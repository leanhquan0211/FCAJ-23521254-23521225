"""Write smoke checks, allowed only when SAM points to a dedicated local test table."""
import argparse
import json
import uuid
from concurrent.futures import ThreadPoolExecutor
from urllib.error import HTTPError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


def call(base, path, method="GET", body=None, expected=None, raw=None, headers=None):
    data = json.dumps(body).encode() if body is not None else raw
    request_headers = {"Content-Type": "application/json", **(headers or {})}
    try:
        result = urlopen(Request(base + path, data=data, method=method, headers=request_headers), timeout=90)
    except HTTPError as exc:
        result = exc
    payload = json.loads(result.read().decode())
    if expected is not None:
        assert result.code == expected, (path, result.code, payload)
    return result.code, payload, result.headers


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:3002")
    args = parser.parse_args()
    base = args.base_url.rstrip("/")
    parsed = urlparse(base)
    if parsed.scheme != "http" or parsed.hostname not in {"localhost", "127.0.0.1"} or not parsed.port:
        parser.error("Only a localhost API is allowed")
    _, health, _ = call(base, "/health", expected=200)
    assert health["database"]["table"].startswith("fcaj-event-workshop-local-test-"), "Use a dedicated test table; no writes sent"
    email = f"http-{uuid.uuid4().hex}@example.com"
    body = {"fullName": "  HTTP Test  ", "email": f" {email.upper()} ", "phone": " 0901234567 "}
    _, before, _ = call(base, "/events/http-open", expected=200)
    _, registration, headers = call(base, "/events/http-open/registrations", "POST", body, 201)
    assert uuid.UUID(registration["id"]).version == 4
    assert headers["Location"] == f"/registrations/{registration['id']}"
    assert set(registration) == {"id", "eventId", "fullName", "email", "phone", "createdAt"}
    assert registration["email"] == email and registration["fullName"] == "HTTP Test" and registration["phone"] == "0901234567"
    _, after, _ = call(base, "/events/http-open", expected=200)
    assert after["remainingSeats"] == before["remainingSeats"] - 1
    _, saved, _ = call(base, f"/registrations/{registration['id']}", expected=200)
    assert saved == registration
    _, duplicate, _ = call(base, "/events/http-open/registrations", "POST", {**body, "email": email}, 409)
    assert duplicate["error"]["code"] == "DUPLICATE_REGISTRATION"
    _, unchanged, _ = call(base, "/events/http-open", expected=200)
    assert unchanged["remainingSeats"] == after["remainingSeats"]
    call(base, "/events/http-other/registrations", "POST", body, 201)
    for event_id, expected, code in [("http-full", 409, "EVENT_FULL"), ("http-ended", 409, "REGISTRATION_CLOSED"), ("http-closed", 409, "REGISTRATION_CLOSED"), ("no-such-event", 404, "EVENT_NOT_FOUND"), ("bad_id", 400, "VALIDATION_ERROR")]:
        _, error, _ = call(base, f"/events/{event_id}/registrations", "POST", body, expected)
        assert error["error"]["code"] == code
    for invalid in [{"fullName": "", "email": "bad"}, {**body, "phone": 123}, {**body, "remainingSeats": 1}]:
        _, error, _ = call(base, "/events/http-open/registrations", "POST", invalid, 400)
        assert error["error"]["code"] == "VALIDATION_ERROR"
    call(base, "/events/http-open/registrations", "POST", raw=b"{", expected=400)
    call(base, "/events/http-open/registrations", "POST", raw=b"{}", headers={"Content-Type": "text/plain"}, expected=415)
    call(base, "/registrations/not-a-uuid", expected=400)
    call(base, f"/registrations/{uuid.uuid4()}", expected=404)
    # Reach exactly one remaining seat in a test-only event, then send concurrent HTTP requests.
    _, other, _ = call(base, "/events/http-other", expected=200)
    for _ in range(other["remainingSeats"] - 1):
        call(base, "/events/http-other/registrations", "POST", {"fullName": "Fill Test", "email": f"{uuid.uuid4().hex}@example.com"}, 201)
    with ThreadPoolExecutor(max_workers=6) as pool:
        outcomes = list(pool.map(lambda _: call(base, "/events/http-other/registrations", "POST", {"fullName": "Race Test", "email": f"{uuid.uuid4().hex}@example.com"}), range(6)))
    assert sum(status == 201 for status, _, _ in outcomes) == 1, outcomes
    assert all(status == 201 or (status == 409 and payload["error"]["code"] == "EVENT_FULL") for status, payload, _ in outcomes)
    _, exhausted, _ = call(base, "/events/http-other", expected=200)
    assert exhausted["remainingSeats"] == 0
    print(json.dumps({"checks": "passed", "registrationId": registration["id"], "lastSeatWinners": 1, "table": health["database"]["table"]}))


if __name__ == "__main__":
    main()
