# API contract — prototype local, phiên bản 2

API người tham gia và API quản trị bên dưới đã được triển khai local. SAM chạy ở `http://127.0.0.1:3001`. Frontend mặc định gọi `/api` qua Vite proxy đến SAM, giúp cookie đăng nhập cùng origin với giao diện. Chế độ mock chỉ dành cho luồng người tham gia, không mô phỏng quyền admin. Các phiên kiểm thử dùng bảng riêng.

## Quy tắc chung

- Chống trùng bằng **eventId + email sau trim và chuyển chữ thường**. `registrationId` là UUID xác nhận một đăng ký thành công, không dùng làm khóa chống trùng.
- Thời gian là ISO 8601 có múi giờ, ví dụ `2026-10-23T09:00:00+07:00`. Backend tính trạng thái và quyết định số chỗ; client không tự trừ hoặc gửi số chỗ.
- Request/response dùng JSON UTF-8. GET không có body; hiện không hỗ trợ query parameter (gửi query trả 400).
- `eventId`: 1–80 ký tự, chữ thường/số/gạch ngang, ký tự đầu là chữ/số. Sai định dạng trả 400; đúng định dạng nhưng không tồn tại trả 404.
- API công khai không trả trường nội bộ DynamoDB (`PK`, `SK`, `startsAtEpoch`, `registrationOpen`, `entityType`). API quản trị có thêm `registrationOpen`, `version`, `occupiedSeats`.
- Danh sách sắp theo thời điểm sự kiện tăng dần; khi bằng nhau, theo ID. Chưa phân trang API cho tập dữ liệu Workshop nhỏ; repository đọc hết các trang Query của DynamoDB.
- CORS cho GET/POST/PUT/DELETE/OPTIONS từ `http://localhost:5173` và `http://127.0.0.1:5173`, có credentials, cho phép header `Content-Type`, `X-CSRF-Token`. Origin khác cần cập nhật cả SAM và `ALLOWED_ORIGINS`. CORS không thay thế kiểm tra quyền.

Lỗi thống nhất cho các API đã triển khai:

```json
{"error":{"code":"EVENT_NOT_FOUND","message":"Không tìm thấy sự kiện.","requestId":"local-request-id"}}
```

Không trả stack trace. `requestId` dùng để tra log SAM. Lỗi validation trường đăng ký có thêm `details` ánh xạ tên trường sang thông báo, ví dụ `{"email":"Email chưa đúng định dạng."}`.

| HTTP | Mã lỗi | Ý nghĩa |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | ID, query hoặc dữ liệu nhập sai |
| 401 | `AUTH_REQUIRED`, `INVALID_CREDENTIALS` | Chưa đăng nhập, phiên hết hạn hoặc thông tin đăng nhập sai |
| 403 | `FORBIDDEN`, `FORBIDDEN_ORIGIN`, `CSRF_FAILED` | Không đủ quyền hoặc nguồn/mã CSRF không hợp lệ |
| 404 | `EVENT_NOT_FOUND`, `REGISTRATION_NOT_FOUND`, `ROUTE_NOT_FOUND` | Không tồn tại |
| 409 | `DUPLICATE_REGISTRATION` | Email đã đăng ký cùng sự kiện |
| 409 | `EVENT_FULL` | Hết chỗ tại thời điểm gửi |
| 409 | `REGISTRATION_CLOSED` | Đóng đăng ký hoặc đã kết thúc |
| 409 | `EVENT_CHANGED`, `CAPACITY_TOO_SMALL`, `EVENT_HAS_REGISTRATIONS` | Sự kiện thay đổi đồng thời, sức chứa quá nhỏ hoặc không được xóa |
| 413 | `PAYLOAD_TOO_LARGE` | Body JSON sau giải mã lớn hơn 32 KiB |
| 429 | `LOGIN_RATE_LIMITED` | Quá số lượt đăng nhập trong cửa sổ 15 phút |
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

## API quản trị — phiên bản 2

Chọn vai trò trên trang `/` chỉ điều hướng; không cấp quyền. Mọi API đọc/ghi quản trị (trừ đăng nhập) kiểm tra session và vai trò admin phía server. Không nhận vai trò, quyền hoặc số chỗ từ trình duyệt. Không có API đăng ký tài khoản admin công khai; tài khoản được tạo bằng `backend/tools/create_admin.py`.

