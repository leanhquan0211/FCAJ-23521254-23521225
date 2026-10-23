"""One browser cookie for both roles; account records remain separate."""
import hmac
import secrets
import time

from auth import SESSION_SECONDS, request_headers, session_cookie, session_key, session_token, verify_origin
from buyer_repository import BuyerRepository
from service import ApiError

COOKIE_NAME = 'event_session'


def shared_key(token):
    return 'APP_' + session_key(token)


def response_cookies(cookie):
    # Old cookies are never accepted for authorization, and disappear on login/logout.
    return [cookie, session_cookie('', clear=True, cookie_name='event_admin_session'),
            session_cookie('', clear=True, cookie_name='event_user_session')]


class SessionService:
    def __init__(self, repository):
        self.repository = repository

    def issue(self, event, identity):
        self.revoke_present(event)
        token = secrets.token_urlsafe(32)
        session = {**identity, 'csrfToken': secrets.token_urlsafe(32),
                   'expiresAt': int(time.time()) + SESSION_SECONDS}
        output = self.output(session)
        self.repository.create(shared_key(token), session)
        return output, session_cookie(token, cookie_name=COOKIE_NAME)

    def revoke_present(self, event):
        for cookie, prefix in [(COOKIE_NAME, 'APP_SESSION#'),
                               ('event_admin_session', 'SESSION#'), ('event_user_session', 'USER_SESSION#')]:
            token = session_token(event, cookie)
            if token:
                digest = session_key(token).split('#', 1)[1]
                self.repository.delete(prefix + digest)

    def output(self, session):
        if session.get('role') not in {'admin', 'user'}:
            raise ApiError(403, 'FORBIDDEN', 'Tài khoản không có quyền hợp lệ.')
        if session.get('role') == 'admin':
            account = self.repository.get('ADMIN#' + session['username'])
            if not account or account.get('role') != 'admin':
                raise ApiError(403, 'FORBIDDEN', 'Tài khoản không còn quyền quản trị.')
            return {key: session[key] for key in ('username', 'role', 'csrfToken', 'expiresAt')}
        from buyer_auth import user_output
        account = BuyerRepository(self.repository.table).user(session['userId'])
        if not account or account.get('role') != 'user':
            raise ApiError(403, 'FORBIDDEN', 'Tài khoản không còn quyền người tham gia.')
        return {'role': 'user', 'user': user_output(account),
                'csrfToken': session['csrfToken'], 'expiresAt': session['expiresAt']}

    def require(self, event, role=None, mutation=False):
        token = session_token(event, COOKIE_NAME)
        session = self.repository.get(shared_key(token)) if token else None
        if not session or int(session['expiresAt']) <= int(time.time()):
            raise ApiError(401, 'AUTH_REQUIRED', 'Vui lòng đăng nhập để tiếp tục.')
        output = self.output(session)
        if role and output['role'] != role:
            raise ApiError(403, 'FORBIDDEN', 'Tài khoản không có quyền sử dụng chức năng này.')
        if mutation:
            verify_origin(event)
            if not hmac.compare_digest(request_headers(event).get('x-csrf-token', '').encode(), session['csrfToken'].encode()):
                raise ApiError(403, 'CSRF_FAILED', 'Phiên thao tác đã thay đổi. Vui lòng tải lại trang.')
        return output

    def login(self, event, body):
        from auth import AuthService
        from buyer_auth import BuyerAuthService
        if not isinstance(body, dict) or set(body) not in ({'identifier', 'password'}, {'email', 'password'}):
            raise ApiError(400, 'VALIDATION_ERROR', 'Cần tên đăng nhập hoặc email và mật khẩu.')
        identifier = body.get('identifier', body.get('email'))
        if not isinstance(identifier, str):
            raise ApiError(400, 'VALIDATION_ERROR', 'Tên đăng nhập hoặc email không hợp lệ.')
        if 'email' in body or '@' in identifier:
            return BuyerAuthService(BuyerRepository(self.repository.table)).login(
                event, {'email': identifier, 'password': body['password']})
        return AuthService(self.repository).login(event, {'username': identifier, 'password': body['password']})

    def logout(self, event):
        self.require(event, mutation=True)
        self.revoke_present(event)
        return session_cookie('', clear=True, cookie_name=COOKIE_NAME)
