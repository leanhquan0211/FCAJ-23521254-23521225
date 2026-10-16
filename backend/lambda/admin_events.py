"""Admin event rules. Authorization is enforced by the handler before entering here."""
import uuid
from datetime import datetime, timezone

from botocore.exceptions import ClientError

from service import ApiError, EventService, event_output

CATEGORIES = {"Công nghệ", "Thiết kế", "Kỹ năng", "Cộng đồng"}
TEXT_LIMITS = {"title": 160, "location": 240, "organizer": 160, "summary": 300, "description": 5000}
INPUT_FIELDS = {*TEXT_LIMITS, "category", "dateTime", "capacity", "registrationOpen"}


def validate_event(body, editing=False):
    expected = INPUT_FIELDS | ({"version"} if editing else set())
    if not isinstance(body, dict) or set(body) != expected:
        raise ApiError(400, "VALIDATION_ERROR", "Thông tin sự kiện thiếu trường hoặc có trường không được phép.")
    values, errors = {}, {}
    for field, maximum in TEXT_LIMITS.items():
        value = body[field]
        if not isinstance(value, str) or not 1 <= len(value.strip()) <= maximum:
            errors[field] = f"Vui lòng nhập từ 1 đến {maximum} ký tự."
        else:
            values[field] = value.strip()
    if not isinstance(body["category"], str) or body["category"] not in CATEGORIES:
        errors["category"] = "Danh mục không hợp lệ."
    else:
        values["category"] = body["category"]
    if type(body["capacity"]) is not int or not 1 <= body["capacity"] <= 100000:
        errors["capacity"] = "Sức chứa phải là số nguyên từ 1 đến 100.000."
    else:
        values["capacity"] = body["capacity"]
    if type(body["registrationOpen"]) is not bool:
        errors["registrationOpen"] = "Trạng thái mở đăng ký phải là true hoặc false."
    else:
        values["registrationOpen"] = body["registrationOpen"]
    try:
        starts = datetime.fromisoformat(body["dateTime"])
        if starts.utcoffset() is None or not 2000 <= starts.year <= 2100:
            raise ValueError()
        values.update(dateTime=starts.isoformat(), startsAtEpoch=int(starts.timestamp()))
    except (TypeError, ValueError, OverflowError):
        errors["dateTime"] = "Thời gian cần có múi giờ và năm từ 2000 đến 2100."
    if editing and (type(body["version"]) is not int or body["version"] < 0):
        errors["version"] = "Phiên bản sự kiện không hợp lệ."
    if errors:
        raise ApiError(400, "VALIDATION_ERROR", "Vui lòng kiểm tra thông tin sự kiện.", errors)
    return values


def admin_output(item):
    return {**event_output(item), "registrationOpen": item["registrationOpen"],
            "version": item.get("version", 0), "occupiedSeats": item["capacity"] - item["remainingSeats"]}


class AdminEventService:
    def __init__(self, repository):
        self.repository = repository

    def list_events(self):
        items = self.repository.list_events()
        items.sort(key=lambda item: (datetime.fromisoformat(item["dateTime"]), item["id"]))
        return {"events": [admin_output(item) for item in items]}

    def create(self, body):
        values = validate_event(body)
        if values["startsAtEpoch"] <= datetime.now(timezone.utc).timestamp():
            raise ApiError(400, "VALIDATION_ERROR", "Sự kiện mới phải diễn ra trong tương lai.", {"dateTime": "Hãy chọn thời gian trong tương lai."})
        event_id = "event-" + uuid.uuid4().hex
        item = {**values, "id": event_id, "PK": "EVENTS", "SK": f"EVENT#{event_id}",
                "entityType": "EVENT", "remainingSeats": values["capacity"], "version": 1}
        self.repository.insert_event(item)
        return admin_output(item)

    def current(self, event_id, version):
        EventService(self.repository).get_event(event_id)
        item = self.repository.get_event(event_id)
        if item is None:
            raise ApiError(404, "EVENT_NOT_FOUND", "Không tìm thấy sự kiện.")
        if item.get("version", 0) != version:
            raise ApiError(409, "EVENT_CHANGED", "Sự kiện đã thay đổi. Hãy tải lại danh sách trước khi sửa.")
        return item

    def update(self, event_id, body):
        values = validate_event(body, editing=True)
        current = self.current(event_id, body["version"])
        occupied = current["capacity"] - current["remainingSeats"]
        if values["capacity"] < occupied:
            raise ApiError(409, "CAPACITY_TOO_SMALL", f"Sức chứa không được nhỏ hơn {occupied} chỗ đã dùng.")
        item = {**current, **values, "remainingSeats": values["capacity"] - occupied, "version": body["version"] + 1}
        self.write(lambda: self.repository.replace_event(current, item))
        return admin_output(item)

    def delete(self, event_id, body):
        if not isinstance(body, dict) or set(body) != {"version"} or type(body["version"]) is not int or body["version"] < 0:
            raise ApiError(400, "VALIDATION_ERROR", "Cần phiên bản sự kiện để xóa.")
        current = self.current(event_id, body["version"])
        if current["remainingSeats"] != current["capacity"]:
            raise ApiError(409, "EVENT_HAS_REGISTRATIONS", "Sự kiện đã có chỗ được sử dụng nên không thể xóa. Bạn có thể đóng đăng ký.")
        self.write(lambda: self.repository.delete_event(current))
        return {"deleted": True}

    @staticmethod
    def write(operation):
        try:
            operation()
        except ClientError as exc:
            if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
                raise ApiError(409, "EVENT_CHANGED", "Sự kiện vừa thay đổi hoặc có người đăng ký. Hãy tải lại danh sách.") from None
            raise
