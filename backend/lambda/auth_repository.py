"""Only this layer reads/writes administrator accounts and sessions."""
from botocore.exceptions import ClientError

from service import ApiError


class AuthRepository:
    def __init__(self, table):
        self.table = table

    def get(self, key):
        return self.table.get_item(Key={"PK": key, "SK": "METADATA"}, ConsistentRead=True).get("Item")

    def create(self, key, values):
        self.table.put_item(Item={**values, "PK": key, "SK": "METADATA"},
                            ConditionExpression="attribute_not_exists(PK)")

    def delete(self, key):
        self.table.delete_item(Key={"PK": key, "SK": "METADATA"})

    def count_login(self, key, limit, expires_at):
        # Atomic, shared across Lambda containers; count before password verification.
        try:
            self.table.update_item(
                Key={"PK": key, "SK": "METADATA"},
                UpdateExpression="SET expiresAt = :expiry ADD attempts :one",
                ConditionExpression="attribute_not_exists(attempts) OR attempts < :limit",
                ExpressionAttributeValues={":expiry": expires_at, ":one": 1, ":limit": limit},
            )
        except ClientError as exc:
            if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
                raise ApiError(429, "LOGIN_RATE_LIMITED", "Bạn đã thử đăng nhập nhiều lần. Vui lòng chờ tối đa 15 phút.") from None
            raise
