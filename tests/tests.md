# Kiểm thử Backend

`tests/backend/test_read_api.py` (tính từ repo root) chứa unit test với mock; chạy bằng lệnh unittest container trong [Backend README](../backend/README.md#kiểm-thử).

`backend/tools/check_api.py` (tính từ repo root) là smoke test chỉ đọc API local đã chạy. Không tạo đăng ký hoặc reset/seed dữ liệu.

`tests/backend/test_registration.py` là unit test cho đăng ký. `test_registration_integration.py` là test transaction thật, chỉ chạy opt-in trên bảng test mới. `backend/tools/check_registration_api.py` kiểm tra ghi qua HTTP và tự chặn nếu SAM đang dùng bảng ứng dụng. `tests/frontend/check-registration-browser.mjs` kiểm tra UI bằng Chrome headless trên bảng test. Cách tạo môi trường test mới và chạy các lệnh nằm trong Backend README.

`tests/backend/test_admin.py` kiểm tra quyền, mật khẩu/session, CSRF, schema và bảo toàn chỗ khi sửa/xóa. `backend/tools/check_admin_api.py` kiểm tra HTTP quản trị trên bảng test và có thể truyền tài khoản ngẫu nhiên qua stdin cho `tests/frontend/check-admin-browser.mjs` bằng `--browser`. Xem [bảo mật](../docs/security.md) và [hướng dẫn backend](../backend/README.md#tạo-tài-khoản-admin-và-dùng-quản-trị).
