# API contract — prototype local, phiên bản 1

Cả năm API bên dưới đã được triển khai local. API chạy qua SAM ở `http://127.0.0.1:3001`. Frontend React ở `http://localhost:5173` chọn HTTP API hoặc mock bằng `VITE_DATA_MODE`; cấu hình mẫu mặc định dùng API. Các phiên kiểm thử dùng bảng riêng và có thể chạy SAM ở cổng 3002.

## Quy tắc chung

- Chống trùng bằng **eventId + email sau trim và chuyển chữ thường**. `registrationId` là UUID xác nhận một đăng ký thành công, không dùng làm khóa chống trùng.
- Thời gian là ISO 8601 có múi giờ, ví dụ `2026-10-23T09:00:00+07:00`. Backend tính trạng thái và quyết định số chỗ; client không tự trừ hoặc gửi số chỗ.
- Request/response dùng JSON UTF-8. GET không có body; hiện không hỗ trợ query parameter (gửi query trả 400).
- `eventId`: 1–80 ký tự, chữ thường/số/gạch ngang, ký tự đầu là chữ/số. Sai định dạng trả 400; đúng định dạng nhưng không tồn tại trả 404.
- Trường nội bộ DynamoDB (`PK`, `SK`, `startsAtEpoch`, `registrationOpen`, `entityType`) không xuất ra API.
- Danh sách sắp theo thời điểm sự kiện tăng dần; khi bằng nhau, theo ID. Chưa phân trang API cho tập dữ liệu Workshop nhỏ; repository đọc hết các trang Query của DynamoDB.
- CORS cho GET/POST/OPTIONS từ `http://localhost:5173` và `http://127.0.0.1:5173`, không dùng credentials/cookie. Origin khác cần cập nhật cả cấu hình SAM và `ALLOWED_ORIGINS` trước khi chạy lại.

Lỗi thống nhất cho các API đã triển khai:

```json
{"error":{"code":"EVENT_NOT_FOUND","message":"Không tìm thấy sự kiện.","requestId":"local-request-id"}}
```

Không trả stack trace. `requestId` dùng để tra log SAM. Lỗi validation trường đăng ký có thêm `details` ánh xạ tên trường sang thông báo, ví dụ `{"email":"Email chưa đúng định dạng."}`.

| HTTP | Mã lỗi | Ý nghĩa |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | ID, query hoặc dữ liệu nhập sai |
| 404 | `EVENT_NOT_FOUND`, `REGISTRATION_NOT_FOUND`, `ROUTE_NOT_FOUND` | Không tồn tại |
| 409 | `DUPLICATE_REGISTRATION` | Email đã đăng ký cùng sự kiện |
| 409 | `EVENT_FULL` | Hết chỗ tại thời điểm gửi |
| 409 | `REGISTRATION_CLOSED` | Đóng đăng ký hoặc đã kết thúc |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Body đăng ký không phải JSON |
| 503 | `DATABASE_UNAVAILABLE` | Database chưa sẵn sàng hoặc transaction vẫn xung đột sau retry có giới hạn |
| 500 | `INTERNAL_ERROR` | Lỗi xử lý khác |

Đường dẫn/method không được khai báo trong SAM có thể bị bộ giả lập Gateway chặn trước handler; response mặc định của Gateway không thuộc envelope trên.

## GET /health — đã triển khai

Input: không có body/query. Kiểm tra bảng ACTIVE và thực hiện Query đọc thử, không ghi dữ liệu. Thành công 200:

```json
{"status":"ok","database":{"status":"ready","table":"fcaj-event-workshop-local"}}
```

Lỗi: 400 query không hỗ trợ; 503 `DATABASE_UNAVAILABLE` khi không truy cập được bảng; 500 lỗi khác. Không coi ứng dụng khỏe chỉ vì tiến trình API đang chạy.

## GET /events — đã triển khai

Input: không có body/query; tìm kiếm/lọc hiện do Frontend thực hiện sau khi đọc danh sách. Thành công 200:

```json
{"events":[{"id":"thiet-ke-de-dung","title":"Thiết kế sản phẩm dễ dùng","category":"Thiết kế","dateTime":"2026-10-23T09:00:00+07:00","location":"TP. Hồ Chí Minh","organizer":"Nhóm Workshop Sự kiện","capacity":40,"remainingSeats":18,"summary":"Từ nhu cầu người dùng đến bản phác thảo đầu tiên.","description":"Một buổi thực hành cách đặt câu hỏi, sắp xếp thông tin và thử nhanh một ý tưởng giao diện.","status":"open"}]}
```

Danh sách rỗng hợp lệ là `{"events":[]}`. Lỗi: 400, 503, 500 theo bảng chung.

## GET /events/{eventId} — đã triển khai

Input: `eventId` trong path, không có body/query. Thành công 200: trả **trực tiếp object sự kiện** như một phần tử `events` ở ví dụ trên. Lỗi: 400 ID/query sai, 404 `EVENT_NOT_FOUND`, 503, 500.

