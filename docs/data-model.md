# Mô hình DynamoDB Local

Một bảng `fcaj-event-workshop-local`, khóa chuỗi `PK` + `SK`, không có GSI. Chọn mô hình này vì các truy vấn hiện tại là danh sách sự kiện và lấy từng sự kiện/đăng ký bằng ID. Với tập sự kiện Workshop nhỏ, danh sách dùng Query trên partition `EVENTS`, tránh Scan toàn bảng.

| Loại item | PK | SK | Trạng thái triển khai v4 |
| --- | --- | --- | --- |
| Sự kiện | `EVENTS` | `EVENT#<eventId>` | Có bảng/seed và API đọc |
| Đăng ký | `REGISTRATION#<registrationId>` | `METADATA` | Đã triển khai, ID là UUID v4 |
| Khóa chống trùng email cũ | `EVENT#<eventId>` | `EMAIL#<email chuẩn hóa>` | Legacy giữ nguyên, không ghi mới theo v3 |
| User | `USER#<userId>` | `PROFILE` | fullName/email/role/createdAt, passwordSalt/passwordHash |
| Email duy nhất | `USER_EMAIL#<email chuẩn hóa>` | `METADATA` | userId, cùng transaction tạo User |
| Phiên chung | `APP_SESSION#<SHA-256 token>` | `METADATA` | role + userId hoặc username, csrfToken/expiresAt |
| User/event reference | `USER#<userId>` | `REGISTRATION#<eventId>` | registrationId/eventId/createdAt, entityType USER_REGISTRATION |
| Idempotency | `USER#<userId>` | `IDEMPOTENCY#<key>` | fingerprint/registrationId/registration snapshot |
| Counter User | `USER_AUTH#<kind>#<digest>#<bucket>` | `METADATA` | attempts/expiresAt; riêng signup-ip/login-ip/login-account |
| Tài khoản admin | `ADMIN#<username chữ thường>` | `METADATA` | role, passwordSalt và passwordHash scrypt; không trả ra API |
| Phiên v3 cũ | `SESSION#<hash>` hoặc `USER_SESSION#<hash>` | `METADATA` | Không chấp nhận xác thực v4; thu hồi khi cookie cũ được gửi lúc login/logout |
| Giới hạn đăng nhập | `LOGIN#<ip/account>#<SHA-256>#<cửa sổ 15 phút>` | `METADATA` | attempts atomic và expiresAt |

Item sự kiện chứa các trường công khai trong [API contract v4](api-contract.md), cùng `entityType=EVENT`, `registrationOpen`, `startsAtEpoch` (giây), `startsAtEpochMs` và `salesOpenAtEpochMs` (milliseconds). salesOpenAt=null lưu epoch=0; legacy thiếu salesOpenAt được đọc null, thiếu startsAtEpochMs dùng epoch giây cũ. `status` tính khi đọc. Boto3 Decimal được đổi sang JSON number.

API đăng ký dùng **một TransactWriteItems** gồm:

1. Update sự kiện, giảm `remainingSeats` đúng một, điều kiện không có deleting, còn ghế, manual mở, đã tới salesOpenAt và chưa tới dateTime theo giờ server.
2. ConditionCheck profile User tồn tại, role=user và chưa deleting.
3. Put User/event reference, điều kiện chưa tồn tại.
4. Put đăng ký UUID có userId chủ sở hữu, điều kiện chưa tồn tại.
5. Put User/Idempotency-Key gồm fingerprint và snapshot kết quả, điều kiện chưa tồn tại.

Transaction thành công trả201. Nếu bị hủy, service đọc nhất quán lại để phân loại replay/trùng/đóng/hết chỗ, retry tối đa4 lượt có jitter, sau đó503 REGISTRATION_BUSY. ClientRequestToken sinh cho từng transaction call và giữ trong SDK retry; HTTP request mới vẫn được bảo vệ bởi record idempotency bền vững. Replay đọc trước điều kiện bán, trả200 cùng vé. Chưa có TTL cho idempotency.

