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
            "ConditionExpression": "#capacity = :capacity AND remainingSeats = :seats AND (attribute_not_exists(#version) OR #version = :version)",
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

    def has_registration(self, event_id, email):
        return "Item" in self.table.get_item(
            Key={"PK": f"EVENT#{event_id}", "SK": f"EMAIL#{email}"}, ConsistentRead=True,
        )

    def create_registration(self, registration, now_epoch):
        # A separate low-level client avoids resource-client attribute transformations.
        client = local_client(self.table.meta.client.meta.endpoint_url, self.table.name)
        serializer = TypeSerializer()

        def attributes(values):
            return {key: serializer.serialize(value) for key, value in values.items()}

        client.transact_write_items(
            ClientRequestToken=registration["id"],
            TransactItems=[
                {"Update": {
                    "TableName": self.table.name,
                    "Key": attributes({"PK": "EVENTS", "SK": f"EVENT#{registration['eventId']}"}),
                    "UpdateExpression": "SET remainingSeats = remainingSeats - :one",
                    "ConditionExpression": "attribute_exists(PK) AND registrationOpen = :open AND remainingSeats >= :one AND startsAtEpoch > :now",
                    "ExpressionAttributeValues": attributes({":one": 1, ":open": True, ":now": now_epoch}),
                }},
                {"Put": {
                    "TableName": self.table.name,
                    "Item": attributes({"PK": f"EVENT#{registration['eventId']}", "SK": f"EMAIL#{registration['email']}", "entityType": "REGISTRATION_UNIQUE", "registrationId": registration["id"]}),
                    "ConditionExpression": "attribute_not_exists(PK) AND attribute_not_exists(SK)",
                }},
                {"Put": {
                    "TableName": self.table.name,
                    "Item": attributes({**registration, "PK": f"REGISTRATION#{registration['id']}", "SK": "METADATA", "entityType": "REGISTRATION"}),
                    "ConditionExpression": "attribute_not_exists(PK) AND attribute_not_exists(SK)",
                }},
            ],
        )