Trạng thái ưu tiên: đã tới `dateTime` → `ended`; nếu chưa tới nhưng `registrationOpen=false` → `closed`; còn lại hết chỗ → `full`; còn chỗ → `open`.

## POST /events/{eventId}/registrations — đã triển khai

Input: `Content-Type: application/json`, `eventId` trong path:

```json
{"fullName":"Nguyễn An","email":" An@Example.com ","phone":"0901234567"}
```

Validation: trim tất cả trường; `fullName` bắt buộc, 1–120 ký tự sau trim; email bắt buộc, tối đa 254 ký tự, định dạng có phần trước/sau `@` và domain có dấu chấm, không chứa khoảng trắng; chuẩn hóa về chữ thường; `phone` tùy chọn, chuỗi tối đa 32 ký tự sau trim, thiếu thì lưu `""`. Không nhận `remainingSeats`, `capacity`, `status`, `id` hoặc trường ngoài schema. Body không phải object JSON/trường sai kiểu trả 400. `eventId` chỉ lấy từ path. Hỗ trợ body JSON thường và body base64 theo HTTP API payload v2.

Thành công **201**:

```json
{"id":"91aa116c-9ba1-4e9f-b192-fcf9178882c8","eventId":"thiet-ke-de-dung","fullName":"Nguyễn An","email":"an@example.com","phone":"0901234567","createdAt":"2026-10-16T10:00:00+07:00"}
```

Kèm `Location: /registrations/91aa116c-9ba1-4e9f-b192-fcf9178882c8` (đường dẫn API). Trường `id` chính là `registrationId`, giữ nguyên tên JSON để tương thích Frontend. ID dùng UUID v4 ngẫu nhiên, không tuần tự.

Lỗi: 400 validation; 404 sự kiện; 409 đóng/kết thúc, trùng, hết chỗ; 415 body không phải JSON; 503 DB; 500 nội bộ. Kiểm tra ưu tiên: đóng/kết thúc → email trùng → hết chỗ. Việc giữ chỗ, ghi khóa email và tạo đăng ký thực hiện trong một transaction. SDK dùng `ClientRequestToken` bằng UUID của lần đăng ký để retry cùng transaction không trừ chỗ hai lần. Xung đột được đọc lại nhất quán và retry có giới hạn; transaction thất bại không để lại một phần dữ liệu. Không có thông báo đã gửi email.

## GET /registrations/{registrationId} — đã triển khai

Input: `registrationId` là UUID v4 dạng chuẩn có gạch ngang trong path; không có body/query. Thành công **200**, chỉ các trường như response POST, không trả PK/SK hay khóa chống trùng. Sai định dạng → 400; không tồn tại → 404 `REGISTRATION_NOT_FOUND`; thêm 503/500 như trên. UUID ngẫu nhiên giúp tránh đoán theo dãy số nhưng không thay thế đăng nhập/ủy quyền; ai có URL vẫn đọc được đăng ký tương ứng. Response có `Cache-Control: no-store`. Endpoint chỉ dùng cho prototype local, chưa có xác thực hoặc rate limiting.

Nếu mất kết nối sau lúc transaction đã commit, client có thể chưa nhận được mã dù đăng ký đã lưu. Frontend không tự retry POST; lần gửi lại cùng email trả 409. Chưa có HTTP idempotency key hoặc luồng khôi phục mã xác nhận.

## Mapping Frontend và API

| Frontend hiện có | API / thay đổi lúc tích hợp |
| --- | --- |
| `getEvents(): EventItem[]` | HTTP trả `{events: EventItem[]}`; adapter lấy `.events` |
| `getEvent(id): EventItem \| null` | HTTP 200 object; adapter xử lý 404 thành trạng thái không tìm thấy |
| `Registration` có `id` | Giữ `id` trong JSON; `registrationId` là tên tham số route, cùng giá trị |
| `open`, `full`, `ended`, `closed` | Frontend đã có kiểu/nhãn/bộ lọc `closed`, không đổi thành `ended` |
| `RegistrationError` mã `duplicate`, `full`, `closed` | Adapter map từ `DUPLICATE_REGISTRATION`, `EVENT_FULL`, `REGISTRATION_CLOSED` |
| React `/events/:id/register` | Trang form; API tạo đăng ký là **POST `/events/:id/registrations`** |
| React `/registrations/:id` | Trang kết quả; API đọc JSON cũng có path `/registrations/:id` nhưng khác origin/cổng |

Các trường sự kiện còn lại giữ cùng tên/kiểu với `frontend/src/types/event.ts`. `frontend/src/services/events.ts` chọn HTTP hoặc mock theo `VITE_DATA_MODE`; HTTP service đọc `VITE_API_BASE_URL`. Chế độ API không dùng localStorage cho đăng ký, không tự chuyển sang mock khi lỗi. Frontend không tự trừ chỗ; Backend quyết định kết quả.
