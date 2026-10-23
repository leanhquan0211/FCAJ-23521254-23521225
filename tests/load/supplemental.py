"""Small ownership/idempotency assertions outside the measured load window."""
import uuid
from config import PROFILE


def verify(prepared):
    checks = {}
    ticket_checked = False
    paths = PROFILE["paths"]
    for index, (client, session) in enumerate(zip(prepared["clients"], prepared["sessions"])):
        data, _ = client.expect(paths["myTickets"])
        mine = [ticket for ticket in data.get("registrations", []) if ticket.get("eventId") == prepared["eventId"]]
        checks[f"owner_list_{index}"] = all(ticket.get("userId") == session["userId"] for ticket in data.get("registrations", [])) and len(mine) <= 1
        if not mine:
            continue
        ticket = mine[0]
        ticket_checked = True
        detail, _ = client.expect(paths["ticket"].format(registrationId=ticket["id"]))
        checks[f"owner_detail_{index}"] = detail == ticket
        path = paths["purchase"].format(eventId=prepared["eventId"])
        headers = {PROFILE["csrfHeader"]: session["csrfToken"], PROFILE["idempotencyHeader"]: session["idempotencyKey"]}
        replay, replay_body, replay_headers = client.call(path, "POST", {}, headers)
        checks[f"replay_{index}"] = replay == 200 and replay_body == ticket and replay_headers.get(PROFILE["replayHeader"], "").lower() == "true"
        status, body, _ = client.call(path, "POST", {"phone": "changed"}, headers)
        checks[f"key_reused_{index}"] = status == 409 and isinstance(body, dict) and body.get("error", {}).get("code") == "IDEMPOTENCY_KEY_REUSED"
        other_headers = {**headers, PROFILE["idempotencyHeader"]: str(uuid.uuid4())}
        status, body, _ = client.call(path, "POST", {}, other_headers)
        checks[f"duplicate_{index}"] = status == 409 and isinstance(body, dict) and body.get("error", {}).get("code") == "DUPLICATE_REGISTRATION"
        if len(prepared["clients"]) > 1:
            other = prepared["clients"][(index + 1) % len(prepared["clients"])]
            status, body, _ = other.call(paths["ticket"].format(registrationId=ticket["id"]))
            checks[f"ownership_{index}"] = status == 404 and isinstance(body, dict) and body.get("error", {}).get("code") == "REGISTRATION_NOT_FOUND"
        # A small supporting check, never another load test or 100 replay requests.
        break
    return {"status": "not_run" if not ticket_checked else "passed" if checks and all(checks.values()) else "failed", "checks": checks,
            "skipped": ["cross_account_ownership"] if len(prepared["clients"]) < 2 else [],
            "measured": False, "note": "Các request bổ trợ không tính vào biểu đồ/latency của khoảng tải."}
