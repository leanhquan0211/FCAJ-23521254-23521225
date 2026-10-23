# Contract người mua v3 — bản đề xuất để thống nhất

Ngày: **23/10/2026**. Nguồn yêu cầu: [biên bản](yeu-cau.md). **Chưa duyệt, chưa triển khai.** API đang chạy vẫn theo [contract v2](../docs/api-contract.md). Không dùng JSON ví dụ ở đây như kết quả kiểm thử hoặc cam kết API mới đã tồn tại.

Đầu mối cập nhật canonical contract và data model: **bên ứng dụng/người mua**. Sau khi hai bên thống nhất mới đưa nội dung được duyệt vào `docs/api-contract.md`, `docs/data-model.md` và code. Mọi thay đổi ảnh hưởng test phải có commit/mốc áp dụng. Các ID, token, mật khẩu và thời điểm trong ví dụ là dữ liệu minh họa, không hardcode chúng vào bài test.

## 1. Luồng đề xuất và những gì khác hiện tại

Khách xem/tìm/lọc/chi tiết công khai → bấm đặt vé → nếu chưa đăng nhập thì login/register → quay lại đúng `/events/{eventId}/register` → backend kiểm tra giờ mở bán/trạng thái/chỗ → transaction tạo một vé/User/sự kiện → kết quả → Vé của tôi.

- User có thể tạo tài khoản và login trước giờ mở bán. Không OTP/email verification trong đợt này; email đúng định dạng không chứng minh người dùng sở hữu hộp thư hoặc là người thật.
- Chỉ hai realm đang đề xuất cho đợt này: User mới và admin hiện có. Chưa thêm Organizer/đa đơn vị/SSO/thanh toán/hủy vé. Hướng nhiều đơn vị đã thảo luận trước đó không tự được coi là đã triển khai; cần quyết định riêng nếu đưa lại vào phạm vi.
- Tên/email khi mua lấy từ tài khoản trong session. Body đặt vé chỉ có phone tùy chọn; không cho gửi userId/email/role/capacity. Đây là thay đổi breaking so với v2 gửi fullName/email/phone.
- Thêm `salesOpenAt` (giờ mở bán), User ownership và `Idempotency-Key`. Gửi lại cùng key/nội dung nhận vé cũ; mua thêm cùng sự kiện bằng key khác là trùng nghiệp vụ.
- Frontend chỉ chấp nhận return path nội bộ nằm trong luồng sự kiện; không nhận URL ngoài hoặc đường dẫn `//...`. Register không tự login: thành công quay sang login, giữ return path, rồi quay về sự kiện.

## 2. Trạng thái từng API và đường dẫn đề xuất

Đường dẫn dưới là path tại SAM, **không có `/api`**. Trình duyệt sản phẩm gọi `/api` + path qua proxy Vite. API test chạy riêng trên 3002.

| Method và path chính xác | V2 hiện tại | Đề xuất v3 | Request → success |
| --- | --- | --- | --- |
| `GET /health` | Đã có | Giữ và thêm version/thời gian server | Không body → 200 Health |
| `GET /events` | Đã có, công khai | Thêm salesOpenAt/status not_open | Không body → 200 `{events:[Event]}` |
| `GET /events/{eventId}` | Đã có, công khai | Thêm salesOpenAt/status not_open | Không body → 200 Event trực tiếp |
| `POST /auth/register` | Chưa có | Mới, không cấp admin | `{fullName,email,password}` → 201 `{user:User}` |
| `POST /auth/login` | Chưa có | Mới, cấp cookie User | `{email,password}` → 200 Session + Set-Cookie |
| `GET /auth/session` | Chưa có | Mới, kiểm tra phiên User | Không body → 200 Session |
| `POST /auth/logout` | Chưa có | Mới, thu hồi phiên User | `{}` → 200 `{loggedOut:true}` + clear cookie |
| `POST /events/{eventId}/registrations` | Đã có, chưa auth | **Đổi**: User + CSRF + key, body mới | `{phone?:string}` → 201 Ticket mới; 200 replay |
| `GET /registrations/{registrationId}` | Đã có, công khai | **Đổi**: User, chỉ chủ vé | Không body → 200 Ticket |
| `GET /me/registrations` | Chưa có | Mới, Vé của tôi | Không body → 200 `{registrations:[Ticket]}` |
| `POST /admin/login`, `GET /admin/session`, `POST /admin/logout` | Đã có | Giữ username/cookie admin riêng | Theo contract v2 |
| `GET /admin/events` | Đã có | Event admin thêm salesOpenAt | Không body → 200 `{events:[AdminEvent]}` |
| `POST /admin/events` | Đã có | Thêm salesOpenAt vào body tạo | EventInput → 201 AdminEvent |
| `PUT /admin/events/{eventId}` | Đã có | Thêm salesOpenAt vào body sửa | EventInput + version → 200 AdminEvent |
| `DELETE /admin/events/{eventId}` | Đã có | Giữ bảo vệ chỗ đã dùng | `{version}` → 200 `{deleted:true}` |

