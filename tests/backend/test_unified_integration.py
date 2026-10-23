"""Shared-session and deletion regressions against a dedicated local test table."""
import os
import sys
import unittest
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'backend' / 'lambda'))
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'backend' / 'dynamodb_setup'))
from auth import password_record, session_key
from auth_repository import AuthRepository
from buyer_repository import BuyerRepository
from configuration import local_table
from init_db import initialize
from admin_events import AdminEventService
from booking import BookingService
from event_deletion import EventDeletionService, belongs_to_event
from repository import EventRepository
from service import ApiError, EventService
from session import SessionService, shared_key


@unittest.skipUnless(os.getenv('RUN_DYNAMODB_INTEGRATION') == '1', 'Opt-in local database tests')
class UnifiedIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        name = os.environ['DYNAMODB_TABLE']
        if not name.startswith('fcaj-event-workshop-local-test-'):
            raise RuntimeError('Dedicated test table required')
        cls.table = local_table(os.environ['DYNAMODB_ENDPOINT'], name)
        initialize(cls.table, seed_demo=False)

    def setUp(self):
        self.repo = EventRepository(self.table)
        self.bookings = BookingService(self.repo)

    def assert_code(self, code, action):
        with self.assertRaises(ApiError) as caught:
            action()
        self.assertEqual(caught.exception.code, code)

    def create_event(self, seats=200):
        return AdminEventService(self.repo).create({
            'title': 'Deletion fixture', 'category': 'Công nghệ', 'dateTime': '2099-01-01T00:00:00Z',
            'salesOpenAt': None, 'location': 'Local', 'organizer': 'Test', 'capacity': seats,
            'registrationOpen': True, 'summary': 'Fixture', 'description': 'Fixture'})

    def user(self):
        return {'userId': str(uuid.uuid4()), 'email': f'{uuid.uuid4().hex}@example.com',
                'fullName': 'Test Buyer', 'role': 'user', 'createdAt': '2026-10-23T00:00:00Z'}

    def finish_delete(self, event):
        for _ in range(30):
            result = EventDeletionService(self.repo).delete(event['id'], event['version'])
            if result.get('deleted'):
                return
        self.fail('Cleanup did not finish within the fixture limit')

    def test_switch_account_revokes_old_session_and_legacy_cookies_cannot_authorize(self):
        buyer_repo = BuyerRepository(self.table)
        user = self.user()
        password = uuid.uuid4().hex
        buyer_repo.create_user({**user, **password_record(password)})
        auth_repo = AuthRepository(self.table)
        username = 'test-' + uuid.uuid4().hex
        auth_repo.create('ADMIN#' + username, {'username': username, 'role': 'admin', **password_record(password)})
        service = SessionService(auth_repo)
        request = {'headers': {'origin': 'http://127.0.0.1:5173'}}
        buyer, buyer_cookie = service.login(request, {'identifier': user['email'], 'password': password})
        old_token = buyer_cookie.split(';')[0].split('=')[1]
        old_event = {**request, 'cookies': [buyer_cookie.split(';')[0]]}
        self.assertEqual(service.require(old_event)['user']['userId'], user['userId'])
        admin, admin_cookie = service.login(old_event, {'identifier': username, 'password': password})
        self.assertEqual(admin['role'], 'admin')
        self.assertIsNone(auth_repo.get(shared_key(old_token)))
        self.assert_code('AUTH_REQUIRED', lambda: service.require(old_event))
        admin_event = {**request, 'cookies': [admin_cookie.split(';')[0]]}
        self.assert_code('FORBIDDEN', lambda: service.require(admin_event, role='user'))
        legacy = 'a' * 43
        auth_repo.create(session_key(legacy), {'username': username, 'role': 'admin', 'expiresAt': 9999999999})
        self.assert_code('AUTH_REQUIRED', lambda: service.require({'cookies': [f'event_admin_session={legacy}']}))
        _, next_cookie = service.login({**admin_event, 'cookies': admin_event['cookies'] + [f'event_admin_session={legacy}']},
                                       {'identifier': user['email'], 'password': password})
        self.assertIsNone(auth_repo.get(session_key(legacy)))
        self.assert_code('AUTH_REQUIRED', lambda: service.require(admin_event))
        final_event = {'cookies': [next_cookie.split(';')[0]], 'headers': {
            'origin': 'http://127.0.0.1:5173', 'x-csrf-token': service.require({'cookies': [next_cookie.split(';')[0]]})['csrfToken']}}
        service.logout(final_event)
        self.assert_code('AUTH_REQUIRED', lambda: service.require(final_event))

    def test_delete_removes_only_event_tickets_and_preserves_account_session_other_event(self):
        user = self.user()
        BuyerRepository(self.table).create_user({**user, **password_record(uuid.uuid4().hex)})
        sessions = SessionService(AuthRepository(self.table))
        _, cookie = sessions.issue({}, {'userId': user['userId'], 'role': 'user'})
        first, other = self.create_event(), self.create_event()
        key = str(uuid.uuid4())
        ticket, _ = self.bookings.register(first['id'], {}, user, key)
        keep, _ = self.bookings.register(other['id'], {}, user, str(uuid.uuid4()))
        self.table.put_item(Item={'PK': 'EVENT#' + first['id'], 'SK': 'EMAIL#legacy@example.com', 'registrationId': ticket['id']})
        self.finish_delete(first)
        self.assertEqual(self.bookings.list_registrations(user['userId'])['registrations'], [keep])
        self.assertIsNotNone(BuyerRepository(self.table).user(user['userId']))
        self.assertEqual(sessions.require({'cookies': [cookie.split(';')[0]]})['user']['userId'], user['userId'])
        self.assert_code('REGISTRATION_NOT_FOUND', lambda: self.bookings.get_registration(ticket['id'], user['userId']))
        self.assert_code('EVENT_NOT_FOUND', lambda: self.bookings.register(first['id'], {}, user, key))
        self.assertEqual(EventDeletionService(self.repo).delete(first['id'], first['version']), {'deleted': True})
        self.assertIsNone(self.repo.get_user_item(user['userId'], f'IDEMPOTENCY#{key}'))

    def test_cleanup_resumes_after_failure_and_multiple_pages_without_exposing_tickets(self):
        event = self.create_event()
        user = self.user()
        ticket, _ = self.bookings.register(event['id'], {}, user, str(uuid.uuid4()))
        # Enough unrelated records to require a second HTTP-sized cleanup call.
        with self.table.batch_writer() as batch:
            for _ in range(550):
                batch.put_item(Item={'PK': 'TEST_FILLER#' + uuid.uuid4().hex, 'SK': 'METADATA'})
        original_scan = self.table.scan
        calls = 0
        def interrupted(**params):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise RuntimeError('Injected interruption after one completed page')
            return original_scan(**params)
        with patch.object(self.table, 'scan', side_effect=interrupted):
            with self.assertRaises(RuntimeError):
                EventDeletionService(self.repo).delete(event['id'], event['version'])
        locked = self.repo.get_event(event['id'])
        self.assertTrue(locked['deleting'])
        self.assertIn('deletionCursor', locked)
        self.assert_code('EVENT_NOT_FOUND', lambda: self.bookings.register(event['id'], {}, self.user(), str(uuid.uuid4())))
        self.assertEqual(self.bookings.list_registrations(user['userId']), {'registrations': []})
        self.finish_delete(event)
        self.assertIsNone(self.repo.get_registration(ticket['id']))

    def test_delete_many_tickets_and_booking_race_leave_no_event_records(self):
        event = self.create_event()
        # 40 tickets = 120 related items, beyond a single batch/transaction cleanup.
        for _ in range(40):
            self.bookings.register(event['id'], {}, self.user(), str(uuid.uuid4()))
        def book(_):
            try:
                self.bookings.register(event['id'], {}, self.user(), str(uuid.uuid4()))
            except ApiError as exc:
                self.assertIn(exc.code, {'EVENT_NOT_FOUND', 'REGISTRATION_CLOSED', 'REGISTRATION_BUSY'})
        with ThreadPoolExecutor(max_workers=9) as pool:
            futures = [pool.submit(book, index) for index in range(8)]
            futures.append(pool.submit(self.finish_delete, event))
            for future in futures:
                future.result()
        params = {'ConsistentRead': True}
        while True:
            page = self.table.scan(**params)
            self.assertFalse(any(belongs_to_event(item, event['id']) for item in page['Items']))
            if not page.get('LastEvaluatedKey'):
                break
            params['ExclusiveStartKey'] = page['LastEvaluatedKey']
        self.assertIsNone(self.repo.get_event(event['id']))
