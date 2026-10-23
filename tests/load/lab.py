"""CLI for the test lab. Run with Python 3.11+ from the test worktree root."""
import argparse
import json
from pathlib import Path
import socket
import sys
import time
import urllib.error
import urllib.request
import uuid

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "runner"))
from config import LabError, PROFILE, Settings, guard_table
from engine import FINAL, git_version, utc_now
from client import NoRedirect
from fixtures import app_modules, create_environment, health


def runner_request(path, body=None):
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    req = urllib.request.Request("http://127.0.0.1:3100" + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Origin": "http://127.0.0.1:3100", "Content-Type": "application/json"},
        method="POST" if body is not None else "GET")
    try:
        response = opener.open(req, timeout=15)
    except urllib.error.HTTPError as exc:
        response = exc
    except (urllib.error.URLError, OSError):
        raise LabError("RUNNER_UNAVAILABLE", "Hãy chạy python -B tests/runner/server.py trước; CLI không mở controller k6 thứ hai.") from None
    with response:
        data = json.load(response)
        if response.status >= 400:
            raise LabError(data.get("error", "RUNNER_ERROR"), data.get("message", "Runner từ chối yêu cầu."))
        return data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-url")
    parser.add_argument("--app-root")
    parser.add_argument("--k6")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("environment", help="Create a new empty test table and SAM env file; no existing table reset")
    commands.add_parser("preflight", help="Read v3 readiness without creating accounts")
    run_parser = commands.add_parser("run")
    run_parser.add_argument("--scenario", choices=["hot", "ramp", "scarce"], default="ramp")
    run_parser.add_argument("--mode", choices=["public", "purchase"], default="public")
    for field, flag in [("users", "users"), ("capacity", "capacity"), ("rampUp", "ramp-up"), ("hold", "hold"),
                        ("rampDown", "ramp-down"), ("maxRequests", "max-requests"), ("timeout", "timeout"),
                        ("maxRetries", "max-retries"), ("intervalMs", "interval-ms"), ("salesLead", "sales-lead")]:
        run_parser.add_argument("--" + flag, dest=field, type=int)
    cleanup = commands.add_parser("cleanup-environment", help="Delete only a lab-owned table, never a prefix sweep or a volume")
    cleanup.add_argument("--manifest", required=True)
    cleanup.add_argument("--confirm", required=True)
    cleanup.add_argument("--confirm-no-other-writers", action="store_true", required=True)
    args = parser.parse_args()
    settings = Settings(api_url=args.api_url, app_root=args.app_root, k6=args.k6)
    try:
        if args.command == "environment":
            table = create_environment(settings)
            folder = settings.results / "environments"
            folder.mkdir(exist_ok=True)
            env_file = folder / f"{table}.env.json"
            env = {"EventsFunction": {"DYNAMODB_ENDPOINT": "http://fcaj-dynamodb-local:8000", "DYNAMODB_TABLE": table,
                    "DYNAMODB_REGION": "us-east-1", "ALLOWED_ORIGINS": settings.origin + ",http://localhost:5173", "COOKIE_SECURE": "false"}}
            env_file.write_text(json.dumps(env, indent=2), encoding="utf-8")
            manifest_path = folder / f"{table}.manifest.json"
            manifest_path.write_text(json.dumps({"owner": "event-test-lab", "environmentId": uuid.uuid4().hex,
                "table": table, "envFile": str(env_file), "createdAt": utc_now(), **git_version(settings.app_root)}, indent=2), encoding="utf-8")
            print(json.dumps({"table": table, "envFile": str(env_file), "manifest": str(manifest_path)}))
            return 0
        if args.command == "preflight":
            data = health(settings, purchase=True)
            print(json.dumps({"ready": True, "table": data["database"]["table"], "apiContractVersion": data["apiContractVersion"]}))
            return 0
        if args.command == "cleanup-environment":
            manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
            table = guard_table(manifest.get("table"))
            if manifest.get("owner") != "event-test-lab" or table != args.confirm or not manifest.get("environmentId"):
                raise LabError("UNSAFE_CLEANUP", "Manifest phải do lab tạo và --confirm phải khớp chính xác tên bảng.")
            if health(settings)["database"]["table"] != table:
                raise LabError("UNSAFE_CLEANUP", "Health không trỏ đúng bảng manifest.")
            try:
                connection = socket.create_connection(("127.0.0.1", 3100), timeout=.5)
            except OSError:
                connection = None
            if connection:
                connection.close()
                raise LabError("RUNNER_ACTIVE", "Dừng runner trước khi dọn bảng, để không có lượt mới bắt đầu trong lúc dọn.")
            for report in settings.results.glob("*/report.json"):
                if json.loads(report.read_text(encoding="utf-8")).get("state") not in FINAL:
                    raise LabError("RUN_ACTIVE", "Có lượt chưa kết thúc; mở lại runner để ghi nhận gián đoạn rồi kiểm tra trước khi dọn.")
            local_table, _, _ = app_modules(settings)
            local_table(settings.db_endpoint, table).delete()
            manifest.update(deletedAt=utc_now())
            Path(args.manifest).write_text(json.dumps(manifest, indent=2), encoding="utf-8")
            print(json.dumps({"deletedTable": table}))
            return 0
        if args.k6 or args.app_root:
            raise LabError("RUNNER_CONFIG", "Cấu hình K6_BIN/APP_SOURCE_ROOT khi khởi động runner, không thay qua CLI chạy tải.")
        if runner_request("/meta")["apiUrl"] != settings.api_url:
            raise LabError("RUNNER_CONFIG", "API_TEST_URL của CLI khác API đích mà runner đang điều khiển.")
        config = {key: getattr(args, key) for key in ("scenario", "mode", "users", "capacity", "rampUp", "hold", "rampDown", "maxRequests", "timeout", "maxRetries", "intervalMs", "salesLead") if getattr(args, key) is not None}
        run = runner_request("/runs", config)
        try:
            while run["state"] not in FINAL:
                time.sleep(.5)
                run = runner_request("/runs/" + run["runId"])
        except KeyboardInterrupt:
            run = runner_request("/runs/" + run["runId"] + "/stop", {})
            until = time.monotonic() + 90
            while run["state"] not in FINAL and time.monotonic() < until:
                time.sleep(.5)
                run = runner_request("/runs/" + run["runId"])
        print(json.dumps(run, ensure_ascii=True, indent=2))
        return 0 if run["verdict"] == "passed" else 2 if run["verdict"] == "blocked" else 1
    except LabError as exc:
        print(json.dumps({"error": exc.code, "message": exc.message}, ensure_ascii=True))
        return 2 if exc.code.startswith("WAITING_") else 1


if __name__ == "__main__": sys.exit(main())