V3 đề xuất vẫn chưa phân trang/tìm kiếm phía server cho phạm vi local nhỏ: không nhận query trên các API trên; gửi query không hỗ trợ trả 400. Vé của tôi dùng Query tất cả các trang DB, trả createdAt giảm dần, cùng thời điểm thì theo id. Danh sách events giữ thứ tự dateTime tăng dần rồi id như v2. Nếu thêm pagination sau này phải thông báo contract trước khi bên test đổi assertion.

## 3. Schema và JSON ví dụ

### 3.1. Tài khoản và phiên

Register request:

```json
{"fullName":"Người thử 001","email":" Buyer-001@Example.com ","password":"<mat-khau-test-ngau-nhien-15-den-128-ky-tu>"}
```

201 response (không tự cấp cookie đăng nhập):

```json
{"user":{"userId":"65e81330-cf1a-4b7f-9c31-8df1d61065b5","fullName":"Người thử 001","email":"buyer-001@example.com","role":"user","createdAt":"2026-10-23T02:00:00Z"}}
```

Login request:

```json
{"email":"buyer-001@example.com","password":"<mat-khau-da-tao-o-buoc-register>"}
```

Login/session response mẫu, gọi chung là Session:

```json
{"user":{"userId":"65e81330-cf1a-4b7f-9c31-8df1d61065b5","fullName":"Người thử 001","email":"buyer-001@example.com","role":"user","createdAt":"2026-10-23T02:00:00Z"},"csrfToken":"<token-csrf-cua-phien>","expiresAt":1792749600}
```

- User gồm đúng userId (UUID v4), fullName, email, role=user, createdAt (ISO 8601 UTC). Không trả salt/hash/PK/SK/token session.
- Trim fullName, 1–120 ký tự; email trim/lowercase, tối đa 254 và kiểm tra định dạng như quy tắc hiện có. Unique email được bảo vệ bằng điều kiện ghi/transaction, không chỉ check rồi put.
- Password 15–128 ký tự, không trim/chuyển chữ thường; nhập lại password ở UI không cần gửi thành trường thứ tư. Tận dụng scrypt/salt đang dùng cho admin, không thiết kế thuật toán mới.
- expiresAt là Unix seconds, thời hạn phiên đề xuất 8 giờ như admin. Giá trị mẫu không phải thời gian phiên hiện tại; test lấy từ response thật.
- Backend tự cấp userId/role; unknown fields như role/admin/userId bị từ chối 400, không âm thầm tin dữ liệu client.

### 3.2. Sự kiện và giờ mở bán

Event công khai gồm các trường v2 và salesOpenAt:

```json
{"id":"event-2f057ceb8233419895d1acee8fe5438d","title":"Sự kiện kiểm thử","category":"Công nghệ","dateTime":"2099-01-01T09:00:00+07:00","salesOpenAt":null,"location":"Trực tuyến","organizer":"Nhóm Workshop","capacity":200,"remainingSeats":200,"summary":"Sự kiện dùng thử.","description":"Dữ liệu minh họa, không thanh toán.","status":"open"}
```

EventInput gửi admin:

```json
{"title":"Sự kiện kiểm thử","category":"Công nghệ","dateTime":"2099-01-01T09:00:00+07:00","salesOpenAt":null,"location":"Trực tuyến","organizer":"Nhóm Workshop","capacity":200,"registrationOpen":true,"summary":"Sự kiện dùng thử.","description":"Dữ liệu minh họa, không thanh toán."}
```

PUT có thêm `version` đã lấy từ GET admin. AdminEvent = Event + registrationOpen/version/occupiedSeats như v2. ID do server tạo; không tự đoán hoặc cố định fixture ID nếu dùng POST admin.

