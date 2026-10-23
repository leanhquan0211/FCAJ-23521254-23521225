"""Public buyer accounts and opaque sessions; identity always comes from the server."""
import hashlib
import hmac
import os
import re
import time
import uuid
from datetime import datetime, timezone

from botocore.exceptions import ClientError

from auth import password_digest, password_record, verify_origin
from service import ApiError

USER_FIELDS = ("userId", "fullName", "email", "role", "createdAt")


def normalize_email(value):
    if not isinstance(value, str):
        raise ApiError(400, "VALIDATION_ERROR", "Email không hợp lệ.", {"email": "Vui lòng nhập email hợp lệ."})
    value = value.strip().lower()
    if len(value) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
        raise ApiError(400, "VALIDATION_ERROR", "Email không hợp lệ.", {"email": "Vui lòng nhập email hợp lệ."})
    return value


def user_output(account):
    return {key: account[key] for key in USER_FIELDS}



class BuyerAuthService:
    def __init__(self, repository):
        self.repository = repository

    def rate_limit(self, event, action, email=None):
        window = int(os.getenv("USER_AUTH_WINDOW_SECONDS", "900"))
        if window <= 0:
            raise ValueError("USER_AUTH_WINDOW_SECONDS must be positive")
        now = int(time.time())
        bucket = now // window
        expires = (bucket + 1) * window
        ip = (event.get("requestContext", {}).get("http") or {}).get("sourceIp", "local")
        counters = [(f"{action}-ip", ip, int(os.getenv(
            "USER_SIGNUP_IP_LIMIT" if action == "signup" else "USER_LOGIN_IP_LIMIT", "120")))]
        if action == "login":
            counters.append(("login-account", email, int(os.getenv("USER_LOGIN_ACCOUNT_LIMIT", "10"))))
        for kind, value, limit in counters:
            if limit <= 0:
                raise ValueError("Buyer auth limits must be positive")
            digest = hashlib.sha256(value.encode()).hexdigest()
            try:
                self.repository.count_login(f"USER_AUTH#{kind}#{digest}#{bucket}", limit, expires)
            except ApiError as exc:
                if exc.code != "LOGIN_RATE_LIMITED":
                    raise
                raise ApiError(429, "AUTH_RATE_LIMITED", "Bạn đã thử quá nhiều lần. Vui lòng đợi rồi thử lại.",
                               headers={"Retry-After": str(max(1, expires - now))}) from None

    def register(self, event, body):
        verify_origin(event)
        if not isinstance(body, dict) or set(body) != {"fullName", "email", "password"}:
            raise ApiError(400, "VALIDATION_ERROR", "Cần họ tên, email và mật khẩu; không nhận trường quyền.")
        self.rate_limit(event, "signup")
        name = body["fullName"]
        if not isinstance(name, str) or not 1 <= len(name.strip()) <= 120:
            raise ApiError(400, "VALIDATION_ERROR", "Họ tên không hợp lệ.", {"fullName": "Nhập từ 1 đến 120 ký tự."})
        email = normalize_email(body["email"])
        try:
            record = password_record(body["password"])
        except ValueError as exc:
            raise ApiError(400, "VALIDATION_ERROR", str(exc), {"password": str(exc)}) from None
        account = {"userId": str(uuid.uuid4()), "fullName": name.strip(), "email": email,
                   "role": "user", "version": 1, "createdAt": datetime.now(timezone.utc).isoformat(), **record}
        try:
            self.repository.create_user(account)
        except ClientError as exc:
            if exc.response["Error"]["Code"] == "TransactionCanceledException":
                if self.repository.account_by_email(email):
                    raise ApiError(409, "EMAIL_ALREADY_EXISTS", "Email này đã có tài khoản.",
                                   {"email": "Hãy đăng nhập bằng tài khoản đã tạo."}) from None
            raise
        return {"user": user_output(account)}

    def login(self, event, body):
        verify_origin(event)
        if not isinstance(body, dict) or set(body) != {"email", "password"}:
            raise ApiError(400, "VALIDATION_ERROR", "Vui lòng nhập email và mật khẩu.")
        email = normalize_email(body["email"])
        self.rate_limit(event, "login", email)
        password = body["password"]
        if not isinstance(password, str) or not 1 <= len(password) <= 128:
            raise ApiError(400, "VALIDATION_ERROR", "Mật khẩu không hợp lệ.")
        account = self.repository.account_by_email(email)
        actual = password_digest(password, account["passwordSalt"] if account else "0" * 32)
        if not hmac.compare_digest(actual, account["passwordHash"] if account else "0" * 128) or not account or account.get("role") != "user" or account.get("deleting"):
            raise ApiError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.")
        from session import SessionService
        return SessionService(self.repository).issue(event, {"userId": account["userId"], "role": "user"})

    def require_user(self, event, mutation=False):
        from session import SessionService
        return SessionService(self.repository).require(event, role="user", mutation=mutation)

    def logout(self, event):
        from session import SessionService
        self.require_user(event, mutation=True)
        return SessionService(self.repository).logout(event)

    @staticmethod
    def output(session, account):
        return {"user": user_output(account), "csrfToken": session["csrfToken"], "expiresAt": session["expiresAt"]}
