"""Admin-only user management; public signup still controls role and password."""
import uuid

from botocore.exceptions import ClientError

from buyer_auth import normalize_email, user_output
from service import ApiError


def account_output(account):
    return {**user_output(account), 'version': account.get('version', 0), 'deleting': account.get('deleting', False)}


class AdminAccountService:
    def __init__(self, repository):
        self.repository = repository

    def list_users(self):
        accounts = self.repository.list_users()
        accounts.sort(key=lambda account: (account['fullName'].casefold(), account['userId']))
        return {'users': [account_output(account) for account in accounts]}

    def current(self, user_id, body, fields):
        try:
            parsed = uuid.UUID(user_id or '')
            if parsed.version != 4 or str(parsed) != user_id:
                raise ValueError()
        except (ValueError, TypeError, AttributeError):
            raise ApiError(400, 'VALIDATION_ERROR', 'Mã tài khoản không hợp lệ.') from None
        if not isinstance(body, dict) or set(body) != fields or type(body.get('version')) is not int or body['version'] < 0:
            raise ApiError(400, 'VALIDATION_ERROR', 'Thông tin tài khoản hoặc phiên bản không hợp lệ.')
        account = self.repository.user(user_id)
        if account and (account.get('role') != 'user' or account.get('version', 0) != body['version']):
            raise ApiError(409, 'ACCOUNT_CHANGED', 'Tài khoản đã thay đổi. Hãy tải lại danh sách.')
        return account

    def update(self, user_id, body):
        account = self.current(user_id, body, {'fullName', 'email', 'version'})
        if not account:
            raise ApiError(404, 'ACCOUNT_NOT_FOUND', 'Không tìm thấy tài khoản.')
        if account.get('deleting'):
            raise ApiError(409, 'ACCOUNT_CHANGED', 'Tài khoản đang bị xóa nên không thể chỉnh sửa.')
        name = body['fullName']
        if not isinstance(name, str) or not 1 <= len(name.strip()) <= 120:
            raise ApiError(400, 'VALIDATION_ERROR', 'Họ tên cần từ 1 đến 120 ký tự.', {'fullName': 'Nhập họ tên hợp lệ.'})
        email = normalize_email(body['email'])
        try:
            return account_output(self.repository.update_user(account, name.strip(), email))
        except ClientError as exc:
            if exc.response['Error']['Code'] == 'TransactionCanceledException':
                owner = self.repository.account_by_email(email)
                if owner and owner['userId'] != user_id:
                    raise ApiError(409, 'EMAIL_ALREADY_EXISTS', 'Email đã thuộc tài khoản khác.', {'email': 'Hãy dùng email khác.'}) from None
                raise ApiError(409, 'ACCOUNT_CHANGED', 'Tài khoản vừa thay đổi. Hãy tải lại danh sách.') from None
            raise

    def delete(self, user_id, body):
        account = self.current(user_id, body, {'version'})
        if not account:
            return {'deleted': True}
        try:
            if not account.get('deleting'):
                self.repository.lock_user(account)
            deleted = self.repository.cleanup_user(account)
            return {'deleted': True} if deleted else {'deleted': False, 'deleting': True, 'version': body['version']}
        except ClientError as exc:
            if exc.response['Error']['Code'] in {'ConditionalCheckFailedException', 'TransactionCanceledException'}:
                if not self.repository.user(user_id):
                    return {'deleted': True}
                raise ApiError(409, 'ACCOUNT_CHANGED', 'Tài khoản vừa thay đổi. Hãy tải lại và tiếp tục xóa.') from None
            raise
