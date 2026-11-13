"""Windows-user-encrypted test credentials, bound to one deployment. Never export secrets."""
import ctypes
from ctypes import wintypes
import hashlib
import json
import os
import re
import uuid
from config import LabError


def protect(data, decrypt=False):
    if os.name != "nt": raise LabError("POOL_UNAVAILABLE", "Pool mã hóa hiện hỗ trợ Windows DPAPI; không lưu mật khẩu dạng rõ.")
    class Blob(ctypes.Structure):
        _fields_ = [("size", wintypes.DWORD), ("data", ctypes.POINTER(ctypes.c_ubyte))]
    buffer = ctypes.create_string_buffer(data)
    source = Blob(len(data), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_ubyte)))
    output = Blob()
    crypt = ctypes.WinDLL("crypt32", use_last_error=True)
    function = crypt.CryptUnprotectData if decrypt else crypt.CryptProtectData
    function.argtypes = [ctypes.POINTER(Blob), ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p,
                         ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(Blob)]
    function.restype = wintypes.BOOL
    if not function(ctypes.byref(source), None, None, None, None, 1, ctypes.byref(output)):
        raise LabError("POOL_UNAVAILABLE", "Không mở được pool bằng Windows user hiện tại; không tự ghi đè hoặc lưu plaintext.")
    try: return ctypes.string_at(output.data, output.size)
    finally:
        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel.LocalFree.argtypes = [ctypes.c_void_p]
        kernel.LocalFree.restype = ctypes.c_void_p
        kernel.LocalFree(output.data)


class AccountPool:
    def __init__(self, settings):
        self.binding = settings.api_url + "|" + settings.expected_table + "|" + settings.expected_function_arn
        self.path = settings.results / ("accounts-" + hashlib.sha256(self.binding.encode()).hexdigest()[:20] + ".dpapi")
        self.accounts = []
        if self.path.exists():
            data = json.loads(protect(self.path.read_bytes(), decrypt=True))
            if data.get("binding") != self.binding: raise LabError("POOL_UNAVAILABLE", "Pool không khớp môi trường.")
            self.accounts = data["accounts"]

    def save(self):
        payload = protect(json.dumps({"binding": self.binding, "accounts": self.accounts}).encode())
        temporary = self.path.with_suffix("." + uuid.uuid4().hex + ".tmp")
        temporary.write_bytes(payload)
        temporary.replace(self.path)

    def available(self, table, count):
        selected, stale = [], []
        for account in self.accounts:
            if len(selected) >= count: break
            if not re.fullmatch(r"lab-[a-f0-9]{24}-\d{3}@example\.test", account.get("email", "")):
                raise LabError("POOL_UNAVAILABLE", "Pool chứa tài khoản không phải User test.")
            profile = table.get_item(Key={"PK": "USER#" + account["userId"], "SK": "PROFILE"},
                                     ProjectionExpression="userId, email, #role, deleting", ExpressionAttributeNames={"#role": "role"},
                                     ConsistentRead=True).get("Item")
            if not profile or profile.get("email") != account["email"] or profile.get("role") != "user" or profile.get("deleting"):
                stale.append(account)
            else: selected.append(account)
        if stale:
            self.accounts = [account for account in self.accounts if account not in stale]
            self.save()
        return selected

    def add(self, account):
        self.accounts.append(account)
        self.save()
