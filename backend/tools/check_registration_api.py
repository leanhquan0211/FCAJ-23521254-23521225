"""Buyer v3 smoke checks; writes only to a dedicated localhost test table."""
import argparse
import json
import secrets
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

from check_admin_api import Client
from auth import password_record
from auth_repository import AuthRepository
from configuration import local_table


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:3002")
    parser.add_argument("--endpoint-url", default="http://127.0.0.1:8000")
    args = parser.parse_args()
    url = urlparse(args.base_url)
    if url.scheme != "http" or url.hostname not in {"localhost", "127.0.0.1"} or not url.port:
        parser.error("Only an explicit localhost API is allowed")
    admin = Client(args.base_url.rstrip("/"))
    health, _ = admin.call("/health")
    table_name = health["database"]["table"]
    assert table_name.startswith("fcaj-event-workshop-local-test-"), "No writes: test table required"
    assert health["apiContractVersion"] == "3.0"
    table = local_table(args.endpoint_url, table_name)
    password = secrets.token_urlsafe(24)
    username = "smoke-" + uuid.uuid4().hex[:10]
    AuthRepository(table).create("ADMIN#" + username, {"username": username, "role": "admin", **password_record(password)})
    session, _ = admin.call("/admin/login", "POST", {"username": username, "password": password})
    admin.csrf = session["csrfToken"]

    def buyer():
        client = Client(admin.base)
        email = f"buyer-{uuid.uuid4().hex}@example.com"
        credentials = {"email": email, "password": password}
        profile, headers = client.call("/auth/register", "POST", {"fullName": "HTTP Buyer", **credentials}, 201)
        assert "Set-Cookie" not in headers and profile["user"]["role"] == "user"
        client.call("/auth/session", expected=401)
        client.call("/auth/register", "POST", {"fullName": "Duplicate", **credentials}, 409)
        session, headers = client.call("/auth/login", "POST", credentials)
        client.csrf = session["csrfToken"]
        assert "HttpOnly" in headers["Set-Cookie"] and "SameSite=Strict" in headers["Set-Cookie"]
        assert client.call("/auth/session")[0]["user"]["userId"] == profile["user"]["userId"]
        client.call("/admin/events", expected=401)
        return client

    fixture = {"title": "Buyer API smoke", "category": "Công nghệ", "dateTime": "2099-06-01T09:00:00+07:00",
               "location": "Local", "organizer": "Test", "capacity": 1, "registrationOpen": True,
               "salesOpenAt": None, "summary": "Test only", "description": "Dedicated test table"}
    event, _ = admin.call("/admin/events", "POST", fixture, 201)
    path = f"/events/{event['id']}/registrations"
    guest, owner, other = Client(admin.base), buyer(), buyer()
    key = {"Idempotency-Key": str(uuid.uuid4())}
    guest.call(path, "POST", {}, 401, extra_headers=key)
    admin.call(path, "POST", {}, 401, extra_headers=key)
    owner.call(path, "POST", {}, 403, csrf=False, extra_headers=key)
    owner.call(path, "POST", {}, 403, origin="https://attacker.example", extra_headers=key)
    owner.call(path, "POST", {"email": "spoof@example.com"}, 400, extra_headers=key)
    owner.call(path, "POST", {}, 400)
    ticket, headers = owner.call(path, "POST", {"phone": " 0901234567 "}, 201, extra_headers=key)
    assert headers["Idempotent-Replayed"] == "false" and headers["Location"] == f"/registrations/{ticket['id']}"
    # Retry as if the first response had been lost, even though the last seat is now gone.
    replay, headers = owner.call(path, "POST", {"phone": "0901234567"}, extra_headers=key)
    assert replay == ticket and headers["Idempotent-Replayed"] == "true"
    owner.call(path, "POST", {"phone": "different"}, 409, extra_headers=key)
    duplicate, _ = owner.call(path, "POST", {}, 409, extra_headers={"Idempotency-Key": str(uuid.uuid4())})
    assert duplicate["error"]["details"]["registrationId"] == ticket["id"]
    assert owner.call(f"/registrations/{ticket['id']}")[0] == ticket
    other.call(f"/registrations/{ticket['id']}", expected=404)
    guest.call(f"/registrations/{ticket['id']}", expected=401)
    assert owner.call("/me/registrations")[0]["registrations"] == [ticket]
    assert other.call("/me/registrations")[0]["registrations"] == []
    legacy_id = str(uuid.uuid4())
    legacy = {name: value for name, value in ticket.items() if name != "userId"}
    table.put_item(Item={**legacy, "id": legacy_id, "PK": f"REGISTRATION#{legacy_id}", "SK": "METADATA"},
                   ConditionExpression="attribute_not_exists(PK)")
    owner.call(f"/registrations/{legacy_id}", expected=404)
    admin.call(f"/admin/events/{event['id']}", "PUT", {**fixture, "registrationOpen": False, "version": event["version"]})
    assert owner.call(path, "POST", {"phone": "0901234567"}, extra_headers=key)[0] == ticket

    opening = datetime.now(timezone.utc) + timedelta(seconds=5)
    scheduled, _ = admin.call("/admin/events", "POST", {**fixture, "capacity": 10, "salesOpenAt": opening.isoformat()}, 201)
    scheduled_path = f"/events/{scheduled['id']}/registrations"
    schedule_key = {"Idempotency-Key": str(uuid.uuid4())}
    assert other.call(f"/events/{scheduled['id']}")[0]["status"] == "not_open"
    not_open, _ = other.call(scheduled_path, "POST", {}, 409, extra_headers=schedule_key)
    assert not_open["error"]["code"] == "SALES_NOT_OPEN"
    time.sleep(max(0, opening.timestamp() - time.time()) + 0.1)
    other.call(scheduled_path, "POST", {}, 201, extra_headers=schedule_key)

    race, _ = admin.call("/admin/events", "POST", fixture, 201)
    buyers = [buyer() for _ in range(8)]
    def compete(client):
        try:
            client.call(f"/events/{race['id']}/registrations", "POST", {}, 201,
                        extra_headers={"Idempotency-Key": str(uuid.uuid4())})
            return "won"
        except AssertionError as exc:
            _, status, body = exc.args[0]
            assert status == 409 and body["error"]["code"] == "EVENT_FULL", exc
            return "full"
    with ThreadPoolExecutor(max_workers=8) as pool:
        outcomes = list(pool.map(compete, buyers))
    assert outcomes.count("won") == 1, outcomes
    assert owner.call(f"/events/{race['id']}")[0]["remainingSeats"] == 0
    owner.call("/auth/logout", "POST", {}, 403, csrf=False)
    owner.call("/auth/logout", "POST", {})
    owner.call("/auth/session", expected=401)
    print(json.dumps({"checks": "passed", "contract": "3.0", "table": table_name,
                      "lastSeatRequests": 8, "lastSeatWinners": 1, "ownerIsolation": True,
                      "schedule": True, "replayAfterFullAndClosed": True}))


if __name__ == "__main__":
    main()