Vé của tôi Query PK User và SK prefix REGISTRATION#, sau đó đọc từng Ticket theo ID và kiểm tra owner. Account đăng ký mới dùng transaction hai item: User và email unique. Session chỉ lưu token hash, đọc lại profile/role mỗi request. Vé legacy thiếu userId và khóa email cũ giữ nguyên, không gán theo email; GET User trả404, không còn public. Chỗ legacy không được hoàn lại hay reset khi nâng cấp.

Repository dùng resource client cho đọc và low-level client riêng cho transaction. Low-level client nhận AttributeValue được tạo bởi `TypeSerializer`, tránh trộn cơ chế tự chuyển kiểu của boto3 resource với payload đã serialize.

Các test ghi và tranh chỗ chạy trên bảng riêng `fcaj-event-workshop-local-test-<mã ngẫu nhiên>`, không sửa số chỗ hoặc seed ghi đè bảng ứng dụng. Bảng test được giữ lại sau kiểm thử; không tự xóa dữ liệu/volume.

## Seed và dữ liệu bền vững

`init_db.py` mặc định chỉ tạo bảng nếu thiếu, không tự thêm sự kiện hoặc xóa bản ghi cũ. Admin tự tạo sự kiện để dùng thử với dữ liệu thật. Dữ liệu demo chỉ được thêm khi chủ động truyền `--seed-demo`; test integration bật tùy chọn này trên bảng test riêng.

`backend/dynamodb_setup/events.json` giữ tám ID, nội dung, sức chứa và số chỗ gốc theo Frontend. Số chỗ đã chiếm trong mock gốc là dữ liệu nền, không có bản ghi đăng ký tương ứng. Khi seed lần đầu, `seedDayOffset` tạo ngày có timezone `+07:00` tương đối với ngày hiện tại ở Việt Nam: các sự kiện tương lai còn chỗ/hết chỗ và hai sự kiện quá khứ đã kết thúc. Ví dụ trong contract là minh họa; ngày thực tế phụ thuộc lần seed đầu.

Mọi Put khi seed demo dùng `attribute_not_exists(PK) AND attribute_not_exists(SK)`. Chạy lại với `--seed-demo` chỉ bổ sung ID thiếu, không đổi ngày, chỗ hoặc dữ liệu đã chỉnh. Vì không tự dời ngày khi chạy lại, các sự kiện sẽ kết thúc theo thời gian thật; admin có thể tạo sự kiện mới thay vì âm thầm reset dữ liệu.

Compose dùng volume `fcaj-event-workshop-dynamodb-data` và `-sharedDb -dbPath /data`, không dùng in-memory. Restart/stop/start vẫn giữ dữ liệu; không dùng `down -v`. Port DB chỉ bind `127.0.0.1:8000`; Lambda vào cùng network `fcaj-event-workshop-local` và truy cập `http://fcaj-dynamodb-local:8000`.

## Quản lý sự kiện và session

Sự kiện mới có `version=1`; sự kiện seed cũ thiếu version được xem là 0. Mỗi sửa tăng version một. Repository chỉ Put sửa khi chưa có deleting và version/cặp capacity/remainingSeats vẫn giống bản đọc trước. Xóa dùng quy trình khóa theo version rồi dọn riêng. Cần alias `#capacity` vì capacity là reserved word của DynamoDB. Một lượt đăng ký cạnh tranh làm điều kiện cập nhật/xóa thất bại thay vì bị ghi đè.

Sức chứa mới trừ số chỗ đã dùng sẽ ra remainingSeats mới. Admin được xóa sự kiện bất kể ghế đã dùng; khóa deleting=true, registrationOpen=false trước khi dọn. Điều kiện sửa/booking từ chối khóa deleting. API quản trị sự kiện đọc partition EVENTS; danh sách User riêng dùng Scan và chỉ xuất trường công khai. Không xuất hash mật khẩu, session hay khóa email.

