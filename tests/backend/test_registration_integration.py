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
from service import ApiError
from booking import BookingService


@unittest.skipUnless(os.getenv("RUN_DYNAMODB_INTEGRATION") == "1", "Opt-in local database tests")
class TransactionIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        name = os.environ["DYNAMODB_TABLE"]
        if not name.startswith("fcaj-event-workshop-local-test-"):
            raise RuntimeError("A dedicated test table is required")
        cls.table = local_table(os.environ["DYNAMODB_ENDPOINT"], name)
        initialize(cls.table, seed_demo=True)
        cls.repo = EventRepository(cls.table)
        local_client(cls.table.meta.client.meta.endpoint_url, cls.table.name)
        base = cls.repo.get_event("thiet-ke-de-dung")
        for event_id, seats, is_open, timestamp in [
            ("http-open", 8, True, 4070908800), ("http-other", 8, True, 4070908800),
            ("last-seat", 1, True, 4070908800), ("same-user-race", 8, True, 4070908800),
            ("http-full", 0, True, 4070908800), ("http-ended", 0, True, 1),
            ("http-closed", 4, False, 4070908800), ("same-key-race", 8, True, 4070908800),
        ]:
            item = {**base, "id": event_id, "SK": f"EVENT#{event_id}", "capacity": seats or 5, "remainingSeats": seats, "registrationOpen": is_open, "startsAtEpoch": timestamp, "dateTime": "2099-01-01T00:00:00Z" if timestamp > 1 else "2000-01-01T00:00:00Z"}
            # Do not overwrite anything if someone mistakenly reuses a populated test table.
            cls.table.put_item(Item=item, ConditionExpression="attribute_not_exists(PK) AND attribute_not_exists(SK)")

    def register(self, event_id, user, key=None):
        # Independent table resource per worker, sharing a thread-safe SDK client.
        table = self.table.__class__(self.table.name, client=self.table.meta.client)
        try:
            result, replayed = BookingService(EventRepository(table)).register(event_id, {}, user, key or str(uuid.uuid4()))
            return (200 if replayed else 201, result)
        except ApiError as exc:
            return (exc.status, exc.code)

    def buyer(self):
        return {"userId": str(uuid.uuid4()), "fullName": "Integration Test", "email": f"integration-{uuid.uuid4().hex}@example.com"}

    def all_items(self):
        result = self.table.scan(ConsistentRead=True)
        items = result["Items"]
        while result.get("LastEvaluatedKey"):
            result = self.table.scan(ConsistentRead=True, ExclusiveStartKey=result["LastEvaluatedKey"])
            items.extend(result["Items"])
        return items

    def test_parallel_last_seat_has_one_winner_and_no_partial_items(self):
        users = [self.buyer() for _ in range(8)]
        with ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(lambda user: self.register("last-seat", user), users))
        self.assertEqual(sum(status == 201 for status, _ in results), 1, results)
        self.assertTrue(all(status in {201, 409} for status, _ in results), results)
        self.assertEqual(self.repo.get_event("last-seat")["remainingSeats"], 0)
        items = self.all_items()
        registrations = [item for item in items if item.get("entityType") == "REGISTRATION" and item.get("eventId") == "last-seat"]
        unique = [item for item in items if item.get("entityType") == "USER_REGISTRATION" and item.get("eventId") == "last-seat"]
        self.assertEqual(len(registrations), 1)
        self.assertEqual(len([item for item in items if item.get("entityType") == "IDEMPOTENCY" and item.get("registration", {}).get("eventId") == "last-seat"]), 1)
        self.assertEqual(len(unique), 1)
        self.assertEqual(unique[0]["registrationId"], registrations[0]["id"])

    def test_parallel_same_user_creates_one_registration_and_one_seat(self):
        user = self.buyer()
        with ThreadPoolExecutor(max_workers=6) as pool:
            results = list(pool.map(lambda _: self.register("same-user-race", user), range(6)))
        self.assertEqual(sum(status == 201 for status, _ in results), 1, results)
        self.assertEqual(self.repo.get_event("same-user-race")["remainingSeats"], 7)
        self.assertTrue(all(status == 201 or code == "DUPLICATE_REGISTRATION" for status, code in results))

    def test_parallel_same_key_replays_one_ticket(self):
        user, key = self.buyer(), str(uuid.uuid4())
        with ThreadPoolExecutor(max_workers=6) as pool:
            results = list(pool.map(lambda _: self.register("same-key-race", user, key), range(6)))
        self.assertEqual(sum(status == 201 for status, _ in results), 1, results)
        self.assertTrue(all(status in {200, 201} for status, _ in results), results)
        self.assertEqual(len({ticket["id"] for _, ticket in results}), 1)
        self.assertEqual(self.repo.get_event("same-key-race")["remainingSeats"], 7)


if __name__ == "__main__":
    unittest.main()
