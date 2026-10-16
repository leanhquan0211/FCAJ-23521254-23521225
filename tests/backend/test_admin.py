import json
import sys
import time
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from botocore.exceptions import ClientError

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend" / "lambda"))
import app
from admin_events import AdminEventService, validate_event
from auth import AuthService, password_record, session_cookie, session_key
from auth_repository import AuthRepository
from repository import EventRepository
from service import ApiError


def event_item(**changes):
    return {"PK": "EVENTS", "SK": "EVENT#example", "entityType": "EVENT", "id": "example",
            "title": "Sự kiện mẫu", "category": "Công nghệ", "dateTime": "2099-01-01T09:00:00+07:00",
            "startsAtEpoch": 4070908800, "location": "Trực tuyến", "organizer": "Workshop",
            "capacity": 10, "remainingSeats": 8, "registrationOpen": True,
            "summary": "Tóm tắt", "description": "Nội dung", **changes}


def event_input(**changes):
    item = event_item()
    return {key: item[key] for key in ("title", "category", "dateTime", "location", "organizer", "capacity", "registrationOpen", "summary", "description")} | changes


class AuthTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.account = {"username": "admin", "role": "admin", **password_record("A long test password 123!")}

    def setUp(self):
        self.repo = Mock()
        self.service = AuthService(self.repo)
        self.token = "a" * 43
        self.session = {"username": "admin", "role": "admin", "csrfToken": "test-csrf", "expiresAt": int(time.time()) + 300}
        self.repo.get.side_effect = lambda key: self.account if key == "ADMIN#admin" else self.session
        self.event = {"headers": {"origin": "http://localhost:5173", "x-csrf-token": "test-csrf"}, "cookies": [f"event_admin_session={self.token}"]}

    def assert_code(self, code, function):
        with self.assertRaises(ApiError) as raised:
            function()
        self.assertEqual(raised.exception.code, code)

    def test_password_salted_and_length_checked(self):
        other = password_record("A long test password 123!")
        self.assertNotEqual(other["passwordHash"], self.account["passwordHash"])
        self.assertNotIn("password", other)
        for value in ["short", "x" * 129]:
            with self.assertRaises(ValueError):
                password_record(value)

    def test_login_rotates_session_and_returns_http_only_cookie(self):
        session, cookie = self.service.login(self.event, {"username": " ADMIN ", "password": "A long test password 123!"})
        self.assertEqual(session["role"], "admin")
        self.repo.delete.assert_called_once_with(session_key(self.token))
        key, stored = self.repo.create.call_args.args
        self.assertTrue(key.startswith("SESSION#"))
        self.assertNotIn(cookie.split(";")[0].split("=")[1], key)
        self.assertIn("HttpOnly", cookie)
        self.assertIn("SameSite=Strict", cookie)
        self.assertNotIn("passwordHash", stored)

    def test_login_unknown_and_wrong_password_share_error(self):
        for account in [None, self.account]:
            self.repo.get.side_effect = None
            self.repo.get.return_value = account
            self.assert_code("INVALID_CREDENTIALS", lambda: self.service.login(self.event, {"username": "admin", "password": "wrong"}))
        self.repo.create.assert_not_called()

    def test_login_rejects_untrusted_origin_missing_origin_and_role_injection(self):
        for headers in [{}, {"origin": "http://localhost:5173.attacker.com"}, {"origin": "null"}]:
            self.assert_code("FORBIDDEN_ORIGIN", lambda: self.service.login({"headers": headers}, {"username": "admin", "password": "anything"}))
        self.assert_code("VALIDATION_ERROR", lambda: self.service.login(self.event, {"username": "admin", "password": "anything", "role": "admin"}))

    def test_missing_and_forged_cookie_never_grant_admin(self):
        for event in [{}, {"headers": {"role": "admin", "authorization": "Bearer admin"}}, {"cookies": ["event_admin_session=admin"]}]:
            self.assert_code("AUTH_REQUIRED", lambda: self.service.require_admin(event))

    def test_expired_session_and_revoked_account(self):
        self.session["expiresAt"] = 1
        self.assert_code("AUTH_REQUIRED", lambda: self.service.require_admin(self.event))
        self.session["expiresAt"] = int(time.time()) + 300
        self.repo.get.side_effect = lambda key: {"role": "user"} if key == "ADMIN#admin" else self.session
        self.assert_code("FORBIDDEN", lambda: self.service.require_admin(self.event))

    def test_mutations_require_origin_and_matching_csrf(self):
        self.assertEqual(self.service.require_admin(self.event, mutation=True), self.session)
        for headers, code in [({"origin": "http://localhost:5173"}, "CSRF_FAILED"), ({"origin": "http://localhost:5173", "x-csrf-token": "fake"}, "CSRF_FAILED"), ({"origin": "http://localhost:5173", "x-csrf-token": "sai-mã"}, "CSRF_FAILED"), ({"x-csrf-token": "test-csrf"}, "FORBIDDEN_ORIGIN")]:
            self.assert_code(code, lambda: self.service.require_admin({**self.event, "headers": headers}, mutation=True))

    def test_logout_deletes_session_and_clears_cookie(self):
        cookie = self.service.logout(self.event)
        self.repo.delete.assert_called_once_with(session_key(self.token))
        self.assertIn("Max-Age=0", cookie)
        with patch.dict("os.environ", {"COOKIE_SECURE": "true"}):
            self.assertIn("; Secure", session_cookie(self.token))

    def test_rate_limit_is_atomic_and_maps_to_429(self):
        table = Mock()
        table.update_item.side_effect = ClientError({"Error": {"Code": "ConditionalCheckFailedException"}}, "UpdateItem")
        self.assert_code("LOGIN_RATE_LIMITED", lambda: AuthRepository(table).count_login("LOGIN#test", 10, 100))
        self.assertIn("attempts < :limit", table.update_item.call_args.kwargs["ConditionExpression"])


