import re
from datetime import datetime, timezone



class ApiError(Exception):
    def __init__(self, status, code, message, details=None, headers=None):
        self.status = status
        self.code = code
        self.message = message
        self.details = details
        self.headers = headers or {}
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
        "not_open" if item.get("salesOpenAt") and datetime.fromisoformat(item["salesOpenAt"]) > now else
        "full" if item["remainingSeats"] <= 0 else "open"
    )
    return {**{key: item[key] for key in EVENT_FIELDS}, "salesOpenAt": item.get("salesOpenAt"), "status": status}


class EventService:
    def __init__(self, repository):
        self.repository = repository

    def list_events(self):
        items = [item for item in self.repository.list_events() if not item.get("deleting")]
        items.sort(key=lambda item: (datetime.fromisoformat(item["dateTime"]), item["id"]))
        return {"events": [event_output(item) for item in items]}

    def get_event(self, event_id):
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,79}", event_id or ""):
            raise ApiError(400, "VALIDATION_ERROR", "Mã sự kiện không hợp lệ.")
        item = self.repository.get_event(event_id)
        if item is None or item.get("deleting"):
            raise ApiError(404, "EVENT_NOT_FOUND", "Không tìm thấy sự kiện.")
        return event_output(item)
