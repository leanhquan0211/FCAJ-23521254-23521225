"""Extract public target coordinates from local Terraform state; never refresh/apply."""
import argparse
import json
from pathlib import Path
from urllib.parse import urlparse


def extract(state):
    outputs = state.get("outputs", {})
    website = outputs.get("website_url", {}).get("value", "")
    table = outputs.get("dynamodb_table_name", {}).get("value", "")
    parsed = urlparse(website)
    if parsed.scheme != "https" or not parsed.hostname or parsed.path not in {"", "/"} or parsed.query or parsed.username or parsed.fragment:
        raise ValueError("Terraform website_url must be an HTTPS origin")
    functions = [i.get("attributes", {}) for r in state.get("resources", [])
                 if r.get("mode") == "managed" and r.get("type") == "aws_lambda_function" and r.get("name") == "backend"
                 for i in r.get("instances", [])]
    if len(functions) != 1 or not isinstance(table, str) or not table:
        raise ValueError("Expected exactly one backend Lambda and a table output")
    function = functions[0]
    arn = function.get("arn", "").split(":")
    if len(arn) != 7 or arn[2] != "lambda" or arn[5] != "function" or not arn[4].isdigit():
        raise ValueError("Invalid Lambda ARN in state")
    variables = function.get("environment", [{}])[0].get("variables", {})
    if variables.get("DYNAMODB_TABLE") != table:
        raise ValueError("Terraform Lambda and table outputs disagree")
    return {"apiUrl": website.rstrip("/") + "/api", "origin": website.rstrip("/"), "host": parsed.hostname,
            "table": table, "function": function["function_name"], "region": arn[3], "account": arn[4],
            "functionArn": ":".join(arn)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--infra", required=True)
    args = parser.parse_args()
    try:
        source = Path(args.infra).resolve() / "terraform.tfstate"
        result = extract(json.loads(source.read_text(encoding="utf-8-sig")))
        print(json.dumps(result))  # Only selected public identifiers, never raw state/environment.
    except (OSError, ValueError, KeyError, TypeError, IndexError):
        parser.exit(1, "Cannot resolve target from Terraform state. Verify --infra and completed deployment; no old URL fallback.\n")


if __name__ == "__main__": main()
