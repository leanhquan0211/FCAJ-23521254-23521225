# Frontend đăng ký sự kiện — API 4.1

React/TypeScript/Vite, Tailwind và shadcn/ui. Hệ Sakura Night trong [DESIGN.md](DESIGN.md): nền navy, điểm nhấn hồng, Be Vietnam Pro và Geist; dùng component/Dialog/Lucide sẵn có, không thêm dependency cho redesign.

## Giao diện trên nhánh quan — 30/10/2026

Bố cục đã đổi theo ảnh tham chiếu: điều hướng ngang trong suốt nhạt dần, hero chữ trái–đồ họa phải, dải chủ đề, phần giới thiệu bất đối xứng và danh sách Card. Thanh/nav control không bo tròn; bỏ nút thu gọn desktop, giữ drawer mobile. Đăng nhập/đăng ký dùng phần giới thiệu và form hai cột; mobile xếp dọc. Danh sách quản trị và Vé của tôi dùng Card grid thay các hàng chia đường kẻ. Route, state nghiệp vụ, handler nghiệp vụ, service và validation được giữ.

`src/components/BlossomArtwork.tsx` vẽ quạt giấy/cành hoa bằng path SVG với sắc neon và nhiều cánh hoa, không dùng ký tự ghép hình hoặc emoji. `BrandMark.tsx` là logo SVG có shading/highlight tạo chiều sâu. Animation 6.5–8.5 giây chỉ dùng transform/opacity; reduced motion dừng đồ họa. `ThemeToggle.tsx` đổi sáng/tối và nhớ lựa chọn qua localStorage. Token hai mode nằm ở `tokens.css`; style mới thêm cuối `src/index.css`, giữ import Tailwind/shadcn/font.

Bổ sung chất liệu kính theo ảnh tham chiếu thứ hai: phần giới thiệu đứng riêng; chỉ khung form đăng nhập/đăng ký có nền kính, logo và liên kết chuyển form. Header cao 56px, tông hồng có mức che phủ mặc định khoảng 25%. Form, Card, bộ lọc và Dialog dùng kính xuyên nền, mặc định trong suốt 65% (alpha nền 35–43%), blur 8px; có fallback nền đặc. `DimensionalIcons.tsx` giữ hình nghĩa Lucide nhưng dựng nhiều lớp SVG tạo khối, cạnh và ánh sáng; logo cạnh dòng giới thiệu dùng `BrandMark.tsx`. `SakuraBackdrop.tsx` được gắn một lần trong `main.tsx`, tạo 28 cánh hoa nền (16 trên mobile), không chắn thao tác; reduced motion dừng lớp này.

`AppearanceControls.tsx` đặt ba icon cạnh nút sáng/tối: nhấn để mở Popover Trong suốt, Neon hoặc Bóng nổi, đều từ 0–100%, mặc định 65%/70%/60%. Thay đổi áp dụng ngay, hỗ trợ bàn phím/Escape/bấm ngoài và nhớ lựa chọn qua khóa localStorage `event-workshop:appearance`. Mức trong suốt 100% đưa alpha nền kính và blur về 0; không còn thanh ở cuối màn hình. Bóng nổi điều chỉnh cạnh/ánh sáng/bóng của Card, form, nút và Input; 0% tắt bóng. Bóng có quầng neon hồng phụ thuộc cả Bóng nổi và Neon; Neon 0% bỏ quầng nhưng giữ bóng tạo khối. Thiết lập cũ chưa có elevation tự dùng 60%. `PageMotion.tsx` tạo hiệu ứng vào mờ/lướt 320ms khi đổi route, không key/remount nội dung theo pathname; reduced motion tắt animation. Không thay cấu trúc router hoặc logic nghiệp vụ.

