# Mô hình DynamoDB Local

Một bảng `fcaj-event-workshop-local`, khóa chuỗi `PK` + `SK`, không có GSI. Chọn mô hình này vì các truy vấn hiện tại là danh sách sự kiện và lấy từng sự kiện/đăng ký bằng ID. Với tập sự kiện Workshop nhỏ, danh sách dùng Query trên partition `EVENTS`, tránh Scan toàn bảng.

| Loại item | PK | SK | Trạng thái triển khai |
| --- | --- | --- | --- |
| Sự kiện | `EVENTS` | `EVENT#<eventId>` | Có bảng/seed và API đọc |
| Đăng ký | `REGISTRATION#<registrationId>` | `METADATA` | Đã triển khai, ID là UUID v4 |
| Khóa chống trùng | `EVENT#<eventId>` | `EMAIL#<email chuẩn hóa>` | Đã triển khai trong cùng transaction |
| Tài khoản admin | `ADMIN#<username chữ thường>` | `METADATA` | role, passwordSalt và passwordHash scrypt; không trả ra API |
| Phiên admin | `SESSION#<SHA-256 token>` | `METADATA` | username, role, csrfToken và expiresAt |
| Giới hạn đăng nhập | `LOGIN#<ip/account>#<SHA-256>#<cửa sổ 15 phút>` | `METADATA` | attempts atomic và expiresAt |

Item sự kiện chứa các trường công khai trong [API contract](api-contract.md), cùng `entityType=EVENT`, `registrationOpen` và `startsAtEpoch` (Unix seconds). `status` được tính khi đọc; không lưu một giá trị trạng thái dễ bị cũ. `remainingSeats` là số nguyên được Backend quản lý. Boto3 trả Decimal; handler chuyển số nguyên sang JSON number, không trả chuỗi.

API đăng ký dùng **một TransactWriteItems** gồm:

1. Update sự kiện, giảm `remainingSeats` đúng một, điều kiện `remainingSeats > 0`, `registrationOpen = true`, `startsAtEpoch > now`.
2. Put khóa chống trùng `eventId + email.trim().lower()`, điều kiện item chưa tồn tại.
3. Put đăng ký có UUID, điều kiện item chưa tồn tại.

Transaction thành công mới trả kết quả 201. Nếu bị hủy, service đọc lại nhất quán để phân loại đóng/hết chỗ/trùng và retry có giới hạn nếu còn xung đột. `ClientRequestToken` là UUID của đăng ký, được giữ nguyên khi SDK retry. Khóa chống trùng chứa `registrationId` để đối chiếu với bản ghi đăng ký; không có API liệt kê các khóa email.

Repository dùng resource client cho đọc và low-level client riêng cho transaction. Low-level client nhận AttributeValue được tạo bởi `TypeSerializer`, tránh trộn cơ chế tự chuyển kiểu của boto3 resource với payload đã serialize.

Các test ghi và tranh chỗ chạy trên bảng riêng `fcaj-event-workshop-local-test-<mã ngẫu nhiên>`, không sửa số chỗ hoặc seed ghi đè bảng ứng dụng. Bảng test được giữ lại sau kiểm thử; không tự xóa dữ liệu/volume.

## Seed và dữ liệu bền vững

`backend/dynamodb_setup/events.json` giữ tám ID, nội dung, sức chứa và số chỗ gốc theo Frontend. Số chỗ đã chiếm trong mock gốc là dữ liệu nền, không có bản ghi đăng ký tương ứng. Khi seed lần đầu, `seedDayOffset` tạo ngày có timezone `+07:00` tương đối với ngày hiện tại ở Việt Nam: các sự kiện tương lai còn chỗ/hết chỗ và hai sự kiện quá khứ đã kết thúc. Ví dụ trong contract là minh họa; ngày thực tế phụ thuộc lần seed đầu.

Mọi Put dùng `attribute_not_exists(PK) AND attribute_not_exists(SK)`. Chạy lại chỉ bổ sung ID thiếu, không đổi ngày, chỗ hoặc dữ liệu đã chỉnh. Vì không tự dời ngày khi chạy lại, các sự kiện sẽ kết thúc theo thời gian thật; cần tạo sự kiện mới có chủ đích ở mốc quản trị sau này thay vì âm thầm reset dữ liệu.

Compose dùng volume `fcaj-event-workshop-dynamodb-data` và `-sharedDb -dbPath /data`, không dùng in-memory. Restart/stop/start vẫn giữ dữ liệu; không dùng `down -v`. Port DB chỉ bind `127.0.0.1:8000`; Lambda vào cùng network `fcaj-event-workshop-local` và truy cập `http://fcaj-dynamodb-local:8000`.

## Quản lý sự kiện và session

Sự kiện mới có `version=1`; sự kiện seed cũ thiếu version được xem là 0. Mỗi sửa tăng version một. Repository chỉ Put/Delete khi version và cặp capacity/remainingSeats vẫn giống bản đọc trước đó. Cần alias `#capacity` vì capacity là reserved word của DynamoDB. Một lượt đăng ký cạnh tranh làm điều kiện cập nhật/xóa thất bại thay vì bị ghi đè.

Sức chứa mới trừ số chỗ đã dùng sẽ ra remainingSeats mới. Xóa bị chặn nếu có bất kỳ chỗ đã dùng, kể cả dữ liệu nền từ seed. API quản trị đọc partition EVENTS, không Scan hoặc xuất tài khoản, session hay khóa email.

`expiresAt` là Unix seconds. Backend luôn kiểm tra thời hạn session bằng code; không dựa vào việc DB có xóa item hết hạn hay không. Bộ đếm chỉ dùng key cửa sổ hiện tại. Mốc local chưa bật dọn TTL tự động, nên item hết hạn có thể còn trong DB; đăng xuất xóa session đang dùng. Không ghi token gốc hoặc mật khẩu rõ vào DB.

Mọi client cần endpoint local rõ ràng. Code chỉ cho các hostname loopback hoặc alias Docker trên, URL HTTP có port; thiếu/sai cấu hình sẽ dừng trước khi tạo boto3 client. Client luôn dùng credentials giả `local`/`local`; không đọc profile AWS hoặc metadata để tìm credentials. Không có đường fallback tới DynamoDB AWS trong mốc này.
