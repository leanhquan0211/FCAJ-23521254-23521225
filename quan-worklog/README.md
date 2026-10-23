# Nhật ký và bàn giao luồng người mua

Ngày bắt đầu **23/10/2026**, tuần4. Đây là khu ghi chép cho phần ứng dụng/người mua theo biên bản Phúc gửi; không suy ra tác giả của các công việc cũ từ tên thư mục.

## Cửa sổ mới đọc theo thứ tự

1. [Phong cách chung](../phuc-worklog/phong-cach.md): giải thích dễ hiểu, mô tả trước code, chờ duyệt và kiểm tra theo giai đoạn. Lượt23/10 đã được người dùng duyệt toàn plan và cho phép tự hoàn tất.
2. [Biên bản con người](yeu-cau.md): nguồn yêu cầu gốc, giữ nguyên văn.
3. [Nhật ký23/10](week-4/23-10.md): đọc mục cập nhật mới nhất để biết kết quả, process và điểm tiếp tục; phần đầu là lịch sử khảo sát trước triển khai.
4. [Phối hợp Git](phoi-hop.md): phạm vi file, worktree, cổng và mốc bàn giao.
5. [Contract chính thức v3](../docs/api-contract.md), [data model](../docs/data-model.md), [security](../docs/security.md). [Bản nháp ban đầu](api-du-kien.md) giữ để giải thích quyết định, không thay canonical contract.

## Trạng thái cần nhớ

- Code mới nằm trên `feat/buyer-flow` tại `.worktrees/buyer-flow`. Nền `f4e20b9` đã chứa quan-worklog trên GitHub main. Không đổi branch/file của cửa sổ ở repo gốc; lúc kiểm tra cuối, repo gốc đang ở `phuc`, cũng tại nền này.
- V3 có User/register/login/session/logout, đặt vé bằng session+CSRF+Idempotency-Key, Vé của tôi và owner-only. Admin có giờ mở bán. Dữ liệu legacy giữ nguyên, không tự nhận theo email chưa xác minh.
- Bên ứng dụng đã kiểm tra unit, transaction DynamoDB, HTTP và Edge headless; số lượng/lệnh/kết quả cụ thể trong nhật ký. Chưa chạy bài k6 100 người, runner hoặc dashboard của bên đồng hành.
- Chỉ local; đặt vé = giữ chỗ + mã xác nhận. Chưa thanh toán/OTP/Organizer nhiều đơn vị/AWS và chưa chứng minh autoscaling.
- Không tạo `tests/load`, `tests/runner`, `tests/dashboard`, `tests/results` thay bên kiểm thử. Phía đó tích hợp commit bàn giao rồi build API test từ đúng worktree/contract.

Ghi tiếp nhật ký theo ngày, phân biệt yêu cầu đã duyệt, mã đã có và kết quả thực chạy. Không đưa password/token/cookie vào Git. Mỗi lần đo phải ghi app commit, contract version và run/table chính xác.

Nguồn nền: [bối cảnh tuần3](../phuc-worklog/week-3/boi-canh.md), [nhật ký Phúc đầu ngày](../phuc-worklog/week-4/23-10.md), README và tài liệu trong docs. Việc ghi chép mới không chuyển tác giả công việc cũ sang Quân.
