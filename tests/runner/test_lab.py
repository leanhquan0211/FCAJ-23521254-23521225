"""Unit checks only: simulated HTTP/DB fixtures are never load-test acceptance evidence."""
import copy
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from unittest.mock import Mock, patch
from http.server import ThreadingHTTPServer

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "load"))
from audit import inspect_items
from config import LabError, Settings, guard_table, local_url, validate_config
from engine import Engine
from fixtures import health
from metrics import Metrics, percentile
from server import LocalServer, handler_for


class ConfigTests(unittest.TestCase):
    def test_defaults_are_small_public_run(self):
        config = validate_config({})
        self.assertEqual((config["users"], config["mode"]), (2, "public"))

    def test_command_paths_and_urls_are_not_browser_parameters(self):
        for field in ["command", "script", "apiUrl", "table", "k6", "appRoot", "results"]:
            with self.subTest(field=field), self.assertRaises(LabError): validate_config({field: "ignored"})

    def test_type_range_duration_and_request_limits(self):
        for config in [{"users": True}, {"users": 101}, {"users": 0}, {"hold": -1}, {"maxRetries": 3},
                       {"scenario": "arbitrary"}, {"scenario": []}, {"mode": {}}, {"mode": "mock"}, {"timeout": 76}, {"maxRequests": 5001},
                       {"mode": "purchase", "users": 100, "maxRequests": 199}]:
            with self.subTest(config=config), self.assertRaises(LabError): validate_config(config)

    def test_hot_requires_enough_capacity(self):
        with self.assertRaises(LabError): validate_config({"scenario": "hot", "users": 10, "capacity": 1})

    def test_hot_forces_real_purchase_mode(self):
        self.assertEqual(validate_config({"scenario": "hot"})["mode"], "purchase")

    def test_valid_100_user_presets(self):
        for scenario, capacity in [("hot", 200), ("scarce", 10), ("scarce", 1)]:
            self.assertEqual(validate_config({"scenario": scenario, "users": 100, "capacity": capacity, "maxRequests": 400})["users"], 100)

    def test_only_loopback_http_without_credentials_or_paths(self):
        self.assertEqual(local_url("http://127.0.0.1:3002", "test"), "http://127.0.0.1:3002")
        for url in ["https://aws.example:443", "http://127.0.0.1:3002/api", "http://user:password@localhost:3002", "file:///tmp/x", "http://localhost:3002?q=1"]:
            with self.subTest(url=url), self.assertRaises(LabError): local_url(url, "test")

    def test_application_table_is_rejected(self):
        for table in [None, "fcaj-event-workshop-local", "production", "fcaj-event-workshop-local-test-"]:
            with self.subTest(table=table), self.assertRaises(LabError): guard_table(table)


class MetricsTests(unittest.TestCase):
    def test_unmeasured_metrics_are_null_not_fabricated(self):
        result = Metrics().snapshot()
        self.assertIsNone(result["latency"]["p95"])
        self.assertIsNone(result["throughput"])
        self.assertEqual(result["series"], [])

    def test_percentile_uses_interpolation(self):
        self.assertEqual(percentile([0, 100], .95), 95)
        self.assertIsNone(percentile([], .95))

    def test_outcomes_retries_and_unique_receipts(self):
        metrics = Metrics()
        for second, value, outcome in [(0, 100, "timeout"), (1, 20, "replay"), (2, 30, "full")]:
            metrics.consume({"type": "Point", "metric": "lab_latency", "data": {
                "time": f"2026-10-23T00:00:0{second}Z", "value": value, "tags": {"kind": "purchase", "outcome": outcome}}})
        for name in ["lab_retries", "lab_receipts", "lab_receipts"]:
            metrics.consume({"type": "Point", "metric": name, "data": {"time": "2026-10-23T00:00:03Z", "value": 1, "tags": {"registrationId": "ticket-1"}}})
        result = metrics.snapshot()
        self.assertEqual(result["requests"], 3)
        self.assertEqual(result["counts"]["timeout"], 1)  # recovered replay must not hide the timeout
        self.assertEqual(result["counts"]["replay"], 1)
        self.assertEqual(result["retries"], 1)
        self.assertEqual(result["uniqueReceipts"], 1)
        self.assertEqual(result["purchaseAttempts"], 3)


