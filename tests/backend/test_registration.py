import base64
import json
import sys
import unittest
import uuid
from pathlib import Path
from unittest.mock import Mock, patch

from botocore.exceptions import ClientError

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend" / "lambda"))
import app
from repository import EventRepository
from service import ApiError, RegistrationService, validate_registration


class RegistrationTests(unittest.TestCase):
    def setUp(self):
        self.repo = Mock()
        self.repo.get_event.return_value = {
            "id": "example", "title": "Example", "category": "Thiết kế", "dateTime": "2099-01-01T00:00:00+07:00",
            "location": "Local", "organizer": "Workshop", "capacity": 10, "remainingSeats": 1,
            "summary": "Summary", "description": "Description", "registrationOpen": True,
        }
        self.repo.has_registration.return_value = False
        self.service = RegistrationService(self.repo)
        self.valid = {"fullName": "  Nguyễn An  ", "email": " An@Example.com ", "phone": " 0901234567 "}

    def test_normalization_and_optional_phone(self):
        self.assertEqual(validate_registration(self.valid), {"fullName": "Nguyễn An", "email": "an@example.com", "phone": "0901234567"})
        self.assertEqual(validate_registration({"fullName": "An", "email": "an@example.com"})["phone"], "")

    def test_invalid_fields_and_unknown_fields(self):
        cases = [None, [], {}, {**self.valid, "capacity": 10}, {**self.valid, "fullName": " "}, {**self.valid, "fullName": "x" * 121}, {**self.valid, "email": "invalid"}, {**self.valid, "email": "x" * 250 + "@a.com"}, {**self.valid, "phone": None}, {**self.valid, "phone": "x" * 33}]
        for body in cases:
            with self.subTest(body=body), self.assertRaises(ApiError) as raised:
                validate_registration(body)
            self.assertEqual(raised.exception.status, 400)

    def test_success_uses_random_uuid_and_returns_only_contract_fields(self):
        result = self.service.register("example", self.valid)
        self.assertEqual(uuid.UUID(result["id"]).version, 4)
        self.assertEqual(set(result), {"id", "eventId", "fullName", "email", "phone", "createdAt"})
        self.assertEqual(result["email"], "an@example.com")
        self.repo.create_registration.assert_called_once()

    def test_duplicate_full_closed_and_ended(self):
        for changes, duplicate, code in [({}, True, "DUPLICATE_REGISTRATION"), ({"remainingSeats": 0}, False, "EVENT_FULL"), ({"registrationOpen": False}, False, "REGISTRATION_CLOSED"), ({"dateTime": "2020-01-01T00:00:00Z"}, False, "REGISTRATION_CLOSED")]:
            with self.subTest(code=code):
                event = self.repo.get_event.return_value.copy()
                self.repo.get_event.return_value.update(changes)
                self.repo.has_registration.return_value = duplicate
                with self.assertRaises(ApiError) as raised:
                    self.service.register("example", self.valid)
                self.assertEqual(raised.exception.code, code)
                self.repo.get_event.return_value = event
        self.repo.create_registration.assert_not_called()

    def test_missing_event(self):
        self.repo.get_event.return_value = None
        with self.assertRaises(ApiError) as raised:
            self.service.register("missing", self.valid)
        self.assertEqual(raised.exception.status, 404)

    def test_transaction_failure_rechecks_seats(self):
        error = ClientError({"Error": {"Code": "TransactionCanceledException"}}, "TransactWriteItems")
        def fail(*args):
            self.repo.get_event.return_value["remainingSeats"] = 0
            raise error
        self.repo.create_registration.side_effect = fail
        with self.assertRaises(ApiError) as raised:
            self.service.register("example", self.valid)
        self.assertEqual(raised.exception.code, "EVENT_FULL")

    def test_transient_transaction_conflict_retries_with_same_registration(self):
        error = ClientError({"Error": {"Code": "TransactionCanceledException"}, "CancellationReasons": [{"Code": "TransactionConflict"}]}, "TransactWriteItems")
        self.repo.create_registration.side_effect = [error, None]
        with patch("service.time.sleep"):
            result = self.service.register("example", self.valid)
        self.assertEqual(self.repo.create_registration.call_count, 2)
        self.assertEqual(self.repo.create_registration.call_args_list[0].args[0]["id"], result["id"])

    def test_get_result_is_whitelisted_and_handles_missing_uuid(self):
        registration = {"id": str(uuid.uuid4()), "eventId": "example", "fullName": "An", "email": "an@example.com", "phone": "", "createdAt": "2026-10-16T00:00:00Z", "PK": "private"}
        self.repo.get_registration.return_value = registration
        self.assertNotIn("PK", self.service.get_registration(registration["id"]))
        with self.assertRaises(ApiError) as raised:
            self.service.get_registration("guessable-id")
        self.assertEqual(raised.exception.status, 400)
        self.repo.get_registration.return_value = None
        with self.assertRaises(ApiError) as raised:
            self.service.get_registration(str(uuid.uuid4()))
        self.assertEqual(raised.exception.status, 404)

    def test_handler_201_location_and_field_errors(self):
        event = {"routeKey": "POST /events/{eventId}/registrations", "headers": {"content-type": "application/json"}, "pathParameters": {"eventId": "example"}, "body": json.dumps(self.valid)}
        with patch("app.local_table"), patch("app.EventRepository", return_value=self.repo):
            response = app.lambda_handler(event, None)
            self.assertEqual(response["statusCode"], 201)
            self.assertTrue(response["headers"]["Location"].startswith("/registrations/"))
            event["body"] = json.dumps({"fullName": "", "email": "bad"})
            response = app.lambda_handler(event, None)
            self.assertEqual(response["statusCode"], 400)
            self.assertIn("email", json.loads(response["body"])["error"]["details"])

    def test_body_parser_handles_http_v2_encoding_and_content_type(self):
        encoded = base64.b64encode(json.dumps(self.valid).encode()).decode()
        self.assertEqual(app.registration_body({"headers": {"Content-Type": "application/json; charset=utf-8"}, "isBase64Encoded": True, "body": encoded}), self.valid)
        for event, status in [({"headers": {}, "body": "{}"}, 415), ({"headers": {"content-type": "application/json"}, "body": "{"}, 400)]:
            with self.assertRaises(ApiError) as raised:
                app.registration_body(event)
            self.assertEqual(raised.exception.status, status)

    def test_transaction_contains_three_guarded_writes(self):
        table = Mock()
        table.name = "fcaj-event-workshop-local-test"
        table.meta.client.meta.endpoint_url = "http://fcaj-dynamodb-local:8000"
        registration = {"id": str(uuid.uuid4()), "eventId": "example", "email": "an@example.com"}
        with patch("repository.local_client") as client:
            EventRepository(table).create_registration(registration, 123)
            request = client.return_value.transact_write_items.call_args.kwargs
        self.assertEqual(request["ClientRequestToken"], registration["id"])
        self.assertEqual(len(request["TransactItems"]), 3)
        self.assertIn("remainingSeats >= :one", request["TransactItems"][0]["Update"]["ConditionExpression"])
        self.assertEqual(request["TransactItems"][1]["Put"]["Item"]["SK"], {"S": "EMAIL#an@example.com"})


if __name__ == "__main__":
    unittest.main()
