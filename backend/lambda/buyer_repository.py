"""Buyer profiles/email uniqueness. Session/counter primitives reuse the admin storage layer."""
from boto3.dynamodb.types import TypeSerializer

from auth_repository import AuthRepository
from configuration import local_client


class BuyerRepository(AuthRepository):
    def user(self, user_id):
        return self.table.get_item(
            Key={"PK": f"USER#{user_id}", "SK": "PROFILE"}, ConsistentRead=True,
        ).get("Item")

    def account_by_email(self, email):
        reference = self.get(f"USER_EMAIL#{email}")
        return self.user(reference["userId"]) if reference else None

    def create_user(self, account):
        serialize = TypeSerializer().serialize
        items = [
            {**account, "PK": f"USER#{account['userId']}", "SK": "PROFILE", "entityType": "USER"},
            {"PK": f"USER_EMAIL#{account['email']}", "SK": "METADATA",
             "userId": account["userId"], "entityType": "USER_EMAIL"},
        ]
        client = local_client(self.table.meta.client.meta.endpoint_url, self.table.name)
        client.transact_write_items(TransactItems=[{"Put": {
            "TableName": self.table.name,
            "Item": {key: serialize(value) for key, value in item.items()},
            "ConditionExpression": "attribute_not_exists(PK) AND attribute_not_exists(SK)",
        }} for item in items])
