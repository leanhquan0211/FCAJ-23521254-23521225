# Kiểm thử Backend

`tests/backend/test_read_api.py` (tính từ repo root) chứa unit test với mock; chạy bằng lệnh unittest container trong [Backend README](../backend/README.md#kiểm-thử).

`backend/tools/check_api.py` (tính từ repo root) là smoke test chỉ đọc API local đã chạy. Không tạo đăng ký hoặc reset/seed dữ liệu.

`tests/backend/test_registration.py` là unit test cho đăng ký. `test_registration_integration.py` là test transaction thật, chỉ chạy opt-in trên bảng test mới. `backend/tools/check_registration_api.py` kiểm tra ghi qua HTTP và tự chặn nếu SAM đang dùng bảng ứng dụng. `tests/frontend/check-registration-browser.mjs` kiểm tra UI bằng Chrome headless trên bảng test. Cách tạo môi trường test mới và chạy các lệnh nằm trong Backend README.
