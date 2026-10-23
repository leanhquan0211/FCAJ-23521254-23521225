"""One account, one ticket per event; replay an HTTP intent without spending another seat."""
import hashlib
import json
import random
import re
import time
import uuid
from datetime import datetime, timezone

from botocore.exceptions import ClientError

from service import ApiError, EventService

TICKET_FIELDS = ("id", "eventId", "userId", "fullName", "email", "phone", "createdAt")


def validate_booking(event_id, body, key):
    if not isinstance(event_id, str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,79}", event_id):
        raise ApiError(400, "VALIDATION_ERROR", "Mã sự kiện không hợp lệ.")
    if not isinstance(body, dict) or set(body) - {"phone"}:
        raise ApiError(400, "VALIDATION_ERROR", "Chỉ nhận số điện thoại; danh tính lấy từ phiên đăng nhập.")
    phone = body.get("phone", "")
    if not isinstance(phone, str) or len(phone.strip()) > 32:
        raise ApiError(400, "VALIDATION_ERROR", "Số điện thoại không hợp lệ.", {"phone": "Nhập tối đa 32 ký tự."})
    try:
        parsed = uuid.UUID(key or "")
        if parsed.version != 4 or str(parsed) != key:
            raise ValueError()
    except (ValueError, TypeError, AttributeError):
        raise ApiError(400, "VALIDATION_ERROR", "Cần Idempotency-Key là UUID v4 chuẩn.",
                       {"idempotencyKey": "Gửi cùng một UUID v4 khi thử lại thao tác đặt vé."}) from None
    payload = {"method": "POST", "eventId": event_id, "phone": phone.strip()}
    fingerprint = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    return phone.strip(), fingerprint


class BookingService:
    def __init__(self, repository):
        self.repository = repository

    def get_registration(self, registration_id, user_id):
        try:
            parsed = uuid.UUID(registration_id or "")
            if parsed.version != 4 or str(parsed) != registration_id:
                raise ValueError()
        except (ValueError, TypeError, AttributeError):
            raise ApiError(400, "VALIDATION_ERROR", "Mã đăng ký không hợp lệ.") from None
        item = self.repository.get_registration(registration_id)
        if not item or item.get("userId") != user_id:
            raise ApiError(404, "REGISTRATION_NOT_FOUND", "Không tìm thấy vé thuộc tài khoản của bạn.")
        EventService(self.repository).get_event(item["eventId"])
        return {field: item[field] for field in TICKET_FIELDS}

    def list_registrations(self, user_id):
        tickets = []
        for reference in self.repository.list_user_registrations(user_id):
            try:
                tickets.append(self.get_registration(reference["registrationId"], user_id))
            except ApiError as exc:
                if exc.status != 404:
                    raise
        tickets.sort(key=lambda item: (-datetime.fromisoformat(item["createdAt"]).timestamp(), item["id"]))
        return {"registrations": tickets}

    def existing(self, user_id, event_id, key, fingerprint):
        EventService(self.repository).get_event(event_id)
        saved = self.repository.get_user_item(user_id, f"IDEMPOTENCY#{key}")
        if saved:
            if saved["fingerprint"] != fingerprint:
                raise ApiError(409, "IDEMPOTENCY_KEY_REUSED", "Mã yêu cầu đã được dùng cho nội dung khác.")
            return saved["registration"]
        reference = self.repository.get_user_item(user_id, f"REGISTRATION#{event_id}")
        if reference:
            # A concurrent transaction can commit between the two reads above.
            # Re-read the intent before calling this a different-key duplicate.
            saved = self.repository.get_user_item(user_id, f"IDEMPOTENCY#{key}")
            if saved:
                if saved["fingerprint"] != fingerprint:
                    raise ApiError(409, "IDEMPOTENCY_KEY_REUSED", "Mã yêu cầu đã được dùng cho nội dung khác.")
                return saved["registration"]
            raise ApiError(409, "DUPLICATE_REGISTRATION", "Bạn đã có vé của sự kiện này.",
                           {"registrationId": reference["registrationId"]})
        return None

    def check_availability(self, event_id):
        event = EventService(self.repository).get_event(event_id)
        if event["status"] in {"closed", "ended"}:
            raise ApiError(409, "REGISTRATION_CLOSED", "Sự kiện đã đóng đăng ký hoặc đã đến giờ diễn ra.")
        if event["status"] == "not_open":
            raise ApiError(409, "SALES_NOT_OPEN", "Sự kiện chưa đến giờ mở bán.")
        if event["status"] == "full":
            raise ApiError(409, "EVENT_FULL", "Sự kiện đã hết chỗ.")

    def register(self, event_id, body, user, key):
        phone, fingerprint = validate_booking(event_id, body, key)
        now = datetime.now(timezone.utc)
        registration = {"id": str(uuid.uuid4()), "eventId": event_id, "userId": user["userId"],
                        "fullName": user["fullName"], "email": user["email"],
                        "phone": phone, "createdAt": now.isoformat()}
        for attempt in range(4):
            saved = self.existing(user["userId"], event_id, key, fingerprint)
            if saved:
                return saved, True
            self.check_availability(event_id)
            try:
                self.repository.create_booking(registration, key, fingerprint, int(time.time() * 1000))
                return registration, False
            except ClientError as exc:
                if exc.response["Error"]["Code"] != "TransactionCanceledException":
                    raise
                reasons = {reason.get("Code") for reason in exc.response.get("CancellationReasons", [])}
                if reasons - {None, "None", "TransactionConflict", "ConditionalCheckFailed"}:
                    raise
                # Even on the last attempt, read committed results before returning busy.
                saved = self.existing(user["userId"], event_id, key, fingerprint)
                if saved:
                    return saved, True
                self.check_availability(event_id)
                if attempt < 3:
                    time.sleep(0.02 * (2 ** attempt) + random.uniform(0, 0.02))
        raise ApiError(503, "REGISTRATION_BUSY", "Đặt vé đang bận xử lý. Vui lòng thử lại cùng mã yêu cầu.",
                       headers={"Retry-After": "1"})
