"""Opt-in transaction tests. Always use a new, dedicated local test table; no deletion."""
import os
import sys
import unittest
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend" / "lambda"))
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend" / "dynamodb_setup"))
from configuration import local_table, local_client
from init_db import initialize
from repository import EventRepository
from service import ApiError, RegistrationService


@unittest.skipUnless(os.getenv("RUN_DYNAMODB_INTEGRATION") == "1", "Opt-in local database tests")
class TransactionIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        name = os.environ["DYNAMODB_TABLE"]
        if not name.startswith("fcaj-event-workshop-local-test-"):
            raise RuntimeError("A dedicated test table is required")
        cls.table = local_table(os.environ["DYNAMODB_ENDPOINT"], name)
        initialize(cls.table)
        cls.repo = EventRepository(cls.table)
        local_client(cls.table.meta.client.meta.endpoint_url, cls.table.name)
        base = cls.repo.get_event("thiet-ke-de-dung")
        for event_id, seats, is_open, timestamp in [
            ("http-open", 8, True, 4070908800), ("http-other", 8, True, 4070908800),
            ("last-seat", 1, True, 4070908800), ("same-email-race", 8, True, 4070908800),
            ("http-full", 0, True, 4070908800), ("http-ended", 0, True, 1),
            ("http-closed", 4, False, 4070908800),
        ]:
            item = {**base, "id": event_id, "SK": f"EVENT#{event_id}", "capacity": seats or 5, "remainingSeats": seats, "registrationOpen": is_open, "startsAtEpoch": timestamp, "dateTime": "2099-01-01T00:00:00Z" if timestamp > 1 else "2000-01-01T00:00:00Z"}
            # Do not overwrite anything if someone mistakenly reuses a populated test table.
            cls.table.put_item(Item=item, ConditionExpression="attribute_not_exists(PK) AND attribute_not_exists(SK)")

    def register(self, event_id, email):
        # Independent table resource per worker, sharing a thread-safe SDK client.
        table = self.table.__class__(self.table.name, client=self.table.meta.client)
        try:
            result = RegistrationService(EventRepository(table)).register(event_id, {"fullName": "Integration Test", "email": email})
            return (201, result)
        except ApiError as exc:
            return (exc.status, exc.code)

    def all_items(self):
        result = self.table.scan(ConsistentRead=True)
        items = result["Items"]
        while result.get("LastEvaluatedKey"):
            result = self.table.scan(ConsistentRead=True, ExclusiveStartKey=result["LastEvaluatedKey"])
            items.extend(result["Items"])
        return items

    def test_parallel_last_seat_has_one_winner_and_no_partial_items(self):
        emails = [f"race-{uuid.uuid4().hex}@example.com" for _ in range(8)]
        with ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(lambda email: self.register("last-seat", email), emails))
        self.assertEqual(sum(status == 201 for status, _ in results), 1, results)
        self.assertTrue(all(status in {201, 409} for status, _ in results), results)
        self.assertEqual(self.repo.get_event("last-seat")["remainingSeats"], 0)
        items = self.all_items()
        registrations = [item for item in items if item.get("entityType") == "REGISTRATION" and item.get("eventId") == "last-seat"]
        unique = [item for item in items if item["PK"] == "EVENT#last-seat"]
        self.assertEqual(len(registrations), 1)
        self.assertEqual(len(unique), 1)
        self.assertEqual(unique[0]["registrationId"], registrations[0]["id"])

    def test_parallel_same_email_creates_one_registration_and_one_seat(self):
        email = f"duplicate-{uuid.uuid4().hex}@example.com"
        with ThreadPoolExecutor(max_workers=6) as pool:
            results = list(pool.map(lambda _: self.register("same-email-race", email), range(6)))
        self.assertEqual(sum(status == 201 for status, _ in results), 1, results)
        self.assertEqual(self.repo.get_event("same-email-race")["remainingSeats"], 7)
        self.assertTrue(all(status == 201 or code == "DUPLICATE_REGISTRATION" for status, code in results))


if __name__ == "__main__":
    unittest.main()
