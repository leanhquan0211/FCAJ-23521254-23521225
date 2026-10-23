"""Single-run local coordinator. k6 is a child process; browser input never becomes a shell command."""
import copy
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import threading
import time
import uuid

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "load"))
from audit import reconcile
from config import DEFAULTS, LabError, PROFILE, PROFILE_HASH, SCENARIOS, validate_config
from fixtures import health, prepare
from metrics import Metrics, TECHNICAL
from supplemental import verify

FINAL = {"completed", "failed", "blocked", "stopped", "interrupted"}


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def git_version(root):
    git = os.getenv("GIT_BIN", "git")
    if os.name == "nt" and Path("D:/Scoop/apps/git/current/cmd/git.exe").is_file():
        git = "D:/Scoop/apps/git/current/cmd/git.exe"
    try:
        commit = subprocess.run([git, "-C", str(root), "rev-parse", "HEAD"], capture_output=True, text=True, timeout=10, check=True).stdout.strip()
        dirty = bool(subprocess.run([git, "-C", str(root), "status", "--porcelain"], capture_output=True, text=True, timeout=10, check=True).stdout)
        return {"appCommit": commit, "appDirty": dirty}
    except (OSError, subprocess.SubprocessError):
        return {"appCommit": None, "appDirty": None}


class Engine:
    def __init__(self, settings):
        self.settings = settings
        self.lock = threading.RLock()
        self.runs, self.cancelled, self.processes, self.workers = {}, {}, {}, {}
        for path in settings.results.glob("*/report.json"):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                if not re.fullmatch(r"[a-f0-9]{24}", data.get("runId", "")): continue
                if data.get("state") not in FINAL:
                    data.update(state="interrupted", verdict="incomplete", finishedAt=utc_now())
                    data.setdefault("issues", []).append({"code": "RUNNER_RESTARTED", "message": "Runner dừng trước khi kết thúc; cần đối chiếu lại DB, không tự báo đạt."})
                    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
                self.runs[data["runId"]] = data
            except (OSError, ValueError):
                continue

    def metadata(self):
        return {"scenarios": SCENARIOS, "defaults": DEFAULTS, "apiUrl": self.settings.api_url,
                "adapter": PROFILE["id"], "adapterStatus": PROFILE["status"], "maxUsers": 100,
                "note": "Kết quả local không chứng minh autoscaling AWS."}

    def list_runs(self):
        with self.lock:
            return [copy.deepcopy(run) for run in sorted(self.runs.values(), key=lambda r: r["createdAt"], reverse=True)[:100]]

    def get(self, run_id):
        with self.lock:
            if run_id not in self.runs: raise LabError("RUN_NOT_FOUND", "Không tìm thấy lượt chạy.")
            return copy.deepcopy(self.runs[run_id])

    def update(self, run_id, **values):
        with self.lock:
            self.runs[run_id].update(values, updatedAt=utc_now())
            target = self.settings.results / run_id / "report.json"
            target.write_text(json.dumps(self.runs[run_id], ensure_ascii=False, indent=2), encoding="utf-8")

    def start(self, values):
        config = validate_config(values)
        with self.lock:
            if any(run["state"] not in FINAL for run in self.runs.values()):
                raise LabError("RUN_ACTIVE", "Chỉ chạy một lượt tại một thời điểm.")
            run_id = uuid.uuid4().hex[:24]
            (self.settings.results / run_id).mkdir()
            run = {"schemaVersion": 1, "runId": run_id, "scenario": config["scenario"], "config": config,
                   "state": "preparing", "verdict": "pending", "createdAt": utc_now(),
                   "preparedUsers": 0, "issues": [], "metrics": Metrics().snapshot(),
                   "verification": {"status": "not_run"}, "supplemental": {"status": "not_run"},
                   "source": {**git_version(self.settings.app_root), "adapter": PROFILE["id"], "adapterHash": PROFILE_HASH}}
            self.runs[run_id] = run
            self.cancelled[run_id] = threading.Event()
            self.update(run_id)
            worker = threading.Thread(target=self._run, args=(run_id,), daemon=True)
            self.workers[run_id] = worker
            worker.start()
            return self.get(run_id)

    def stop(self, run_id):
        with self.lock:
            current = self.get(run_id)
            if current["state"] in FINAL: return current
            self.cancelled[run_id].set()
            self.update(run_id, state="stopping")
            process = self.processes.get(run_id)
            if process and process.poll() is None: process.terminate()
            return self.get(run_id)

    def _run(self, run_id):
        config = self.get(run_id)["config"]
        prepared, metrics = None, Metrics()
        cancel = self.cancelled[run_id]
        began = time.monotonic()
        self.settings.deadline = began + 900
        try:
            version = subprocess.run([self.settings.k6, "version"], capture_output=True, text=True, timeout=10, check=True)
            self.update(run_id, k6Version=version.stdout.strip()[:120])
            observed = health(self.settings)
            self.update(run_id, table=observed["database"]["table"], observedContractVersion=observed.get("apiContractVersion", "unreported (v2 compatible)"))
            prepared = prepare(self.settings, config, run_id, lambda **v: self.update(run_id, **v), cancel)
            self.update(run_id, table=prepared["table"], eventId=prepared.get("eventId"),
                        preparationSeconds=round(time.monotonic() - began, 2),
                        clockRttMs=prepared.get("clockRttMs"), clockOffsetMs=prepared.get("clockOffsetMs"))
            if cancel.is_set(): raise LabError("STOPPED", "Đã dừng trước khoảng đo.")
            if config["scenario"] == "ramp" and config["mode"] == "purchase":
                # A gradual arrival schedule starts after sales open, not a barrier release of every VU.
                while time.time() < prepared["startAt"]:
                    if cancel.wait(.1): raise LabError("STOPPED", "Đã dừng trước mở bán.")
            input_data = {k: v for k, v in prepared.items() if k != "clients"}
            input_data.update(config=config, profile=PROFILE, baseUrl=self.settings.api_url, origin=self.settings.origin)
            script = "const LAB_INPUT = " + json.dumps(input_data, ensure_ascii=True) + ";\n" + (Path(__file__).parents[1] / "load/scenarios.js").read_text(encoding="utf-8")
            directory = self.settings.results / run_id
            raw = directory / "metrics.ndjson"
            # No credentials in environment/argv, no shell=True, no untrusted executable from HTTP.
            command = [self.settings.k6, "run", "--quiet", "--no-color", "--log-output=none", "--out", f"json={raw}", "-"]
            child_env = {k: v for k, v in os.environ.items() if not k.startswith("K6_") and k.lower() not in {"http_proxy", "https_proxy", "all_proxy", "no_proxy"}}
            child_env["K6_NO_USAGE_REPORT"] = "true"
            child_env["NO_PROXY"] = "*"
            with self.lock:
                if cancel.is_set(): raise LabError("STOPPED", "Đã dừng trước khi mở k6.")
                process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
                                           env=child_env, creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
                self.processes[run_id] = process
            # Drain stderr without persisting it: k6 can include configuration/source in errors.
            error_tail = bytearray()
            def drain():
                while True:
                    chunk = process.stderr.read(1024)
                    if not chunk: break
                    error_tail.extend(chunk)
                    if len(error_tail) > 4096: del error_tail[:-4096]
            reader = threading.Thread(target=drain, daemon=True)
            reader.start()
            try:
                process.stdin.write(script.encode("utf-8"))
                process.stdin.close()
            except (BrokenPipeError, OSError):
                pass
            self.update(run_id, state="stopping" if cancel.is_set() else "running", measurementStartedAt=utc_now())
            offset, pending = 0, b""
            watchdog = time.monotonic() + 360
            def consume():
                nonlocal offset, pending
                if not raw.exists(): return
                if raw.stat().st_size > 100 * 1024 * 1024:
                    raise LabError("OUTPUT_LIMIT", "Đã vượt trần 100 MiB dữ liệu đo.")
                with raw.open("rb") as handle:
                    handle.seek(offset)
                    chunk = handle.read(8 * 1024 * 1024)
                    offset += len(chunk)
                lines = (pending + chunk).split(b"\n")
                pending = lines.pop()
                for line in lines:
                    try: metrics.consume(json.loads(line))
                    except (ValueError, KeyError, TypeError):
                        raise LabError("INVALID_K6_OUTPUT", "Điểm đo k6 không đọc được; không xuất kết quả đạt.") from None
                self.update(run_id, metrics=metrics.snapshot())
            while process.poll() is None:
                consume()
                if cancel.is_set() or time.monotonic() >= watchdog:
                    process.terminate()
                    process.wait(timeout=10)
                    if not cancel.is_set(): raise LabError("RUN_TIMEOUT", "Đã tới timeout runner 360 giây.")
                time.sleep(.25)
            # Flush all buffered metric points after the child closes its file.
            while raw.exists() and offset < raw.stat().st_size: consume()
            reader.join(timeout=2)
            self.update(run_id, k6ExitCode=process.returncode, measurementFinishedAt=utc_now(), metrics=metrics.snapshot())
            if process.returncode != 0 and not cancel.is_set():
                raise LabError("K6_FAILED", f"k6 trả exit code {process.returncode}; không có kết quả đạt. Stderr đã giữ riêng trong bộ nhớ, không xuất secrets.")
            self.update(run_id, state="verifying")
            if config["mode"] == "purchase":
                if not cancel.is_set(): self.update(run_id, supplemental=verify(prepared))
                audit = reconcile(self.settings, prepared, config["capacity"], metrics.receipts)
                if cancel.is_set():
                    audit.update(status="inconclusive", reason="STOPPED_REQUESTS_MAY_STILL_COMMIT")
                self.update(run_id, verification=audit)
            else:
                self.update(run_id, verification={"status": "not_applicable", "note": "Bài chỉ đọc, không có fixture ghi hoặc đối chiếu vé."})
            snapshot = metrics.snapshot()
            expected = min(config["users"], config["capacity"])
            technical = sum(snapshot["counts"][key] for key in TECHNICAL)
            ok = snapshot["requests"] > 0 and technical == 0
            if config["mode"] == "purchase":
                ok = ok and audit["status"] == "passed" and audit["tickets"] == expected
                ok = ok and snapshot["counts"]["new"] == expected and snapshot["counts"]["full"] == config["users"] - expected
                ok = ok and self.get(run_id)["supplemental"]["status"] == "passed"
            self.update(run_id, state="stopped" if cancel.is_set() else "completed" if ok else "failed",
                        verdict="incomplete" if cancel.is_set() else "passed" if ok else "failed", finishedAt=utc_now())
        except LabError as exc:
            blocked = exc.code.startswith("WAITING_") or exc.code in {"APP_FACTORY_MISSING", "APP_SOURCE_MISSING"}
            issues = self.get(run_id)["issues"] + [{"code": exc.code, "message": exc.message}]
            self.update(run_id, state="stopped" if cancel.is_set() else "blocked" if blocked else "failed",
                        verdict="incomplete" if cancel.is_set() else "blocked" if blocked else "failed", issues=issues,
                        metrics=metrics.snapshot(), finishedAt=utc_now())
        except (OSError, subprocess.SubprocessError):
            self.update(run_id, state="failed", verdict="failed", finishedAt=utc_now(),
                        issues=[{"code": "TOOL_UNAVAILABLE", "message": "Không chạy được k6 hoặc công cụ local; kiểm tra K6_BIN/quyền thực thi."}])
        except Exception:
            # Never serialize arbitrary SDK/HTTP exceptions (may contain values from the application).
            self.update(run_id, state="failed", verdict="failed", finishedAt=utc_now(),
                        issues=[{"code": "LAB_INTERNAL_ERROR", "message": "Lỗi công cụ test; chưa thể kết luận kết quả ứng dụng. Không xuất exception chứa dữ liệu riêng."}])
        finally:
            with self.lock:
                process = self.processes.pop(run_id, None)
                if process and process.poll() is None:
                    process.kill()
                    process.wait(timeout=10)
            if prepared and config["mode"] == "purchase" and self.get(run_id)["verification"]["status"] == "not_run":
                try:
                    audit = reconcile(self.settings, prepared, config["capacity"], metrics.receipts)
                    audit.update(status="inconclusive", reason="LOAD_DID_NOT_FINISH")
                except Exception:
                    audit = {"status": "inconclusive", "reason": "AUDIT_UNAVAILABLE_AFTER_FAILURE"}
                self.update(run_id, verification=audit)
            # Destruction of these objects drops cookie jars and the in-memory stdin script.
            prepared = None
