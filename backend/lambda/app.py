import json
import logging
import os
import uuid
import base64
import binascii
from decimal import Decimal
from datetime import datetime, timezone

from botocore.exceptions import BotoCoreError, ClientError

from configuration import ConfigurationError, local_table
from repository import EventRepository
from service import ApiError, EventService
from admin_events import AdminEventService
from auth import AuthService, session_output
from auth_repository import AuthRepository
from buyer_auth import BuyerAuthService
from buyer_repository import BuyerRepository
from booking import BookingService
from session import SessionService, response_cookies
from account_repository import AccountRepository
from admin_accounts import AdminAccountService

logger = logging.getLogger(__name__)


def json_number(value):
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    raise TypeError(f"Cannot serialize {type(value).__name__}")


def response(status, body, event, extra_headers=None, cookies=None):
    headers = {"Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store",
               "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer"}
    headers.update(extra_headers or {})
    origin = next((v for k, v in (event.get("headers") or {}).items() if k.lower() == "origin"), None)
    allowed = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin in allowed:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Expose-Headers"] = "Location, Idempotent-Replayed"
        headers["Vary"] = "Origin"
    result = {"statusCode": status, "headers": headers, "body": json.dumps(body, ensure_ascii=False, default=json_number)}
    if cookies:
        result["cookies"] = cookies
    return result


def registration_body(event):
    headers = {key.lower(): value for key, value in (event.get("headers") or {}).items()}
    if headers.get("content-type", "").split(";")[0].strip().lower() != "application/json":
        raise ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Vui lòng gửi dữ liệu JSON.")
    try:
        body = event.get("body") or ""
        if event.get("isBase64Encoded"):
            body = base64.b64decode(body, validate=True).decode("utf-8")
        if len(body.encode("utf-8")) > 32768:
            raise ApiError(413, "PAYLOAD_TOO_LARGE", "Dữ liệu gửi lên quá lớn.")
        return json.loads(body)
    except (ValueError, TypeError, UnicodeError, binascii.Error):
        raise ApiError(400, "VALIDATION_ERROR", "Nội dung JSON không hợp lệ.") from None


def lambda_handler(event, context):
    request_context = event.get("requestContext", {})
    request_id = request_context.get("requestId") or getattr(context, "aws_request_id", None) or str(uuid.uuid4())
    route = event.get("routeKey") or ""
    try:
        if event.get("queryStringParameters"):
            raise ApiError(400, "VALIDATION_ERROR", "API này chưa hỗ trợ tham số truy vấn.")
        if route not in {"GET /health", "GET /events", "GET /events/{eventId}", "POST /events/{eventId}/registrations", "GET /registrations/{registrationId}",
                         "POST /admin/login", "GET /admin/session", "POST /admin/logout", "GET /admin/events", "POST /admin/events",
                         "PUT /admin/events/{eventId}", "DELETE /admin/events/{eventId}",
                         "GET /admin/users", "PUT /admin/users/{userId}", "DELETE /admin/users/{userId}",
                         "POST /auth/register", "POST /auth/login", "GET /auth/session", "POST /auth/logout", "GET /me/registrations"}:
            raise ApiError(404, "ROUTE_NOT_FOUND", "Không tìm thấy API.")
        table = local_table()
        repository = EventRepository(table)
        buyer = BuyerAuthService(BuyerRepository(table))
        sessions = SessionService(AuthRepository(table))
        if route == "POST /auth/register":
            return response(201, buyer.register(event, registration_body(event)), event)
        if route == "POST /auth/login":
            body, cookie = sessions.login(event, registration_body(event))
            return response(200, body, event, cookies=response_cookies(cookie))
        if route == "GET /auth/session":
            return response(200, sessions.require(event), event)
        if route == "POST /auth/logout":
            cookie = sessions.logout(event)
            return response(200, {"loggedOut": True}, event, cookies=response_cookies(cookie))
        if "/admin/" in route:
            auth = AuthService(AuthRepository(table))
            if route == "POST /admin/login":
                session, cookie = auth.login(event, registration_body(event))
                return response(200, session_output(session), event, cookies=response_cookies(cookie))
            if route == "POST /admin/logout":
                cookie = auth.logout(event)
                return response(200, {"loggedOut": True}, event, cookies=response_cookies(cookie))
            session = auth.require_admin(event, mutation=not route.startswith("GET "))
            if route == "GET /admin/session":
                return response(200, session_output(session), event)
            if route in {"GET /admin/users", "PUT /admin/users/{userId}", "DELETE /admin/users/{userId}"}:
                accounts = AdminAccountService(AccountRepository(table))
                user_id = (event.get("pathParameters") or {}).get("userId")
                if route == "GET /admin/users":
                    body = accounts.list_users()
                elif route.startswith("PUT "):
                    body = accounts.update(user_id, registration_body(event))
                else:
                    body = accounts.delete(user_id, registration_body(event))
                return response(202 if body.get("deleting") else 200, body, event)
            admin = AdminEventService(repository)
            event_id = (event.get("pathParameters") or {}).get("eventId")
            if route == "GET /admin/events":
                body = admin.list_events()
            elif route == "POST /admin/events":
                return response(201, admin.create(registration_body(event)), event)
            elif route == "PUT /admin/events/{eventId}":
                body = admin.update(event_id, registration_body(event))
            else:
                body = admin.delete(event_id, registration_body(event))
            return response(202 if body.get("deleting") else 200, body, event)
        if route == "GET /health":
            table_name = repository.health()
            body = {"status": "ok", "database": {"status": "ready", "table": table_name},
                    "apiContractVersion": "4.1", "serverTime": datetime.now(timezone.utc).isoformat()}
        elif route == "GET /events":
            body = EventService(repository).list_events()
        elif route == "GET /events/{eventId}":
            body = EventService(repository).get_event((event.get("pathParameters") or {}).get("eventId"))
        elif route == "POST /events/{eventId}/registrations":
            session = buyer.require_user(event, mutation=True)
            headers = {key.lower(): value for key, value in (event.get("headers") or {}).items()}
            body, replayed = BookingService(repository).register(
                (event.get("pathParameters") or {}).get("eventId"), registration_body(event),
                session["user"], headers.get("idempotency-key"))
            return response(200 if replayed else 201, body, event,
                            {"Location": f"/registrations/{body['id']}", "Idempotent-Replayed": str(replayed).lower()})
        elif route == "GET /me/registrations":
            session = buyer.require_user(event)
            body = BookingService(repository).list_registrations(session["user"]["userId"])
        else:
            session = buyer.require_user(event)
            body = BookingService(repository).get_registration(
                (event.get("pathParameters") or {}).get("registrationId"), session["user"]["userId"])
        return response(200, body, event)
    except ApiError as exc:
        status, code, message = exc.status, exc.code, exc.message
        error = {"code": code, "message": message, "requestId": request_id}
        if exc.details:
            error["details"] = exc.details
        return response(status, {"error": error}, event, exc.headers)
    except (BotoCoreError, ClientError, ConfigurationError, RuntimeError):
        logger.exception("Database unavailable; requestId=%s", request_id)
        status, code, message = 503, "DATABASE_UNAVAILABLE", "Cơ sở dữ liệu chưa sẵn sàng. Vui lòng thử lại."
    except Exception:
        logger.exception("Internal error; requestId=%s", request_id)
        status, code, message = 500, "INTERNAL_ERROR", "Không thể xử lý yêu cầu lúc này."
    return response(status, {"error": {"code": code, "message": message, "requestId": request_id}}, event)
