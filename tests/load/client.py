"""One real cookie jar per account. No API bodies or credentials are logged."""
import http.cookiejar
import json
import time
import urllib.error
import urllib.request

from config import LabError, PROFILE


class Client:
    def __init__(self, settings):
        self.settings = settings
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), urllib.request.HTTPCookieProcessor(self.jar), NoRedirect())

    def call(self, path, method="GET", body=None, headers=None):
        remaining = getattr(self.settings, "deadline", time.monotonic() + 75) - time.monotonic()
        if remaining <= 0:
            raise LabError("RUN_TIMEOUT", "Đã tới giới hạn tổng thời gian runner.")
        request_headers = {"Origin": self.settings.origin, **(headers or {})}
        if body is not None: request_headers["Content-Type"] = "application/json"
        req = urllib.request.Request(self.settings.api_url + path,
                                     data=json.dumps(body).encode() if body is not None else None,
                                     method=method, headers=request_headers)
        try:
            response = self.opener.open(req, timeout=min(75, remaining))
        except urllib.error.HTTPError as exc:
            response = exc
        except (urllib.error.URLError, TimeoutError, OSError):
            raise LabError("API_UNAVAILABLE", "Không kết nối được API test; không chuyển sang mock.") from None
        with response:
            raw = response.read(1024 * 1024 + 1)
            if len(raw) > 1024 * 1024:
                raise LabError("INVALID_RESPONSE", "Response vượt giới hạn đọc 1 MiB.")
            try: data = json.loads(raw)
            except (ValueError, UnicodeError): data = None
            return response.status, data, response.headers

    def expect(self, path, method="GET", body=None, status=200, headers=None):
        actual, data, response_headers = self.call(path, method, body, headers)
        if actual != status or not isinstance(data, dict):
            code = data.get("error", {}).get("code", "INVALID_RESPONSE") if isinstance(data, dict) else "INVALID_RESPONSE"
            if code not in {"AUTH_RATE_LIMITED", "LOGIN_RATE_LIMITED", "AUTH_REQUIRED", "VALIDATION_ERROR", "ROUTE_NOT_FOUND", "DATABASE_UNAVAILABLE"}:
                code = "UNEXPECTED_RESPONSE"
            raise LabError(code, f"Bước chuẩn bị {method} {path.split('/')[1]} trả HTTP {actual}; cần {status}.")
        return data, response_headers

    def user_cookie(self):
        found = [cookie for cookie in self.jar if cookie.name == PROFILE["userCookie"]]
        if len(found) != 1:
            raise LabError("CONTRACT_MISMATCH", "Thiếu cookie User theo adapter; cần bên ứng dụng bàn giao.")
        return {"name": found[0].name, "value": found[0].value}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None