Chất liệu Liquid Glass: Card/form/khung lọc có phản xạ và viền sáng, cạnh nổi/bóng mềm; các nút nội dung dạng kính cong, primary giữ màu hồng. Input có bóng phía trong, chữ và focus giữ rõ. Bốn nút trong suốt/neon/bóng nổi/theme sát nhau, icon 24px và vùng bấm 44px. Entry header không còn nút Khám phá dẫn vòng lại login; menu sau đăng nhập giữ nguyên. Ở 320px, brand của khung đã đăng nhập chỉ hiện logo có tên truy cập để tránh tràn.

Browser UI smoke đạt 100 lượt bố cục: 320/375/414/768/1280px × 10 màn hình × sáng/tối, bằng response fixture chặn ngay trong profile trình duyệt riêng, không ghi database. Đã kiểm tra lọc/tìm/xóa lọc, drawer/Escape/trả focus, theme persistence sau reload, form/kết quả với fixture, lỗi/loading mô phỏng và reduced motion. Đây không phải kết quả HTTP/Backend integration thật. Script/ảnh/report tạm ở `.browser-temp/quan-ui/`, được gitignore. Các browser script lịch sử dưới `tests/frontend/` có selector theo sidebar cũ; chưa được cập nhật hoặc chạy lại trong phạm vi chỉ sửa Frontend này.

Lượt kiểm tra cuối đạt 100 lượt bố cục; kiểm tra Popover chỉ hiện sau nhấn icon, vị trí không tràn ở 5 độ rộng, Escape/trả focus, bàn phím và giá trị 100% lưu sau reload, chuyển form/tab bằng click có animation 320ms, reduced motion, cánh hoa nền và logo giới thiệu. Bóng nổi 0/60/100 thay đổi box-shadow thực tế của panel/nút/Input; kiểm tra neon trên bóng bật/tắt, giữ độ nổi khi Neon 0%, lưu mức mới và nâng cấp thiết lập cũ. Đăng nhập/đăng ký vừa 1366×768 ở cả sáng/tối; nội dung dài và mobile vẫn cuộn tự nhiên. Kết quả ở `.browser-temp/quan-ui/elevation-report.json`; script tạm không được đưa vào Git. Build đạt, lint chỉ còn hai warning Fast Refresh đã có từ trước.

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
3. Menu ngang: User có Khám phá sự kiện/Vé của tôi; Admin có Quản lý sự kiện/Tạo sự kiện/Quản lý tài khoản. Trang hiện tại được đánh dấu; header có nút sáng/tối và đăng xuất. Vùng dưới header nêu vai trò/trang/tên tài khoản. Màn nhỏ dùng drawer, Escape đóng và trả focus.
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

SessionProvider/services/session/useSession giữ một nguồn phiên trong bộ nhớ; BroadcastChannel chỉ gửi tín hiệu changed, không gửi credential. Kiểm tra lại khi quay về tab và theo hạn8giờ. AppShell giữ menu/navbar/logout; SiteLayout và AdminLayout kiểm tra role cho từng nhóm route. Buyer hook lấy phần User từ phiên chung để các form đặt vé dễ đọc. Các file khung/chọn khu vực cũ còn trên đĩa nhưng không nối vào route mới, không phải luồng cần phát triển tiếp.

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

## Quản lý User và menu (API 4.1)

Admin vào `/admin/users` để tìm tên/email, sửa tên/email và xóa User. Xóa sẽ hủy vé/trả chỗ; nếu trả 202, dùng nút tiếp tục xóa. Menu desktop luôn có nhãn, mobile giữ drawer đầy đủ. Chỉ tùy chọn sáng/tối được ghi localStorage, không lưu credential.

Kiểm tra HTTP và giao diện: từ gốc dự án chạy `python backend/tools/check_accounts_api.py --base-url http://127.0.0.1:3002 --browser`, với SAM test/database test riêng, Vite 5175 proxy tới 3002 và Edge CDP 9241. Script từ chối ghi nếu health không chỉ ra bảng có prefix `fcaj-event-workshop-local-test-`. Xem [contract](../docs/api-contract.md).
