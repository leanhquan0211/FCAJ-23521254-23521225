"""Prepare through real application APIs; import only the app's admin provisioning factory."""
from datetime import datetime, timedelta, timezone
import secrets
import sys
import time
import uuid
import copy

from client import Client
from config import LabError, PROFILE, guard_table
from account_pool import AccountPool


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
    table = settings.check_table(body.get("database", {}).get("table"), purchase=purchase)
    if body.get("status") != "ok" or body.get("database", {}).get("status") != "ready":
        raise LabError("DATABASE_NOT_READY", "Health chưa xác nhận database ready.")
    if body.get("apiContractVersion") != PROFILE["healthVersion"] or not body.get("serverTime"):
        raise LabError("WAITING_FOR_CONTRACT", "Cần API 4.1 và serverTime; chưa tạo User/sự kiện.")
    if purchase:
        status, data, _ = client.call(PROFILE["paths"]["session"])
        if status != 401 or not isinstance(data, dict) or data.get("error", {}).get("code") != "AUTH_REQUIRED":
            raise LabError("WAITING_FOR_USER_AUTH", "Chờ /auth/session trả 401 AUTH_REQUIRED cho khách chưa đăng nhập.")
    return body


def create_environment(settings):
    if settings.environment == "aws":
        raise LabError("UNSAFE_ENVIRONMENT", "Runner không tạo bảng AWS. Dùng tài nguyên hiện tại đã được xác nhận.")
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

    manifest = {"owner": "event-test-lab", "runId": run_id, "apiUrl": settings.api_url,
                "table": table_name, "functionArn": settings.expected_function_arn,
                "users": [], "events": [], "pendingEmail": None, "pendingEventTitle": None}
    def journal(): update(fixtureManifest=copy.deepcopy(manifest))
    journal()
    if settings.environment == "aws":
        limits = settings.auth_limits or {}
        try:
            budget = min(int(limits["USER_SIGNUP_IP_LIMIT"]), int(limits["USER_LOGIN_IP_LIMIT"]))
        except (KeyError, TypeError, ValueError):
            raise LabError("WAITING_FOR_RATE_CONFIG", "Chưa đọc được giới hạn đăng ký/đăng nhập của Lambda.") from None
        if budget < config["users"] + 20:
            raise LabError("WAITING_FOR_RATE_CONFIG", "Giới hạn hiện tại chưa đủ số User cộng 20 lượt dự phòng. Chọn bài nhỏ hoặc cập nhật cấu hình; không tự bỏ rate limit.")

    table = database_table(settings, table_name)
    # Verify HTTP and the locally configured DB address the same ACTIVE table before writes.
    if table.meta.client.describe_table(TableName=table_name)["Table"]["TableStatus"] != "ACTIVE":
        raise LabError("DATABASE_NOT_READY", "Bảng fixture chưa ACTIVE.")
    if settings.environment == "aws":
        import os
        username, password = os.getenv("LAB_ADMIN_USERNAME"), os.getenv("LAB_ADMIN_PASSWORD")
        if not username or not password:
            raise LabError("WAITING_FOR_TEST_ADMIN", "Cấp Admin test qua LAB_ADMIN_USERNAME/LAB_ADMIN_PASSWORD ở terminal runner.")
    else:
        _, password_record, AuthRepository = app_modules(settings)
        username, password = "lab-" + run_id[:16], secrets.token_urlsafe(24)
        AuthRepository(table).create("ADMIN#" + username, {"username": username, "role": "admin", **password_record(password)})
    admin = Client(settings)
    admin_session, _ = admin.expect(PROFILE["paths"]["adminLogin"], "POST", {"username": username, "password": password})
    if admin_session.get("role") != "admin":
        raise LabError("CONTRACT_MISMATCH", "Phiên chuẩn bị phải có role admin.")
    sessions, clients = [], []
    pool = AccountPool(settings)
    available = pool.available(table, config["users"])
    update(reusedUsers=0, createdUsers=0)
    for index in range(config["users"]):
        if cancelled.is_set(): raise LabError("STOPPED", "Đã dừng trong bước chuẩn bị.")
        client = Client(settings)
        reused = index < len(available)
        if reused:
            account = available[index]
            email, user_password = account["email"], account["password"]
            registered = {"userId": account["userId"]}
        else:
            email, user_password = f"lab-{run_id}-{index:03d}@example.test", secrets.token_urlsafe(24)
            manifest["pendingEmail"] = email
            journal()
            user_body, _ = client.expect(PROFILE["paths"]["register"], "POST", {
                "fullName": f"Người thử {index + 1:03d}", "email": email, "password": user_password}, status=201)
            registered = user_body.get("user", {})
            if not registered.get("userId") or registered.get("email") != email:
                raise LabError("CONTRACT_MISMATCH", "Response tạo tài khoản không khớp email của lượt test.")
            manifest["users"].append({"userId": registered["userId"], "email": email, "poolManaged": True, "sourceRunId": run_id, "reused": False})
            manifest["pendingEmail"] = None
            journal()
            pool.add({"userId": registered["userId"], "email": email, "password": user_password, "sourceRunId": run_id})
        if reused:
            manifest["users"].append({"userId": registered["userId"], "email": email, "poolManaged": True, "sourceRunId": account["sourceRunId"], "reused": True})
        journal()
        session, _ = client.expect(PROFILE["paths"]["login"], "POST", {"identifier": email, "password": user_password})
        user_id = session.get("user", {}).get("userId")
        if (not user_id or session.get("role") != "user" or session.get("user", {}).get("role") != "user"
                or user_id != registered.get("userId")
                or not isinstance(session.get("csrfToken"), str)
                or session.get("expiresAt", 0) < time.time() + 300):
            raise LabError("CONTRACT_MISMATCH", "Session User không khớp adapter hoặc sắp hết hạn.")
        sessions.append({"userId": user_id, "cookie": client.user_cookie(), "csrfToken": session["csrfToken"],
                         "idempotencyKey": str(uuid.uuid4()), "expiresAt": session["expiresAt"]})
        clients.append(client)
        update(preparedUsers=index + 1, reusedUsers=min(index + 1, len(available)), createdUsers=max(0, index + 1 - len(available)))
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
    manifest["pendingEventTitle"] = f"LAB {run_id}"
    journal()
    event, _ = admin.expect(PROFILE["paths"]["adminEvents"], "POST", {
        "title": f"LAB {run_id}", "category": "Công nghệ", "dateTime": (opens + timedelta(days=1)).isoformat(),
        "salesOpenAt": opens.isoformat(), "location": "Workshop test", "organizer": "Test lab",
        "capacity": config["capacity"], "registrationOpen": True,
        "summary": f"Run {run_id}", "description": f"Dữ liệu kiểm thử riêng: {run_id}"}, status=201,
        headers={PROFILE["csrfHeader"]: admin_session["csrfToken"]})
    if isinstance(event.get("id"), str):
        manifest["events"].append({"eventId": event["id"], "title": f"LAB {run_id}"})
        manifest["pendingEventTitle"] = None
        journal()
    if event.get("remainingSeats") != config["capacity"] or not isinstance(event.get("id"), str):
        raise LabError("FIXTURE_INVALID", "Sự kiện mới phải còn nguyên sức chứa.")
    if time.time() + offset >= opens.timestamp():
        raise LabError("PREPARATION_OVERRAN", "Đã qua giờ mở bán trong lúc chuẩn bị; cần tăng salesLead rồi tạo lượt mới.")
    return {"table": table_name, "eventId": event["id"], "eventIds": [event["id"]], "sessions": sessions,
            "clients": clients, "startAt": opens.timestamp() - offset + .1,
            "clockRttMs": round((after - before) * 1000, 2), "clockOffsetMs": round(offset * 1000, 2)}


