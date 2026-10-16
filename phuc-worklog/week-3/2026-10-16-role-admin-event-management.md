# Chọn vai trò, đăng nhập admin và quản lý sự kiện

- Ngày: 16/10/2026 (giờ Việt Nam).
- Nhánh làm việc: `phuc`.
- Trạng thái: hoàn thành nâng cấp và kiểm tra local; đã kết thúc môi trường dùng thử/kiểm thử.
- Đây là một worklog cho toàn bộ ý tưởng; nếu sửa tiếp ý tưởng này thì cập nhật chính file này.

## Yêu cầu và quyết định đã thống nhất

Người mở trang chủ chọn Người tham gia hoặc Quản trị viên. Người tham gia vào thẳng website để tìm kiếm, xem sự kiện và đăng ký. Quản trị viên phải đăng nhập trước khi thêm/sửa/xóa sự kiện hoặc mở/đóng đăng ký. Giữ tách biệt frontend, API và backend, giữ thiết kế hiện có và dùng logic dễ giải thích.

Người dùng đã chọn: **chặn xóa sự kiện khi đã có đăng ký**, thay vì ẩn sự kiện. Bản triển khai bảo vệ tất cả chỗ đã dùng, kể cả chỗ nền từ dữ liệu seed. Có thể đóng đăng ký thay cho xóa.

## Kết quả triển khai

- Trang `/` chọn vai trò; `/events` giữ luồng người tham gia và tìm kiếm không dấu.
- `/admin/login` có form đăng nhập, loading và lỗi; `/admin` có danh sách/tìm kiếm, thêm/sửa và xóa có xác nhận.
- Form quản trị: tên, danh mục, thời gian theo giờ Việt Nam, địa điểm/hình thức trực tuyến, đơn vị tổ chức, sức chứa, giới thiệu ngắn, nội dung chi tiết và mở/đóng đăng ký.
- Giữ Almanac, font Be Vietnam Pro/Geist, màu và component UI cũ. Không thêm dependency npm hoặc Python.
- Vite proxy `/api` đến SAM cổng 3001 để cookie cùng origin với frontend; `.env.example` và cấu hình local đã chuyển sang `/api`.
- Có bảy API admin: login, session, logout, danh sách, tạo, sửa và xóa sự kiện. Năm API người tham gia được giữ.
- Contract v2 và mô hình dữ liệu được cập nhật để hai phía frontend/backend có cùng cách hiểu.

## Vì sao xử lý như vậy

Chọn vai trò chỉ quyết định mở trang nào; nó không phải bằng chứng có quyền. Backend kiểm tra phiên và vai trò trong từng request admin, nên sửa giao diện hoặc gọi thẳng API không cấp quyền.

Session dùng token ngẫu nhiên trong cookie HttpOnly, SameSite=Strict, hạn 8 giờ. Server lưu hash token; logout xóa session ở server. CSRF token giữ trong bộ nhớ React; thao tác ghi cần Origin hợp lệ và CSRF token. Không lưu session token/quyền vào localStorage hoặc sessionStorage.

Tài khoản admin được tạo qua CLI nhập mật khẩu ẩn, không có tài khoản hoặc mật khẩu mặc định. Mật khẩu 15–128 ký tự, băm scrypt N=32768/r=8/p=3, salt riêng từng tài khoản. Có giới hạn đăng nhập 10 lượt/tài khoản và 30 lượt/IP mỗi cửa sổ 15 phút, lưu bằng atomic update trong DynamoDB. Không có API tự đăng ký admin.

Khi sửa sức chứa, backend giữ nguyên số chỗ đã dùng rồi tính chỗ còn lại. Không cho giảm xuống dưới số chỗ đã dùng. Khi lưu/xóa, DB kiểm tra version và số chỗ vẫn giống bản đã đọc để không ghi đè người vừa đăng ký. Hai lượt sửa cùng version chỉ một lượt được chấp nhận. Lỗi xung đột yêu cầu tải lại.

Nội dung sự kiện được hiển thị dưới dạng văn bản qua React, không chạy HTML/script. Backend giới hạn trường được nhận, độ dài, kiểu dữ liệu, múi giờ và kích thước JSON.

## Nhóm file chính

| Nhóm | File/thư mục |
| --- | --- |
| Xác thực backend | `backend/lambda/auth.py`, `auth_repository.py` |
| Quản lý sự kiện | `backend/lambda/admin_events.py`, `repository.py`, `service.py` |
| HTTP/routes | `backend/lambda/app.py`, `backend/template.yaml` |
| Cấp tài khoản | `backend/tools/create_admin.py` |
| Frontend | `frontend/src/pages/RoleSelectionPage.tsx`, `pages/admin/`, `components/AdminLayout.tsx`, `hooks/useAdminSession.ts` |
| API frontend | `frontend/src/services/http-client.ts`, `http-events.ts`, `admin.ts`, `types/admin.ts` |
| Routing/thiết kế | `App.tsx`, `SiteLayout.tsx`, `index.css`, `EventDetailPage.tsx`, Vite, DESIGN.md và Hallmark log |
| Kiểm tra | `tests/backend/test_admin.py`, `backend/tools/check_admin_api.py`, `tests/frontend/check-admin-browser.mjs` |
| Tài liệu | README gốc/frontend/backend, `docs/api-contract.md`, `docs/data-model.md`, `docs/security.md`, `tests/tests.md` |

