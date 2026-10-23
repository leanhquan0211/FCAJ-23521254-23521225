# Frontend đăng ký sự kiện — API v3

React/TypeScript/Vite, Tailwind và shadcn/ui. Giữ hệ thiết kế Almanac trong [DESIGN.md](DESIGN.md): màu giấy/pine, Be Vietnam Pro cho tiêu đề và Geist cho nội dung. Không bổ sung thư viện UI/test cho mốc này.

## Chạy local

Từ thư mục gốc của đúng worktree:

```powershell
npm.cmd --prefix frontend ci
npm.cmd --prefix frontend run dev
```

Mở `http://127.0.0.1:5173`. Vite proxy `/api` sang SAM3001, không cần API URL chứa secret. Mặc định `VITE_DATA_MODE=api`, `VITE_API_BASE_URL=/api`; có thể copy `.env.example` thành `.env.local` khi cần. Sau đổi env phải restart Vite. Backend xem [hướng dẫn](../backend/README.md).

Nếu đang dùng SAM test3002, trong terminal Vite trước khi chạy dev:

```powershell
$env:API_PROXY_TARGET='http://127.0.0.1:3002'
npm.cmd --prefix frontend run dev
```

Đây là cấu hình proxy của Vite tại máy, không phải cấu hình hosting AWS. Cổng5173 cần trống; không dừng process của cửa sổ khác khi chưa đối chiếu. Preview4173 không nằm trong Origin allowlist mặc định cho login.

## Luồng dùng thử

1. Khách xem/tìm/lọc sự kiện công khai. Chọn sự kiện còn chỗ và bấm đặt vé.
2. Chưa có phiên thì sang login; chọn tạo tài khoản, nhập tên/email/mật khẩu15–128ký tự và xác nhận mật khẩu.
3. Register thành công quay sang login, chưa tự đăng nhập. Sau login quay lại đúng sự kiện đã chọn.
4. Tên/email lấy từ tài khoản, chỉ nhập phone tùy chọn rồi xác nhận. Backend quyết định lịch mở bán, trạng thái và số ghế.
5. Trang kết quả có mã vé; Vé của tôi liệt kê vé của tài khoản đang đăng nhập. Logout thu hồi phiên và tải lại trang công khai để xóa toàn bộ trạng thái tài khoản trong bộ nhớ.

Đặt vé hiện là giữ chỗ và mã xác nhận, chưa thanh toán/gửi email. Admin vẫn đăng nhập riêng, tạo/sửa/đóng sự kiện; thêm `salesOpenAt` tùy chọn trong form. Để trống = không hẹn giờ; nhập theo giờ Việt Nam và không sau giờ diễn ra. Chưa tới lịch hiển thị Chưa mở bán. Sự kiện có chỗ đã dùng không được xóa.

## Routes và trách nhiệm mã

Giao diện được tách thành ba khung, giữ nguyên các URL và API v3:

- `/` dùng `EntryLayout` trung lập: hai lối vào, không hiện tài khoản và không gọi API session.
- Các trang người tham gia dùng `SiteLayout` bên trong `BuyerSessionProvider`: chỉ hiện tên User, menu sự kiện/vé và logout User. Logo quay về danh sách sự kiện; Chọn khu vực khác quay về trang chung.
- `/admin/login` và các trang `/admin` dùng `AdminShell`: nhãn Khu vực quản trị, menu quản lý/tạo sự kiện và tên admin. `AdminLayout` kiểm tra phiên/quyền trước nội dung quản trị. Logout về `/admin/login`; Xem website mở khu người tham gia.

Hai phiên có thể cùng tồn tại. Chuyển khu vực chỉ điều hướng, không đổi quyền hay đăng xuất. Logout chỉ thu hồi phiên của khu vực đang dùng. Trang admin không tự tải session User, trang User không tự tải session admin. Lỗi đường dẫn trong khu admin vẫn nằm trong khung admin sau khi kiểm tra quyền.

| Route | Chức năng |
| --- | --- |
| / | Chọn khu vực, trung lập và chỉ điều hướng |
| /events, /events/:eventId | Xem/tìm/lọc/chi tiết công khai |
| /signup, /login | Tài khoản người tham gia |
| /events/:eventId/register | Đặt vé, cần User |
| /registrations/:registrationId | Kết quả, chỉ chủ vé |
| /my-tickets | Vé của tôi |
| /admin/login | Đăng nhập quản trị |
| /admin, /admin/events/new, /admin/events/:eventId/edit | Quản trị, cần admin |

