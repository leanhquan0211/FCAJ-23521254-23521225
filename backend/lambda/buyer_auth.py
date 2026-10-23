"""Public buyer accounts and opaque sessions; identity always comes from the server."""
import hashlib
import hmac
import os
import re
import secrets
import time
import uuid
from datetime import datetime, timezone

from botocore.exceptions import ClientError

from auth import (SESSION_SECONDS, password_digest, password_record, request_headers,
                  session_cookie, session_token, verify_origin)
from service import ApiError

COOKIE_NAME = "event_user_session"
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


def buyer_session_key(token):
    return "USER_SESSION#" + hashlib.sha256(token.encode()).hexdigest()


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
                   "role": "user", "createdAt": datetime.now(timezone.utc).isoformat(), **record}
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
        if not hmac.compare_digest(actual, account["passwordHash"] if account else "0" * 128) or not account or account.get("role") != "user":
            raise ApiError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.")
        previous = session_token(event, COOKIE_NAME)
        if previous:
            self.repository.delete(buyer_session_key(previous))
        token = secrets.token_urlsafe(32)
        session = {"userId": account["userId"], "csrfToken": secrets.token_urlsafe(32),
                   "expiresAt": int(time.time()) + SESSION_SECONDS}
        self.repository.create(buyer_session_key(token), session)
        return self.output(session, account), session_cookie(token, cookie_name=COOKIE_NAME)

    def require_user(self, event, mutation=False):
        token = session_token(event, COOKIE_NAME)
        session = self.repository.get(buyer_session_key(token)) if token else None
        if not session or int(session["expiresAt"]) <= int(time.time()):
            raise ApiError(401, "AUTH_REQUIRED", "Vui lòng đăng nhập để xem hoặc đặt vé.")
        account = self.repository.user(session["userId"])
        if not account or account.get("role") != "user":
            raise ApiError(403, "FORBIDDEN", "Tài khoản không còn quyền người tham gia.")
        if mutation:
            verify_origin(event)
            csrf = request_headers(event).get("x-csrf-token", "")
            if not hmac.compare_digest(csrf.encode(), session["csrfToken"].encode()):
                raise ApiError(403, "CSRF_FAILED", "Phiên thao tác không hợp lệ. Vui lòng tải lại trang.")
        return self.output(session, account)

    def logout(self, event):
        self.require_user(event, mutation=True)
        self.repository.delete(buyer_session_key(session_token(event, COOKIE_NAME)))
        return session_cookie("", clear=True, cookie_name=COOKIE_NAME)

    @staticmethod
    def output(session, account):
        return {"user": user_output(account), "csrfToken": session["csrfToken"], "expiresAt": session["expiresAt"]}
