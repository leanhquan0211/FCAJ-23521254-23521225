"""Read-only local table check. Requires an explicit endpoint."""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "lambda"))

from configuration import local_table
from repository import EventRepository


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--endpoint-url", required=True)
    parser.add_argument("--table-name", default="fcaj-event-workshop-local")
    args = parser.parse_args()
    repo = EventRepository(local_table(args.endpoint_url, args.table_name))
    print(json.dumps({"table": repo.health(), "events": len(repo.list_events())}))