- salesOpenAt đề xuất là ISO 8601 **có timezone** hoặc null. Null = không có mốc giờ mở bán, vẫn chịu manual registrationOpen, số chỗ và giờ diễn ra. Field bắt buộc hiện diện trong POST/PUT v3; null là cách chủ động không đặt lịch. Bản ghi legacy thiếu field được đọc thành null, không tự ghi lại database.
- salesOpenAt không được sau dateTime. Ví dụ `+07:00` và `Z` đều chấp nhận; backend so sánh thời điểm UTC bằng giờ server, không theo đồng hồ trình duyệt/k6. Không đợi đồng hồ UI để quyết định cấp vé.
- Điều kiện bán mới: registrationOpen=true, đã tới salesOpenAt nếu khác null, chưa tới dateTime, còn chỗ. Đúng tại salesOpenAt thì mở; đúng tại dateTime thì dừng theo hành vi v2. Dự án hiện chưa có endTime, nên nhãn ended vẫn dùng mốc dateTime cũ, chưa mở rộng thời gian kết thúc thực tế.
- Trạng thái ưu tiên: tới dateTime → ended; manual đóng → closed; chưa tới salesOpenAt → **not_open**; hết chỗ → full; còn lại open. Frontend/types/filter và test parser phải hỗ trợ giá trị mới này.
- Trong test mở bán thật, tạo mốc tương đối theo giờ server; không dùng năm 2099 làm giờ mở bán rồi chờ request thành công. Ví dụ event diễn ra sau vài giờ, salesOpenAt sau thời điểm chuẩn bị đủ thời gian để 100 phiên sẵn sàng.

Health đề xuất đầy đủ sau khi v3 sẵn sàng:

```json
{"status":"ok","database":{"status":"ready","table":"fcaj-event-workshop-local-test-<suffix>"},"apiContractVersion":"3.0","serverTime":"2026-10-23T02:00:00Z"}
```

Version/serverTime chưa có ở v2. Mỗi mốc vẫn phải bàn giao danh sách API thực sự sẵn sàng; không coi chỉ có version là mọi endpoint đã đạt. serverTime hỗ trợ đối chiếu clock, không bảo đảm yêu cầu đến server đúng thời điểm client phát.

### 3.3. Đặt vé và đọc lại

POST request body đề xuất:

```json
{"phone":"0901234567"}
```

Body `{}` hợp lệ, phone mặc định chuỗi rỗng, trim và tối đa 32 ký tự. Không nhận fullName/email/userId/eventId trong body; email/tên từ tài khoản đã xác thực, eventId từ path. Đây là breaking change cần sửa frontend và các test v2 đang gửi fullName/email.

Ticket mới, GET kết quả và một phần tử Vé của tôi có cùng schema:

```json
{"id":"91aa116c-9ba1-4e9f-b192-fcf9178882c8","eventId":"event-2f057ceb8233419895d1acee8fe5438d","userId":"65e81330-cf1a-4b7f-9c31-8df1d61065b5","fullName":"Người thử 001","email":"buyer-001@example.com","phone":"0901234567","createdAt":"2026-10-23T02:00:00Z"}
```

- `id` tiếp tục là tên trường JSON của registrationId (UUID v4), không đổi thành ticketId. Vé chỉ là cách gọi trên UI, chưa phải thực thể thanh toán mới.
- Tạo mới trả **201**, `Location: /registrations/<id>`, `Idempotent-Replayed: false`.
- Replay cùng key/nội dung đã hoàn tất trả **200**, cùng Ticket đã lưu và `Idempotent-Replayed: true`; không sinh ID mới, không giảm chỗ thêm.
- GET `/me/registrations` trả `{"registrations":[]}` khi chưa có vé. Test lấy eventId từ POST admin/GET events, registrationId từ POST/replay/GET me, userId từ register/login/session. Không đoán UUID.
- GET kết quả: thiếu/hết hạn phiên User → 401; không tồn tại, vé của người khác hoặc legacy chưa có owner → **404 REGISTRATION_NOT_FOUND** để không lộ bản ghi. Admin cookie không tự cấp quyền xem vé ở endpoint User; nếu cần quyền kiểm kê admin thì thiết kế riêng, chưa mở API đọc mọi vé.
- Các response cá nhân và auth dùng Cache-Control no-store. Không có nội dung đã gửi email/đã thanh toán.

## 4. Cookie, Origin, CSRF và 100 người dùng ảo

Đề xuất cookie User mới **event_user_session**, tách cookie admin hiện tại **event_admin_session**. Token ngẫu nhiên, DB chỉ giữ SHA-256; cookie `HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`, Secure=false chỉ cho HTTP local. Role/userId được đọc lại từ account hợp lệ, không tin role do browser gửi.

| Request | Cookie User | Origin | Header CSRF/key |
| --- | --- | --- | --- |
| GET health/events/detail | Không cần | Không bắt buộc | Không |
| POST auth/register/login | Không cần | Bắt buộc allowlist | Không cần CSRF trước khi có session |
| GET auth/session, me, registration | Bắt buộc | Không bắt buộc ở HTTP client; browser có cơ chế riêng | Không |
| POST auth/logout | Bắt buộc | Bắt buộc allowlist | X-CSRF-Token |
| POST đặt vé | Bắt buộc | Bắt buộc allowlist | X-CSRF-Token + Idempotency-Key |

