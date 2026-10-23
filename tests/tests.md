# Kiểm thử Backend

Mốc hiện tại là API v3. Bổ sung `test_buyer_auth.py` cho User/session/rate limit, `test_registration.py` cho owner/replay/key và3 integration test tranh chỗ/chống trùng/replay atomic. Mỗi lần chạy integration phải tạo bảng test mới, không tái sử dụng fixture đã chạy. `check_registration_api.py` tự chuẩn bị tài khoản/phiên thật và kiểm tra v3 trên bảng test. Browser buyer mới là `check-buyer-browser.mjs`; tên `check-registration-browser.mjs` cũ chuyển sang bài mới. Kết quả đã chạy và giới hạn nằm trong [nhật ký23/10](../quan-worklog/week-4/23-10.md).

`tests/backend/test_read_api.py` (tính từ repo root) chứa unit test với mock; chạy bằng lệnh unittest container trong [Backend README](../backend/README.md#kiểm-thử).

`backend/tools/check_api.py` (tính từ repo root) là smoke test chỉ đọc API local đã chạy. Không tạo đăng ký hoặc reset/seed dữ liệu.

`tests/backend/test_registration.py` là unit test cho đăng ký. `test_registration_integration.py` là test transaction thật, chỉ chạy opt-in trên bảng test mới. `backend/tools/check_registration_api.py` kiểm tra ghi qua HTTP và tự chặn nếu SAM đang dùng bảng ứng dụng. `tests/frontend/check-registration-browser.mjs` kiểm tra UI bằng Chrome headless trên bảng test. Cách tạo môi trường test mới và chạy các lệnh nằm trong Backend README.

`tests/backend/test_admin.py` kiểm tra quyền, mật khẩu/session, CSRF, schema và bảo toàn chỗ khi sửa/xóa. `backend/tools/check_admin_api.py` kiểm tra HTTP quản trị trên bảng test và có thể truyền tài khoản ngẫu nhiên qua stdin cho `tests/frontend/check-admin-browser.mjs` bằng `--browser`. Xem [bảo mật](../docs/security.md) và [hướng dẫn backend](../backend/README.md#tạo-tài-khoản-admin-và-dùng-quản-trị).
