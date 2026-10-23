"""Account API/browser smoke test. Only writes to a dedicated local test table."""
import argparse
import json
import secrets
import subprocess
import uuid
from pathlib import Path

from check_admin_api import Client
from auth import password_record
from auth_repository import AuthRepository
from configuration import local_table


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:3002')
    parser.add_argument('--browser', action='store_true')
    args = parser.parse_args()
    from urllib.parse import urlparse
    url = urlparse(args.base_url)
    if url.scheme != 'http' or url.hostname not in {'localhost', '127.0.0.1'} or not url.port:
        parser.error('Explicit localhost URL required')
    admin = Client(args.base_url)
    health, _ = admin.call('/health')
    assert health['apiContractVersion'] == '4.1'
    table_name = health['database']['table']
    assert table_name.startswith('fcaj-event-workshop-local-test-'), 'No writes: dedicated table required'
    username, password = 'accounts-' + uuid.uuid4().hex, secrets.token_urlsafe(32)
    AuthRepository(local_table('http://127.0.0.1:8000', table_name)).create(
        'ADMIN#' + username, {'username': username, 'role': 'admin', **password_record(password)})
    admin.csrf = admin.call('/auth/login', 'POST', {'identifier': username, 'password': password})[0]['csrfToken']
    guest = Client(args.base_url)
    guest.call('/admin/users', expected=401)
    def buyer(name):
        client = Client(args.base_url)
        email = f'account-{uuid.uuid4().hex}@example.com'
        user, _ = client.call('/auth/register', 'POST', {'fullName': name, 'email': email, 'password': password}, 201)
        client.csrf = client.call('/auth/login', 'POST', {'identifier': email, 'password': password})[0]['csrfToken']
        return client, user['user']
    owner, user = buyer('Original Buyer')
    other, other_user = buyer('Other Buyer')
    owner.call('/admin/users', expected=403)
    path = '/admin/users/' + user['userId']
    for method in ['PUT', 'DELETE']:
        owner.call(path, method, {'version': 1}, 403)
        guest.call(path, method, {'version': 1}, 401)
    fixture = {'title': 'Account API fixture', 'category': 'Công nghệ', 'dateTime': '2099-01-01T00:00:00Z',
               'salesOpenAt': None, 'location': 'Local', 'organizer': 'Test', 'capacity': 10,
               'registrationOpen': True, 'summary': 'Fixture', 'description': 'Fixture'}
    first = admin.call('/admin/events', 'POST', fixture, 201)[0]
    second = admin.call('/admin/events', 'POST', fixture, 201)[0]
    def book(client, event):
        return client.call(f"/events/{event['id']}/registrations", 'POST', {}, 201,
                           extra_headers={'Idempotency-Key': str(uuid.uuid4())})[0]
    original_ticket = book(owner, first)
    other_ticket = book(other, first)
    managed = next(item for item in admin.call('/admin/users')[0]['users'] if item['userId'] == user['userId'])
    assert set(managed) == {'userId', 'fullName', 'email', 'role', 'createdAt', 'version', 'deleting'}
    new_email = f'updated-{uuid.uuid4().hex}@example.com'
    body = {'fullName': 'Updated Buyer', 'email': new_email, 'version': managed['version']}
    admin.call(path, 'PUT', body, 403, csrf=False)
    admin.call(path, 'PUT', body, 403, origin='https://attacker.example')
    admin.call(path, 'PUT', {**body, 'role': 'admin'}, 400)
    admin.call(path, 'PUT', {**body, 'password': password}, 400)
    admin.call(path, 'PUT', {**body, 'email': 'invalid'}, 400)
    admin.call(path, 'PUT', {**body, 'email': other_user['email']}, 409)
    updated = admin.call(path, 'PUT', body)[0]
    assert updated['email'] == new_email and updated['version'] == 2
    admin.call(path, 'PUT', body, 409)
    assert owner.call('/auth/session')[0]['user']['email'] == new_email
    assert owner.call(f"/registrations/{original_ticket['id']}")[0]['email'] == user['email']
    assert book(owner, second)['email'] == new_email
    for _ in range(40):
        result, _ = admin.call(path, 'DELETE', {'version': updated['version']}, (200, 202))
        owner.call('/auth/session', expected=401)
        if result['deleted']:
            break
    assert result['deleted']
    admin.call(path, 'DELETE', {'version': updated['version']})
    assert admin.call(f"/events/{first['id']}")[0]['remainingSeats'] == 9
    assert admin.call(f"/events/{second['id']}")[0]['remainingSeats'] == 10
    assert other.call(f"/registrations/{other_ticket['id']}")[0]['id'] == other_ticket['id']
    guest.call('/auth/login', 'POST', {'identifier': new_email, 'password': password}, 401)
    print('PASS account HTTP: permissions, CSRF, edit/email uniqueness, snapshot, delete/refund/retry/session revocation', flush=True)
    if args.browser:
        browser_buyer, browser_user = buyer('Người tham gia kiểm tra giao diện')
        book(browser_buyer, first)
        script = Path(__file__).resolve().parents[2] / 'tests/frontend/check-accounts-browser.mjs'
        subprocess.run(['node', str(script)], input=json.dumps({'username': username, 'password': password,
            'userId': browser_user['userId'], 'email': browser_user['email'], 'duplicateEmail': other_user['email'],
            'eventId': first['id'], 'expectedSeats': 9}), text=True, check=True)
    print(json.dumps({'accounts': 'passed', 'contract': '4.1', 'table': table_name}))


if __name__ == '__main__':
    main()