| Method / đường dẫn API | Body | Thành công |
| --- | --- | --- |
| `POST /admin/login` | `{username, password}` | 200, session công khai và cookie |
| `GET /admin/session` | Không | 200, `{username, role, csrfToken, expiresAt}` |
| `POST /admin/logout` | Không | 200, `{loggedOut:true}`, xóa session và cookie |
| `GET /admin/events` | Không | 200, `{events: AdminEvent[]}` |
| `POST /admin/events` | Toàn bộ thông tin sự kiện bên dưới | 201, `AdminEvent` |
| `PUT /admin/events/{eventId}` | Toàn bộ thông tin + `version` | 200, `AdminEvent` |
| `DELETE /admin/events/{eventId}` | `{version}` | 200, `{deleted:true}` |

`AdminEvent` gồm các trường sự kiện công khai và `registrationOpen: boolean`, `version: integer`, `occupiedSeats: capacity - remainingSeats`. Dữ liệu seed cũ chưa có version được đọc thành 0; sự kiện mới bắt đầu ở 1. `occupiedSeats` có cả chỗ đã dùng trong dữ liệu mẫu, không đồng nghĩa số bản ghi đăng ký thực tế.

Ví dụ body tạo sự kiện:

```json
{
  "title": "Thực hành giao diện web",
  "category": "Công nghệ",
  "dateTime": "2099-01-01T09:00:00+07:00",
  "location": "Trực tuyến",
  "organizer": "Nhóm Workshop",
  "capacity": 40,
  "registrationOpen": true,
  "summary": "Buổi thực hành dành cho người mới.",
  "description": "Nội dung và những điều người tham gia cần chuẩn bị."
}
```

- Tất cả trường trên bắt buộc. Trim chuỗi. Giới hạn ký tự: title 160, location 240, organizer 160, summary 300, description 5000.
- Category: Công nghệ / Thiết kế / Kỹ năng / Cộng đồng. Capacity: số nguyên 1–100.000, không nhận boolean hoặc số thập phân.
- DateTime: ISO 8601 có múi giờ, năm 2000–2100. Tạo mới cần thời gian tương lai. Form nhập theo giờ Việt Nam và gửi `+07:00`.
- ID do server tạo dạng `event-<uuid hex>`; client không được gửi ID, remainingSeats, status, startsAtEpoch, PK/SK, role hoặc trường lạ.
- Sửa capacity giữ nguyên số chỗ đã dùng; không cho giảm xuống dưới số này. Cập nhật có điều kiện kiểm tra version, capacity và remainingSeats tại DB, nên không ghi đè đăng ký vừa xảy ra. Nếu xung đột trả 409 `EVENT_CHANGED`, cần tải lại trước khi sửa.
- Theo lựa chọn của người dùng dự án: **chặn xóa khi đã có chỗ được dùng**. Chỉ xóa sự kiện có `remainingSeats == capacity`, kèm điều kiện DB chống đăng ký xen vào. Có thể đóng đăng ký thay cho xóa. Mã và dữ liệu đăng ký đã có được giữ nguyên.

### Phiên đăng nhập và CSRF

Cookie `event_admin_session`: token ngẫu nhiên 256 bit, `HttpOnly; SameSite=Strict; Path=/`, thời hạn tuyệt đối 8 giờ. DB chỉ giữ SHA-256 của token. Không đưa token vào JSON, localStorage, sessionStorage hoặc URL. Đăng nhập lại thay token, đăng xuất xóa session phía server. Backend kiểm tra lại tài khoản/role trong mỗi request. Phiên hết hạn trả 401, giao diện quay về đăng nhập.

Đăng nhập cần `Origin` khớp chính xác allowlist. Các thao tác POST/PUT/DELETE quản trị sau đăng nhập cần cả Origin hợp lệ và header `X-CSRF-Token` lấy từ session response. CSRF token chỉ giữ trong bộ nhớ React. Thiếu/sai trả 403. Không tự retry thao tác ghi khi mất kết nối.

Mật khẩu được băm bằng scrypt N=32768/r=8/p=3, salt ngẫu nhiên 128 bit. Tạo mật khẩu 15–128 ký tự, không có tài khoản/mật khẩu mặc định. Sai tên hoặc mật khẩu trả cùng một thông báo. Mỗi cửa sổ 15 phút có tối đa 10 lượt đăng nhập/tài khoản và 30 lượt/IP, tính bằng atomic update trong DB; quá giới hạn trả 429, tính cả lượt thành công. Bộ đếm IP được kiểm tra trước để tránh tạo vô hạn bộ đếm tài khoản.

`COOKIE_SECURE=false` chỉ cho HTTP local trong mốc này. Khi triển khai thật phải có HTTPS, bật Secure và thiết kế lại cấu hình endpoint/origin phù hợp; template hiện vẫn chỉ dành cho local. Cookie qua `/api` proxy tránh trộn `localhost` và `127.0.0.1` giữa frontend/backend. Link kết quả của khách vẫn là link bí mật theo UUID như v1, chưa có tài khoản khách hoặc cơ chế khôi phục mã.
