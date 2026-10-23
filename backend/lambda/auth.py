"""Local admin authentication: scrypt passwords, opaque sessions, origin + CSRF checks."""
import hashlib
import hmac
import os
import re
import secrets
import time
from http.cookies import CookieError, SimpleCookie

from service import ApiError

SESSION_SECONDS = 8 * 60 * 60
COOKIE_NAME = "event_session"
SCRYPT_N, SCRYPT_R, SCRYPT_P = 2 ** 15, 8, 3


def password_digest(password, salt):
    # OWASP's 32 MiB scrypt profile; standard library, no extra runtime package.
    return hashlib.scrypt(password.encode("utf-8"), salt=bytes.fromhex(salt),
                          n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P, maxmem=64 * 1024 * 1024).hex()


def password_record(password):
    if not isinstance(password, str) or not 15 <= len(password) <= 128:
        raise ValueError("Mật khẩu cần từ 15 đến 128 ký tự.")
    salt = secrets.token_hex(16)
    return {"passwordSalt": salt, "passwordHash": password_digest(password, salt)}


def username_value(value):
    if not isinstance(value, str) or not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_.-]{2,63}", value.strip()):
        raise ApiError(400, "VALIDATION_ERROR", "Tên đăng nhập cần 3–64 ký tự chữ, số, dấu chấm, gạch ngang hoặc gạch dưới.")
    return value.strip().lower()


def request_headers(event):
    return {key.lower(): value for key, value in (event.get("headers") or {}).items()}


def verify_origin(event):
    allowed = {origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")}
    if request_headers(event).get("origin") not in allowed:
        raise ApiError(403, "FORBIDDEN_ORIGIN", "Nguồn gửi yêu cầu không được phép.")


def session_token(event, cookie_name=COOKIE_NAME):
    headers = request_headers(event)
    raw = "; ".join(event.get("cookies") or []) or headers.get("cookie", "")
    try:
        cookies = SimpleCookie()
        cookies.load(raw)
        value = cookies[cookie_name].value if cookie_name in cookies else ""
        return value if re.fullmatch(r"[a-zA-Z0-9_-]{43}", value) else ""
    except CookieError:
        return ""


def session_key(token):
    return "SESSION#" + hashlib.sha256(token.encode()).hexdigest()


def session_cookie(token, clear=False, cookie_name=COOKIE_NAME):
    # HTTP is permitted only for this explicitly local application. Enable Secure for HTTPS.
    secure = "; Secure" if os.getenv("COOKIE_SECURE", "false").lower() == "true" else ""
    return f"{cookie_name}={token}; Path=/; HttpOnly; SameSite=Strict; Max-Age={0 if clear else SESSION_SECONDS}{secure}"


class AuthService:
    def __init__(self, repository):
        self.repository = repository

    def login(self, event, body):
        verify_origin(event)
        if not isinstance(body, dict) or set(body) != {"username", "password"}:
            raise ApiError(400, "VALIDATION_ERROR", "Vui lòng nhập tên đăng nhập và mật khẩu.")
        username = username_value(body["username"])
        password = body["password"]
        if not isinstance(password, str) or not 1 <= len(password) <= 128:
            raise ApiError(400, "VALIDATION_ERROR", "Mật khẩu không hợp lệ.")
        now = int(time.time())
        bucket = now // 900
        source_ip = (event.get("requestContext", {}).get("http") or {}).get("sourceIp", "local")
        for kind, value, limit in [("ip", source_ip, 30), ("account", username, 10)]:
            digest = hashlib.sha256(value.encode()).hexdigest()
            self.repository.count_login(f"LOGIN#{kind}#{digest}#{bucket}", limit, (bucket + 1) * 900)
        account = self.repository.get("ADMIN#" + username)
        # Do comparable work even for an unknown account. Never reveal which field was wrong.
        salt = account["passwordSalt"] if account else "0" * 32
        actual = password_digest(password, salt)
        expected = account["passwordHash"] if account else "0" * 128
        if not hmac.compare_digest(actual, expected) or not account or account.get("role") != "admin":
            raise ApiError(401, "INVALID_CREDENTIALS", "Tên đăng nhập hoặc mật khẩu không đúng.")
        from session import SessionService
        return SessionService(self.repository).issue(event, {"username": username, "role": "admin"})

    def require_admin(self, event, mutation=False):
        from session import SessionService
        return SessionService(self.repository).require(event, role="admin", mutation=mutation)

    def logout(self, event):
        from session import SessionService
        self.require_admin(event, mutation=True)
        return SessionService(self.repository).logout(event)


def session_output(session):
    return {key: session[key] for key in ("username", "role", "csrfToken", "expiresAt")}
