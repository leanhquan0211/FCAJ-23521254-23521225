"""Read-only reconciliation scoped to one fresh event and the run's accounts/keys."""
import time
from config import LabError, PROFILE, guard_table
from fixtures import app_modules


def inspect_items(items, event_id, capacity, sessions, receipt_ids):
    model = PROFILE["model"]
    event = next((i for i in items if i.get("PK") == model["eventPK"] and i.get("SK") == model["eventSKPrefix"] + event_id), None)
    tickets = [i for i in items if i.get("entityType") == model["ticketType"] and i.get("eventId") == event_id]
    users = {s["userId"] for s in sessions}
    ticket_ids = {i.get("id") for i in tickets}
    references = [i for i in items if i.get("PK") in {model["userPKPrefix"] + u for u in users}
                  and i.get("SK") == model["referenceSKPrefix"] + event_id]
    keys = {s["userId"]: (model["userPKPrefix"] + s["userId"], model["idempotencySKPrefix"] + s["idempotencyKey"]) for s in sessions}
    idem = [i for i in items if i.get("PK") in {model["userPKPrefix"] + u for u in users}
            and str(i.get("SK", "")).startswith(model["idempotencySKPrefix"])]
    owners = [i.get("userId") for i in tickets]
    remaining = event.get("remainingSeats") if event else None
    expected_refs = {(model["userPKPrefix"] + str(i.get("userId")), i.get("id")) for i in tickets}
    actual_refs = {(i.get("PK"), i.get("registrationId")) for i in references}
    ticket_by_id = {i.get("id"): i for i in tickets}
    fields = ("id", "eventId", "userId", "fullName", "email", "phone", "createdAt")
    def matches_snapshot(item):
        snapshot = item.get("registration")
        ticket = ticket_by_id.get(item.get("registrationId"))
        return (isinstance(snapshot, dict) and ticket is not None
                and all(field in snapshot and snapshot[field] == ticket.get(field) for field in fields)
                and (item.get("PK"), item.get("SK")) == keys.get(ticket.get("userId")))
    checks = {
        "eventExists": event is not None,
        "capacityPreserved": bool(event) and event.get("capacity") == capacity,
        "seatsInRange": remaining is not None and 0 <= remaining <= capacity,
        "seatCountMatchesTickets": remaining is not None and capacity - remaining == len(tickets),
        "oneTicketPerUser": len(owners) == len(set(owners)) and set(owners) <= users,
        "uniqueTicketIds": None not in ticket_ids and len(ticket_ids) == len(tickets),
        "referencesMatch": len(references) == len(tickets) and actual_refs == expected_refs,
        "idempotencyMatches": len(idem) == len(tickets) and {i.get("registrationId") for i in idem} == ticket_ids
                              and all(matches_snapshot(i) for i in idem),
        "responsesPersisted": set(receipt_ids) <= ticket_ids,
    }
    return {"status": "passed" if all(checks.values()) else "failed", "checks": checks,
            "remainingSeats": int(remaining) if remaining is not None else None,
            "tickets": len(tickets), "references": len(references), "idempotencyRecords": len(idem)}


def reconcile(settings, prepared, capacity, receipt_ids):
    table_name = guard_table(prepared["table"])
    local_table, _, _ = app_modules(settings)
    table = local_table(settings.db_endpoint, table_name)
    previous = None
    # Two identical, consistently-read snapshots; late writes after a forced stop remain a stated limitation.
    for _ in range(4):
        items, params = [], {"ConsistentRead": True}
        while True:
            if time.monotonic() > getattr(settings, "deadline", float("inf")) or len(items) > 100000:
                raise LabError("AUDIT_LIMIT", "Đã tới giới hạn đọc đối chiếu; chưa thể kết luận.")
            page = table.scan(**params)
            items.extend(page.get("Items", []))
            if "LastEvaluatedKey" not in page: break
            params["ExclusiveStartKey"] = page["LastEvaluatedKey"]
        result = inspect_items(items, prepared["eventId"], capacity, prepared["sessions"], receipt_ids)
        if result == previous: return result
        previous = result
        time.sleep(1)
    return {**previous, "status": "inconclusive", "reason": "DATABASE_STILL_CHANGING"}