## Kiểm tra đã thực hiện

| Kiểm tra | Kết quả |
| --- | --- |
| Unit test backend bằng Python 3.13 container | 45 đạt; hai integration test được skip trong lệnh mặc định |
| Toàn bộ suite với integration trên DynamoDB Local, Python host 3.11 | 47 đạt, gồm 45 unit và hai integration |
| Tranh chỗ cuối/trùng email | Tám lượt tranh một chỗ chỉ một thành công; sáu lượt cùng email chỉ một đăng ký |
| SAM build trong container | Đạt, runtime Python 3.13 |
| SAM validate --lint | Đạt |
| HTTP quản trị qua SAM | Login, cookie, session, CSRF, Origin, quyền, CRUD, đóng/mở, bảo toàn đăng ký, stale version, logout đạt |
| Hai request sửa cùng version | Đúng một lượt thành công |
| Xóa sự kiện | Sự kiện trống xóa được; có đăng ký trả 409 và giữ kết quả đăng ký |
| Frontend build/lint | Đạt, không có lỗi; giữ hai cảnh báo Fast Refresh cũ ở Button/Badge |
| Edge headless | Chọn vai trò, khách tìm kiếm, URL admin trực tiếp, sai mật khẩu, login/reload/logout, tạo/sửa/đóng sự kiện, đăng ký khách và chặn xóa đạt |
| Kiểm tra XSS đơn giản | Nội dung `<script>` hiển thị như chữ, không thực thi |
| Responsive trang vai trò/login/danh sách/form admin | Không tràn ngang và chữ hành động không xuống dòng ở 320/375/414/768/1280 px |
| Ảnh form mobile | Đã xem trực tiếp, giữ bố cục và ngôn ngữ thiết kế cũ |
| Git diff --check | Đạt; vẫn ở nhánh phuc |

Kiểm thử ghi chỉ sử dụng bảng `fcaj-event-workshop-local-test-6b77bbaf7349`. Tài khoản và mật khẩu test sinh ngẫu nhiên trong bộ nhớ, truyền sang browser qua stdin, không tạo tài khoản thật cho người dùng. Bảng test đã được xóa sau kiểm tra; bảng ứng dụng vẫn có tám sự kiện.

Hai lỗi được phát hiện và sửa trong quá trình kiểm tra: alias cho `capacity` là từ dành riêng của DynamoDB; điều hướng sau logout tránh cạnh tranh với route guard. Script browser cũng chờ nút login hết trạng thái kiểm tra phiên trước khi gửi form.

## Thu hồi tài nguyên

- Đã dừng Vite và SAM, gỡ container Lambda và container/network Compose của phiên.
- Đã gỡ ba image: SAM build Python 3.13, Lambda Python 3.13 base và rapid runtime. Trường Images của `docker system df` giảm từ 18,21 GB xuống 13,71 GB (khoảng 4,5 GB); đây là số Docker báo, không phải phép đo dung lượng trống Windows hay kích thước VHDX.
- Giữ volume `fcaj-event-workshop-dynamodb-data` và dữ liệu người dùng. Không xóa volume, node_modules, venv hay cache/image của dự án khác.
- Đã xóa artifact `.aws-sam`, `frontend/dist`, env test ngẫu nhiên, profile và ảnh browser tạm.
- Đã dừng Docker Desktop khi không còn container chạy để trả tài nguyên RAM. Lần build/chạy backend tiếp theo sẽ cần tải lại image đã gỡ.

## Cách dùng lần tiếp theo

Mở Docker Desktop, chạy DB/build/seed theo Backend README. Tạo tài khoản admin một lần bằng:

```powershell
docker compose -f backend/compose.yaml run --rm -it tools backend/tools/create_admin.py --endpoint-url http://fcaj-dynamodb-local:8000 --username phuc
```

Tự nhập mật khẩu ẩn hai lần. Sau đó chạy SAM và frontend theo README; truy cập `http://127.0.0.1:5173/`, chọn vai trò. Không cần tạo lại tài khoản khi khởi động lần sau.

## Giới hạn và phần chưa làm

Mốc này chỉ local. HTTP và COOKIE_SECURE=false chỉ phục vụ localhost; chưa có triển khai AWS/HTTPS thật, MFA, khôi phục mật khẩu, giao diện cấp tài khoản, dọn TTL tự động hoặc rate limit toàn bộ API. Link kết quả khách vẫn là link UUID bí mật, chưa có xác thực khách hay khôi phục mã sau khi mất response. Chưa kiểm tra Firefox/Safari hoặc trình đọc màn hình. Bảo mật có các biện pháp và kiểm thử cụ thể, không khẳng định an toàn tuyệt đối hoặc sẵn sàng production.

Nguồn nghiên cứu và các quy tắc cần giữ đã ghi tại `docs/security.md`: OWASP Authorization, Session Management, Password Storage, Authentication, CSRF Prevention và Schema.org Event. Không sao chép giao diện dự án khác.
