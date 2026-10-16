"""Provision a local admin interactively. No default password; never overwrite accounts."""
import argparse
import getpass
import sys
import warnings
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lambda"))

from botocore.exceptions import ClientError
from auth import password_record, username_value
from auth_repository import AuthRepository
from configuration import local_table
from service import ApiError


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--endpoint-url", required=True)
    parser.add_argument("--table-name", default="fcaj-event-workshop-local")
    parser.add_argument("--username", required=True)
    args = parser.parse_args()
    try:
        username = username_value(args.username)
        # Refuse terminals which would echo the password.
        with warnings.catch_warnings():
            warnings.simplefilter("error", getpass.GetPassWarning)
            password = getpass.getpass("Mật khẩu admin (15–128 ký tự): ")
            confirmation = getpass.getpass("Nhập lại mật khẩu: ")
        if password != confirmation:
            raise ValueError("Hai mật khẩu không giống nhau.")
        record = password_record(password)
        AuthRepository(local_table(args.endpoint_url, args.table_name)).create(
            "ADMIN#" + username, {"username": username, "role": "admin", **record})
        print("Đã tạo tài khoản admin. Mật khẩu không được ghi vào file hoặc log.")
    except (ValueError, ApiError, getpass.GetPassWarning) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            print("Tài khoản đã tồn tại; không ghi đè.", file=sys.stderr)
            return 1
        raise
    return 0


if __name__ == "__main__":
    sys.exit(main())