Allowlist local giữ `http://127.0.0.1:5173` và `http://localhost:5173`, không wildcard. K6/runner gửi Origin cố định `http://127.0.0.1:5173`. GET không ghi dữ liệu; kiểm tra CSRF và Origin trên thao tác ghi đã xác thực. Logout thu hồi session server, clear cookie; phiên không còn hợp lệ trả 401. Login thay token của phiên hiện có nếu được gửi, không chia một cookie giữa 100 người.

Trình duyệt sản phẩm dùng fetch credentials include qua `/api` như hiện có. CSRF giữ trong bộ nhớ, lấy lại qua GET session sau reload. Không lưu session token vào localStorage. CORS/SAM v3 cần cho thêm header **Idempotency-Key**, expose **Location, Idempotent-Replayed** cho trường hợp fetch cross-origin được cho phép. Trước cập nhật header, preflight v2 có thể chưa chấp nhận key này.

**Bàn giao cho k6:** chuẩn bị 100 account → login từng account ngoài khoảng đo → giữ một bộ `{userId, cookie, csrfToken, expiresAt}` trong bộ nhớ của harness cho mỗi VU. Mỗi VU được gán một account và cookie jar riêng. Nếu setup chạy tập trung, không giả định cookie jar setup tự chuyển cho mọi VU: phải đưa đúng cookie/CSRF cho từng VU. K6 mặc định có thể reset cookie giữa iteration, nên script cần chủ động nạp lại jar hoặc chốt option giữ cookie phù hợp. Không log/xuất bộ secret này sang dashboard hoặc report Git.

Đã đối chiếu option k6 `noCookiesReset`: mặc định false, cookie jar reset sau mỗi iteration; có thể đặt true hoặc nạp lại cookie đúng User ở đầu mỗi iteration. Đây là cấu hình harness cần ghi rõ, không đổi cơ chế session của ứng dụng.

Test gửi Cookie/session và CSRF thật; không tắt auth để đạt 100 lượt. Session đủ hạn cho run, có bài hết hạn riêng. Response thiếu auth/CSRF/Origin được thống kê riêng, không gọi là hết vé.

### Chính sách giới hạn auth đề xuất để review

Giữ nguyên giới hạn admin v2. Với User, đề xuất cửa sổ 900 giây, **tách bộ đếm signup/login/admin**, login tối đa 10 lượt/account và 120 lượt/IP/cửa sổ; signup 120 lượt/IP/cửa sổ. Các giá trị 120 là đề xuất local cho bước chuẩn bị 100 người và cần duyệt, không phải khuyến nghị bắt buộc từ OWASP hay cấu hình đã chạy. Có 429 AUTH_RATE_LIMITED + Retry-After khi vượt; không làm giả source IP để vượt bộ đếm. Test chuẩn bị không lặp 100 lần login mỗi vòng đo.

Biến dự kiến cho User: USER_AUTH_WINDOW_SECONDS=900, USER_LOGIN_IP_LIMIT=120, USER_LOGIN_ACCOUNT_LIMIT=10, USER_SIGNUP_IP_LIMIT=120. Backend vẫn kiểm tra đầy đủ; nếu thay chính sách phải ghi vào manifest/report. Bản thân signup/login có bài test chức năng/rate limit riêng. API không OTP chưa đủ để chứng minh email/người thật và chưa là thiết kế production.

## 5. Idempotency và transaction

**Hai quy tắc khác nhau:**

| Tình huống | Hành vi đề xuất |
| --- | --- |
| User/sự kiện chưa có vé, key mới, đủ điều kiện | 201, tạo một vé và giảm một chỗ |
| Cùng User, cùng key, cùng path/body đã chuẩn hóa | 200, Ticket cũ, replay=true |
| Cùng User, cùng key nhưng eventId hoặc body khác | 409 IDEMPOTENCY_KEY_REUSED, không ghi |
| Cùng User/sự kiện đã có vé nhưng key mới | 409 DUPLICATE_REGISTRATION, details.registrationId là vé của chính User |
| User khác dùng cùng chuỗi key | Không coi là request của User trước; key được scoped theo userId |

Client sinh UUID v4 cho **một ý định đặt vé**, giữ nguyên khi timeout/retry; lần đặt khác sinh key mới. Header bắt buộc, thiếu/sai dạng trả 400. Fingerprint gồm method/path với eventId + body chuẩn hóa phone; `{}` và `{"phone":""}` tương đương. Không đưa CSRF/session token vào fingerprint vì đăng nhập lại vẫn cần lấy được kết quả của cùng User.

