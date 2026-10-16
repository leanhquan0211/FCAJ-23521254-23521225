import json
import sys
import unittest
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend" / "lambda"))
sys.path.insert(0, str(ROOT / "backend" / "dynamodb_setup"))

import app
from configuration import ConfigurationError, local_table
from init_db import initialize
from repository import EventRepository
from service import ApiError, EventService, event_output


def example_item(**changes):
    return {
        "PK": "EVENTS", "SK": "EVENT#example", "id": "example",
        "title": "Sự kiện mẫu", "category": "Thiết kế", "dateTime": "2099-01-01T09:00:00+07:00",
        "location": "Trực tuyến", "organizer": "Workshop", "capacity": Decimal(40),
        "remainingSeats": Decimal(18), "summary": "Giới thiệu", "description": "Chi tiết",
        "registrationOpen": True, "startsAtEpoch": 4070935200, **changes,
    }


class ReadApiTests(unittest.TestCase):
    def test_status_is_decided_by_time_open_flag_and_seats(self):
        now = datetime(2026, 10, 16, tzinfo=timezone.utc)
        self.assertEqual(event_output(example_item(), now)["status"], "open")
        self.assertEqual(event_output(example_item(remainingSeats=0), now)["status"], "full")
        self.assertEqual(event_output(example_item(registrationOpen=False), now)["status"], "closed")
        ended = example_item(dateTime="2020-01-01T09:00:00+07:00", registrationOpen=False)
        self.assertEqual(event_output(ended, now)["status"], "ended")

    def test_api_hides_internal_fields_and_returns_json_numbers(self):
        result = event_output(example_item())
        self.assertNotIn("PK", result)
        self.assertNotIn("registrationOpen", result)
        encoded = json.loads(json.dumps(result, default=app.json_number))
        self.assertIsInstance(encoded["remainingSeats"], int)

    def test_timezone_is_required_in_stored_data(self):
        with self.assertRaises(ValueError):
            event_output(example_item(dateTime="2099-01-01T09:00:00"))

    def test_list_sorts_actual_times_not_timezone_text(self):
        repo = Mock()
        repo.list_events.return_value = [example_item(id="later", dateTime="2099-01-01T08:00:00+00:00"), example_item(id="earlier")]
        self.assertEqual([item["id"] for item in EventService(repo).list_events()["events"]], ["earlier", "later"])

    def test_bad_and_missing_ids_have_distinct_errors(self):
        repo = Mock()
        repo.get_event.return_value = None
        for event_id, status in [("bad_id!", 400), ("unknown-id", 404)]:
            with self.subTest(event_id=event_id), self.assertRaises(ApiError) as raised:
                EventService(repo).get_event(event_id)
            self.assertEqual(raised.exception.status, status)

    def invoke(self, route, repository, **extra):
        event = {"version": "2.0", "routeKey": route, "requestContext": {"requestId": "test-id"}, **extra}
        with patch("app.local_table"), patch("app.EventRepository", return_value=repository):
            result = app.lambda_handler(event, None)
        return result, json.loads(result["body"])

    def test_health_checks_table_access(self):
        repo = Mock()
        repo.health.return_value = "fcaj-event-workshop-local"
        result, body = self.invoke("GET /health", repo)
        self.assertEqual(result["statusCode"], 200)
        self.assertEqual(body["database"]["status"], "ready")
        repo.health.assert_called_once()

    def test_unavailable_database_uses_error_envelope(self):
        repo = Mock()
        repo.health.side_effect = RuntimeError("private internal failure")
        with patch("app.logger"):
            result, body = self.invoke("GET /health", repo)
        self.assertEqual(result["statusCode"], 503)
        self.assertEqual(body["error"]["code"], "DATABASE_UNAVAILABLE")
        self.assertNotIn("private", result["body"])
        self.assertEqual(body["error"]["requestId"], "test-id")

    def test_internal_error_does_not_leak_trace(self):
        repo = Mock()
        repo.list_events.side_effect = ValueError("private failure")
        with patch("app.logger"):
            result, body = self.invoke("GET /events", repo)
        self.assertEqual(result["statusCode"], 500)
        self.assertEqual(body["error"]["code"], "INTERNAL_ERROR")
        self.assertNotIn("private", result["body"])

    def test_http_v2_detail_not_found(self):
        repo = Mock()
        repo.get_event.return_value = None
        result, body = self.invoke("GET /events/{eventId}", repo, pathParameters={"eventId": "unknown"})
        self.assertEqual(result["statusCode"], 404)
        self.assertEqual(body["error"]["code"], "EVENT_NOT_FOUND")

    def test_query_is_rejected(self):
        result, _ = self.invoke("GET /events", Mock(), queryStringParameters={"q": "example"})
        self.assertEqual(result["statusCode"], 400)

    def test_allowed_origin_is_explicit(self):
        for origin, allowed in [("http://localhost:5173", True), ("https://untrusted.example", False)]:
            result, _ = self.invoke("GET /events", Mock(list_events=Mock(return_value=[])), headers={"origin": origin})
            self.assertEqual("Access-Control-Allow-Origin" in result["headers"], allowed)

    def test_query_reads_all_database_pages(self):
        table = Mock()
        table.query.side_effect = [{"Items": [{"id": "one"}], "LastEvaluatedKey": {"PK": "EVENTS", "SK": "EVENT#one"}}, {"Items": [{"id": "two"}]}]
        self.assertEqual(len(EventRepository(table).list_events()), 2)
        self.assertEqual(table.query.call_args.kwargs["ExclusiveStartKey"]["SK"], "EVENT#one")


