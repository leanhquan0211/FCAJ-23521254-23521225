# Kiểm thử Backend

Mốc hiện tại là API v4. Bổ sung `test_buyer_auth.py` cho User/session/rate limit, `test_registration.py` cho owner/replay/key và3 integration test tranh chỗ/chống trùng/replay atomic. Mỗi lần chạy integration phải tạo bảng test mới, không tái sử dụng fixture đã chạy. `check_registration_api.py` tự chuẩn bị tài khoản/phiên thật và kiểm tra v4 trên bảng test. Browser buyer mới là `check-buyer-browser.mjs`; tên `check-registration-browser.mjs` cũ chuyển sang bài mới. Kết quả đã chạy và giới hạn nằm trong [nhật ký23/10](../phuc-worklog/WORKLOG.md).

`tests/backend/test_read_api.py` (tính từ repo root) chứa unit test với mock; chạy bằng lệnh unittest container trong [Backend README](../backend/README.md#kiểm-thử).

`backend/tools/check_api.py` (tính từ repo root) là smoke test chỉ đọc API local đã chạy. Không tạo đăng ký hoặc reset/seed dữ liệu.

`tests/backend/test_registration.py` là unit test cho đăng ký. `test_registration_integration.py` là test transaction thật, chỉ chạy opt-in trên bảng test mới. `backend/tools/check_registration_api.py` kiểm tra ghi qua HTTP và tự chặn nếu SAM đang dùng bảng ứng dụng. `tests/frontend/check-registration-browser.mjs` kiểm tra UI bằng Chrome headless trên bảng test. Cách tạo môi trường test mới và chạy các lệnh nằm trong Backend README.

`tests/backend/test_admin.py` kiểm tra quyền, mật khẩu/session, CSRF, schema và bảo toàn chỗ khi sửa/xóa. `backend/tools/check_admin_api.py` kiểm tra HTTP quản trị trên bảng test và có thể truyền tài khoản ngẫu nhiên qua stdin cho `tests/frontend/check-admin-browser.mjs` bằng `--browser`. Xem [bảo mật](../docs/security.md) và [hướng dẫn backend](../backend/README.md#tạo-tài-khoản-admin-và-dùng-quản-trị).

V4 thêm test_unified_integration.py: đổi tài khoản thu hồi phiên cũ, từ chối cookie legacy, giữ tài khoản/vé khác khi xóa, tiếp tục sau gián đoạn, hơn500 item và xóa40vé đồng thời mua. check-admin-browser.mjs gọi bài check-unified-browser.mjs cho sidebar/navbar/mobile và nhiều tab; không còn assertion hai phiên song song. Toàn suite dùng bảng mới riêng; kết quả thật xem nhật ký mục15.

## Kiểm tra quản lý User — API 4.1

`test_unified_integration.py` kiểm tra email duy nhất/version, vé giữ snapshot, session đọc profile mới, khóa chặn transaction mua, hủy vé/hoàn chỗ một lần, retry sau gián đoạn, hai Admin cùng xóa và xóa sự kiện đồng thời, vé sót sau khi sự kiện xóa liên kết trước. Fixture integration phải có profile User vì transaction mua thêm ConditionCheck.

`backend/tools/check_accounts_api.py` chạy qua HTTP trên bảng test riêng: quyền, CSRF/Origin, schema, sửa/xóa, hoàn chỗ, session bị thu hồi và giữ vé người khác. `--browser` chạy thêm `tests/frontend/check-accounts-browser.mjs`: tìm kiếm tên/email, sửa email trùng, xác nhận/hủy/xóa, sidebar/tooltip/preference, responsive 320/375/414/768/1280. Đây không phải bộ 100 người hoặc bằng chứng scaling AWS.
