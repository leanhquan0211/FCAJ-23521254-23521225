"""Admin HTTP checks on a dedicated local test table; no writes to the application table."""
import argparse
import hashlib
import http.cookiejar
import json
import secrets
import subprocess
import sys
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlparse
from urllib.request import HTTPCookieProcessor, Request, build_opener

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lambda"))
from auth import password_record
from auth_repository import AuthRepository
from configuration import local_table


class Client:
    def __init__(self, base):
        self.base = base
        self.jar = http.cookiejar.CookieJar()
        self.opener = build_opener(HTTPCookieProcessor(self.jar))
        self.csrf = ""

    def call(self, path, method="GET", body=None, expected=200, csrf=True, origin="http://localhost:5173"):
        headers = {"Origin": origin}
        if body is not None:
            headers["Content-Type"] = "application/json"
        if csrf and self.csrf:
            headers["X-CSRF-Token"] = self.csrf
        request = Request(self.base + path, data=json.dumps(body).encode() if body is not None else None,
                          method=method, headers=headers)
        try:
            result = self.opener.open(request, timeout=90)
        except HTTPError as exc:
            result = exc
        payload = json.loads(result.read().decode("utf-8"))
        assert result.code == expected, (path, result.code, payload)
        return payload, result.headers


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:3001")
    parser.add_argument("--endpoint-url", default="http://127.0.0.1:8000")
    parser.add_argument("--browser", action="store_true", help="Also run browser checks on an existing isolated debugging session")
    args = parser.parse_args()
    parsed = urlparse(args.base_url)
    if parsed.scheme != "http" or parsed.hostname not in {"127.0.0.1", "localhost"} or not parsed.port:
        parser.error("Only a localhost API is allowed")
    client = Client(args.base_url.rstrip("/"))
    health, _ = client.call("/health")
    table_name = health["database"]["table"]
    assert table_name.startswith("fcaj-event-workshop-local-test-"), "Use a separate test table; no writes sent"
    table = local_table(args.endpoint_url, table_name)
    username, password = "test-" + uuid.uuid4().hex[:12], secrets.token_urlsafe(32)
    AuthRepository(table).create("ADMIN#" + username, {"username": username, "role": "admin", **password_record(password)})
    fixture = {"title": "Kiểm thử quản trị", "category": "Công nghệ", "dateTime": "2099-01-01T09:00:00+07:00",
               "location": "Trực tuyến", "organizer": "Nhóm kiểm thử", "capacity": 5,
               "registrationOpen": True, "summary": "Sự kiện kiểm thử", "description": "Chỉ dùng trong bảng test."}
    for method, path in [("GET", "/admin/events"), ("POST", "/admin/events"), ("PUT", "/admin/events/example"), ("DELETE", "/admin/events/example")]:
        client.call(path, method, fixture if method != "GET" else None, 401)
    client.call("/admin/login", "POST", {"username": username, "password": "wrong"}, 401)
    session, headers = client.call("/admin/login", "POST", {"username": username, "password": password})
    assert "HttpOnly" in headers["Set-Cookie"] and "SameSite=Strict" in headers["Set-Cookie"]
    client.csrf = session["csrfToken"]
    client.call("/admin/session")
    client.call("/admin/events", "POST", fixture, 403, csrf=False)
    client.call("/admin/events", "POST", fixture, 403, origin="https://attacker.example")
    client.call("/admin/events", "POST", {**fixture, "remainingSeats": 999}, 400)
    created, _ = client.call("/admin/events", "POST", fixture, 201)
    event_id = created["id"]
    public, _ = client.call(f"/events/{event_id}")
    assert public["remainingSeats"] == 5 and "version" not in public
    closed, _ = client.call(f"/admin/events/{event_id}", "PUT", {**fixture, "registrationOpen": False, "version": created["version"]})
    client.call(f"/events/{event_id}/registrations", "POST", {"fullName": "Guest", "email": "guest@example.com"}, 409)
    client.call(f"/admin/events/{event_id}", "PUT", {**fixture, "version": created["version"]}, 409)
    reopened, _ = client.call(f"/admin/events/{event_id}", "PUT", {**fixture, "version": closed["version"]})
    registration, _ = client.call(f"/events/{event_id}/registrations", "POST", {"fullName": "Guest", "email": "guest@example.com"}, 201)
    resized, _ = client.call(f"/admin/events/{event_id}", "PUT", {**fixture, "capacity": 7, "version": reopened["version"]})
    assert resized["remainingSeats"] == 6 and resized["occupiedSeats"] == 1
    error, _ = client.call(f"/admin/events/{event_id}", "DELETE", {"version": resized["version"]}, 409)
    assert error["error"]["code"] == "EVENT_HAS_REGISTRATIONS"
    result, _ = client.call(f"/registrations/{registration['id']}")
    assert result["id"] == registration["id"]
    # Both writes use the same version; precisely one edit may win.
    def edit(index):
        other = Client(client.base)
        other.jar = client.jar
        other.opener = build_opener(HTTPCookieProcessor(other.jar))
        other.csrf = client.csrf
        try:
            other.call(f"/admin/events/{event_id}", "PUT", {**fixture, "title": f"Race {index}", "version": resized["version"]})
            return True
        except AssertionError as exc:
            assert exc.args[0][1] == 409, exc
            return False
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sum(pool.map(edit, range(2))) == 1
    disposable, _ = client.call("/admin/events", "POST", fixture, 201)
    client.call(f"/admin/events/{disposable['id']}", "DELETE", {"version": disposable["version"]})
    client.call(f"/events/{disposable['id']}", expected=404)
    cookie = next(iter(client.jar)).value
    client.call("/admin/logout", "POST")
    client.call("/admin/events", expected=401)
    assert "Item" not in table.get_item(Key={"PK": "SESSION#" + hashlib.sha256(cookie.encode()).hexdigest(), "SK": "METADATA"})
    if args.browser:
        print("PASS admin HTTP: permissions, cookies, CSRF, CRUD, concurrent edits and logout", flush=True)
        script = Path(__file__).resolve().parents[2] / "tests" / "frontend" / "check-admin-browser.mjs"
        subprocess.run(["node", str(script)], input=json.dumps({"username": username, "password": password}), text=True, check=True)
    print(json.dumps({"checks": "passed", "table": table_name, "admin": "login/session/CSRF/CRUD/logout", "concurrentEditWinners": 1}))


if __name__ == "__main__":
    main()