UI cần giữ key trong tiến trình và có thể dùng sessionStorage theo User/sự kiện cho thao tác đang chờ để sống qua reload; đây không phải token xác thực. Khi nhận kết quả xác định thì kết thúc ý định. Nếu mất key vẫn có Vé của tôi; không âm thầm sinh key mới cho một retry rồi giả định đó là replay.

Backend kiểm tra auth/Origin/CSRF và input trước, rồi đọc idempotency record nhất quán **trước điều kiện còn chỗ/đóng/mở bán**. Request đã thành công vẫn replay được sau khi sự kiện hết chỗ hoặc đóng. Sau đó kiểm tra User/sự kiện đã có vé, điều kiện bán và transaction. Trường hợp chưa có event và chưa có replay trả 404. Gửi lặp không được đổi nội dung vé đã lưu.

Transaction đề xuất gồm bốn item khác nhau:

1. Update sự kiện: giảm remainingSeats một; điều kiện manual mở, đã tới salesOpenAt nếu có, chưa tới giờ diễn ra, remainingSeats > 0. Thời điểm kiểm tra là giờ server trong lần xử lý, không phải thời điểm client bấm.
2. Put User/sự kiện reference, điều kiện chưa tồn tại, chống cấp vé thứ hai và phục vụ Query Vé của tôi.
3. Put Ticket theo registrationId UUID, điều kiện chưa tồn tại.
4. Put idempotency record theo User/key, gồm fingerprint, registrationId và kết quả cần replay, điều kiện chưa tồn tại.

Tất cả thành công hoặc không ghi gì. Nếu request trùng đến đồng thời, chỉ một transaction được tạo vé; request thua đọc lại record/unique reference nhất quán để trả replay/trùng đúng quy tắc. Xung đột còn lại retry có giới hạn/jitter; hết lượt trả 503 REGISTRATION_BUSY, không đổi thành EVENT_FULL nếu chưa đọc được bằng chứng hết chỗ.

Idempotency record đề xuất giữ cùng vòng đời Ticket, chưa đặt TTL tự xóa trong mốc không có hủy vé. Cần review lại retention khi bổ sung hủy/đăng ký lại. DynamoDB ClientRequestToken nội bộ vẫn hữu ích khi SDK retry nhưng không thay record HTTP này; token DynamoDB có cửa sổ hiệu lực giới hạn.

## 6. Mã lỗi cho test

Envelope giữ v2:

```json
{"error":{"code":"EVENT_FULL","message":"Sự kiện đã hết chỗ.","requestId":"<request-id-tu-server>"}}
```

| HTTP | code | Ý nghĩa/cách phân loại |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | Body/ID/key/query/thời gian sai; details theo trường khi phù hợp |
| 401 | AUTH_REQUIRED | Chưa login User hoặc phiên hết hạn |
| 401 | INVALID_CREDENTIALS | Email/mật khẩu sai, cùng thông báo chung |
| 403 | FORBIDDEN | Tài khoản không còn quyền User hợp lệ |
| 403 | FORBIDDEN_ORIGIN / CSRF_FAILED | Sai Origin/CSRF; không tính hết vé |
| 404 | EVENT_NOT_FOUND / REGISTRATION_NOT_FOUND | Sự kiện không có; vé không có/quyền xem không phù hợp |
| 409 | EMAIL_ALREADY_EXISTS | Signup email chuẩn hóa đã được dùng |
| 409 | SALES_NOT_OPEN | Chưa tới giờ mở bán |
| 409 | REGISTRATION_CLOSED | Manual đóng hoặc đã tới dateTime |
| 409 | EVENT_FULL | Hết chỗ được xác minh, lỗi nghiệp vụ dự kiến |
| 409 | DUPLICATE_REGISTRATION | User đã có vé, key khác; details.registrationId để User tra lại |
| 409 | IDEMPOTENCY_KEY_REUSED | Cùng User/key nhưng khác nội dung, không retry bằng key đó |
| 409 | EVENT_CHANGED / CAPACITY_TOO_SMALL / EVENT_HAS_REGISTRATIONS | Lỗi quản trị giữ v2 |
| 413 / 415 | PAYLOAD_TOO_LARGE / UNSUPPORTED_MEDIA_TYPE | Body quá lớn / không phải JSON |
| 429 | AUTH_RATE_LIMITED | Policy User, Retry-After theo cửa sổ; admin vẫn LOGIN_RATE_LIMITED |
| 503 | REGISTRATION_BUSY | Xung đột chưa phục hồi sau giới hạn; lỗi kỹ thuật riêng |
| 503 | DATABASE_UNAVAILABLE | Không đọc/ghi được DB; không tính hết vé |
| 500 | INTERNAL_ERROR | Lỗi kỹ thuật khác |

