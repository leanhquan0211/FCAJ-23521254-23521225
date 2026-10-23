"""Prepare through real application APIs; import only the app's admin provisioning factory."""
from datetime import datetime, timedelta, timezone
import secrets
import sys
import time
import uuid

from client import Client
from config import LabError, PROFILE, guard_table


def app_modules(settings):
    source = settings.app_root / "backend/lambda"
    sdk = settings.app_root / ".aws-sam/build/EventsFunction"
    if not (source / "configuration.py").is_file():
        raise LabError("APP_SOURCE_MISSING", "APP_SOURCE_ROOT phải trỏ repository ứng dụng đã bàn giao.")
    for directory in (sdk, source):
        if str(directory) not in sys.path: sys.path.insert(0, str(directory))
    try:
        from configuration import local_table
        from auth import password_record
        from auth_repository import AuthRepository
    except ImportError:
        raise LabError("APP_FACTORY_MISSING", "Cần SAM build đúng APP_SOURCE_ROOT và factory admin của ứng dụng; không tạo session giả.") from None
    return local_table, password_record, AuthRepository


def health(settings, purchase=False):
    client = Client(settings)
    body, _ = client.expect(PROFILE["paths"]["health"])
    table = guard_table(body.get("database", {}).get("table"))
    if body.get("status") != "ok" or body.get("database", {}).get("status") != "ready":
        raise LabError("DATABASE_NOT_READY", "Health chưa xác nhận database ready.")
    if purchase:
        if body.get("apiContractVersion") != PROFILE["healthVersion"] or not body.get("serverTime"):
            raise LabError("WAITING_FOR_V3", "Chờ tích hợp: /health chưa bàn giao apiContractVersion=3.0 và serverTime; chưa tạo User/sự kiện.")
        status, data, _ = client.call(PROFILE["paths"]["session"])
        if status != 401 or not isinstance(data, dict) or data.get("error", {}).get("code") != "AUTH_REQUIRED":
            raise LabError("WAITING_FOR_USER_AUTH", "Chờ /auth/session trả 401 AUTH_REQUIRED cho khách chưa đăng nhập.")
    return body


def create_environment(settings):
    local_table, _, _ = app_modules(settings)
    table_name = PROFILE["tablePrefix"] + uuid.uuid4().hex[:16]
    table = local_table(settings.db_endpoint, table_name)
    # Use the application's default initialization (empty table), not a new seed schema.
    sys.path.insert(0, str(settings.app_root / "backend/dynamodb_setup"))
    from init_db import initialize
    initialize(table)
    return table_name


def prepare(settings, config, run_id, update, cancelled):
    health_data = health(settings, purchase=config["mode"] == "purchase")
    table_name = health_data["database"]["table"]
    if config["mode"] == "public":
        data, _ = Client(settings).expect(PROFILE["paths"]["events"])
        events = data.get("events")
        if not isinstance(events, list): raise LabError("CONTRACT_MISMATCH", "GET /events phải trả events array.")
        return {"table": table_name, "eventIds": [event["id"] for event in events if isinstance(event, dict) and isinstance(event.get("id"), str)], "sessions": []}

    local_table, password_record, AuthRepository = app_modules(settings)
    table = local_table(settings.db_endpoint, table_name)
    # Verify HTTP and the locally configured DB address the same ACTIVE table before writes.
    if table.meta.client.describe_table(TableName=table_name)["Table"]["TableStatus"] != "ACTIVE":
        raise LabError("DATABASE_NOT_READY", "Bảng fixture chưa ACTIVE.")
    username, password = "lab-" + run_id[:16], secrets.token_urlsafe(24)
    AuthRepository(table).create("ADMIN#" + username, {"username": username, "role": "admin", **password_record(password)})
    admin = Client(settings)
    admin_session, _ = admin.expect(PROFILE["paths"]["adminLogin"], "POST", {"username": username, "password": password})
    sessions, clients = [], []
    for index in range(config["users"]):
        if cancelled.is_set(): raise LabError("STOPPED", "Đã dừng trong bước chuẩn bị.")
        client = Client(settings)
        email, user_password = f"lab-{run_id}-{index:03d}@example.test", secrets.token_urlsafe(24)
        user_body, _ = client.expect(PROFILE["paths"]["register"], "POST", {
            "fullName": f"Người thử {index + 1:03d}", "email": email, "password": user_password}, status=201)
        session, _ = client.expect(PROFILE["paths"]["login"], "POST", {"email": email, "password": user_password})
        user_id = session.get("user", {}).get("userId")
        if (not user_id or session.get("user", {}).get("role") != "user"
                or user_id != user_body.get("user", {}).get("userId")
                or not isinstance(session.get("csrfToken"), str)
                or session.get("expiresAt", 0) < time.time() + 300):
            raise LabError("CONTRACT_MISMATCH", "Session User không khớp adapter hoặc sắp hết hạn.")
        sessions.append({"userId": user_id, "cookie": client.user_cookie(), "csrfToken": session["csrfToken"],
                         "idempotencyKey": str(uuid.uuid4()), "expiresAt": session["expiresAt"]})
        clients.append(client)
        update(preparedUsers=index + 1)
    if len({session["userId"] for session in sessions}) != config["users"] or len({session["cookie"]["value"] for session in sessions}) != config["users"]:
        raise LabError("SESSION_ISOLATION_FAILED", "Mỗi User phải có userId và session riêng.")
    # Warm health provides server clock estimate; keep RTT so the clock estimate is auditable.
    before = time.time()
    clock, _ = Client(settings).expect(PROFILE["paths"]["health"])
    after = time.time()
    server_now = datetime.fromisoformat(clock["serverTime"].replace("Z", "+00:00")).timestamp()
    if after - before > 2:
        raise LabError("CLOCK_UNCERTAIN", "Health RTT >2 giây; chưa đo được mốc mở bán chính xác, hãy làm nóng API rồi chạy lại.")
    offset = server_now - (before + after) / 2
    opens = datetime.fromtimestamp(time.time() + offset + config["salesLead"], timezone.utc)
    event, _ = admin.expect(PROFILE["paths"]["adminEvents"], "POST", {
        "title": f"LAB {run_id}", "category": "Công nghệ", "dateTime": (opens + timedelta(days=1)).isoformat(),
        "salesOpenAt": opens.isoformat(), "location": "Local test", "organizer": "Test lab",
        "capacity": config["capacity"], "registrationOpen": True,
        "summary": f"Run {run_id}", "description": f"Dữ liệu kiểm thử riêng: {run_id}"}, status=201,
        headers={PROFILE["csrfHeader"]: admin_session["csrfToken"]})
    if event.get("remainingSeats") != config["capacity"] or not isinstance(event.get("id"), str):
        raise LabError("FIXTURE_INVALID", "Sự kiện mới phải còn nguyên sức chứa.")
    if time.time() + offset >= opens.timestamp():
        raise LabError("PREPARATION_OVERRAN", "Đã qua giờ mở bán trong lúc chuẩn bị; cần tăng salesLead rồi tạo lượt mới.")
    return {"table": table_name, "eventId": event["id"], "eventIds": [event["id"]], "sessions": sessions,
            "clients": clients, "startAt": opens.timestamp() - offset + .1,
            "clockRttMs": round((after - before) * 1000, 2), "clockOffsetMs": round(offset * 1000, 2)}
