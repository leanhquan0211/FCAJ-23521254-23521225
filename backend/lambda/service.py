import re
import random
import time
import uuid
from datetime import datetime, timezone

from botocore.exceptions import ClientError


class ApiError(Exception):
    def __init__(self, status, code, message, details=None):
        self.status = status
        self.code = code
        self.message = message
        self.details = details
        super().__init__(message)


EVENT_FIELDS = (
    "id", "title", "category", "dateTime", "location", "organizer",
    "capacity", "remainingSeats", "summary", "description",
)


def event_output(item, now=None):
    now = now or datetime.now(timezone.utc)
    starts_at = datetime.fromisoformat(item["dateTime"])
    if starts_at.utcoffset() is None:
        raise ValueError("Stored event must include a timezone")
    status = (
        "ended" if starts_at <= now else
        "closed" if not item["registrationOpen"] else
        "full" if item["remainingSeats"] <= 0 else "open"
    )
    return {**{key: item[key] for key in EVENT_FIELDS}, "status": status}


class EventService:
    def __init__(self, repository):
        self.repository = repository

    def list_events(self):
        items = self.repository.list_events()
        items.sort(key=lambda item: datetime.fromisoformat(item["dateTime"]))
        return {"events": [event_output(item) for item in items]}

    def get_event(self, event_id):
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,79}", event_id or ""):
            raise ApiError(400, "VALIDATION_ERROR", "Mã sự kiện không hợp lệ.")
        item = self.repository.get_event(event_id)
        if item is None:
            raise ApiError(404, "EVENT_NOT_FOUND", "Không tìm thấy sự kiện.")
        return event_output(item)


REGISTRATION_FIELDS = ("id", "eventId", "fullName", "email", "phone", "createdAt")


def validate_registration(body):
    if not isinstance(body, dict) or set(body) - {"fullName", "email", "phone"}:
        raise ApiError(400, "VALIDATION_ERROR", "Dữ liệu đăng ký không hợp lệ.")
    errors, values = {}, {}
    for name, maximum in [("fullName", 120), ("email", 254), ("phone", 32)]:
        value = body.get(name, "")
        if not isinstance(value, str):
            errors[name] = "Giá trị phải là chuỗi ký tự."
            continue
        value = value.strip()
        values[name] = value.lower() if name == "email" else value
        if len(value) > maximum:
            errors[name] = f"Vui lòng nhập tối đa {maximum} ký tự."
        elif name != "phone" and not value:
            errors[name] = "Vui lòng nhập họ và tên." if name == "fullName" else "Vui lòng nhập email."
        elif name == "email" and not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            errors[name] = "Email chưa đúng định dạng."
    if errors:
        raise ApiError(400, "VALIDATION_ERROR", "Vui lòng kiểm tra thông tin đăng ký.", errors)
    return values


class RegistrationService:
    def __init__(self, repository):
        self.repository = repository

    def get_registration(self, registration_id):
        try:
            parsed = uuid.UUID(registration_id or "")
            if parsed.version != 4 or str(parsed) != registration_id.lower():
                raise ValueError()
        except (ValueError, AttributeError):
            raise ApiError(400, "VALIDATION_ERROR", "Mã đăng ký không hợp lệ.") from None
        item = self.repository.get_registration(str(parsed))
        if item is None:
            raise ApiError(404, "REGISTRATION_NOT_FOUND", "Không tìm thấy đăng ký.")
        return {key: item[key] for key in REGISTRATION_FIELDS}

    def check_availability(self, event_id, email):
        event = EventService(self.repository).get_event(event_id)
        if event["status"] in {"ended", "closed"}:
            raise ApiError(409, "REGISTRATION_CLOSED", "Sự kiện đã đóng đăng ký hoặc đã kết thúc.")
        if self.repository.has_registration(event_id, email):
            raise ApiError(409, "DUPLICATE_REGISTRATION", "Email này đã đăng ký sự kiện.")
        if event["status"] == "full":
            raise ApiError(409, "EVENT_FULL", "Sự kiện đã hết chỗ.")

    def register(self, event_id, body):
        values = validate_registration(body)
        self.check_availability(event_id, values["email"])
        now = datetime.now(timezone.utc)
        registration = {"id": str(uuid.uuid4()), "eventId": event_id, **values, "createdAt": now.isoformat()}
        for attempt in range(4):
            try:
                self.repository.create_registration(registration, int(now.timestamp()))
                return registration
            except ClientError as exc:
                if exc.response["Error"]["Code"] != "TransactionCanceledException":
                    raise
                # Re-read consistently: a concurrent request may have taken the seat/email.
                self.check_availability(event_id, values["email"])
                reasons = {reason.get("Code") for reason in exc.response.get("CancellationReasons", [])}
                if reasons - {None, "None", "TransactionConflict", "ConditionalCheckFailed"}:
                    raise
                if attempt == 3:
                    raise ApiError(503, "DATABASE_UNAVAILABLE", "Đăng ký đang bận xử lý. Vui lòng thử lại.") from None
                time.sleep(0.02 * (2 ** attempt) + random.uniform(0, 0.02))
