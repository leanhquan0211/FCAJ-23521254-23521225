import json
import logging
import os
import uuid
import base64
import binascii
from decimal import Decimal

from botocore.exceptions import BotoCoreError, ClientError

from configuration import ConfigurationError, local_table
from repository import EventRepository
from service import ApiError, EventService, RegistrationService

logger = logging.getLogger(__name__)


def json_number(value):
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    raise TypeError(f"Cannot serialize {type(value).__name__}")


def response(status, body, event, extra_headers=None):
    headers = {"Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store"}
    headers.update(extra_headers or {})
    origin = next((v for k, v in (event.get("headers") or {}).items() if k.lower() == "origin"), None)
    allowed = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin in allowed:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Vary"] = "Origin"
    return {"statusCode": status, "headers": headers, "body": json.dumps(body, ensure_ascii=False, default=json_number)}


def registration_body(event):
    headers = {key.lower(): value for key, value in (event.get("headers") or {}).items()}
    if headers.get("content-type", "").split(";")[0].strip().lower() != "application/json":
        raise ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Vui lòng gửi dữ liệu JSON.")
    try:
        body = event.get("body") or ""
        if event.get("isBase64Encoded"):
            body = base64.b64decode(body, validate=True).decode("utf-8")
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
        if route not in {"GET /health", "GET /events", "GET /events/{eventId}", "POST /events/{eventId}/registrations", "GET /registrations/{registrationId}"}:
            raise ApiError(404, "ROUTE_NOT_FOUND", "Không tìm thấy API.")
        repository = EventRepository(local_table())
        if route == "GET /health":
            table_name = repository.health()
            body = {"status": "ok", "database": {"status": "ready", "table": table_name}}
        elif route == "GET /events":
            body = EventService(repository).list_events()
        elif route == "GET /events/{eventId}":
            body = EventService(repository).get_event((event.get("pathParameters") or {}).get("eventId"))
        elif route == "POST /events/{eventId}/registrations":
            body = RegistrationService(repository).register((event.get("pathParameters") or {}).get("eventId"), registration_body(event))
            return response(201, body, event, {"Location": f"/registrations/{body['id']}"})
        else:
            body = RegistrationService(repository).get_registration((event.get("pathParameters") or {}).get("registrationId"))
        return response(200, body, event)
    except ApiError as exc:
        status, code, message = exc.status, exc.code, exc.message
        error = {"code": code, "message": message, "requestId": request_id}
        if exc.details:
            error["details"] = exc.details
        return response(status, {"error": error}, event)
    except (BotoCoreError, ClientError, ConfigurationError, RuntimeError):
        logger.exception("Database unavailable; requestId=%s", request_id)
        status, code, message = 503, "DATABASE_UNAVAILABLE", "Cơ sở dữ liệu chưa sẵn sàng. Vui lòng thử lại."
    except Exception:
        logger.exception("Internal error; requestId=%s", request_id)
        status, code, message = 500, "INTERNAL_ERROR", "Không thể xử lý yêu cầu lúc này."
    return response(status, {"error": {"code": code, "message": message, "requestId": request_id}}, event)