Thứ tự cho request mới sau auth/input: replay theo key → vé đã có theo User/event → event tồn tại → đóng/kết thúc → chưa mở bán → hết chỗ → thử transaction. Khi transaction thất bại phải đọc lại để phân loại, không dựa trên snapshot ban đầu. Sai method/route có thể bị SAM/Gateway chặn trước handler như v2; runner không giả định mọi lỗi hạ tầng đều có JSON envelope này.

Timeout phía client là **chưa rõ kết quả**, không đồng nghĩa không có vé. Sau khi server xử lý xong, retry cùng key hoặc GET me/GET kết quả để đối chiếu. Đếm 201 mới và 200 replay riêng; replay không phải một vé mới dù đều là HTTP 2xx.

## 7. Data model đề xuất — chưa ghi hoặc migration

Giữ một bảng local PK/SK, chưa cần thêm GSI cho truy cập User/event ở mốc này:

| Item | PK | SK | Nội dung chính |
| --- | --- | --- | --- |
| Event | EVENTS | EVENT#eventId | Giữ v2; thêm salesOpenAt và mốc epoch nội bộ để transaction kiểm tra |
| User | USER#userId | PROFILE | fullName/email/role=user/createdAt + salt/hash, không xuất hash |
| Email unique | USER_EMAIL#email-normalized | METADATA | userId; cùng transaction tạo account |
| User session | USER_SESSION#SHA256(token) | METADATA | userId/csrfToken/expiresAt; không lưu token rõ |
| Ticket | REGISTRATION#registrationId | METADATA | Ticket fields + entityType=REGISTRATION, thêm userId |
| User/event unique + reference | USER#userId | REGISTRATION#eventId | registrationId/eventId/createdAt, entityType=USER_REGISTRATION |
| HTTP idempotency | USER#userId | IDEMPOTENCY#key | fingerprint/registrationId/Ticket snapshot, entityType=IDEMPOTENCY |
| User auth counter | USER_AUTH#kind#digest#bucket | METADATA | attempts/expiresAt, tách admin counters |
| Admin/session/counters cũ | Giữ v2 | Giữ v2 | Không tự ghi đè hoặc đổi username login |

Vé của tôi Query PK USER#userId + SK begins_with REGISTRATION#, rồi đọc Ticket theo ID; sort response như mục 2. Đây là cách đơn giản cho local nhỏ, cần đo nếu phát triển lịch sử vé lớn, chưa khẳng định tối ưu cho mọi tải.

### Dữ liệu v2/legacy

- Không xóa/sửa/gán chủ vé cũ theo email chưa xác minh. Giữ bản ghi REGISTRATION và khóa EVENT/email cũ; giữ capacity/remainingSeats đã dùng. Không tự seed lại hoặc reset bảng ứng dụng.
- Vé không có userId không hiện trong Vé của tôi và không được đọc công khai sau nâng cấp. GET với User vẫn 404 cho legacy. Đây là thay đổi quyền truy cập phải chấp nhận rõ, không phải lỗi mất dữ liệu.
- Legacy thiếu salesOpenAt được đọc null. Không bắt buộc backfill chỉ để đọc. Các số chỗ đã dùng cũ có thể không khớp số bản ghi nếu là seed; không dùng sự kiện legacy để assertion capacity - remainingSeats = số vé mới.
- Rule v3 chống trùng theo User/event. Cùng email từng có vé legacy không đủ bằng chứng để nhận/chuyển vé. Nếu cho mua mới, vé v3 vẫn phải chiếm chỗ mới và tối đa một vé v3/User/event; việc chặn mua theo email legacy là quyết định nghiệp vụ riêng, không tự gán ownership để giải quyết.
- Nếu cần quản trị kiểm kê legacy, dùng công cụ local chỉ đọc và báo số lượng đã lọc thông tin, không thêm endpoint public xuất toàn bộ PII. Chuyển quyền legacy, nếu có, là đợt có bằng chứng người sở hữu và kế hoạch riêng.

## 8. Chuẩn bị/đặt lại/dọn dữ liệu test

**Chủ trì là bên test**, trong `tests/load/` đề xuất; bên ứng dụng giữ schema và bàn giao API/factory cần thiết. Không thêm API production bỏ qua auth để tiện test.

