# Bảo mật cho luồng vai trò và quản trị local

## Quy tắc cần giữ khi phát triển

- Nút chọn Admin, route guard React và CORS không cấp quyền. Mỗi API admin đều kiểm tra session và role ở backend. Gõ thẳng URL hoặc sửa localStorage không làm tăng quyền.
- Không tạo tài khoản admin từ website, không có mật khẩu mặc định, không ghi mật khẩu vào source, VITE env, URL hoặc log. Tạo tài khoản bằng CLI có nhập mật khẩu ẩn; không ghi đè tài khoản cũ.
- Không lưu mật khẩu rõ hoặc mã hóa có thể giải ngược. Dùng scrypt chuẩn của Python, salt riêng từng tài khoản. Không tự thiết kế thuật toán mật mã.
- Cookie session HttpOnly, SameSite=Strict; token ngẫu nhiên, server lưu hash, thời hạn 8 giờ, đăng xuất thu hồi ở server. CSRF token giữ trong bộ nhớ, gửi header trên thao tác ghi; kiểm tra Origin chính xác.
- Giới hạn đăng nhập dùng DynamoDB để không mất tác dụng khi Lambda đổi container. Thông báo sai tên/mật khẩu giống nhau. Backend không tin header role hay giá trị quyền gửi từ client.
- Chỉ nhận trường nằm trong schema, giới hạn độ dài và dung lượng body, kiểm tra lại mọi dữ liệu ở backend. Nội dung sự kiện là văn bản, React escape khi hiển thị; không dùng dangerouslySetInnerHTML, eval hoặc HTML thô.
- Không nhận remainingSeats hoặc status từ form. Không giảm sức chứa dưới số chỗ đã dùng. Kiểm tra DB có điều kiện để tránh ghi đè đăng ký đồng thời. Sự kiện có chỗ đã dùng không được xóa; dùng đóng đăng ký.
- Thông báo lỗi không trả stack trace, password hash, cookie hoặc khóa PK/SK. Log dùng requestId; không log toàn bộ request đăng nhập.

## Cách xác minh

`tests/backend/test_admin.py` kiểm tra mật khẩu, session, CSRF, nguồn giả, role giả, quyền trên tất cả route admin, schema, sức chứa, xóa và xung đột.

`backend/tools/check_admin_api.py` chỉ chạy trên bảng test riêng: gọi HTTP thật để kiểm tra cookie, khách bị chặn, CRUD, đăng ký, đóng/mở, xóa bị chặn và hai lượt sửa cùng version chỉ một lượt thành công. Tài khoản test ngẫu nhiên chỉ tồn tại trong bảng test.

`tests/frontend/check-admin-browser.mjs` nhận thông tin tài khoản test qua stdin, không ghi vào file. Kiểm tra chọn vai trò, URL admin trực tiếp, sai mật khẩu, login/reload/logout, tìm kiếm, thêm/sửa/đóng, chặn xóa và render nội dung như văn bản. Chạy ở các độ rộng 320/375/414/768/1280 px trên browser profile riêng.

## Giới hạn của mốc local

Chỉ bind loopback. HTTP và COOKIE_SECURE=false dành cho localhost. Chưa có MFA, khôi phục mật khẩu, giao diện cấp/thu hồi tài khoản, dọn TTL tự động hoặc rate limit cho toàn bộ API. Khi mất response sau đăng ký vẫn chưa có cơ chế khôi phục mã. Link UUID kết quả khách là quyền xem theo đường dẫn, chưa có xác thực khách; người nhận được link có thể đọc thông tin tương ứng. Chưa triển khai AWS hoặc xác nhận phù hợp cho production.

## Nguồn tham khảo

- [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): kiểm tra quyền từng request, mặc định từ chối.
- [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): scrypt N=2^15/r=8/p=3 là một cấu hình cân bằng CPU/RAM được liệt kê.
- [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html): thông báo lỗi chung và giới hạn đăng nhập theo tài khoản.
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): cookie HttpOnly, SameSite, thời hạn và thu hồi session.
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html): kiểm tra Origin và CSRF token, không chỉ dựa vào SameSite.
- [Schema.org Event](https://schema.org/Event): tham khảo tên, mô tả, thời gian, địa điểm, đơn vị tổ chức và sức chứa; ứng dụng chỉ lấy các trường cần cho phạm vi hiện tại.
