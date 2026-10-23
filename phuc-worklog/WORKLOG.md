# Nhật ký công việc

Ghi các công việc chính đã hoàn thành và kết quả kiểm tra theo ngày, phục vụ báo cáo tiến độ. Bối cảnh hiện hành xem [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md); quy cách cộng tác xem [AI_RULE.md](AI_RULE.md).

## Giai đoạn nền — trước 16/10/2026

Báo cáo cũ chưa có đủ mốc ngày chi tiết; giữ riêng giai đoạn này, không tính lại thành công việc mới ngày 16/10 hoặc 23/10.

- Hoàn thiện frontend prototype: danh sách/chi tiết, tìm kiếm/lọc, form đăng ký, kết quả và lựa chọn API/mock.
- Xây backend SAM/DynamoDB Local với API health, danh sách/chi tiết sự kiện, tạo/đọc đăng ký; transaction giữ chỗ và chống trùng email. Tích hợp toàn bộ luồng người tham gia với API thật, xử lý lỗi và lưu dữ liệu bền vững.
- Báo cáo giai đoạn ghi nhận 26 unit, 2 integration đạt cùng HTTP/browser/build; đây là bằng chứng cũ, chưa có tài khoản User hoặc idempotency giữa các lần gửi HTTP ở mốc đó.

