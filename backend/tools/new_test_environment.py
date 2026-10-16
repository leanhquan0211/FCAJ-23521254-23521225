"""Write a new local-only SAM test config; never replace an existing config or database."""
import json
import uuid
from pathlib import Path


if __name__ == "__main__":
    suffix = uuid.uuid4().hex[:12]
    table = f"fcaj-event-workshop-local-test-{suffix}"
    path = Path(__file__).resolve().parents[1] / f"env.test-{suffix}.local.json"
    config = {"EventsFunction": {
        "DYNAMODB_ENDPOINT": "http://fcaj-dynamodb-local:8000", "DYNAMODB_TABLE": table,
        "DYNAMODB_REGION": "us-east-1", "ALLOWED_ORIGINS": "http://localhost:5173,http://127.0.0.1:5173",
    }}
    with path.open("x", encoding="utf-8") as file:
        json.dump(config, file, indent=2)
        file.write("\n")
    print(json.dumps({"table": table, "envFile": str(path)}))
