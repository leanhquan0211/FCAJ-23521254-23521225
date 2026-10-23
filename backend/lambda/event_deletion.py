"""Resumable event cleanup. Never remove a user's account or another event's tickets."""
from botocore.exceptions import ClientError

from service import ApiError


def belongs_to_event(item, event_id):
    pk, sk = item['PK'], item['SK']
    if pk == f'EVENT#{event_id}':  # Legacy email references.
        return True
    if pk.startswith('REGISTRATION#') and item.get('eventId') == event_id:
        return True
    if pk.startswith('USER#'):
        if sk == f'REGISTRATION#{event_id}':
            return True
        if sk.startswith('IDEMPOTENCY#') and item.get('registration', {}).get('eventId') == event_id:
            return True
    return False


class EventDeletionService:
    def __init__(self, repository):
        self.repository = repository
        self.table = repository.table

    def delete(self, event_id, version):
        current = self.repository.get_event(event_id)
        if current is None:
            # Safe to retry when the final success response was lost.
            return {'deleted': True}
        if current.get('version', 0) != version:
            raise ApiError(409, 'EVENT_CHANGED', 'Sự kiện đã thay đổi. Hãy tải lại danh sách.')
        key = {'PK': 'EVENTS', 'SK': f'EVENT#{event_id}'}
        if not current.get('deleting'):
            try:
                result = self.table.update_item(
                    Key=key, UpdateExpression='SET deleting = :yes, registrationOpen = :no',
                    ConditionExpression='attribute_exists(PK) AND (attribute_not_exists(#v) OR #v = :v)',
                    ExpressionAttributeNames={'#v': 'version'},
                    ExpressionAttributeValues={':yes': True, ':no': False, ':v': version},
                    ReturnValues='ALL_NEW')
                current = result['Attributes']
            except ClientError as exc:
                if exc.response['Error']['Code'] == 'ConditionalCheckFailedException':
                    raise ApiError(409, 'EVENT_CHANGED', 'Sự kiện vừa thay đổi. Hãy tải lại danh sách.') from None
                raise
        cursor = current.get('deletionCursor')
        guard = {'ConditionExpression': 'deleting = :yes AND (attribute_not_exists(#v) OR #v = :v)',
                 'ExpressionAttributeNames': {'#v': 'version'},
                 'ExpressionAttributeValues': {':yes': True, ':v': version}}
        # Bound one request. Persist progress only after all deletes on that page succeeded.
        # Scan supports pre-v4 records too; an event index is a future optimization.
        for _ in range(5):
            params = {'ConsistentRead': True, 'Limit': 100}
            if cursor:
                params['ExclusiveStartKey'] = cursor
            page = self.table.scan(**params)
            with self.table.batch_writer() as batch:
                for item in page.get('Items', []):
                    if belongs_to_event(item, event_id):
                        batch.delete_item(Key={'PK': item['PK'], 'SK': item['SK']})
            cursor = page.get('LastEvaluatedKey')
            if not cursor:
                self.table.delete_item(Key=key, **guard)
                return {'deleted': True}
            self.table.update_item(
                Key=key, UpdateExpression='SET deletionCursor = :cursor',
                **{**guard, 'ExpressionAttributeValues': {**guard['ExpressionAttributeValues'], ':cursor': cursor}})
        return {'deleted': False, 'deleting': True, 'version': version}