def database_table(settings, table_name):
    settings.check_table(table_name, purchase=True)
    if settings.environment == "aws":
        import boto3
        from botocore.config import Config
        return boto3.resource("dynamodb", region_name=settings.region,
                              config=Config(connect_timeout=5, read_timeout=10, retries={"max_attempts": 2})).Table(table_name)
    local_table, _, _ = app_modules(settings)
    return local_table(settings.db_endpoint, table_name)


def await_sales(settings, prepared, cancelled):
    """Gate ordinary booking-load tests on observed server state, not client clock estimates.

    This intentionally does not test the exact opening-time boundary. All polling is
    preparation traffic and remains outside k6 latency/throughput measurements.
    """
    deadline = time.monotonic() + 30
    client = Client(settings)
    while time.monotonic() < deadline:
        if cancelled.is_set(): raise LabError("STOPPED", "Đã dừng khi chờ xác nhận mở bán.")
        event, _ = client.expect(PROFILE["paths"]["event"].format(eventId=prepared["eventId"]))
        if event.get("status") == "open":
            if event.get("remainingSeats", 0) <= 0:
                raise LabError("FIXTURE_CHANGED", "Sự kiện test không còn chỗ trước khoảng đo.")
            prepared["startAt"] = time.time()
            return
        if event.get("status") != "not_open":
            raise LabError("FIXTURE_CHANGED", "Sự kiện test bị đóng/hết chỗ trước khi bắt đầu đo.")
        if cancelled.wait(.25): raise LabError("STOPPED", "Đã dừng khi chờ mở bán.")
    raise LabError("SALES_GATE_TIMEOUT", "API chưa xác nhận sự kiện mở trong 30 giây; không gửi tải đặt vé sớm.")
