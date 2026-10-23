"""Only allow bounded, local runs. The browser cannot supply commands, paths or URLs."""
import hashlib
import json
import os
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
PROFILE_PATH = Path(__file__).with_name("contract-v3-draft.json")
PROFILE = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
PROFILE_HASH = hashlib.sha256(PROFILE_PATH.read_bytes()).hexdigest()
SCENARIOS = {
    "hot": "Sự kiện hot — đủ vé",
    "ramp": "Tải tăng, giữ, giảm",
    "scarce": "Tranh vé giới hạn",
}
DEFAULTS = dict(scenario="ramp", mode="public", users=2, capacity=200,
                rampUp=3, hold=4, rampDown=3, maxRequests=30, timeout=30,
                maxRetries=0, intervalMs=500, salesLead=5)
BOUNDS = dict(users=(1, 100), capacity=(1, 100000), rampUp=(1, 60), hold=(1, 60),
              rampDown=(1, 60), maxRequests=(1, 5000), timeout=(1, 75),
              maxRetries=(0, 2), intervalMs=(100, 5000), salesLead=(2, 60))


class LabError(Exception):
    def __init__(self, code, message):
        self.code, self.message = code, message
        super().__init__(message)


def local_url(value, name):
    parsed = urlparse(value)
    if (parsed.scheme != "http" or parsed.hostname not in {"127.0.0.1", "localhost", "::1"}
            or not parsed.port or parsed.path not in {"", "/"} or parsed.query
            or parsed.fragment or parsed.username or parsed.password):
        raise LabError("INVALID_CONFIG", f"{name} phải là HTTP loopback có cổng, không có path/credentials.")
    return value.rstrip("/")


def validate_config(values):
    if not isinstance(values, dict) or set(values) - set(DEFAULTS):
        raise LabError("INVALID_CONFIG", "Tham số không được phép.")
    result = {**DEFAULTS, **values}
    if (not isinstance(result["scenario"], str) or not isinstance(result["mode"], str)
            or result["scenario"] not in SCENARIOS or result["mode"] not in {"public", "purchase"}):
        raise LabError("INVALID_CONFIG", "Kịch bản hoặc chế độ không hợp lệ.")
    if result["scenario"] != "ramp":
        result["mode"] = "purchase"
    for name, (minimum, maximum) in BOUNDS.items():
        if type(result[name]) is not int or not minimum <= result[name] <= maximum:
            raise LabError("INVALID_CONFIG", f"{name}: cần số nguyên {minimum}–{maximum}.")
    if sum(result[k] for k in ("rampUp", "hold", "rampDown")) > 180:
        raise LabError("INVALID_CONFIG", "Tổng thời gian ramp tối đa 180 giây.")
    if result["mode"] == "purchase" and result["maxRequests"] < result["users"] * (2 + result["maxRetries"]):
        raise LabError("INVALID_CONFIG", "Trần request cần đủ cho một GET và POST/User, cộng retry đã chọn.")
    if result["scenario"] == "hot" and result["capacity"] < result["users"]:
        raise LabError("INVALID_CONFIG", "Bài đủ vé cần sức chứa ít nhất bằng số User.")
    return result


class Settings:
    def __init__(self, api_url=None, app_root=None, results=None, k6=None, db_endpoint=None):
        self.api_url = local_url(api_url or os.getenv("API_TEST_URL", "http://127.0.0.1:3002"), "API_TEST_URL")
        self.db_endpoint = local_url(db_endpoint or os.getenv("DYNAMODB_ENDPOINT", "http://127.0.0.1:8000"), "DYNAMODB_ENDPOINT")
        self.app_root = Path(app_root or os.getenv("APP_SOURCE_ROOT", str(ROOT))).resolve()
        self.results = Path(results or os.getenv("LAB_RESULTS_DIR", str(ROOT / "tests/results"))).resolve()
        self.k6 = k6 or os.getenv("K6_BIN", str(ROOT / "tests/runner/.tools/k6.exe" if os.name == "nt" else "k6"))
        self.origin = "http://127.0.0.1:5173"
        self.results.mkdir(parents=True, exist_ok=True)


def guard_table(table):
    if not isinstance(table, str) or not table.startswith(PROFILE["tablePrefix"]) or len(table) <= len(PROFILE["tablePrefix"]):
        raise LabError("UNSAFE_TABLE", "Chỉ ghi/đối chiếu bảng test riêng có prefix fcaj-event-workshop-local-test-.")
    return table
