# Dọn dữ liệu mẫu

Ngày hoàn thành: **16/10/2026**. Nhánh: **`phuc`**. Môi trường: DynamoDB Local, bảng `fcaj-event-workshop-local`.

## Yêu cầu và nguyên nhân

Người dùng muốn loại bỏ các sự kiện và số người tham gia ảo đang xuất hiện trong màn hình admin. Dữ liệu khởi tạo cũ có tám sự kiện với số chỗ còn lại nhỏ hơn sức chứa, nhưng không tạo bản ghi người đăng ký tương ứng. Admin tính chỗ đã dùng bằng `capacity - remainingSeats`, nên các sự kiện mẫu này bị chặn xóa theo quy tắc bảo vệ sự kiện đã có đăng ký.

Trước khi dọn đã đọc trực tiếp toàn bộ bảng: **8 EVENT, 0 REGISTRATION, 0 REGISTRATION_UNIQUE, 1 ADMIN, 1 SESSION và 2 LOGIN**. Tám sự kiện khớp nội dung, sức chứa và số chỗ trong fixture; chưa có phiên bản chỉnh sửa của admin. Không có sự kiện tự tạo trong bảng tại thời điểm kiểm tra.

## Việc đã hoàn thành

- Xóa đúng tám sự kiện mẫu: `thiet-ke-de-dung`, `du-lieu-co-ban`, `cv-dung-nang-luc`, `giao-dien-web`, `ve-cung-cong-dong`, `trinh-bay-y-tuong`, `nhiep-anh-ke-chuyen`, `ket-noi-tinh-nguyen`.
- Thực hiện một lượt bảo trì trực tiếp bằng DynamoDB transaction, chỉ nhắm các khóa sự kiện đã xác minh. Mỗi thao tác xóa có điều kiện đối chiếu các trường đã đọc, bao gồm số chỗ và phiên bản, để dừng nếu sự kiện vừa thay đổi. Không thêm đường API bỏ qua quyền admin hoặc quy tắc chặn xóa.
- Giữ nguyên tài khoản admin, session, bộ đếm đăng nhập và Docker volume. Không có bản ghi người đăng ký nào cần xóa; số người ảo là số chỗ nền trong sự kiện.
- Sửa `backend/dynamodb_setup/init_db.py`: mặc định chỉ tạo bảng nếu thiếu, không tự thêm dữ liệu mẫu. Dùng `--seed-demo` khi chủ động cần demo; seed vẫn không ghi đè bản ghi cũ. Fixture được giữ lại cho kiểm thử, và integration test bật demo rõ ràng trên bảng test riêng.
- Sửa `backend/tools/check_api.py` để chấp nhận danh sách trống hoặc sự kiện tự tạo, thay vì bắt buộc tám sự kiện và một ID mẫu cố định.
- Cập nhật README, mô hình dữ liệu và `boi-canh.md` để phản ánh cách khởi tạo mới và kết quả dọn dữ liệu.

Cách xử lý vẫn giữ phân chia frontend → API → backend → database. Giao diện và API nghiệp vụ không cần thay đổi: sau khi tải lại danh sách, admin có thể tự tạo sự kiện mới với toàn bộ số chỗ còn trống. Frontend chạy `VITE_DATA_MODE=mock` vẫn có dữ liệu mẫu riêng; đó không phải database ứng dụng.

## Kết quả kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| Đọc lại database sau dọn | 0 sự kiện, 0 đăng ký; giữ nguyên 1 ADMIN, 1 SESSION, 2 LOGIN |
| So sánh dữ liệu ngoài partition sự kiện trước/sau | Không thay đổi |
| Chạy lại `initialize(table)` mặc định trên bảng ứng dụng | `created=0`, `preserved=0`; không sinh lại mẫu |
| Handler `GET /health`, `GET /events` gọi trực tiếp với DB thật | 200; DB ready; `events=[]` |
| Service danh sách admin đọc DB thật | `events=[]` |
| Unit test bằng Python host 3.11 | 46 đạt; 2 integration test được bỏ qua theo cấu hình mặc định |
| Kiểm tra công cụ smoke với HTTP giả lập | Đạt cho danh sách trống và một sự kiện có ID tự tạo, trạng thái closed |
| `git diff --check` | Đạt |

Trong đợt này không chạy lại SAM HTTP server, kiểm thử trình duyệt hoặc integration transaction. Kiểm tra handler trực tiếp không được hiểu là đã chạy HTTP qua SAM. Không tải thêm image Docker hoặc cài thư viện mới.

## Nguồn tham khảo và bằng chứng

- [Dữ liệu mẫu gốc](../../backend/dynamodb_setup/events.json): đối chiếu đúng tám ID, nội dung và số chỗ trước khi xóa.
- [Script khởi tạo](../../backend/dynamodb_setup/init_db.py), [unit test khởi tạo](../../tests/backend/test_read_api.py) và [integration fixture](../../tests/backend/test_registration_integration.py): xác định hành vi mặc định, tùy chọn demo và việc bảo toàn bản ghi cũ.
- [Quy tắc quản trị](../../backend/lambda/admin_events.py) và [repository](../../backend/lambda/repository.py): cách tính chỗ đã dùng, chặn xóa và điều kiện bảo vệ khi có thay đổi đồng thời.
- [Công cụ kiểm tra API](../../backend/tools/check_api.py): kiểm tra danh sách trống và chi tiết theo ID thực tế.
- [AWS — DynamoDB Transactions: How it works](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html), đã đọc ngày 16/10/2026: tham khảo transaction thực hiện toàn bộ hoặc không thực hiện khi một điều kiện không đạt.

Các số lượng database ở trên là kết quả đọc local trong lần thực hiện này, không phải số liệu lấy từ tài liệu AWS hoặc số liệu cố định cho những lần dùng sau. Không ghi mật khẩu, token hoặc dữ liệu cá nhân vào worklog.
