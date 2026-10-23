"""Admin account storage and atomic ticket cancellation; local table only."""
from boto3.dynamodb.conditions import Attr, Key
from boto3.dynamodb.types import TypeSerializer
from botocore.exceptions import ClientError

from buyer_repository import BuyerRepository
from configuration import local_client
from repository import EventRepository
from service import ApiError


class AccountRepository(BuyerRepository):
    def transaction(self, operations):
        serialize = TypeSerializer().serialize
        items = []
        for kind, values in operations:
            values = {**values, 'TableName': self.table.name}
            for field in ('Key', 'Item', 'ExpressionAttributeValues'):
                if field in values:
                    values[field] = {key: serialize(value) for key, value in values[field].items()}
            items.append({kind: values})
        local_client(self.table.meta.client.meta.endpoint_url, self.table.name).transact_write_items(TransactItems=items)

    def list_users(self):
        params = {'ConsistentRead': True,
                  'FilterExpression': Attr('SK').eq('PROFILE') & Attr('role').eq('user'),
                  'ProjectionExpression': 'userId, fullName, email, #role, createdAt, #version, deleting',
                  'ExpressionAttributeNames': {'#role': 'role', '#version': 'version'}}
        items = []
        while True:
            page = self.table.scan(**params)
            items.extend(page.get('Items', []))
            if not page.get('LastEvaluatedKey'):
                return items
            params['ExclusiveStartKey'] = page['LastEvaluatedKey']

    @staticmethod
    def profile_guard(version):
        return {'ConditionExpression': '#role = :user AND attribute_not_exists(deleting) AND (attribute_not_exists(#v) OR #v = :v)',
                'ExpressionAttributeNames': {'#role': 'role', '#v': 'version'},
                'ExpressionAttributeValues': {':user': 'user', ':v': version}}

    def update_user(self, current, full_name, email):
        user_id = current['userId']
        updated = {**current, 'fullName': full_name, 'email': email, 'version': current.get('version', 0) + 1}
        operations = [('Put', {'Item': updated, **self.profile_guard(current.get('version', 0))})]
        if email != current['email']:
            operations.extend([
                ('Put', {'Item': {'PK': f'USER_EMAIL#{email}', 'SK': 'METADATA', 'userId': user_id, 'entityType': 'USER_EMAIL'},
                         'ConditionExpression': 'attribute_not_exists(PK)'}),
                ('Delete', {'Key': {'PK': f"USER_EMAIL#{current['email']}", 'SK': 'METADATA'},
                            'ConditionExpression': 'userId = :id', 'ExpressionAttributeValues': {':id': user_id}}),
            ])
        self.transaction(operations)
        return updated

    def lock_user(self, current):
        guard = self.profile_guard(current.get('version', 0))
        self.table.update_item(Key={'PK': f"USER#{current['userId']}", 'SK': 'PROFILE'},
                               UpdateExpression='SET deleting = :yes',
                               **{**guard, 'ExpressionAttributeValues': {**guard['ExpressionAttributeValues'], ':yes': True}})

    def user_items(self, user_id, prefix=None, limit=25):
        condition = Key('PK').eq(f'USER#{user_id}')
        if prefix:
            condition &= Key('SK').begins_with(prefix)
        return self.table.query(KeyConditionExpression=condition, ConsistentRead=True, Limit=limit).get('Items', [])

    def cancel_ticket(self, user_id, reference):
        """Reference removal and seat refund commit together, so retries cannot refund twice."""
        events = EventRepository(self.table)
        for _ in range(4):
            current = events.get_user_item(user_id, reference['SK'])
            if not current:
                return
            event = events.get_event(current['eventId'])
            refund = event is not None and not event.get('deleting')
            operations = [
                ('ConditionCheck', {'Key': {'PK': f'USER#{user_id}', 'SK': 'PROFILE'},
                                    'ConditionExpression': 'deleting = :yes', 'ExpressionAttributeValues': {':yes': True}}),
                ('Delete', {'Key': {'PK': f'USER#{user_id}', 'SK': current['SK']},
                            'ConditionExpression': 'registrationId = :id', 'ExpressionAttributeValues': {':id': current['registrationId']}}),
                ('Delete', {'Key': {'PK': f"REGISTRATION#{current['registrationId']}", 'SK': 'METADATA'},
                            'ConditionExpression': 'userId = :user' if refund else 'attribute_not_exists(PK) OR userId = :user',
                            'ExpressionAttributeValues': {':user': user_id}}),
            ]
            event_key = {'PK': 'EVENTS', 'SK': f"EVENT#{current['eventId']}"}
            if refund:
                operations.append(('Update', {'Key': event_key, 'UpdateExpression': 'SET remainingSeats = remainingSeats + :one',
                    'ConditionExpression': 'attribute_exists(PK) AND attribute_not_exists(deleting) AND remainingSeats < #capacity',
                    'ExpressionAttributeNames': {'#capacity': 'capacity'}, 'ExpressionAttributeValues': {':one': 1}}))
            else:
                operations.append(('ConditionCheck', {'Key': event_key,
                    'ConditionExpression': 'attribute_not_exists(PK) OR deleting = :yes', 'ExpressionAttributeValues': {':yes': True}}))
            try:
                self.transaction(operations)
                return
            except ClientError as exc:
                if exc.response['Error']['Code'] != 'TransactionCanceledException':
                    raise
        raise ApiError(503, 'ACCOUNT_BUSY', 'Tài khoản đang được xử lý. Vui lòng tiếp tục xóa.', headers={'Retry-After': '1'})

    def cleanup_user(self, current):
        user_id = current['userId']
        # Bound cancellations per request; the durable owner references are the work queue.
        for reference in self.user_items(user_id, 'REGISTRATION#', limit=10):
            self.cancel_ticket(user_id, reference)
        if self.user_items(user_id, 'REGISTRATION#', limit=1):
            return False
        metadata = [item for item in self.user_items(user_id) if item['SK'] != 'PROFILE']
        if metadata:
            with self.table.batch_writer() as batch:
                for item in metadata:
                    batch.delete_item(Key={'PK': item['PK'], 'SK': item['SK']})
            return False
        cursor = current.get('deletionCursor')
        for _ in range(5):
            params = {'ConsistentRead': True, 'Limit': 100}
            if cursor:
                params['ExclusiveStartKey'] = cursor
            page = self.table.scan(**params)
            with self.table.batch_writer() as batch:
                for item in page.get('Items', []):
                    if item['PK'].startswith(('APP_SESSION#', 'USER_SESSION#')) and item.get('userId') == user_id:
                        batch.delete_item(Key={'PK': item['PK'], 'SK': item['SK']})
                    elif item['PK'].startswith('REGISTRATION#') and item.get('userId') == user_id:
                        # Event cleanup may have removed the reference first, then stopped.
                        event = EventRepository(self.table).get_event(item['eventId'])
                        if event and not event.get('deleting'):
                            raise ApiError(503, 'ACCOUNT_BUSY', 'Vé chưa đồng bộ với ghi danh. Vui lòng kiểm tra trước khi tiếp tục xóa.')
                        batch.delete_item(Key={'PK': item['PK'], 'SK': item['SK']})
            cursor = page.get('LastEvaluatedKey')
            if not cursor:
                self.transaction([
                    ('Delete', {'Key': {'PK': f'USER#{user_id}', 'SK': 'PROFILE'},
                                'ConditionExpression': 'deleting = :yes', 'ExpressionAttributeValues': {':yes': True}}),
                    ('Delete', {'Key': {'PK': f"USER_EMAIL#{current['email']}", 'SK': 'METADATA'},
                                'ConditionExpression': 'userId = :user', 'ExpressionAttributeValues': {':user': user_id}}),
                ])
                return True
            self.table.update_item(Key={'PK': f'USER#{user_id}', 'SK': 'PROFILE'},
                UpdateExpression='SET deletionCursor = :cursor', ConditionExpression='deleting = :yes',
                ExpressionAttributeValues={':cursor': cursor, ':yes': True})
        return False
