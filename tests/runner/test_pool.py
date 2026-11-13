"""Credential pool tests never create website users or call AWS."""
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "load"))
from account_pool import AccountPool, protect


@unittest.skipUnless(os.name == "nt", "Windows DPAPI")
class PoolTests(unittest.TestCase):
    def test_encrypted_roundtrip_and_reuse_then_stale_pruning(self):
        with tempfile.TemporaryDirectory() as folder:
            settings = Mock(api_url="https://example.test/api", expected_table="events", expected_function_arn="arn:test", results=Path(folder))
            account = {"userId": "u1", "email": "lab-" + "a" * 24 + "-000@example.test", "password": "test-private-pool-value", "sourceRunId": "a" * 24}
            pool = AccountPool(settings)
            pool.add(account)
            self.assertNotIn(account["password"].encode(), pool.path.read_bytes())
            restored = AccountPool(settings)
            table = Mock()
            table.get_item.return_value = {"Item": {"userId": "u1", "email": account["email"], "role": "user"}}
            self.assertEqual(restored.available(table, 10), [account])
            table.get_item.return_value = {}
            self.assertEqual(restored.available(table, 10), [])
            self.assertEqual(AccountPool(settings).accounts, [])

    def test_different_deployment_does_not_load_old_pool(self):
        with tempfile.TemporaryDirectory() as folder:
            settings = Mock(api_url="https://old.test/api", expected_table="events", expected_function_arn="arn:test", results=Path(folder))
            old = AccountPool(settings)
            old.save()
            settings.api_url = "https://new.test/api"
            new = AccountPool(settings)
            self.assertNotEqual(old.path, new.path)
            self.assertEqual(new.accounts, [])


if __name__ == "__main__": unittest.main()
