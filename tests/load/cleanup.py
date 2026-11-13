"""Plan or explicitly execute API cleanup for one recorded run; never delete tables."""
import argparse
import json
import os
import re
import socket
from pathlib import Path
import time
import uuid

from client import Client
from config import Settings, LabError, PROFILE
from fixtures import health
from cloud_metrics import deployment


def plan(report):
    manifest = report.get("fixtureManifest", {})
    run_id = report.get("runId", "")
    if not re.fullmatch(r"[a-f0-9]{24}", run_id) or manifest.get("runId") != run_id or manifest.get("owner") != "event-test-lab":
        raise LabError("UNSAFE_MANIFEST", "Không có manifest sở hữu hợp lệ cho lượt này.")
    for user in manifest.get("users", []):
        source_run = user.get("sourceRunId", run_id) if user.get("poolManaged") else run_id
        if not re.fullmatch(r"[a-f0-9]{24}", source_run) or not re.fullmatch(r"lab-" + source_run + r"-\d{3}@example\.test", user.get("email", "")):
            raise LabError("UNSAFE_MANIFEST", "Email không thuộc lượt test.")
        validate_id(user.get("userId"))
    for event in manifest.get("events", []):
        if not re.fullmatch(r"event-[a-f0-9]{32}", event.get("eventId", "")):
            raise LabError("UNSAFE_MANIFEST", "Event ID không khớp định dạng ứng dụng.")
        if event.get("title") != "LAB " + run_id: raise LabError("UNSAFE_MANIFEST", "Tên sự kiện không khớp lượt test.")
    return manifest


def validate_id(value):
    try:
        parsed = uuid.UUID(value)
        if parsed.version != 4 or str(parsed) != value: raise ValueError()
    except (ValueError, TypeError, AttributeError):
        raise LabError("UNSAFE_MANIFEST", "ID trong manifest không phải UUID v4 chuẩn.") from None


def execute(settings, report, manifest):
    if report.get("state") not in {"completed", "failed", "blocked", "stopped", "interrupted"}:
        raise LabError("RUN_ACTIVE", "Lượt chưa kết thúc.")
    if manifest.get("pendingEmail") or manifest.get("pendingEventTitle"):
        raise LabError("UNRESOLVED_WRITE", "Có request tạo dữ liệu chưa rõ kết quả; kiểm tra trước, không tự đoán để xóa.")
    if (manifest.get("apiUrl") != settings.api_url or manifest.get("table") != settings.expected_table
            or manifest.get("functionArn") != settings.expected_function_arn):
        raise LabError("TARGET_CHANGED", "Môi trường đã đổi so với manifest; không dọn tự động.")
    settings.check_table(settings.expected_table, purchase=True)
    deployed = deployment(settings)
    if not deployed.get("tableMatches") or not deployed.get("targetMatches"):
        raise LabError("TARGET_CHANGED", "Cấu hình Lambda không khớp môi trường manifest.")
    health(settings, purchase=True)
    username, password = os.getenv("LAB_ADMIN_USERNAME"), os.getenv("LAB_ADMIN_PASSWORD")
    if not username or not password: raise LabError("ADMIN_REQUIRED", "Nhập Admin kín bằng script start-aws.ps1.")
    admin = Client(settings)
    session, _ = admin.expect(PROFILE["paths"]["adminLogin"], "POST", {"username": username, "password": password})
    if session.get("role") != "admin": raise LabError("ADMIN_REQUIRED", "Cần phiên Admin.")
    events, _ = admin.expect("/admin/events")
    users, _ = admin.expect("/admin/users")
    event_by_id = {e["id"]: e for e in events.get("events", [])}
    user_by_id = {u["userId"]: u for u in users.get("users", [])}
    actions = []
    # Validate all ownership before the first DELETE. Missing records are already clean.
    for expected in manifest.get("events", []):
        current = event_by_id.get(expected["eventId"])
        if current:
            if current.get("title") != expected["title"] or current.get("summary") != "Run " + manifest["runId"]:
                raise LabError("OWNERSHIP_CHANGED", "Sự kiện đã thay đổi thông tin sở hữu; không xóa.")
            actions.append(("/admin/events/" + expected["eventId"], current["version"]))
    for expected in manifest.get("users", []):
        if expected.get("poolManaged"): continue  # Retain reusable test users; delete only this run's event/tickets.
        current = user_by_id.get(expected["userId"])
        if current:
            if current.get("email") != expected["email"] or current.get("role") != "user":
                raise LabError("OWNERSHIP_CHANGED", "Tài khoản đã đổi hoặc không thuộc lượt test.")
            actions.append(("/admin/users/" + expected["userId"], current["version"]))
    completed = 0
    for path, version in actions:
        for _ in range(20):
            status, body, _ = admin.call(path, "DELETE", {"version": version}, {PROFILE["csrfHeader"]: session["csrfToken"]})
            if status == 200 and isinstance(body, dict) and body.get("deleted") is True:
                completed += 1
                break
            if status != 202: raise LabError("CLEANUP_INCOMPLETE", "API chưa xác nhận xóa; dừng và kiểm tra report. Không xóa trực tiếp DynamoDB.")
            time.sleep(.2)
        else: raise LabError("CLEANUP_INCOMPLETE", "API còn đang dọn sau 20 lần; cần tiếp tục ở lượt riêng.")
    return {"deletedEntities": completed, "scope": "Only manifest events/users through application API; auth rate counters and non-owned data preserved."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--confirm")
    args = parser.parse_args()
    try:
        if not re.fullmatch(r"[a-f0-9]{24}", args.run_id): raise LabError("UNSAFE_MANIFEST", "Run ID không hợp lệ.")
        settings = Settings()
        source = settings.results / args.run_id / "report.json"
        report = json.loads(source.read_text(encoding="utf-8"))
        if report.get("runId") != args.run_id: raise LabError("UNSAFE_MANIFEST", "Run ID trong report khác đường dẫn.")
        manifest = plan(report)
        if not args.execute:
            print(json.dumps({"planOnly": True, "runId": args.run_id,
                              "usersToDelete": sum(not u.get("poolManaged") for u in manifest.get("users", [])),
                              "poolUsersRetained": sum(bool(u.get("poolManaged")) for u in manifest.get("users", [])),
                              "events": len(manifest.get("events", [])), "unresolved": bool(manifest.get("pendingEmail") or manifest.get("pendingEventTitle"))}))
            return
        if args.confirm != args.run_id: raise LabError("CONFIRM_REQUIRED", "--confirm phải khớp chính xác run ID.")
        try:
            with socket.create_connection(("127.0.0.1", 3100), timeout=.5):
                raise LabError("RUNNER_ACTIVE", "Dừng runner trước khi dọn dữ liệu để không có bài mới bắt đầu.")
        except OSError: pass
        result = execute(settings, report, manifest)
        report["cleanup"] = result
        source.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(result))
    except (LabError, OSError, ValueError, KeyError) as exc:
        print(json.dumps({"error": getattr(exc, "code", "CLEANUP_FAILED"), "message": str(exc) if isinstance(exc, LabError) else "Kiểm tra cấu hình/manifest/quyền; chưa xác nhận dọn hoàn tất."}))
        raise SystemExit(1)


if __name__ == "__main__": main()