class AuditTests(unittest.TestCase):
    def setUp(self):
        self.sessions = [{"userId": "u1", "idempotencyKey": "k1"}, {"userId": "u2", "idempotencyKey": "k2"}]
        self.items = [
            {"PK": "EVENTS", "SK": "EVENT#e1", "capacity": 2, "remainingSeats": 1},
            {"PK": "REGISTRATION#t1", "SK": "METADATA", "entityType": "REGISTRATION", "id": "t1", "eventId": "e1", "userId": "u1"},
            {"PK": "USER#u1", "SK": "REGISTRATION#e1", "registrationId": "t1"},
            {"PK": "USER#u1", "SK": "IDEMPOTENCY#k1", "registrationId": "t1"},
        ]
        self.items[1].update(fullName="Buyer", email="buyer@example.test", phone="", createdAt="2026-10-23T00:00:00+00:00")
        self.items[3]["registration"] = {field: self.items[1][field] for field in
            ("id", "eventId", "userId", "fullName", "email", "phone", "createdAt")}

    def audit(self, items=None, receipts=None):
        return inspect_items(self.items if items is None else items, "e1", 2, self.sessions, {"t1"} if receipts is None else receipts)

    def test_complete_transaction_matches(self): self.assertEqual(self.audit()["status"], "passed")

    def test_missing_reference_or_idempotency_fails(self):
        for index in [2, 3]:
            items = copy.deepcopy(self.items); items.pop(index)
            self.assertEqual(self.audit(items)["status"], "failed")

    def test_negative_seats_and_wrong_counter_fail(self):
        for seats in [-1, 0, 3]:
            items = copy.deepcopy(self.items); items[0]["remainingSeats"] = seats
            self.assertEqual(self.audit(items)["status"], "failed")

    def test_duplicate_owner_fails(self):
        items = copy.deepcopy(self.items)
        items.append({**items[1], "id": "t2"})
        self.assertFalse(self.audit(items)["checks"]["oneTicketPerUser"])

    def test_unrelated_run_is_not_counted(self):
        self.items.append({"PK": "REGISTRATION#other", "id": "other", "eventId": "other-event", "userId": "other", "entityType": "REGISTRATION"})
        self.assertEqual(self.audit()["tickets"], 1)

    def test_orphan_or_unexpected_idempotency_is_detected(self):
        self.items.append({"PK": "USER#u2", "SK": "IDEMPOTENCY#unexpected", "registrationId": "missing"})
        self.assertFalse(self.audit()["checks"]["idempotencyMatches"])

    def test_http_success_without_persisted_ticket_fails(self):
        self.assertFalse(self.audit(receipts={"missing"})["checks"]["responsesPersisted"])

    def test_idempotency_snapshot_must_match_ticket_and_event(self):
        for field, value in [("eventId", "other-event"), ("userId", "u2"), ("phone", "wrong")]:
            items = copy.deepcopy(self.items)
            items[3]["registration"][field] = value
            self.assertFalse(self.audit(items)["checks"]["idempotencyMatches"])
        items = copy.deepcopy(self.items)
        del items[3]["registration"]
        self.assertFalse(self.audit(items)["checks"]["idempotencyMatches"])

    def test_idempotency_key_must_belong_to_ticket_owner(self):
        items = copy.deepcopy(self.items)
        items[3].update(PK="USER#u2", SK="IDEMPOTENCY#k2")
        self.assertFalse(self.audit(items)["checks"]["idempotencyMatches"])


