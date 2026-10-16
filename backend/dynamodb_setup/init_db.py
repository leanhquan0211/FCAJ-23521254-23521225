"""Create a DynamoDB Local table; add demo events only with --seed-demo."""
import argparse
import json
import sys
from datetime import datetime, time, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lambda"))

from botocore.exceptions import BotoCoreError, ClientError
from configuration import ConfigurationError, local_table


def initialize(table, now=None, *, seed_demo=False):
    client = table.meta.client
    try:
        client.describe_table(TableName=table.name)
    except client.exceptions.ResourceNotFoundException:
        try:
            client.create_table(
                TableName=table.name,
                KeySchema=[{"AttributeName": "PK", "KeyType": "HASH"}, {"AttributeName": "SK", "KeyType": "RANGE"}],
                AttributeDefinitions=[{"AttributeName": "PK", "AttributeType": "S"}, {"AttributeName": "SK", "AttributeType": "S"}],
                BillingMode="PAY_PER_REQUEST",
            )
        except client.exceptions.ResourceInUseException:
            pass
    client.get_waiter("table_exists").wait(TableName=table.name, WaiterConfig={"Delay": 1, "MaxAttempts": 30})

    if not seed_demo:
        return {"created": 0, "preserved": 0}

    vietnam = timezone(timedelta(hours=7))
    today = (now or datetime.now(vietnam)).astimezone(vietnam).date()
    fixtures = json.loads(Path(__file__).with_name("events.json").read_text(encoding="utf-8"))
    created, skipped = 0, 0
    for fixture in fixtures:
        item = dict(fixture)
        day = today + timedelta(days=item.pop("seedDayOffset"))
        starts_at = datetime.combine(day, time(hour=9), tzinfo=vietnam)
        item.update(
            PK="EVENTS", SK=f"EVENT#{item['id']}", entityType="EVENT",
            dateTime=starts_at.isoformat(), startsAtEpoch=int(starts_at.timestamp()),
            registrationOpen=True,
        )
        try:
            table.put_item(Item=item, ConditionExpression="attribute_not_exists(PK) AND attribute_not_exists(SK)")
            created += 1
        except client.exceptions.ConditionalCheckFailedException:
            skipped += 1
    return {"created": created, "preserved": skipped}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--endpoint-url", required=True)
    parser.add_argument("--table-name", default="fcaj-event-workshop-local")
    parser.add_argument("--seed-demo", action="store_true", help="Add sample events with simulated occupied seats (optional)")
    args = parser.parse_args()
    try:
        result = initialize(local_table(args.endpoint_url, args.table_name), seed_demo=args.seed_demo)
        print(json.dumps(result))
    except (ConfigurationError, BotoCoreError, ClientError) as exc:
        print(f"Local initialization failed: {type(exc).__name__}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