1. Dùng `backend/tools/new_test_environment.py` hiện có tạo **tên bảng và env mới**, rồi `init_db.py` tạo bảng không seed demo. Script tạo env chưa tự tạo bảng. Mỗi run có runId và manifest chỉ tới đúng test table/commit/contract/kịch bản; không lấy bảng đang dùng ở cổng 3001.
2. Chạy SAM test 3002 bằng env đó. Trước mọi ghi/cleanup, kiểm tra GET health trỏ bảng prefix `fcaj-event-workshop-local-test-` và khớp manifest, endpoint local. Bản build phải đến từ commit đã bàn giao, không lẫn artifact worktree khác.
3. Chuẩn bị admin fixture trong **test table** để tạo sự kiện qua API admin thật. CLI `create_admin.py` hiện có nhập mật khẩu tương tác; nếu cần tự động thì bên test dùng helper/factory của app (password_record/AuthRepository đang có) theo giao diện hai bên chốt, không hardcode hash hoặc copy một schema auth khác. Chưa có helper tự động mới được triển khai trong lượt này.
4. Tạo 100 User tự động qua register API v3 rồi login từng User, lưu secret trong bộ nhớ. Tạo sự kiện qua admin API, lấy eventId từ response. Tên/email có runId để không đụng dữ liệu lượt khác; policy signup/login và thời gian chuẩn bị phải ghi riêng. Không tự tạo session giả bằng cách ghi token tùy ý vào DB.
5. Ba kịch bản chính: 100 người/200 vé để thử luồng thành công; ramp/hold/down có giới hạn; 100 người tranh 10 rồi 1 vé. Tạo sự kiện mới cho từng lượt, mở bán đúng giờ và có clock chuẩn bị đủ. Bài tải đọc công khai không cần User; bài đặt vé dùng User/CSRF thật, một VU một session.
6. Đối chiếu DB chỉ đọc sau xử lý ổn định: số Ticket, User/event reference, idempotency record và chỗ khớp nhau cho các đăng ký thành công; không có reference mồ côi, không vé trùng hoặc chỗ âm. Tất cả số lượng phải lọc đúng eventId/runId, không Scan rồi đếm cả dữ liệu của run khác. Timeout/503/429 không gộp thành hết vé.
7. **Đặt lại:** tạo run/bảng hoặc ít nhất sự kiện mới theo manifest, không sửa remainingSeats bằng tay trên sự kiện đã có vé. Giữ kết quả để xem lại. App DB không reset.
8. **Dọn:** công cụ test tương lai chỉ nhắm chính xác bảng test khớp manifest/runId, không có runner đang ghi, đã lưu báo cáo; hiển thị tên bảng và xác nhận mục tiêu trước khi xóa. Không dùng xóa hàng loạt theo prefix, không xóa volume/DB ứng dụng. Hiện chưa có lệnh cleanup tự động mới; không giả định `new_test_environment.py` sẽ dọn bảng.

Nếu phía test muốn seed account trực tiếp thay vì gọi register, cần chốt helper dùng chung quy tắc băm/unique và ghi rõ bài đo không bao gồm signup. Các test signup API vẫn cần chạy riêng. Không để phía test tự sửa backend để xây đường seed bỏ qua bảo mật.

Với hai bài burst, mỗi User chỉ gửi **một POST đặt vé mới**; các GET xem sự kiện được thống kê riêng. Kỳ vọng trên sự kiện mới, đủ điều kiện, khi không còn lỗi kỹ thuật chưa xử lý:

| Kịch bản | User/request đặt mới | Capacity ban đầu | 201 mới | 409 EVENT_FULL | Vé trong DB / chỗ còn |
| --- | --- | --- | --- | --- | --- |
| Đủ vé | 100 / 100 | 200 | 100 | 0 | 100 / 100 |
| Tranh 10 vé | 100 / 100 | 10 | 10 | 90 | 10 / 0 |
| Tranh 1 vé | 100 / 100 | 1 | 1 | 99 | 1 / 0 |

Đây là assertion đề xuất, không phải kết quả đã đạt. Replay có 200 được đếm riêng, không tăng số vé mới. Với ramp/hold/down kéo dài, phải có đủ danh tính/sự kiện/chỗ cho phần tải tạo vé; không để phần lớn request thành trùng/hết chỗ rồi diễn giải thành throughput mua thành công. Tham số harness cần cấu hình và ghi vào manifest: scenario, số VU, lịch/tốc độ phát mục tiêu, maxDurationSeconds, maxRequests, eventId, app commit, contract version; đồng thời báo tốc độ thực đạt. Trình tự tăng số VU không tự bảo đảm một mức request/giây.

## 9. Env/local và thông tin bên test nhận