class ReadinessTests(unittest.TestCase):
    def test_v2_health_is_blocked_not_passed(self):
        with tempfile.TemporaryDirectory() as folder:
            settings = Settings(results=folder)
            client = Mock()
            client.expect.return_value = ({"status": "ok", "database": {"status": "ready", "table": "fcaj-event-workshop-local-test-unit"}}, {})
            with patch("fixtures.Client", return_value=client), self.assertRaises(LabError) as raised:
                health(settings, purchase=True)
            self.assertEqual(raised.exception.code, "WAITING_FOR_V3")
            client.call.assert_not_called()

    def test_blocked_engine_persists_no_fake_metrics_or_secrets(self):
        with tempfile.TemporaryDirectory() as folder:
            settings = Settings(results=folder)
            engine = Engine(settings)
            with patch("engine.subprocess.run", return_value=subprocess.CompletedProcess([], 0, stdout="k6 test")), patch("engine.health", return_value={"database": {"table": "fcaj-event-workshop-local-test-unit"}}), patch("engine.prepare", side_effect=LabError("WAITING_FOR_V3", "Chờ tích hợp")):
                run = engine.start({"scenario": "hot"})
                engine.workers[run["runId"]].join(timeout=5)
            report = engine.get(run["runId"])
            self.assertEqual((report["state"], report["verdict"]), ("blocked", "blocked"))
            self.assertEqual(report["metrics"]["requests"], 0)
            self.assertIsNone(report["metrics"]["latency"]["p95"])
            self.assertEqual(report["verification"]["status"], "not_run")
            for secret_name in ["csrfToken", "password", '"cookie"']:
                self.assertNotIn(secret_name, json.dumps(report))

    def test_restart_marks_inflight_run_incomplete(self):
        with tempfile.TemporaryDirectory() as folder:
            run_id = "a" * 24; target = Path(folder) / run_id; target.mkdir()
            (target / "report.json").write_text(json.dumps({"runId": run_id, "state": "running", "createdAt": "now"}))
            run = Engine(Settings(results=folder)).get(run_id)
            self.assertEqual((run["state"], run["verdict"]), ("interrupted", "incomplete"))
            self.assertEqual(json.loads((target / "report.json").read_text(encoding="utf-8"))["state"], "interrupted")

    def test_sessions_only_reach_child_stdin_not_argv_env_or_report(self):
        with tempfile.TemporaryDirectory() as folder:
            engine = Engine(Settings(results=folder))
            secret = "unit-only-private-value"
            child = Mock()
            child.poll.return_value = 0
            child.returncode = 0
            child.stderr = io.BytesIO(secret.encode())
            prepared = {"table": "fcaj-event-workshop-local-test-unit", "eventIds": [],
                        "sessions": [{"cookie": {"name": "event_user_session", "value": secret}, "csrfToken": secret}]}
            with patch("engine.subprocess.run", return_value=subprocess.CompletedProcess([], 0, stdout="k6 unit")), patch("engine.health", return_value={"database": {"table": prepared["table"]}}), patch("engine.prepare", return_value=prepared), patch("engine.subprocess.Popen", return_value=child) as spawn:
                run = engine.start({})
                engine.workers[run["runId"]].join(timeout=5)
            self.assertIn(secret.encode(), child.stdin.write.call_args.args[0])
            self.assertNotIn(secret, json.dumps(spawn.call_args.args))
            self.assertNotIn(secret, json.dumps(spawn.call_args.kwargs["env"]))
            report = engine.get(run["runId"])
            self.assertNotIn(secret, json.dumps(report))
            self.assertNotIn(secret, (Path(folder) / run["runId"] / "report.json").read_text(encoding="utf-8"))
            self.assertEqual(report["verdict"], "failed")  # a simulated child with no points cannot pass


class RunnerHttpTests(unittest.TestCase):
    def test_controller_port_cannot_be_shared_by_two_servers(self):
        first = LocalServer(("127.0.0.1", 0), handler_for(Mock()))
        try:
            with self.assertRaises(OSError):
                LocalServer(first.server_address, handler_for(Mock()))
        finally:
            first.server_close()

    def setUp(self):
        self.engine = Mock()
        self.engine.start.side_effect = lambda body: {"config": validate_config(body)}
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), handler_for(self.engine))
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True); self.thread.start()

    def tearDown(self):
        self.server.shutdown(); self.server.server_close(); self.thread.join(timeout=3)

    def post(self, body, host="127.0.0.1:3100", origin="http://127.0.0.1:5174", content_type="application/json"):
        req = urllib.request.Request(f"http://127.0.0.1:{self.server.server_port}/runs", data=json.dumps(body).encode(),
            headers={"Host": host, "Origin": origin, "Content-Type": content_type}, method="POST")
        try: response = urllib.request.urlopen(req, timeout=3)
        except urllib.error.HTTPError as exc: response = exc
        with response: return response.status, json.load(response)

    def test_host_and_origin_guard(self):
        for kwargs in [{"host": "evil.example:3100"}, {"origin": "http://evil.example"}]:
            status, _ = self.post({}, **kwargs); self.assertEqual(status, 403)
        self.engine.start.assert_not_called()

    def test_json_only_and_unknown_command_rejected(self):
        self.assertEqual(self.post({}, content_type="text/plain")[0], 415)
        self.assertEqual(self.post({"command": "not executed"})[0], 400)

    def test_valid_start_returns_202(self): self.assertEqual(self.post({})[0], 202)


if __name__ == "__main__": unittest.main()