`services/http-client.ts` xử lý HTTP/lỗi chung, không fallback sang mock khi API lỗi. `services/buyer.ts` giữ API User/booking; `BuyerSessionProvider` kiểm tra phiên khi tải trang, giữ CSRF trong bộ nhớ và xử lý hết hạn. `booking` form giữ UUID cho ý định đang chờ theo User/event trong sessionStorage; không lưu password/cookie/CSRF ở đó. `services/admin.ts` và `pages/admin/` giữ luồng admin.

Khi request chưa rõ kết quả, form giữ nguyên key/phone và cho thử lại; qua reload vẫn tiếp tục ý định cũ. Sau thành công xóa ý định. Người dùng cũng có thể xem Vé của tôi. Cùng User/event đã có vé nhưng key khác thì điều hướng đến vé đã có. Backend kiểm tra ownership; route guard UI chỉ hỗ trợ trải nghiệm.

## Mock và giới hạn

`VITE_DATA_MODE=mock` chỉ để xem danh sách/chi tiết với dữ liệu mẫu. V3 không mô phỏng tài khoản, đặt vé hoặc quyền admin. Không dùng localStorage/mock để chứng minh transaction hay tải thật. Các helper mock đăng ký cũ còn để tham khảo lịch sử, không nối vào luồng sản phẩm v3.

Hosting sau này cần SPA fallback và HTTPS/Secure cookie. Chưa triển khai AWS, OTP, khôi phục mật khẩu, Organizer nhiều đơn vị, thanh toán hoặc hủy vé. Vé legacy không có userId được giữ trong DB nhưng không đọc công khai và không tự nhận theo email.

## Kiểm tra

```powershell
npm.cmd --prefix frontend run build
npm.cmd --prefix frontend run lint
```

`tests/frontend/check-buyer-browser.mjs` dùng Node WebSocket/CDP với Edge/Chrome headless, API thật trên bảng test. Mặc định frontend5173, API3001, debug9241; chọn `API_TEST_URL=http://127.0.0.1:3002` khi dùng bảng test. `FRONTEND_TEST_URL` và `CHROME_DEBUG_PORT` có thể đổi. Script tự chặn bảng không có prefix test. Fixture `http-open` được tạo bởi integration suite trong [Backend README](../backend/README.md#kiểm-thử), không chạy browser script trên dữ liệu ứng dụng.

Buyer browser kiểm tra signup/login/return path/đặt vé/Vé của tôi/logout; chặn response sau server commit, reload và retry để chứng minh chỉ một vé. Kiểm tra320/375/414/768/1280px. `check-registration-browser.mjs` là tên tương thích trỏ sang bài v3. `check-admin-browser.mjs` kiểm tra hồi quy quản trị và nhận tài khoản test qua stdin từ `check_admin_api.py --browser`. Dùng profile trình duyệt riêng, không dùng profile cá nhân.

Browser admin bổ sung kiểm tra menu/danh tính khi cả hai phiên cùng đăng nhập, không gọi session sai khu vực, và logout mỗi khu vẫn giữ phiên còn lại. Nếu frontend thử chạy ở5175 để không chiếm5173 đang dùng, chỉ thêm Origin5175 vào **env test riêng**, chạy Vite với `API_PROXY_TARGET` trỏ3002 và `--port 5175 --strictPort`; đặt `FRONTEND_TEST_URL=http://127.0.0.1:5175`. Không cần đổi allowlist ứng dụng chính hoặc template để thử qua proxy cùng origin.

Kết quả và ảnh đã kiểm tra được ghi ở [nhật ký23/10](../quan-worklog/week-4/23-10.md). Chưa kiểm tra Firefox/Safari, trình đọc màn hình hoặc nhiều thiết bị. Hai warning Fast Refresh cũ ở `ui/button.tsx` và `ui/badge.tsx` vẫn còn.

Nguồn contract: [API v3](../docs/api-contract.md), [security](../docs/security.md), [yêu cầu con người](../quan-worklog/yeu-cau.md).
