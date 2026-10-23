import uuid

from boto3.dynamodb.conditions import Key
from boto3.dynamodb.types import TypeSerializer

from configuration import local_client


class EventRepository:
    def __init__(self, table):
        self.table = table

    def health(self):
        result = self.table.meta.client.describe_table(TableName=self.table.name)
        if result["Table"]["TableStatus"] != "ACTIVE":
            raise RuntimeError("Table is not active")
        self.table.query(KeyConditionExpression=Key("PK").eq("EVENTS"), Limit=1)
        return self.table.name

    def list_events(self):
        items = []
        params = {"KeyConditionExpression": Key("PK").eq("EVENTS"), "ConsistentRead": True}
        while True:
            result = self.table.query(**params)
            items.extend(result.get("Items", []))
            if "LastEvaluatedKey" not in result:
                return items
            params["ExclusiveStartKey"] = result["LastEvaluatedKey"]

    def get_event(self, event_id):
        return self.table.get_item(
            Key={"PK": "EVENTS", "SK": f"EVENT#{event_id}"}, ConsistentRead=True,
        ).get("Item")

    def insert_event(self, item):
        self.table.put_item(Item=item, ConditionExpression="attribute_not_exists(PK) AND attribute_not_exists(SK)")

    def event_guard(self, current):
        # Both seats and admin version must still match: never overwrite a concurrent booking.
        return {
            "ConditionExpression": "attribute_not_exists(deleting) AND #capacity = :capacity AND remainingSeats = :seats AND (attribute_not_exists(#version) OR #version = :version)",
            "ExpressionAttributeNames": {"#version": "version", "#capacity": "capacity"},
            "ExpressionAttributeValues": {":capacity": current["capacity"], ":seats": current["remainingSeats"], ":version": current.get("version", 0)},
        }

    def replace_event(self, current, item):
        self.table.put_item(Item=item, **self.event_guard(current))

    def delete_event(self, current):
        self.table.delete_item(Key={"PK": "EVENTS", "SK": current["SK"]}, **self.event_guard(current))

    def get_registration(self, registration_id):
        return self.table.get_item(
            Key={"PK": f"REGISTRATION#{registration_id}", "SK": "METADATA"}, ConsistentRead=True,
        ).get("Item")

    def get_user_item(self, user_id, sort_key):
        return self.table.get_item(
            Key={"PK": f"USER#{user_id}", "SK": sort_key}, ConsistentRead=True,
        ).get("Item")

    def list_user_registrations(self, user_id):
        items = []
        params = {"KeyConditionExpression": Key("PK").eq(f"USER#{user_id}") & Key("SK").begins_with("REGISTRATION#"),
                  "ConsistentRead": True}
        while True:
            result = self.table.query(**params)
            items.extend(result.get("Items", []))
            if "LastEvaluatedKey" not in result:
                return items
            params["ExclusiveStartKey"] = result["LastEvaluatedKey"]

    def create_booking(self, registration, key, fingerprint, now_ms):
        """Seat, owner reference, ticket and HTTP replay record commit together."""
        client = local_client(self.table.meta.client.meta.endpoint_url, self.table.name)
        serializer = TypeSerializer()

        def attributes(values):
            return {name: serializer.serialize(value) for name, value in values.items()}

        user_pk = f"USER#{registration['userId']}"
        new_items = [
            {"PK": user_pk, "SK": f"REGISTRATION#{registration['eventId']}",
             "registrationId": registration["id"], "eventId": registration["eventId"],
             "createdAt": registration["createdAt"], "entityType": "USER_REGISTRATION"},
            {**registration, "PK": f"REGISTRATION#{registration['id']}", "SK": "METADATA", "entityType": "REGISTRATION"},
            {"PK": user_pk, "SK": f"IDEMPOTENCY#{key}", "fingerprint": fingerprint,
             "registrationId": registration["id"], "registration": registration, "entityType": "IDEMPOTENCY"},
        ]
        client.transact_write_items(
            # Stable within SDK retries. Conditional owner/key writes protect new HTTP invocations.
            ClientRequestToken=uuid.uuid4().hex,
            TransactItems=[{"Update": {
                "TableName": self.table.name,
                "Key": attributes({"PK": "EVENTS", "SK": f"EVENT#{registration['eventId']}"}),
                "UpdateExpression": "SET remainingSeats = remainingSeats - :one",
                "ConditionExpression": (
                    "attribute_exists(PK) AND attribute_not_exists(deleting) AND registrationOpen = :open AND remainingSeats >= :one "
                    "AND (attribute_not_exists(salesOpenAtEpochMs) OR salesOpenAtEpochMs <= :now) "
                    "AND ((attribute_exists(startsAtEpochMs) AND startsAtEpochMs > :now) "
                    "OR (attribute_not_exists(startsAtEpochMs) AND startsAtEpoch > :seconds))"),
                "ExpressionAttributeValues": attributes({":one": 1, ":open": True, ":now": now_ms, ":seconds": now_ms // 1000}),
            }}] + [{"Put": {"TableName": self.table.name, "Item": attributes(item),
                            "ConditionExpression": "attribute_not_exists(PK) AND attribute_not_exists(SK)"}} for item in new_items],
        )
