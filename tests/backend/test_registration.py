import base64
import json
import sys
import unittest
import uuid
from pathlib import Path
from unittest.mock import Mock, patch

from botocore.exceptions import ClientError

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'backend' / 'lambda'))
import app
from booking import BookingService, validate_booking, TICKET_FIELDS
from repository import EventRepository
from service import ApiError


def event_item(**changes):
    return {'id': 'example', 'title': 'Example', 'category': 'Công nghệ',
            'dateTime': '2099-01-01T00:00:00+07:00', 'salesOpenAt': None,
            'location': 'Local', 'organizer': 'Workshop', 'capacity': 10,
            'remainingSeats': 1, 'summary': 'Summary', 'description': 'Description',
            'registrationOpen': True, **changes}


class BookingTests(unittest.TestCase):
    def setUp(self):
        self.repo = Mock()
        self.repo.get_event.return_value = event_item()
        self.repo.get_user_item.return_value = None
        self.service = BookingService(self.repo)
        self.user = {'userId': str(uuid.uuid4()), 'fullName': 'Người thử', 'email': 'test@example.com'}
        self.key = str(uuid.uuid4())

    def assert_code(self, code, action):
        with self.assertRaises(ApiError) as caught:
            action()
        self.assertEqual(caught.exception.code, code)
        return caught.exception

    def test_body_cannot_inject_identity_or_seats(self):
        for body in [None, [], {'userId': 'other'}, {'email': 'other@example.com'},
                     {'fullName': 'Other'}, {'capacity': 5}, {'phone': None}, {'phone': 'x' * 33}]:
            with self.subTest(body=body):
                self.assert_code('VALIDATION_ERROR', lambda: validate_booking('example', body, self.key))
        for key in [None, '', 'guessable', str(uuid.uuid1()), self.key.upper()]:
            self.assert_code('VALIDATION_ERROR', lambda: validate_booking('example', {}, key))

    def test_optional_phone_has_stable_fingerprint(self):
        self.assertEqual(validate_booking('example', {}, self.key), validate_booking('example', {'phone': ' '}, self.key))
        self.assertNotEqual(validate_booking('example', {'phone': '1'}, self.key)[1], validate_booking('other', {'phone': '1'}, self.key)[1])

    def test_new_ticket_uses_session_identity(self):
        ticket, replay = self.service.register('example', {'phone': ' 123 '}, self.user, self.key)
        self.assertFalse(replay)
        self.assertEqual(set(ticket), set(TICKET_FIELDS))
        self.assertEqual(ticket['userId'], self.user['userId'])
        self.assertEqual(ticket['email'], self.user['email'])
        self.assertEqual(ticket['phone'], '123')
        self.assertEqual(uuid.UUID(ticket['id']).version, 4)
        self.repo.create_booking.assert_called_once()

    def test_replay_survives_full_or_closed_event(self):
        ticket, _ = self.service.register('example', {}, self.user, self.key)
        fingerprint = validate_booking('example', {}, self.key)[1]
        self.repo.get_user_item.return_value = {'fingerprint': fingerprint, 'registration': ticket}
        self.repo.get_event.return_value = event_item(remainingSeats=0, registrationOpen=False)
        self.repo.get_event.reset_mock()
        self.assertEqual(self.service.register('example', {}, self.user, self.key), (ticket, True))
        self.repo.get_event.assert_called_with("example")
        self.assertEqual(self.repo.create_booking.call_count, 1)

    def test_same_key_different_body_is_rejected(self):
        self.repo.get_user_item.return_value = {'fingerprint': 'different', 'registration': {}}
        self.assert_code('IDEMPOTENCY_KEY_REUSED', lambda: self.service.register('example', {}, self.user, self.key))
        self.repo.create_booking.assert_not_called()

    def test_commit_between_idempotency_and_owner_read_is_replayed(self):
        ticket = {'id': str(uuid.uuid4()), 'eventId': 'example'}
        fingerprint = validate_booking('example', {}, self.key)[1]
        self.repo.get_user_item.side_effect = [None, {'registrationId': ticket['id']},
                                               {'fingerprint': fingerprint, 'registration': ticket}]
        self.assertEqual(self.service.register('example', {}, self.user, self.key), (ticket, True))
        self.repo.create_booking.assert_not_called()

    def test_new_key_same_user_event_is_duplicate_with_owned_id(self):
        ticket_id = str(uuid.uuid4())
        self.repo.get_user_item.side_effect = [None, {'registrationId': ticket_id}, None]
        error = self.assert_code('DUPLICATE_REGISTRATION', lambda: self.service.register('example', {}, self.user, self.key))
        self.assertEqual(error.details['registrationId'], ticket_id)
        self.repo.create_booking.assert_not_called()

    def test_closed_full_not_open_and_ended(self):
        for changes, code in [({'remainingSeats': 0}, 'EVENT_FULL'), ({'registrationOpen': False}, 'REGISTRATION_CLOSED'),
                              ({'dateTime': '2000-01-01T00:00:00Z'}, 'REGISTRATION_CLOSED'),
                              ({'salesOpenAt': '2098-01-01T00:00:00Z'}, 'SALES_NOT_OPEN')]:
            with self.subTest(code=code):
                self.repo.get_event.return_value = event_item(**changes)
                self.assert_code(code, lambda: self.service.register('example', {}, self.user, self.key))
        self.repo.create_booking.assert_not_called()

    def test_conflict_retries_same_ticket_and_eventually_returns(self):
        conflict = ClientError({'Error': {'Code': 'TransactionCanceledException'}, 'CancellationReasons': [{'Code': 'TransactionConflict'}]}, 'TransactWriteItems')
        self.repo.create_booking.side_effect = [conflict, None]
        with patch('booking.time.sleep'):
            ticket, _ = self.service.register('example', {}, self.user, self.key)
        self.assertEqual(self.repo.create_booking.call_count, 2)
        self.assertTrue(all(call.args[0]['id'] == ticket['id'] for call in self.repo.create_booking.call_args_list))

    def test_unresolved_conflict_is_busy_not_full(self):
        self.repo.create_booking.side_effect = ClientError({'Error': {'Code': 'TransactionCanceledException'}}, 'TransactWriteItems')
        with patch('booking.time.sleep'):
            error = self.assert_code('REGISTRATION_BUSY', lambda: self.service.register('example', {}, self.user, self.key))
        self.assertEqual(error.status, 503)
        self.assertEqual(self.repo.create_booking.call_count, 4)

    def test_legacy_and_other_owner_are_not_readable(self):
        ticket_id = str(uuid.uuid4())
        for item in [None, {'id': ticket_id}, {'id': ticket_id, 'userId': 'other'}]:
            self.repo.get_registration.return_value = item
            self.assert_code('REGISTRATION_NOT_FOUND', lambda: self.service.get_registration(ticket_id, self.user['userId']))
        self.assert_code('VALIDATION_ERROR', lambda: self.service.get_registration('bad-id', self.user['userId']))

    def test_owner_read_does_not_return_internal_fields(self):
        ticket, _ = self.service.register('example', {}, self.user, self.key)
        self.repo.get_registration.return_value = {**ticket, 'PK': 'private', 'entityType': 'REGISTRATION'}
        self.assertEqual(self.service.get_registration(ticket['id'], self.user['userId']), ticket)

    def test_my_tickets_uses_only_user_references(self):
        ticket, _ = self.service.register('example', {}, self.user, self.key)
        self.repo.list_user_registrations.return_value = [{'registrationId': ticket['id']}]
        self.repo.get_registration.return_value = ticket
        self.assertEqual(self.service.list_registrations(self.user['userId']), {'registrations': [ticket]})
        self.repo.list_user_registrations.assert_called_once_with(self.user['userId'])

    def test_http_requires_auth_and_exposes_new_vs_replay(self):
        event = {'routeKey': 'POST /events/{eventId}/registrations', 'pathParameters': {'eventId': 'example'},
                 'headers': {'content-type': 'application/json', 'idempotency-key': self.key}, 'body': '{}'}
        with patch('app.local_table'), patch('app.EventRepository', return_value=self.repo), patch('app.BuyerAuthService') as auth:
            auth.return_value.require_user.side_effect = ApiError(401, 'AUTH_REQUIRED', 'Login')
            self.assertEqual(app.lambda_handler(event, None)['statusCode'], 401)
            auth.return_value.require_user.side_effect = None
            auth.return_value.require_user.return_value = {'user': self.user}
            result = app.lambda_handler(event, None)
            self.assertEqual(result['statusCode'], 201)
            ticket = json.loads(result['body'])
            self.assertEqual(result['headers']['Location'], '/registrations/' + ticket['id'])
            self.assertEqual(result['headers']['Idempotent-Replayed'], 'false')
            self.repo.get_user_item.return_value = {'fingerprint': validate_booking('example', {}, self.key)[1], 'registration': ticket}
            result = app.lambda_handler(event, None)
            self.assertEqual(result['statusCode'], 200)
            self.assertEqual(result['headers']['Idempotent-Replayed'], 'true')
            self.assertEqual(json.loads(result['body']), ticket)

    def test_body_parser_handles_v2_encoding_and_bad_json(self):
        body = {'phone': '123'}
        encoded = base64.b64encode(json.dumps(body).encode()).decode()
        self.assertEqual(app.registration_body({'headers': {'Content-Type': 'application/json; charset=utf-8'}, 'isBase64Encoded': True, 'body': encoded}), body)
        for event, status in [({'headers': {}, 'body': '{}'}, 415), ({'headers': {'content-type': 'application/json'}, 'body': '{'}, 400)]:
            with self.assertRaises(ApiError) as caught:
                app.registration_body(event)
            self.assertEqual(caught.exception.status, status)

    def test_transaction_has_four_atomic_guarded_writes(self):
        ticket, _ = self.service.register('example', {}, self.user, self.key)
        table = Mock(name='table')
        table.name = 'fcaj-event-workshop-local-test'
        table.meta.client.meta.endpoint_url = 'http://fcaj-dynamodb-local:8000'
        with patch('repository.local_client') as client:
            EventRepository(table).create_booking(ticket, self.key, 'fingerprint', 123000)
            writes = client.return_value.transact_write_items.call_args.kwargs['TransactItems']
        self.assertEqual(len(writes), 4)
        self.assertIn('remainingSeats >= :one', writes[0]['Update']['ConditionExpression'])
        self.assertIn('salesOpenAtEpochMs <= :now', writes[0]['Update']['ConditionExpression'])
        self.assertTrue(all('ConditionExpression' in item['Put'] for item in writes[1:]))


if __name__ == '__main__':
    unittest.main()