| Tên/địa chỉ | Hiện có hay đề xuất | Cách dùng |
| --- | --- | --- |
| DYNAMODB_ENDPOINT/TABLE/REGION | Đã có | Endpoint local bắt buộc; table test riêng, credentials giả local/local |
| ALLOWED_ORIGINS | Đã có | Giữ hai origin 5173, k6 dùng 127.0.0.1:5173 |
| COOKIE_SECURE | Đã có | false chỉ local HTTP, không coi là production |
| VITE_DATA_MODE=api, VITE_API_BASE_URL=/api | Đã có | Frontend sản phẩm → proxy SAM 3001; mock không là bằng chứng |
| SAM_CLI_TELEMETRY=0 và các AWS_* local | Đã có hướng dẫn | Chỉ phục vụ SAM local; không profile/credentials AWS thật |
| USER_* rate limit | Đề xuất mục 4 | Chưa được code; không coi set env là đã có tác dụng |
| API_TEST_URL=http://127.0.0.1:3002 | Tên dùng trong một số script test cũ; k6/runner đề xuất đọc cùng giá trị | Base URL API test, không có tiền tố /api |
| APP_ORIGIN=http://127.0.0.1:5173 | Đề xuất cho harness | Origin trên auth/mutation; chưa là env backend |
| TEST_RUN_ID/TEST_TABLE/TEST_ENV_FILE | Đề xuất cho harness | Khớp manifest; chưa là env app hoặc công cụ đã có |

Không đặt mật khẩu, cookie, CSRF vào VITE_* hoặc report. Test dashboard 5174 gọi runner 3100 qua `/runner`; runner/k6 gọi API test 3002; không thêm CORS wildcard. Chi tiết ở [phoi-hop.md](phoi-hop.md).

Mỗi mốc bàn giao gồm: commit app, phiên bản contract, API ready/chưa ready, env mẫu không secret, cách chuẩn bị admin fixture, response mẫu từ lượt chạy thật đã lọc secret và lệnh kiểm tra. Đổi trường/mã lỗi/header phải ghi changelog trước khi tích hợp.

## 10. Checklist chấp nhận để hai bên review

| Nhóm | Điều cần thử khi triển khai |
| --- | --- |
| Auth | Signup/email chuẩn hóa trùng/field lạ; login sai/đúng; session/reload/logout/hết hạn; không tự cấp admin; 100 cookie/CSRF riêng |
| Thời gian | Trước/đúng/sau salesOpenAt, manual đóng, tới dateTime; server quyết định và transaction không cấp vé sớm |
| Quyền | Không auth bị 401; User B không đọc được vé A bằng sửa ID; me chỉ có vé của mình; legacy không bị nhận nhầm |
| Transaction | 100/200 vé; 100 tranh 10/1; số vé/chỗ/reference/idem khớp; xung đột chưa phục hồi là kỹ thuật |
| Idempotency | Cùng key tuần tự/song song; cùng key khác body/event; key mới cùng User/event; timeout sau commit rồi replay; replay sau hết chỗ/đóng; cùng key ở User khác |
| Frontend | Login/register giữ đúng sự kiện; không redirect ngoài; chưa mở bán; gửi lặp; lỗi giữ thông tin; reload kết quả/Vé của tôi |
| Phối hợp | Test dùng đúng commit/env/table; app và test frontend tách package/cổng; runner/report không chứa secret |

Chưa có checkbox nào được coi là đã đạt của v3. Khi local đạt vẫn chưa là bằng chứng AWS scaling.

## Nguồn

- [Biên bản](yeu-cau.md), [contract v2](../docs/api-contract.md), [mô hình dữ liệu v2](../docs/data-model.md), [bảo mật](../docs/security.md), [backend README](../backend/README.md), [frontend README](../frontend/README.md).
- [auth.py](../backend/lambda/auth.py), [service.py](../backend/lambda/service.py), [repository.py](../backend/lambda/repository.py), [admin_events.py](../backend/lambda/admin_events.py), [template](../backend/template.yaml), [env generator](../backend/tools/new_test_environment.py), [frontend HTTP client](../frontend/src/services/http-client.ts): bằng chứng hiện trạng và phần cần đổi.
- [AWS — DynamoDB transactions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html), đọc 23/10: all-or-nothing, điều kiện ghi và cửa sổ ClientRequestToken. Thiết kế bốn item/retention ở đây là lựa chọn dự án, chưa triển khai.
- [AWS Builders’ Library — Idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/), đã đọc trong phiên 23/10: key theo caller, cùng key khác nội dung, replay và tác động atomic. Tên header/status/retention ở đây là đề xuất, không phải AWS bắt buộc.
- [Grafana k6 — Cookies](https://grafana.com/docs/k6/latest/using-k6/cookies/), đọc 23/10: cookie jar riêng cho VU; cần chốt cách chuẩn bị/duy trì cookie khi viết harness.
- [Grafana k6 — noCookiesReset](https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/#no-cookies-reset), đọc 23/10: cookie reset theo iteration và option giữ cookie. Cấu hình cụ thể của bài test vẫn do hai bên chốt.
- [OWASP — CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), đọc 23/10; [OWASP — Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), đã đọc trong phiên: giữ kiểm tra session/CSRF/Origin; không cho dashboard hoặc report giữ token của người test.
