# Frontend đăng ký sự kiện — API 4.1

React/TypeScript/Vite, Tailwind và shadcn/ui. Giữ hệ Almanac trong [DESIGN.md](DESIGN.md): nền giấy/xanh thông, Be Vietnam Pro và Geist; dùng component/Dialog/Lucide sẵn có, không thêm dependency.

## Chạy local

Tại thư mục gốc của đúng worktree:

```powershell
npm.cmd --prefix frontend ci
npm.cmd --prefix frontend run dev
```

Mở http://127.0.0.1:5173. Vite proxy /api sang SAM3001. Mặc định VITE_DATA_MODE=api và VITE_API_BASE_URL=/api. Backend cần đúng cùng bản v4; v3 không hỗ trợ login identifier hoặc cookie chung. Sau đổi env phải restart Vite.

Thử riêng trên API3002, không chiếm frontend5173 đang dùng:

```powershell
$env:API_PROXY_TARGET='http://127.0.0.1:3002'
npm.cmd --prefix frontend run dev -- --port 5175 --strictPort
```

Chỉ thêm Origin5175 vào ALLOWED_ORIGINS trong env test riêng; đừng đổi template/allowlist ứng dụng để chạy test qua proxy. Cổng preview4173 không nằm trong allowlist mặc định. Đây là cấu hình local, chưa phải hosting AWS.

## Luồng sử dụng

1. Mở website tới form đăng nhập chung. Nhập email User hoặc tên đăng nhập admin và mật khẩu. Chưa có tài khoản thì bấm Tạo tài khoản ngay dưới form; đăng ký chỉ tạo User, chưa tự login.
2. Backend xác định role: User vào /events, admin vào /admin. URL /admin/login cũ chuyển về /login. Không có trang chọn khu vực hoặc nút đổi khu vực.
3. Sidebar trái: User có Khám phá sự kiện/Vé của tôi; admin có Quản lý sự kiện/Tạo sự kiện. Đánh dấu trang đang xem, vùng menu cuộn khi thiếu chiều cao, tài khoản và Đăng xuất ở cuối. Navbar trên cùng nêu trang/vai trò/tên tài khoản; màn nhỏ mở sidebar bằng nút menu, Escape đóng và trả focus.
4. User chọn sự kiện, đặt vé bằng tên/email từ phiên; chỉ phone tùy chọn. Kết quả có mã vé, Vé của tôi chỉ của tài khoản đang dùng. Chưa thanh toán/gửi email.
5. Admin tạo/sửa/đóng, hẹn salesOpenAt theo giờ Việt Nam hoặc để trống. Xóa được cả sự kiện đã có người: xác nhận xóa vé/ghi danh, giữ tài khoản và vé khác. Chưa dọn xong có Tiếp tục xóa; không chỉnh sửa event đang xóa.
6. Đăng xuất thu hồi cookie chung và quay về login. Tab khác cập nhật theo; đăng nhập tài khoản mới cũng thay danh tính ở các tab, không duy trì hai role độc lập. Browser/profile khác vẫn độc lập.

## Routes và mã phụ trách

| Route | Chức năng |
| --- | --- |
| / | Kiểm tra phiên rồi về login hoặc trang theo role |
| /login, /signup | Đăng nhập chung / tạo tài khoản User |
| /events, /events/:eventId | User xem/tìm/lọc/chi tiết |
| /events/:eventId/register | User đặt vé |
| /registrations/:registrationId, /my-tickets | Kết quả/vé của chủ tài khoản |
| /admin/login | Chuyển tới /login |
| /admin, /admin/events/new, /admin/events/:eventId/edit | Admin quản trị |
| /admin/users | Admin tìm/sửa/xóa tài khoản User |

API GET sự kiện vẫn công khai; giao diện API mode yêu cầu đăng nhập để vào khung ứng dụng. Route guard chỉ giúp điều hướng; backend quyết định quyền. Sai URL role đưa về trang chính đúng role.

SessionProvider/services/session/useSession giữ một nguồn phiên trong bộ nhớ; BroadcastChannel chỉ gửi tín hiệu changed, không gửi credential. Kiểm tra lại khi quay về tab và theo hạn8giờ. AppShell giữ sidebar/navbar/logout; SiteLayout và AdminLayout kiểm tra role cho từng nhóm route. Buyer hook lấy phần User từ phiên chung để các form đặt vé dễ đọc. Các file khung/chọn khu vực cũ còn trên đĩa nhưng không nối vào route mới, không phải luồng cần phát triển tiếp.

http-client xử lý HTTP/lỗi chung, không fallback mock khi API lỗi. services/buyer phụ trách đăng ký/đặt vé/Vé của tôi; services/admin phụ trách CRUD. Form đặt vé giữ UUID và phone đang chờ trong sessionStorage theo User/event, không lưu password/cookie/CSRF. Timeout/mất phản hồi giữ key/body để retry hoặc xem Vé của tôi; không tự retry ghi. Sự kiện đã xóa không khôi phục vé qua replay.

## Kiểm tra và giới hạn

```powershell
npm.cmd --prefix frontend run build
npm.cmd --prefix frontend run lint
```

check-buyer-browser.mjs thử signup/login/return path/đặt vé/Vé của tôi/logout, bỏ response sau commit và502 không JSON để kiểm tra retry không tạo vé thứ hai. Cần fixture http-open/http-other từ integration, bảng mới riêng có prefix fcaj-event-workshop-local-test-.

check-admin-browser.mjs gọi check-unified-browser.mjs: login chung, menu role, đổi tài khoản/đăng xuất nhiều tab, sidebar mobile, xóa event đã có vé và giữ vé khác. Credential test chỉ nhận qua stdin từ check_admin_api.py --browser; không lưu mật khẩu vào file.

Các script mặc định frontend5173/API3001/CDP9241; dùng FRONTEND_TEST_URL/API_TEST_URL/CHROME_DEBUG_PORT để đổi sang5175/3002. Dùng Edge/Chrome headless profile riêng. Kiểm tra320/375/414/768/1280 và ảnh thực tế. Kết quả đã chạy xem [nhật ký 23/10](../phuc-worklog/WORKLOG.md), không coi mô tả test là kết quả đạt.

Mock chỉ để xem sự kiện, không mô phỏng account/quyền/transaction. Chưa AWS, Organizer nhiều đơn vị, OTP, khôi phục mật khẩu, thanh toán, hủy vé, Firefox/Safari hoặc trình đọc màn hình. Hai warning Fast Refresh cũ ở ui/button.tsx và ui/badge.tsx còn nguyên.

Nguồn: [API v4](../docs/api-contract.md), [data model](../docs/data-model.md), [security](../docs/security.md), [quy tắc](../phuc-worklog/AI_RULE.md).

## Quản lý User và thu gọn sidebar (API 4.1)

Nhánh `phuc`: Admin vào `/admin/users` để tìm tên/email, sửa tên/email và xóa User. Xóa sẽ hủy vé/trả chỗ; nếu trả 202, dùng nút tiếp tục xóa. Sidebar cả hai role có nút thu gọn trên navbar; mobile vẫn giữ menu đầy đủ. Chỉ tùy chọn giao diện được lưu localStorage.

Kiểm tra HTTP và giao diện: từ gốc dự án chạy `python backend/tools/check_accounts_api.py --base-url http://127.0.0.1:3002 --browser`, với SAM test/database test riêng, Vite 5175 proxy tới 3002 và Edge CDP 9241. Script từ chối ghi nếu health không chỉ ra bảng có prefix `fcaj-event-workshop-local-test-`. Xem [contract](../docs/api-contract.md).
