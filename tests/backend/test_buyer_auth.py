import sys
import time
import unittest
import uuid
from pathlib import Path
from unittest.mock import Mock, patch

from botocore.exceptions import ClientError

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend" / "lambda"))
from auth import password_record
from buyer_auth import BuyerAuthService
from session import shared_key
from service import ApiError


class BuyerAuthTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.password = "A long test-only password 2026!"
        cls.account = {"userId": str(uuid.uuid4()), "fullName": "Buyer", "email": "buyer@example.com",
                       "role": "user", "createdAt": "2026-10-23T00:00:00Z", **password_record(cls.password)}

    def setUp(self):
        self.repo = Mock()
        self.service = BuyerAuthService(self.repo)
        buyer_repository = patch("session.BuyerRepository", return_value=self.repo)
        buyer_repository.start()
        self.addCleanup(buyer_repository.stop)
        self.repo.account_by_email.return_value = self.account
        self.token = "a" * 43
        self.session = {"userId": self.account["userId"], "role": "user", "csrfToken": "buyer-csrf", "expiresAt": int(time.time()) + 300}
        self.repo.get.return_value = self.session
        self.repo.user.return_value = self.account
        self.event = {"headers": {"origin": "http://127.0.0.1:5173", "x-csrf-token": "buyer-csrf"},
                      "cookies": [f"event_session={self.token}"]}

    def assert_code(self, code, function):
        with self.assertRaises(ApiError) as caught:
            function()
        self.assertEqual(caught.exception.code, code)
        return caught.exception

    def test_signup_normalizes_email_and_does_not_auto_login(self):
        result = self.service.register(self.event, {"fullName": " Buyer ", "email": " BUYER@Example.com ", "password": self.password})
        self.assertEqual(result["user"]["role"], "user")
        self.assertEqual(result["user"]["email"], "buyer@example.com")
        self.assertNotIn("passwordHash", result["user"])
        stored = self.repo.create_user.call_args.args[0]
        self.assertNotEqual(stored["passwordHash"], self.password)
        self.assertEqual(stored["fullName"], "Buyer")
        self.repo.create.assert_not_called()

    def test_signup_rejects_role_and_user_id_injection(self):
        body = {"fullName": "Buyer", "email": "buyer@example.com", "password": self.password}
        for field in ["role", "userId", "passwordHash"]:
            self.assert_code("VALIDATION_ERROR", lambda: self.service.register(self.event, {**body, field: "admin"}))
        self.repo.create_user.assert_not_called()

    def test_signup_validation_and_email_duplicate(self):
        body = {"fullName": "Buyer", "email": "buyer@example.com", "password": self.password}
        for changes in [{"fullName": " "}, {"email": "invalid"}, {"password": "short"}, {"password": None}]:
            self.assert_code("VALIDATION_ERROR", lambda: self.service.register(self.event, {**body, **changes}))
        self.repo.create_user.side_effect = ClientError({"Error": {"Code": "TransactionCanceledException"}}, "TransactWriteItems")
        self.assert_code("EMAIL_ALREADY_EXISTS", lambda: self.service.register(self.event, body))

    def test_login_uses_shared_cookie_and_rotates(self):
        result, cookie = self.service.login(self.event, {"email": " BUYER@example.com ", "password": self.password})
        self.assertEqual(result["user"]["userId"], self.account["userId"])
        self.assertNotIn("passwordHash", str(result))
        self.assertIn("event_session=", cookie)
        self.assertIn("HttpOnly", cookie)
        self.assertIn("SameSite=Strict", cookie)
        self.repo.delete.assert_called_once_with(shared_key(self.token))
        key, value = self.repo.create.call_args.args
        self.assertTrue(key.startswith("APP_SESSION#"))
        self.assertEqual(value["userId"], self.account["userId"])

    def test_login_wrong_password_and_unknown_account_same_error(self):
        for account in [None, self.account]:
            self.repo.account_by_email.return_value = account
            self.assert_code("INVALID_CREDENTIALS", lambda: self.service.login(self.event, {"email": "buyer@example.com", "password": "incorrect"}))

    def test_admin_cookie_cannot_be_used_as_buyer_session(self):
        event = {**self.event, "cookies": [f"event_admin_session={self.token}"]}
        self.assert_code("AUTH_REQUIRED", lambda: self.service.require_user(event))
        self.repo.get.assert_not_called()

    def test_expired_and_revoked_accounts(self):
        self.repo.get.return_value = {**self.session, "expiresAt": 1}
        self.assert_code("AUTH_REQUIRED", lambda: self.service.require_user(self.event))
        self.repo.get.return_value = self.session
        for account in [None, {**self.account, "role": "admin"}]:
            self.repo.user.return_value = account
            self.assert_code("FORBIDDEN", lambda: self.service.require_user(self.event))

    def test_mutations_require_origin_and_csrf(self):
        for headers, code in [({"origin": "http://127.0.0.1:5173"}, "CSRF_FAILED"),
                              ({"origin": "https://attacker.example", "x-csrf-token": "buyer-csrf"}, "FORBIDDEN_ORIGIN")]:
            self.assert_code(code, lambda: self.service.require_user({**self.event, "headers": headers}, mutation=True))
        self.assertEqual(self.service.require_user(self.event, mutation=True)["user"]["userId"], self.account["userId"])

    def test_rate_limit_is_not_shared_with_admin_and_returns_retry_after(self):
        self.service.rate_limit(self.event, "login", self.account["email"])
        self.assertTrue(all(call.args[0].startswith("USER_AUTH#") for call in self.repo.count_login.call_args_list))
        self.repo.count_login.side_effect = ApiError(429, "LOGIN_RATE_LIMITED", "Limit")
        error = self.assert_code("AUTH_RATE_LIMITED", lambda: self.service.rate_limit(self.event, "signup"))
        self.assertGreater(int(error.headers["Retry-After"]), 0)

    def test_logout_deletes_shared_session_and_clears_cookie(self):
        cookie = self.service.logout(self.event)
        self.repo.delete.assert_called_once_with(shared_key(self.token))
        self.assertIn("event_session=", cookie)
        self.assertIn("Max-Age=0", cookie)


if __name__ == "__main__":
    unittest.main()
