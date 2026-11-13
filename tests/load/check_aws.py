"""Read-only preflight. Never authenticates a website user or creates test data."""
import argparse
import json
from config import Settings, LabError
from fixtures import health
from cloud_metrics import deployment


def check(settings, audit=False):
    observed = health(settings)
    deployed = deployment(settings)
    if not deployed.get("tableMatches") or not deployed.get("targetMatches"):
        raise LabError("TARGET_CHANGED", "Lambda ARN/bảng không khớp Terraform. Dừng và đồng bộ lại cấu hình.")
    result = {"readyForRead": True, "apiUrl": settings.api_url, "table": observed["database"]["table"],
              "contract": observed["apiContractVersion"], "deployment": deployed, "auditRead": "not_checked"}
    if audit:
        import boto3
        from botocore.config import Config
        table = boto3.resource("dynamodb", region_name=settings.region,
                               config=Config(connect_timeout=3, read_timeout=10, retries={"max_attempts": 1})).Table(settings.expected_table)
        status = table.meta.client.describe_table(TableName=table.name)["Table"]["TableStatus"]
        if status != "ACTIVE": raise LabError("DATABASE_NOT_READY", "Bảng chưa ACTIVE.")
        table.scan(Limit=1, ProjectionExpression="PK", ConsistentRead=True)
        result["auditRead"] = "DescribeTable and bounded Scan succeeded; no row content exported"
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--audit", action="store_true")
    args = parser.parse_args()
    try:
        print(json.dumps(check(Settings(), args.audit), ensure_ascii=True))
    except Exception as exc:
        print(json.dumps({"ready": False, "error": getattr(exc, "code", "READ_PREFLIGHT_FAILED"),
                          "message": str(exc) if isinstance(exc, LabError) else "Kiểm tra AWS profile, quyền chỉ đọc và môi trường đang triển khai. Không có dữ liệu test được tạo."}))
        raise SystemExit(1)


if __name__ == "__main__": main()
