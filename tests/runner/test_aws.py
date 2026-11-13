"""AWS guard/adapter/metric tests use stubs only; never write to AWS."""
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch
from datetime import datetime, timezone

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "load"))
from config import Settings, LabError, validate_config, PROFILE
from fixtures import health, create_environment, prepare, await_sales
from cloud_metrics import collect, capacity
from sync_aws import extract
from cleanup import plan
from cleanup import execute as execute_cleanup


class AwsTests(unittest.TestCase):
    def test_capacity_reads_account_limit_without_changing_it(self):
        client = Mock()
        client.get_account_settings.return_value = {"AccountLimit": {"ConcurrentExecutions": 10}}
        client.get_function_concurrency.return_value = {}
        settings = Mock(environment="aws", region="us-east-1", function_name="backend")
        with patch("boto3.client", return_value=client): result = capacity(settings)
        self.assertEqual(result["accountConcurrency"], 10)
        self.assertEqual(result["syncRpsCeiling"], 100)
        self.assertEqual([call[0] for call in client.method_calls], ["get_account_settings", "get_function_concurrency"])

    def test_booking_gate_waits_for_server_open_despite_client_schedule(self):
        client = Mock()
        client.expect.side_effect = [({"status": "not_open"}, {}), ({"status": "open", "remainingSeats": 1}, {})]
        cancelled = Mock()
        cancelled.is_set.return_value = False
        cancelled.wait.return_value = False
        prepared = {"eventId": "event-test", "startAt": 0}
        with patch("fixtures.Client", return_value=client): await_sales(Mock(), prepared, cancelled)
        self.assertEqual(client.expect.call_count, 2)
        cancelled.wait.assert_called_once()

    def test_booking_gate_rejects_event_changed_before_load(self):
        client = Mock()
        client.expect.return_value = {"status": "full", "remainingSeats": 0}, {}
        cancelled = Mock()
        cancelled.is_set.return_value = False
        with patch("fixtures.Client", return_value=client), self.assertRaises(LabError):
            await_sales(Mock(), {"eventId": "event-test"}, cancelled)

    def settings(self, folder, **overrides):
        env = {"LAB_ENV": "aws", "API_TEST_URL": "https://test.example/api",
               "LAB_ALLOWED_HOST": "test.example", "LAB_EXPECTED_TABLE": "fcaj-project-events"}
        env.update(overrides)
        with patch.dict(os.environ, env, clear=True):
            return Settings(results=folder)

    def test_https_host_and_base_are_checked(self):
        for target in ["http://test.example/api", "https://evil.example/api", "https://test.example/other",
                       "https://name:secret@test.example/api", "https://test.example/api?x=1"]:
            with self.subTest(target=target), tempfile.TemporaryDirectory() as folder, self.assertRaises(LabError):
                self.settings(folder, API_TEST_URL=target)

    def test_read_health_checks_exact_table_and_version(self):
        with tempfile.TemporaryDirectory() as folder:
            settings = self.settings(folder)
            client = Mock()
            body = {"status": "ok", "database": {"status": "ready", "table": "fcaj-project-events"},
                    "apiContractVersion": "4.1", "serverTime": "2026-11-13T00:00:00Z"}
            client.expect.return_value = body, {}
            with patch("fixtures.Client", return_value=client):
                self.assertEqual(health(settings)["apiContractVersion"], "4.1")
                body["database"]["table"] = "other"
                with self.assertRaises(LabError): health(settings)
                body["database"]["table"] = "fcaj-project-events"
                body["apiContractVersion"] = "3.0"
                with self.assertRaises(LabError): health(settings)

    def test_write_flag_without_exact_confirmation_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            settings = self.settings(folder, LAB_ALLOW_WRITES="true")
            with self.assertRaises(LabError): settings.check_table("fcaj-project-events", purchase=True)

    def test_current_table_needs_exact_function_and_table_confirmation(self):
        with tempfile.TemporaryDirectory() as folder:
            settings = self.settings(folder, LAB_EXPECTED_TABLE="fcaj-project-test-events")
            with self.assertRaises(LabError): settings.check_table(settings.expected_table, purchase=True)
            arn = "arn:aws:lambda:us-east-1:123456789012:function:backend"
            settings = self.settings(folder, LAB_EXPECTED_TABLE="fcaj-project-events", LAB_ALLOW_WRITES="true",
                                     LAB_EXPECTED_FUNCTION_ARN=arn, LAB_WRITE_TARGET=arn + "|fcaj-project-events")
            self.assertEqual(settings.check_table(settings.expected_table, purchase=True), settings.expected_table)
            with self.assertRaises(LabError): settings.check_table("other", purchase=True)

    def test_terraform_target_refresh_and_empty_state_rejected(self):
        arn = "arn:aws:lambda:us-east-1:123456789012:function:backend"
        state = {"outputs": {"website_url": {"value": "https://new.example"}, "dynamodb_table_name": {"value": "events"}},
                 "resources": [{"mode": "managed", "type": "aws_lambda_function", "name": "backend", "instances": [
                     {"attributes": {"arn": arn, "function_name": "backend", "environment": [{"variables": {"DYNAMODB_TABLE": "events", "SECRET": "never-export"}}]}}]}]}
        result = extract(state)
        self.assertEqual(result["apiUrl"], "https://new.example/api")
        self.assertNotIn("never-export", json.dumps(result))
        with self.assertRaises(ValueError): extract({})

    def test_manifest_preserves_created_user_when_next_request_fails(self):
        import threading
        with tempfile.TemporaryDirectory() as folder:
            settings = self.settings(folder)
            settings.auth_limits = {"USER_SIGNUP_IP_LIMIT": "2000", "USER_LOGIN_IP_LIMIT": "2000"}
            records = []
            admin, buyer1, buyer2 = Mock(), Mock(), Mock()
            run_id = "a" * 24
            admin.expect.return_value = {"role": "admin", "csrfToken": "secret"}, {}
            buyer1.expect.side_effect = [({"user": {"userId": "u1", "email": f"lab-{run_id}-000@example.test"}}, {}),
                ({"role": "user", "user": {"userId": "u1", "role": "user"}, "csrfToken": "private", "expiresAt": 9999999999}, {})]
            buyer1.user_cookie.return_value = {"name": "event_session", "value": "private"}
            buyer2.expect.side_effect = LabError("AUTH_RATE_LIMITED", "test")
            table = Mock()
            table.meta.client.describe_table.return_value = {"Table": {"TableStatus": "ACTIVE"}}
            pool = Mock()
            pool.available.return_value = []
            with patch("fixtures.AccountPool", return_value=pool), patch("fixtures.health", return_value={"database": {"table": settings.expected_table}}), patch("fixtures.database_table", return_value=table), patch("fixtures.Client", side_effect=[admin, buyer1, buyer2]), patch.dict(os.environ, {"LAB_ADMIN_USERNAME": "admin_test", "LAB_ADMIN_PASSWORD": "not-persisted"}):
                with self.assertRaises(LabError):
                    prepare(settings, {"mode": "purchase", "users": 2}, run_id, lambda **v: records.append(v), threading.Event())
            manifests = [r["fixtureManifest"] for r in records if "fixtureManifest" in r]
            self.assertEqual(len(manifests[-1]["users"]), 1)
            self.assertTrue(manifests[-1]["pendingEmail"].endswith("001@example.test"))
            self.assertNotIn("not-persisted", json.dumps(manifests))
            self.assertNotIn('"cookie"', json.dumps(manifests))

    def test_cleanup_refuses_unowned_ids(self):
        run_id = "a" * 24
        manifest = {"owner": "event-test-lab", "runId": run_id, "events": [], "users": [
            {"userId": "9f641d4d-260b-4dbe-bdd9-039f73878db3", "email": "someone@example.test"}]}
        with self.assertRaises(LabError): plan({"runId": run_id, "fixtureManifest": manifest})

    def test_cleanup_checks_all_ownership_before_any_delete(self):
        self.cleanup_case(changed_user=True)

    def test_reused_account_is_logged_in_without_signup(self):
        import threading
        with tempfile.TemporaryDirectory() as folder:
            settings = self.settings(folder)
            settings.auth_limits = {"USER_SIGNUP_IP_LIMIT": "2000", "USER_LOGIN_IP_LIMIT": "2000"}
            pool, table, admin, buyer = Mock(), Mock(), Mock(), Mock()
            pool.available.return_value = [{"userId": "u1", "email": "lab-" + "a" * 24 + "-000@example.test", "password": "pool-secret", "sourceRunId": "a" * 24}]
            table.meta.client.describe_table.return_value = {"Table": {"TableStatus": "ACTIVE"}}
            admin.expect.return_value = {"role": "admin", "csrfToken": "private"}, {}
            buyer.expect.return_value = {"role": "user", "user": {"userId": "u1", "role": "user"}, "csrfToken": "private", "expiresAt": 9999999999}, {}
            buyer.user_cookie.return_value = {"name": "event_session", "value": "private"}
            cancelled = Mock()
            cancelled.is_set.side_effect = [False, True]
            records = []
            with patch("fixtures.AccountPool", return_value=pool), patch("fixtures.health", return_value={"database": {"table": settings.expected_table}}), patch("fixtures.database_table", return_value=table), patch("fixtures.Client", side_effect=[admin, buyer]), patch.dict(os.environ, {"LAB_ADMIN_USERNAME": "admin_test", "LAB_ADMIN_PASSWORD": "secret"}):
                with self.assertRaises(LabError): prepare(settings, {"mode": "purchase", "users": 2}, "b" * 24, lambda **v: records.append(v), cancelled)
            self.assertEqual(buyer.expect.call_count, 1)
            self.assertEqual(buyer.expect.call_args.args[0], "/auth/login")
            pool.add.assert_not_called()
            self.assertTrue(any(record.get("reusedUsers") == 1 and record.get("createdUsers") == 0 for record in records))

    def test_cleanup_only_deletes_manifest_ids_and_handles_202(self):
        self.cleanup_case(changed_user=False)

    def cleanup_case(self, changed_user):
        run_id = "a" * 24
        event_id = "event-9f641d4d260b4dbebdd9039f73878db3"
        user_id = "a49d2cbd-5976-442c-afb1-28a3b8e4fd2d"
        email = f"lab-{run_id}-000@example.test"
        arn = "arn:aws:lambda:us-east-1:123456789012:function:backend"
        with tempfile.TemporaryDirectory() as folder:
            settings = self.settings(folder, LAB_ALLOW_WRITES="true", LAB_EXPECTED_FUNCTION_ARN=arn,
                                     LAB_WRITE_TARGET=arn + "|fcaj-project-events")
            manifest = {"owner": "event-test-lab", "runId": run_id, "apiUrl": settings.api_url,
                        "table": settings.expected_table, "functionArn": arn,
                        "users": [{"userId": user_id, "email": email}], "events": [{"eventId": event_id, "title": "LAB " + run_id}]}
            report = {"runId": run_id, "state": "completed", "fixtureManifest": manifest}
            plan(report)
            admin = Mock()
            admin.expect.side_effect = [({"role": "admin", "csrfToken": "secret"}, {}),
                ({"events": [{"id": event_id, "title": "LAB " + run_id, "summary": "Run " + run_id, "version": 1}]}, {}),
                ({"users": [{"userId": user_id, "email": "changed@example.test" if changed_user else email, "role": "user", "version": 1}]}, {})]
            admin.call.side_effect = [(202, {"deleted": False}, {}), (200, {"deleted": True}, {}), (200, {"deleted": True}, {})]
            with patch("cleanup.health"), patch("cleanup.deployment", return_value={"tableMatches": True, "targetMatches": True}), patch("cleanup.Client", return_value=admin), patch("cleanup.time.sleep"), patch.dict(os.environ, {"LAB_ADMIN_USERNAME": "admin_test", "LAB_ADMIN_PASSWORD": "secret"}):
                if changed_user:
                    with self.assertRaises(LabError): execute_cleanup(settings, report, manifest)
                    admin.call.assert_not_called()
                else:
                    self.assertEqual(execute_cleanup(settings, report, manifest)["deletedEntities"], 2)
                    self.assertEqual([c.args[0] for c in admin.call.call_args_list], ["/admin/events/" + event_id] * 2 + ["/admin/users/" + user_id])

    def test_aws_environment_creation_is_blocked(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(LabError): create_environment(self.settings(folder))

    def test_500_users_allowed_and_501_rejected(self):
        self.assertEqual(validate_config({"users": 500})["users"], 500)
        with self.assertRaises(LabError): validate_config({"users": 501})
        self.assertEqual(PROFILE["userCookie"], "event_session")

    def test_cloudwatch_preserves_missing_values_and_real_zero(self):
        with tempfile.TemporaryDirectory() as folder:
            settings = self.settings(folder)
            settings.function_name = "test-function"
            client = Mock()
            stamp = datetime(2026, 11, 13, tzinfo=timezone.utc)
            client.get_metric_data.return_value = {"MetricDataResults": [
                {"Id": "concurrent", "Timestamps": [stamp], "Values": [3]},
                {"Id": "errors", "Timestamps": [stamp], "Values": [0]}]}
            with patch("boto3.client", return_value=client):
                result = collect(settings, {"measurementStartedAt": stamp.isoformat(), "measurementFinishedAt": stamp.isoformat()})
            self.assertEqual(result["series"][0]["concurrent"], 3)
            self.assertEqual(result["series"][0]["errors"], 0)
            self.assertNotIn("throttles", result["series"][0])
            queries = client.get_metric_data.call_args.kwargs["MetricDataQueries"]
            self.assertEqual(queries[0]["MetricStat"]["Stat"], "Maximum")
            self.assertTrue(all(q["MetricStat"]["Period"] == 60 for q in queries))


if __name__ == "__main__": unittest.main()