Nguồn: [báo cáo nền lưu trong Git](https://github.com/leanhquan0211/FCAJ-23521254-23521225/blob/b7e1b889029938e0a68ab1acd89bf1f6dffc156b/phuc-worklog/Reports/BC.txt).

## 16/10/2026 — Tuần 3

### Công việc chính

| Hạng mục | Kết quả |
| --- | --- |
| Xác thực và quản trị sự kiện | Thêm đăng nhập/session/đăng xuất Admin, API và giao diện tạo/sửa/xóa, mở/đóng đăng ký. Backend kiểm tra quyền, Origin/CSRF, giới hạn đăng nhập và version khi cập nhật. |
| Bảo toàn số chỗ | Khi sửa sức chứa, giữ số chỗ đã dùng; không giảm dưới mức đã đăng ký. Ở mốc này chặn xóa sự kiện có người; quy tắc xóa được thay đổi ngày 23/10. |
| Tích hợp giao diện | Thêm chọn vai trò, trang quản trị, proxy API cùng origin; giữ thiết kế và component hiện có, không thêm dependency. |
| Dọn dữ liệu mẫu | Xác minh tám sự kiện mẫu không có đăng ký thật rồi xóa đúng tám sự kiện, giữ tài khoản Admin và volume dữ liệu. Đổi init mặc định thành chỉ tạo bảng; thêm mẫu phải dùng --seed-demo, không ghi đè bản ghi cũ. |

### Kiểm tra

- Đợt quản trị: 45 unit và 2 integration đạt; HTTP, trình duyệt, SAM build/validate và frontend build/lint đạt. Kiểm tra tranh chỗ, chống trùng, quyền, CSRF, xung đột version và responsive.
- Đợt dọn mẫu: 46 unit đạt, 2 integration bỏ qua; handler/service với DB thật xác nhận danh sách trống và dữ liệu ngoài sự kiện không đổi. Không chạy lại SAM HTTP/browser trong đợt dọn.
- Các số liệu trên thuộc từng lượt kiểm tra ngày 16/10, không cộng thành một suite hoặc coi là trạng thái DB hiện tại.

Nguồn lịch sử: [nâng cấp quản trị](https://github.com/leanhquan0211/FCAJ-23521254-23521225/blob/b7e1b889029938e0a68ab1acd89bf1f6dffc156b/phuc-worklog/week-3/2026-10-16-role-admin-event-management.md), [dọn mẫu](https://github.com/leanhquan0211/FCAJ-23521254-23521225/blob/b7e1b889029938e0a68ab1acd89bf1f6dffc156b/phuc-worklog/week-3/2026-10-16-don-du-lieu-mau.md). Các bản này giữ trong Git để truy nguyên, không dùng làm hướng dẫn chạy hiện hành.

## 23/10/2026 — Tuần 4

### Công việc chính

| Hạng mục | Trước cập nhật | Kết quả sau cập nhật |
| --- | --- | --- |
| Tài khoản người tham gia | Chỉ Admin có tài khoản; khách đăng ký sự kiện bằng tên/email | Thêm đăng ký, đăng nhập, kiểm tra phiên và đăng xuất cho User; mật khẩu được băm, email duy nhất, không tự cấp quyền Admin. |
| Đặt vé và chống trùng | Ghi danh theo email trong từng sự kiện | Gắn vé với userId; mỗi User tối đa một vé/sự kiện. Mở rộng transaction giữ chỗ để kiểm tra tài khoản và ghi vé, liên kết sở hữu, idempotency cùng nhau. |
| Khôi phục yêu cầu gửi lặp | Chưa có key ổn định giữa các lần gửi HTTP | Thêm Idempotency-Key; gửi lại cùng key/nội dung nhận đúng vé đã lưu, không trừ thêm chỗ. Cùng key nhưng đổi nội dung bị từ chối. |
| Giờ mở bán | Chủ yếu mở/đóng đăng ký thủ công | Thêm salesOpenAt; backend kiểm tra giờ mở bán, trạng thái, thời điểm diễn ra và số chỗ theo giờ server. |
| Quyền xem vé | Kết quả đăng ký chưa gắn tài khoản sở hữu | Thêm Vé của tôi và kiểm tra chủ vé ở backend. Dữ liệu cũ chưa có userId được giữ nguyên, không tự gán theo email. |
| Điều hướng và phiên đăng nhập | Trang chọn khu vực, điều hướng User/Admin dễ lẫn; từng có hai phiên riêng | Chuyển sang một form đăng nhập, menu theo vai trò và một tài khoản đang dùng trong cùng browser/profile; đồng bộ đổi tài khoản/đăng xuất giữa các tab. |
| Giao diện ứng dụng | Chưa có khung điều hướng thống nhất | Thêm sidebar trái, navbar, vị trí trang hiện tại và đăng xuất. Sidebar cả hai vai trò thu gọn được, có nhãn hướng dẫn bằng chuột/bàn phím, nhớ lựa chọn; điện thoại dùng menu đầy đủ. |
| Xóa sự kiện | Chặn xóa khi có chỗ đã dùng | Cho Admin xóa cả sự kiện có người; dọn vé, ghi danh và idempotency của sự kiện, giữ tài khoản và dữ liệu sự kiện khác. |
| Quản lý User | Chưa có trang quản lý | Thêm danh sách hiện tên/email, tìm theo tên/email, sửa thông tin và xóa User. Sửa email có kiểm tra trùng và version để tránh ghi đè; vé cũ giữ thông tin lúc đăng ký. |
| Xóa User | Chưa hỗ trợ | Khóa truy cập trước, hủy vé và trả chỗ cho sự kiện còn hoạt động; gửi lại thao tác không trả chỗ hai lần, không ảnh hưởng người khác. |
| Tổ chức mã nguồn và bàn giao | Ứng dụng và bộ kiểm thử ở nhiều nhánh riêng | Chuẩn hóa API contract/data model, hợp nhất các nhánh vào phuc, giữ main và xóa nhánh feature đã gộp. Bộ test lab của bên kiểm thử được giữ nguyên, chưa tự đổi adapter. |

Đã sửa các lỗi tìm thấy khi kiểm tra: vé còn sót sau khi xóa sự kiện bị gián đoạn; vùng bấm icon sai khi ghép tooltip với menu; thông báo lỗi xóa bị mất sau tải lại; form sửa tài khoản giữ version cũ. Các trường hợp này đã được kiểm tra lại.

### Kiểm tra

| Phạm vi | Kết quả đã ghi nhận trong ngày |
| --- | --- |
| Backend với DynamoDB Local | 75/75 bài đạt, gồm 63 bài không cần DB và 12 integration. Có tranh chỗ cuối, chống trùng, replay, quyền xem vé, xóa đồng thời và tiếp tục sau gián đoạn. |
| HTTP và trình duyệt | Luồng tài khoản, đặt/xem vé, quản lý sự kiện/User và sidebar đạt. Đã thử mất phản hồi sau khi lưu để xác nhận không tạo thêm vé; kiểm tra giao diện ở 320/375/414/768/1280px. |
| Build và cấu hình | SAM build/validate, frontend build/lint đạt; còn hai cảnh báo Fast Refresh có sẵn. |
| Sau hợp nhất Git | 63 bài backend và 28 bài unit test lab đạt; build/lint cả web sản phẩm và dashboard đạt. 12 bài DB được bỏ qua ở lượt này vì Docker đã tắt, không phải chạy lại toàn bộ 75 bài. |

Các bài ghi/xóa dùng bảng test riêng. Bài tranh chỗ đã kiểm tra ở quy mô 8 người/1 chỗ; **chưa phải kết quả 100 người hoặc bằng chứng scaling AWS**. Unit/build của test lab chỉ xác nhận phần công cụ được kiểm tra, không thay bài tích hợp với ứng dụng hiện hành.

### Đối chiếu thay đổi

- Các commit triển khai: [tài khoản và đặt vé](https://github.com/leanhquan0211/FCAJ-23521254-23521225/commit/1688c9809ec27eed1a03a01cde262b6afce0f8c3), [phiên chung và xóa ghi danh](https://github.com/leanhquan0211/FCAJ-23521254-23521225/commit/a10907f0287acd7c664b3902b55968565e66042b), [quản lý User và sidebar](https://github.com/leanhquan0211/FCAJ-23521254-23521225/commit/9d47cff71a8f75e9c42845700d497cf029a56b16).
- Mã xử lý: [booking.py](../backend/lambda/booking.py), [session.py](../backend/lambda/session.py), [event_deletion.py](../backend/lambda/event_deletion.py), [account_repository.py](../backend/lambda/account_repository.py), [AppShell.tsx](../frontend/src/components/AppShell.tsx), [AdminAccountsPage.tsx](../frontend/src/pages/admin/AdminAccountsPage.tsx).
- Bằng chứng hồi quy: [tests backend](../tests/backend/test_unified_integration.py), [HTTP account](../backend/tools/check_accounts_api.py), [browser account](../tests/frontend/check-accounts-browser.mjs), cùng đầu ra kiểm tra đã chạy trong phiên phát triển. Các kết quả trên được tổng hợp từ lượt phát triển/kiểm tra, không phải chạy lại khi sắp xếp tài liệu.
