"""Read CloudWatch for one run; no infrastructure mutation or fabricated zeroes."""
from datetime import datetime, timedelta, timezone


def collect(settings, run):
    if settings.environment != "aws" or not settings.function_name:
        return {"status": "not_configured", "series": [], "note": "Chưa cấu hình Lambda để đọc số đo AWS."}
    if not run.get("measurementStartedAt"):
        return {"status": "waiting", "series": [], "note": "Chưa bắt đầu khoảng đo tải."}
    import boto3
    from botocore.config import Config
    start = datetime.fromisoformat(run["measurementStartedAt"])
    end = datetime.fromisoformat(run["measurementFinishedAt"]) if run.get("measurementFinishedAt") else datetime.now(timezone.utc)
    specifications = [("concurrent", "ConcurrentExecutions", "Maximum"), ("invocations", "Invocations", "Sum"),
                      ("throttles", "Throttles", "Sum"), ("errors", "Errors", "Sum"), ("duration", "Duration", "p95")]
    queries = [{"Id": key, "MetricStat": {"Metric": {"Namespace": "AWS/Lambda", "MetricName": metric,
                "Dimensions": [{"Name": "FunctionName", "Value": settings.function_name}]},
                "Period": 60, "Stat": stat}, "ReturnData": True} for key, metric, stat in specifications]
    client = boto3.client("cloudwatch", region_name=settings.region,
                          config=Config(connect_timeout=3, read_timeout=10, retries={"max_attempts": 1}))
    data = client.get_metric_data(MetricDataQueries=queries, StartTime=start.replace(second=0, microsecond=0),
                                 EndTime=end + timedelta(minutes=1), ScanBy="TimestampAscending", MaxDatapoints=5000)
    rows = {}
    for result in data.get("MetricDataResults", []):
        for stamp, value in zip(result.get("Timestamps", []), result.get("Values", [])):
            rows.setdefault(stamp.timestamp(), {"time": stamp.timestamp()})[result["Id"]] = value
    return {"status": "available" if rows else "waiting", "series": [rows[k] for k in sorted(rows)],
            "sampledAt": datetime.now(timezone.utc).isoformat(), "periodSeconds": 60,
            "note": "AWS cập nhật theo phút và có độ trễ. Bao gồm mọi request tới Lambda trong phút đó; không phải số máy giữ ấm."}


def deployment(settings):
    if settings.environment != "aws" or not settings.function_name:
        return {"status": "not_configured"}
    import boto3
    from botocore.config import Config
    client = boto3.client("lambda", region_name=settings.region,
                          config=Config(connect_timeout=3, read_timeout=10, retries={"max_attempts": 1}))
    result = client.get_function_configuration(FunctionName=settings.function_name)
    table = result.get("Environment", {}).get("Variables", {}).get("DYNAMODB_TABLE")
    variables = result.get("Environment", {}).get("Variables", {})
    return {"status": "available", "tableMatches": table == settings.expected_table,
            "targetMatches": bool(settings.expected_function_arn) and result.get("FunctionArn") == settings.expected_function_arn,
            "authLimits": {key: variables.get(key) for key in ("USER_SIGNUP_IP_LIMIT", "USER_LOGIN_IP_LIMIT", "USER_AUTH_WINDOW_SECONDS")},
            **{key: result.get(key) for key in ("FunctionName", "CodeSha256", "LastModified", "Version")}}


def capacity(settings):
    """Observe quotas, never request/change them. RPS is a quota ceiling, not promised throughput."""
    if settings.environment != "aws": return {"status": "not_configured"}
    import boto3
    from botocore.config import Config
    client = boto3.client("lambda", region_name=settings.region,
                          config=Config(connect_timeout=3, read_timeout=10, retries={"max_attempts": 1}))
    account = client.get_account_settings()["AccountLimit"]["ConcurrentExecutions"]
    reserved = client.get_function_concurrency(FunctionName=settings.function_name).get("ReservedConcurrentExecutions")
    ceiling = min(account, reserved) if reserved is not None else account
    return {"status": "available", "accountConcurrency": account, "functionReserved": reserved,
            "syncRpsCeiling": ceiling * 10, "region": settings.region}