`expiresAt` là Unix seconds. Backend luôn kiểm tra thời hạn session bằng code; không dựa vào việc DB có xóa item hết hạn hay không. Bộ đếm chỉ dùng key cửa sổ hiện tại. Mốc local chưa bật dọn TTL tự động, nên item hết hạn có thể còn trong DB; đăng xuất xóa session đang dùng. Không ghi token gốc hoặc mật khẩu rõ vào DB.

Mọi client cần endpoint local rõ ràng. Code chỉ cho các hostname loopback hoặc alias Docker trên, URL HTTP có port; thiếu/sai cấu hình sẽ dừng trước khi tạo boto3 client. Client luôn dùng credentials giả `local`/`local`; không đọc profile AWS hoặc metadata để tìm credentials. Không có đường fallback tới DynamoDB AWS trong mốc này.

## Xóa ghi danh theo sự kiện — v4

Event có thêm deleting=true và deletionCursor (PK/SK trang scan cuối đã dọn), chỉ xuất deleting cho admin, không xuất cursor. Không tăng version khi khóa, để retry cùng version. Bốn ghi booking atomic và kiểm tra profile User được giữ; transaction không commit sau khi khóa xóa. Public list/detail và xem/replay vé ẩn event đang xóa.

EventDeletionService scan nhất quán cả bảng theo trang100, xử lý tối đa5trang/request. Chọn đúng Ticket có eventId, User SK REGISTRATION#eventId, User IDEMPOTENCY# với registration.eventId, legacy partition EVENT#eventId. Batch dọn xong trang mới lưu cursor, hết trang xóa event. 202 cần tiếp tục DELETE; lỗi giữa chừng dùng cursor bền vững để retry, không reset bảng. Không dọn PROFILE/USER_EMAIL/APP_SESSION hoặc dữ liệu event khác.

Chưa có GSI/index đảo theo event nên scan là giới hạn rõ ràng của local, không phải cách đã chứng minh hiệu quả trên AWS. Cần thiết kế index/backfill có kiểm soát trước quy mô lớn. Không tự đổi schema hoặc migrate bảng ứng dụng trong bản này.

## Quản lý tài khoản ở contract 4.1

Profile `USER#{userId}/PROFILE` có `version` (tạo mới = 1; profile cũ thiếu trường được đọc là 0). Email duy nhất nằm ở `USER_EMAIL#{email}/METADATA`; đổi email phải cập nhật profile, thêm ánh xạ mới và xóa ánh xạ cũ trong cùng transaction. Vé giữ bản chụp tên/email tại lúc đặt.

Transaction mua vé có 4 thao tác ghi và 1 ConditionCheck: profile User phải tồn tại, role=user và chưa có deleting. Khóa xóa tài khoản vì vậy chặn cả yêu cầu mua đang chạy dở trước lúc commit.

Khi xóa User, đặt `deleting=true` trước. Với từng liên kết `USER#.../REGISTRATION#...`, transaction xóa liên kết + vé và cộng một remainingSeats nếu sự kiện còn hoạt động. Liên kết là bằng chứng công việc chưa xử lý nên retry không hoàn chỗ hai lần. Nếu sự kiện đang xóa/đã mất thì không hoàn chỗ. Sau đó dọn metadata, session và vé sót của sự kiện đang xóa; lưu `deletionCursor` trên profile qua các lần DELETE. Cuối cùng xóa profile và ánh xạ email. Không tìm quyền sở hữu bằng email, không đụng vé/tài khoản khác. Vé legacy không có userId không được suy đoán là của User chỉ vì trùng email.

Danh sách User và dọn session hiện dùng Scan local. Cần đánh giá lại chỉ mục, chi phí và công việc nền trước khi triển khai quy mô lớn trên AWS. Xem [contract](api-contract.md) và [account_repository.py](../backend/lambda/account_repository.py).
