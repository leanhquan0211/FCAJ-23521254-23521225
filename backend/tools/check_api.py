"""Read-only contract smoke check against an already running SAM local API."""
import argparse
import hashlib
import json
from datetime import datetime
from urllib.error import HTTPError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


def request(base, path, expected=200, origin=None, method="GET"):
    headers = {"Origin": origin} if origin else {}
    if method == "OPTIONS":
        headers["Access-Control-Request-Method"] = "GET"
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
    result, headers = request(base, "/events", origin="http://localhost:5173")
    assert headers["Access-Control-Allow-Origin"] == "http://localhost:5173"
    events = result["events"]
    assert len(events) >= 8
    assert {"open", "full", "ended"} <= {item["status"] for item in events}
    fields = {"id", "title", "category", "dateTime", "location", "organizer", "capacity", "remainingSeats", "summary", "description", "status"}
    for item in events:
        assert set(item) == fields
        assert isinstance(item["capacity"], int) and isinstance(item["remainingSeats"], int)
        assert 0 <= item["remainingSeats"] <= item["capacity"]
        assert datetime.fromisoformat(item["dateTime"]).utcoffset() is not None
    sample = next(item for item in events if item["id"] == "thiet-ke-de-dung")
    detail, _ = request(base, "/events/thiet-ke-de-dung")
    assert detail == sample
    for path, status, code in [("/events/no-such-event", 404, "EVENT_NOT_FOUND"), ("/events/bad_id", 400, "VALIDATION_ERROR"), ("/events?q=unsupported", 400, "VALIDATION_ERROR")]:
        body, _ = request(base, path, status)
        assert body["error"]["code"] == code and body["error"]["requestId"]
        assert "Traceback" not in json.dumps(body)
    _, denied_headers = request(base, "/events", origin="https://untrusted.example")
    assert "Access-Control-Allow-Origin" not in denied_headers
    _, preflight = request(base, "/events", origin="http://localhost:5173", method="OPTIONS")
    assert preflight["Access-Control-Allow-Origin"] == "http://localhost:5173"
    print(json.dumps({"checks": "passed", "events": len(events), "statuses": sorted({item["status"] for item in events}), "fingerprint": hashlib.sha256(json.dumps(events, sort_keys=True, ensure_ascii=False).encode()).hexdigest()}))


if __name__ == "__main__":
    main()
