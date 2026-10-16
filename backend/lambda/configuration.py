import os
from functools import lru_cache
from urllib.parse import urlparse

import boto3
from botocore.config import Config


class ConfigurationError(ValueError):
    pass


def _settings(endpoint, table_name):
    endpoint = endpoint if endpoint is not None else os.getenv("DYNAMODB_ENDPOINT", "")
    table_name = table_name or os.getenv("DYNAMODB_TABLE", "fcaj-event-workshop-local")
    parsed = urlparse(endpoint)
    try:
        port = parsed.port
    except ValueError as exc:
        raise ConfigurationError("Invalid local endpoint port") from exc
    if (
        parsed.scheme != "http"
        or parsed.hostname not in {"localhost", "127.0.0.1", "::1", "fcaj-dynamodb-local"}
        or not port
        or parsed.username or parsed.password
        or parsed.path not in {"", "/"}
        or parsed.query or parsed.fragment
    ):
        raise ConfigurationError("An explicit DynamoDB Local endpoint is required")
    if not table_name.startswith("fcaj-event-workshop-local"):
        raise ConfigurationError("Only workshop local tables are allowed")

    return endpoint, table_name


def _client_options(endpoint):
    # Explicit fake credentials: never fall back to AWS profiles or metadata.
    return dict(
        endpoint_url=endpoint, region_name=os.getenv("DYNAMODB_REGION", "us-east-1"),
        aws_access_key_id="local", aws_secret_access_key="local",
        config=Config(connect_timeout=2, read_timeout=2, retries={"max_attempts": 1}),
    )


@lru_cache(maxsize=4)
def local_table(endpoint=None, table_name=None):
    endpoint, table_name = _settings(endpoint, table_name)
    resource = boto3.resource("dynamodb", **_client_options(endpoint))
    return resource.Table(table_name)


@lru_cache(maxsize=4)
def local_client(endpoint=None, table_name=None):
    endpoint, _ = _settings(endpoint, table_name)
    return boto3.client("dynamodb", **_client_options(endpoint))