class ConfigurationTests(unittest.TestCase):
    def setUp(self):
        local_table.cache_clear()

    def tearDown(self):
        local_table.cache_clear()

    def test_missing_or_nonlocal_endpoint_never_creates_client(self):
        endpoints = ["", "https://dynamodb.us-east-1.amazonaws.com", "http://example.com:8000", "http://localhost", "http://local:secret@localhost:8000", "http://localhost:8000/path"]
        with patch("configuration.boto3.resource") as resource:
            for endpoint in endpoints:
                with self.subTest(endpoint=endpoint), self.assertRaises(ConfigurationError):
                    local_table(endpoint)
            resource.assert_not_called()

    def test_client_uses_only_fake_credentials_and_local_endpoint(self):
        with patch("configuration.boto3.resource") as resource:
            local_table("http://127.0.0.1:8000")
            kwargs = resource.call_args.kwargs
            self.assertEqual(kwargs["aws_access_key_id"], "local")
            self.assertEqual(kwargs["aws_secret_access_key"], "local")
            self.assertEqual(kwargs["endpoint_url"], "http://127.0.0.1:8000")


class SeedTests(unittest.TestCase):
    def test_default_initialization_does_not_add_demo_events(self):
        table = Mock()
        self.assertEqual(initialize(table), {"created": 0, "preserved": 0})
        table.meta.client.get_waiter.return_value.wait.assert_called_once()
        table.put_item.assert_not_called()
        table.delete_item.assert_not_called()

    def test_reseed_preserves_modified_records(self):
        class Missing(Exception):
            pass
        class Exists(Exception):
            pass
        class ConditionFailed(Exception):
            pass
        table = Mock()
        table.name = "fcaj-event-workshop-local-test"
        client = table.meta.client
        client.exceptions = SimpleNamespace(ResourceNotFoundException=Missing, ResourceInUseException=Exists, ConditionalCheckFailedException=ConditionFailed)
        client.describe_table.side_effect = Missing()
        items = {}

        def put_item(Item, ConditionExpression):
            self.assertEqual(ConditionExpression, "attribute_not_exists(PK) AND attribute_not_exists(SK)")
            key = (Item["PK"], Item["SK"])
            if key in items:
                raise ConditionFailed()
            items[key] = Item
        table.put_item.side_effect = put_item
        now = datetime(2026, 10, 16, tzinfo=timezone.utc)
        self.assertEqual(initialize(table, now, seed_demo=True), {"created": 8, "preserved": 0})
        key = ("EVENTS", "EVENT#thiet-ke-de-dung")
        items[key]["remainingSeats"] = 3
        previous = json.dumps(items[key], sort_keys=True)
        self.assertEqual(initialize(table, now, seed_demo=True), {"created": 0, "preserved": 8})
        self.assertEqual(json.dumps(items[key], sort_keys=True), previous)
        self.assertEqual(len(items), 8)


if __name__ == "__main__":
    unittest.main()
