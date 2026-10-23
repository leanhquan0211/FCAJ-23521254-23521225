# Bảo mật User, đặt vé và quản trị local — v4

## Quy tắc cần giữ khi phát triển

- User tự đăng ký chỉ được role=user. Dùng một cookie event_session cho cả hai role; thay tài khoản thu hồi phiên cũ được gửi. Cookie v3 không được chấp nhận. Mỗi API vẫn kiểm tra role ở server. Vé chỉ chủ sở hữu được đọc; sai owner hoặc legacy không userId trả404. Không nhận lại vé theo email chưa được xác minh.
- Email unique được ghi atomic với account; tên/email đặt vé lấy từ phiên. Bốn ghi ghế/reference/vé/idempotency nằm trong một transaction. Key giữ qua retry, scoped theo User; key cũ khác nội dung bị từ chối.
- User signup/login có bộ đếm riêng; mặc định120/IP/900giây, login thêm10/account. Vượt trả429 và Retry-After. Không tắt auth/CSRF/rate limit chỉ để chạy tải; chuẩn bị phiên ngoài khoảng đo.

- Nút chọn Admin, route guard React và CORS không cấp quyền. Mỗi API admin đều kiểm tra session và role ở backend. Gõ thẳng URL hoặc sửa localStorage không làm tăng quyền.
- Không tạo tài khoản admin từ website, không có mật khẩu mặc định, không ghi mật khẩu vào source, VITE env, URL hoặc log. Tạo tài khoản bằng CLI có nhập mật khẩu ẩn; không ghi đè tài khoản cũ.
- Không lưu mật khẩu rõ hoặc mã hóa có thể giải ngược. Dùng scrypt chuẩn của Python, salt riêng từng tài khoản. Không tự thiết kế thuật toán mật mã.
- Cookie session HttpOnly, SameSite=Strict; token ngẫu nhiên, server lưu hash, thời hạn 8 giờ, đăng xuất thu hồi ở server. CSRF token giữ trong bộ nhớ, gửi header trên thao tác ghi; kiểm tra Origin chính xác.
- Giới hạn đăng nhập dùng DynamoDB để không mất tác dụng khi Lambda đổi container. Thông báo sai tên/mật khẩu giống nhau. Backend không tin header role hay giá trị quyền gửi từ client.
- Chỉ nhận trường nằm trong schema, giới hạn độ dài và dung lượng body, kiểm tra lại mọi dữ liệu ở backend. Nội dung sự kiện là văn bản, React escape khi hiển thị; không dùng dangerouslySetInnerHTML, eval hoặc HTML thô.
- Không nhận remainingSeats hoặc status từ form. Không giảm sức chứa dưới số chỗ đã dùng. Kiểm tra DB có điều kiện để tránh ghi đè đăng ký đồng thời. Admin xóa được sự kiện có người; khóa trước, dọn vé/ghi danh/idempotency đúng event, giữ tài khoản và dữ liệu event khác. Lỗi dọn có thể tiếp tục, chưa xong không báo đã xóa.
- Thông báo lỗi không trả stack trace, password hash, cookie hoặc khóa PK/SK. Log dùng requestId; không log toàn bộ request đăng nhập.

## Cách xác minh

V3 bổ sung `test_buyer_auth.py`, `test_registration.py` và 3 test transaction opt-in. HTTP `check_registration_api.py` dùng tài khoản/phiên thật, kiểm tra replay sau full/closed, owner, legacy, mở bán, logout và8 lượt tranh1chỗ. `check-buyer-browser.mjs` thao tác signup/login/đặt vé/Vé của tôi/logout; cố tình bỏ response sau commit, reload rồi retry. Các kết quả thực tế và giới hạn ở [nhật ký 23/10](../phuc-worklog/week-4/23-10.md).

`tests/backend/test_admin.py` kiểm tra mật khẩu, session, CSRF, nguồn giả, role giả, quyền trên tất cả route admin, schema, sức chứa, xóa và xung đột.

`backend/tools/check_admin_api.py` chỉ chạy trên bảng test riêng: gọi HTTP thật để kiểm tra cookie, khách bị chặn, CRUD, đăng ký, đóng/mở, xóa ghi danh giữ tài khoản và hai lượt sửa cùng version chỉ một lượt thành công. Tài khoản test ngẫu nhiên chỉ tồn tại trong bảng test.

`tests/frontend/check-admin-browser.mjs` gọi bài `check-unified-browser.mjs`, nhận credential test qua stdin. Bài kiểm tra login chung, menu đúng role, nhiều tab đổi tài khoản/logout, menu mobile và xóa sự kiện có vé giữ tài khoản/vé khác. `test_unified_integration.py` kiểm tra record phiên cũ bị thu hồi, cookie legacy bị từ chối, dọn nhiều trang, lỗi giữa chừng và mua đồng thời với xóa. Kết quả thực chạy và giới hạn đọc trong nhật ký, không mặc định mọi bài đã đạt chỉ vì có file test.

## Giới hạn của mốc local

Chỉ bind loopback. HTTP và COOKIE_SECURE=false dành cho localhost. Chưa có OTP/xác minh email, MFA, khôi phục mật khẩu, giao diện quản lý tài khoản, dọn TTL tự động hoặc rate limit cho toàn bộ API. V3 có replay và quyền chủ vé, nhưng chưa là thiết kế đã đánh giá cho production. Chưa triển khai AWS hoặc kiểm chứng autoscaling.

## Nguồn tham khảo

- [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): kiểm tra quyền từng request, mặc định từ chối.
- [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): scrypt N=2^15/r=8/p=3 là một cấu hình cân bằng CPU/RAM được liệt kê.
- [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html): thông báo lỗi chung và giới hạn đăng nhập theo tài khoản.
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): cookie HttpOnly, SameSite, thời hạn và thu hồi session.
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html): kiểm tra Origin và CSRF token, không chỉ dựa vào SameSite.
- [Schema.org Event](https://schema.org/Event): tham khảo tên, mô tả, thời gian, địa điểm, đơn vị tổ chức và sức chứa; ứng dụng chỉ lấy các trường cần cho phạm vi hiện tại.

## Quản lý tài khoản và sidebar — contract 4.1

GET `/admin/users`, PUT/DELETE `/admin/users/{userId}` yêu cầu Admin; thao tác ghi kiểm tra Origin và CSRF. Chỉ sửa fullName/email/version, không nhận role/password. Response chỉ có dữ liệu công khai, không hash mật khẩu hoặc token. Profile đang deleting bị từ chối ở login, session và transaction đặt vé. Xóa User không xóa Admin hoặc tài khoản của người khác.

Frontend chỉ lưu boolean `event-workshop:sidebar-collapsed` trong localStorage. Cookie phiên vẫn HttpOnly và CSRF chỉ nằm trong bộ nhớ. Tùy chọn giao diện không mang thông tin đăng nhập hoặc quyền truy cập.
