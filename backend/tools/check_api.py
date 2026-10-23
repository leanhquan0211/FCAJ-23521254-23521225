"""Read-only contract smoke check against an already running SAM local API."""
import argparse
import hashlib
import json
from datetime import datetime
from urllib.error import HTTPError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


def request(base, path, expected=200, origin=None, method="GET", preflight_method="GET"):
    headers = {"Origin": origin} if origin else {}
    if method == "OPTIONS":
        headers["Access-Control-Request-Method"] = preflight_method
        headers["Access-Control-Request-Headers"] = "Content-Type,X-CSRF-Token,Idempotency-Key"
    try:
        result = urlopen(Request(base + path, headers=headers, method=method), timeout=75)
    except HTTPError as exc:
        result = exc
    raw = result.read().decode("utf-8")
    body = json.loads(raw) if raw else None
    assert result.code == expected, (path, result.code, body)
    return body, result.headers


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:3001")
    args = parser.parse_args()
    parsed = urlparse(args.base_url)
    if parsed.scheme != "http" or parsed.hostname not in {"localhost", "127.0.0.1"} or not parsed.port:
        parser.error("Only an explicit localhost HTTP API is allowed")
    base = args.base_url.rstrip("/")
    health, _ = request(base, "/health")
    assert health["status"] == "ok" and health["database"]["status"] == "ready"
    assert health["apiContractVersion"] == "3.0"
    assert datetime.fromisoformat(health["serverTime"]).utcoffset() is not None
    result, headers = request(base, "/events", origin="http://localhost:5173")
    assert headers["Access-Control-Allow-Origin"] == "http://localhost:5173"
    events = result["events"]
    assert isinstance(events, list)
    fields = {"id", "title", "category", "dateTime", "salesOpenAt", "location", "organizer", "capacity", "remainingSeats", "summary", "description", "status"}
    for item in events:
        assert set(item) == fields
        assert isinstance(item["capacity"], int) and isinstance(item["remainingSeats"], int)
        assert 0 <= item["remainingSeats"] <= item["capacity"]
        assert datetime.fromisoformat(item["dateTime"]).utcoffset() is not None
        assert item["status"] in {"open", "full", "ended", "closed", "not_open"}
    if events:
        sample = events[0]
        detail, _ = request(base, f"/events/{sample['id']}")
        assert detail == sample
    for path, status, code in [("/events/no-such-event", 404, "EVENT_NOT_FOUND"), ("/events/bad_id", 400, "VALIDATION_ERROR"), ("/events?q=unsupported", 400, "VALIDATION_ERROR")]:
        body, _ = request(base, path, status)
        assert body["error"]["code"] == code and body["error"]["requestId"]
        assert "Traceback" not in json.dumps(body)
    _, denied_headers = request(base, "/events", origin="https://untrusted.example")
    assert "Access-Control-Allow-Origin" not in denied_headers
    _, preflight = request(base, "/events", origin="http://localhost:5173", method="OPTIONS")
    assert preflight["Access-Control-Allow-Origin"] == "http://localhost:5173"
    _, booking_preflight = request(base, "/events/http-open/registrations", origin="http://localhost:5173", method="OPTIONS", preflight_method="POST")
    assert "idempotency-key" in booking_preflight["Access-Control-Allow-Headers"].lower()
    assert "idempotent-replayed" in headers["Access-Control-Expose-Headers"].lower()
    print(json.dumps({"checks": "passed", "events": len(events), "statuses": sorted({item["status"] for item in events}), "fingerprint": hashlib.sha256(json.dumps(events, sort_keys=True, ensure_ascii=False).encode()).hexdigest()}))


if __name__ == "__main__":
    main()