class AdminEventTests(unittest.TestCase):
    def setUp(self):
        self.repo = Mock()
        self.repo.get_event.return_value = event_item()
        self.service = AdminEventService(self.repo)

    def assert_code(self, code, function):
        with self.assertRaises(ApiError) as raised:
            function()
        self.assertEqual(raised.exception.code, code)

    def test_create_uses_server_id_and_all_seats_available(self):
        created = self.service.create(event_input())
        self.assertTrue(created["id"].startswith("event-"))
        self.assertEqual(created["remainingSeats"], created["capacity"])
        self.assertEqual(created["version"], 1)
        self.assertNotIn("PK", created)

    def test_validate_rejects_mass_assignment_wrong_types_and_naive_time(self):
        for change in [{"remainingSeats": 100}, {"role": "admin"}, {"capacity": True}, {"capacity": 2.5}, {"capacity": 0}, {"registrationOpen": "true"}, {"category": []}, {"dateTime": "2099-01-01T09:00:00"}, {"description": ""}]:
            self.assert_code("VALIDATION_ERROR", lambda: validate_event(event_input(**change)))

    def test_new_event_cannot_start_in_past(self):
        self.assert_code("VALIDATION_ERROR", lambda: self.service.create(event_input(dateTime="2000-01-01T09:00:00+07:00")))

    def test_update_preserves_taken_seats_and_allows_closing(self):
        updated = self.service.update("example", event_input(capacity=20, registrationOpen=False, version=0))
        self.assertEqual(updated["remainingSeats"], 18)
        self.assertFalse(updated["registrationOpen"])
        self.assertEqual(updated["status"], "closed")

    def test_capacity_cannot_fall_below_occupied(self):
        self.assert_code("CAPACITY_TOO_SMALL", lambda: self.service.update("example", event_input(capacity=1, version=0)))
        self.repo.replace_event.assert_not_called()

    def test_stale_version_and_concurrent_registration_are_rejected(self):
        self.assert_code("EVENT_CHANGED", lambda: self.service.update("example", event_input(version=3)))
        self.repo.replace_event.side_effect = ClientError({"Error": {"Code": "ConditionalCheckFailedException"}}, "PutItem")
        self.assert_code("EVENT_CHANGED", lambda: self.service.update("example", event_input(version=0)))

    def test_delete_blocked_when_any_seat_used(self):
        self.assert_code("EVENT_HAS_REGISTRATIONS", lambda: self.service.delete("example", {"version": 0}))
        self.repo.delete_event.assert_not_called()

    def test_delete_only_empty_event_and_guards_concurrent_registration(self):
        current = event_item(remainingSeats=10)
        self.repo.get_event.return_value = current
        self.assertEqual(self.service.delete("example", {"version": 0}), {"deleted": True})
        table = Mock()
        EventRepository(table).delete_event(current)
        condition = table.delete_item.call_args.kwargs
        self.assertIn("remainingSeats = :seats", condition["ConditionExpression"])
        self.assertEqual(condition["ExpressionAttributeValues"][":seats"], 10)
        self.repo.delete_event.side_effect = ClientError({"Error": {"Code": "ConditionalCheckFailedException"}}, "DeleteItem")
        self.assert_code("EVENT_CHANGED", lambda: self.service.delete("example", {"version": 0}))


class AdminHandlerTests(unittest.TestCase):
    def test_every_admin_data_route_requires_server_session(self):
        for route in ["GET /admin/events", "POST /admin/events", "PUT /admin/events/{eventId}", "DELETE /admin/events/{eventId}", "GET /admin/session", "POST /admin/logout"]:
            with self.subTest(route=route), patch("app.local_table"):
                result = app.lambda_handler({"routeKey": route, "headers": {"role": "admin"}}, None)
                self.assertEqual(result["statusCode"], 401)

    def test_login_uses_http_api_v2_cookies_and_excludes_hash(self):
        session = {"username": "admin", "role": "admin", "csrfToken": "csrf", "expiresAt": 123, "passwordHash": "private"}
        event = {"routeKey": "POST /admin/login", "headers": {"content-type": "application/json"}, "body": "{}"}
        with patch("app.local_table"), patch("app.AuthService") as auth:
            auth.return_value.login.return_value = session, "event_admin_session=opaque; HttpOnly"
            result = app.lambda_handler(event, None)
        self.assertEqual(result["statusCode"], 200)
        self.assertIn("HttpOnly", result["cookies"][0])
        self.assertNotIn("passwordHash", json.loads(result["body"]))


if __name__ == "__main__":
    unittest.main()
