# API contract local — phiên bản 4.1

Áp dụng cho nhánh `phuc`, ngày 23/10/2026, theo yêu cầu đăng nhập chung/sidebar/xóa ghi danh đã được người dùng duyệt trong [nhật ký, mục 15](../phuc-worklog/week-4/23-10-ung-dung.md), kế thừa [yêu cầu nền](../quan-worklog/yeu-cau.md). Nhật ký giữ bằng chứng các mốc trước; kiểm tra bổ sung 4.1 nằm ở [test backend](../tests/backend/test_unified_integration.py), [HTTP smoke](../backend/tools/check_accounts_api.py) và [browser smoke](../tests/frontend/check-accounts-browser.mjs). Đây là hợp đồng của ứng dụng; k6/runner/dashboard do bên kiểm thử phát triển riêng.

## 1. Địa chỉ và quy tắc chung

SAM ứng dụng mặc định `http://127.0.0.1:3001`; SAM test `http://127.0.0.1:3002` với bảng riêng. Path bên dưới không có `/api`. Trình duyệt gọi `/api` qua Vite proxy, mặc định chuyển tới 3001; có thể chọn `API_PROXY_TARGET` khi chạy Vite để thử API khác tại máy.

- JSON UTF-8, không hỗ trợ query parameter; gửi query trả 400. Body tối đa 32 KiB sau giải mã, thao tác có body cần `Content-Type: application/json`.
- `eventId`: 1–80 ký tự thường/số/gạch ngang, bắt đầu bằng chữ/số. `registrationId`: UUID v4 chuẩn chữ thường. Sai dạng 400, không tồn tại 404 sau kiểm tra quyền.
- Không xuất PK/SK/hash mật khẩu/token session trong JSON. Tất cả response handler dùng `Cache-Control: no-store`.
- GET events sắp theo dateTime tăng dần rồi id. GET me sắp createdAt giảm dần rồi id. Repository đọc hết các trang DynamoDB; API chưa phân trang cho phạm vi local nhỏ.
- CORS allowlist `http://localhost:5173,http://127.0.0.1:5173`; credentials=true; methods GET/POST/PUT/DELETE/OPTIONS; allow Content-Type, X-CSRF-Token, Idempotency-Key; expose Location, Idempotent-Replayed. Origin khác phải cấu hình cả SAM và ALLOWED_ORIGINS.

## 2. Các endpoint

| Method / path | Quyền | Body → thành công |
| --- | --- | --- |
| GET /health | Công khai | Không → 200 Health |
| GET /events | Công khai | Không → 200 `{events:Event[]}` |
| GET /events/{eventId} | Công khai | Không → 200 Event |
| POST /auth/register | Origin hợp lệ | `{fullName,email,password}` → 201 `{user:User}`, chưa login |
| POST /auth/login | Origin hợp lệ | `{identifier,password}` → 200 Session theo role + cookie (email/password cũ vẫn nhận) |
| GET /auth/session | Đã đăng nhập | Không → 200 Session theo role |
| POST /auth/logout | Đã đăng nhập + Origin + CSRF | `{}` → 200 `{loggedOut:true}`, thu hồi phiên |
| POST /events/{eventId}/registrations | User + Origin + CSRF + key | `{phone?:string}` → 201 Ticket mới / 200 replay |
| GET /registrations/{registrationId} | Chủ vé | Không → 200 Ticket |
| GET /me/registrations | User | Không → 200 `{registrations:Ticket[]}` |
| POST /admin/login | Origin hợp lệ | `{username,password}` → 200 AdminSession + cookie |
| GET /admin/session | Admin | Không → 200 AdminSession |
| POST /admin/logout | Admin + Origin + CSRF | Không → 200 `{loggedOut:true}` |
| GET /admin/users | Admin | Không → 200 `{users:ManagedUser[]}` |
| PUT /admin/users/{userId} | Admin + Origin + CSRF | `{fullName,email,version}` → 200 ManagedUser |
| DELETE /admin/users/{userId} | Admin + Origin + CSRF | `{version}` → 200 `{deleted:true}` hoặc 202 `{deleted:false,deleting:true,version}` |
| GET /admin/events | Admin | Không → 200 `{events:AdminEvent[]}` |
| POST /admin/events | Admin + Origin + CSRF | EventInput → 201 AdminEvent |
| PUT /admin/events/{eventId} | Admin + Origin + CSRF | EventInput + version → 200 AdminEvent |
| DELETE /admin/events/{eventId} | Admin + Origin + CSRF | `{version}` → 200 `{deleted:true}` hoặc 202 `{deleted:false,deleting:true,version}` |

## 3. Tài khoản và phiên

User có đúng `userId` UUID v4, `fullName`, `email`, `role:"user"`, `createdAt` ISO UTC. Register trim fullName (1–120 ký tự), trim/lowercase email (đúng dạng, tối đa 254), password 15–128 ký tự không trim. Không nhận role/userId hoặc trường lạ. Email duy nhất được bảo vệ bằng transaction. Chưa OTP/xác minh email/khôi phục mật khẩu.

Session theo role: UserSession `{role:"user",user:User,csrfToken:string,expiresAt:number}`; AdminSession `{username,role:"admin",csrfToken,expiresAt}`. expiresAt là Unix seconds, thời hạn tuyệt đối 8 giờ. Login chung nhận identifier là email User hoặc username admin; backend tự xác định role, không nhận role do client chọn. Admin vẫn tạo qua CLI `backend/tools/create_admin.py`.

Một cookie `event_session` cho cả hai role: token ngẫu nhiên 256 bit, HttpOnly, SameSite=Strict, Path=/, Max-Age=28800. DB lưu SHA-256 token ở APP_SESSION#. Đăng nhập thành công thu hồi phiên cũ được trình duyệt gửi, kể cả phiên của role còn lại. Logout thu hồi phiên chung. Cookie cũ event_user_session/event_admin_session không còn được chấp nhận để phân quyền; login/logout gửi Set-Cookie xóa cả hai và thu hồi record tương ứng nếu được gửi. Nâng cấp từ v3 cần đăng nhập lại; không migrate profile/vé.

Đây là một tài khoản đang dùng cho cùng browser/profile, chia sẻ giữa các tab. Trình duyệt/profile khác và từng cookie jar k6 vẫn độc lập. UI đồng bộ thay đổi bằng BroadcastChannel và kiểm tra lại khi quay về tab; backend luôn là nơi quyết định quyền. Có phiên đúng nhưng sai role trả403, thiếu/hết hạn phiên trả401. GET /auth/session trả role hiện tại; /admin/session là alias cần admin. /admin/login và /admin/logout còn để tương thích URL API nhưng cũng dùng cùng cookie, không tạo phiên riêng.

CSRF lấy từ JSON phiên, chỉ giữ trong bộ nhớ UI, gửi X-CSRF-Token trên thao tác ghi sau login. Register/login cần Origin allowlist, chưa cần CSRF trước phiên. Không đưa token vào URL/localStorage/sessionStorage/log.

Mật khẩu dùng scrypt N=32768/r=8/p=3, salt riêng ngẫu nhiên 128 bit. Sai tài khoản/mật khẩu dùng cùng thông báo. Bộ đếm atomic DynamoDB tính cả lượt thành công:

| Loại | Cửa sổ | Giới hạn mặc định |
| --- | --- | --- |
| Admin login | 900 giây | 30/IP và 10/username |
| User signup | USER_AUTH_WINDOW_SECONDS=900 | USER_SIGNUP_IP_LIMIT=120/IP |
| User login | Cùng cửa sổ User | USER_LOGIN_IP_LIMIT=120/IP và USER_LOGIN_ACCOUNT_LIMIT=10/email |

Counter signup/login/admin riêng. User vượt trả 429 AUTH_RATE_LIMITED + Retry-After tới hết cửa sổ; admin giữ LOGIN_RATE_LIMITED. Giá trị User phục vụ chuẩn bị 100 tài khoản local, không là cam kết cấu hình production.

## 4. Event và lịch mở bán

Event công khai:

```json
{"id":"event-example","title":"Buổi thực hành","category":"Công nghệ","dateTime":"2099-06-01T09:00:00+07:00","salesOpenAt":null,"location":"Trực tuyến","organizer":"Nhóm Workshop","capacity":40,"remainingSeats":40,"summary":"Cùng thực hành.","description":"Thông tin chuẩn bị.","status":"open"}
```

EventInput gồm title/category/dateTime/salesOpenAt/location/organizer/capacity/registrationOpen/summary/description. Tất cả bắt buộc, PUT thêm version. `salesOpenAt` null = không hẹn giờ, hoặc ISO có timezone và không sau dateTime. Legacy thiếu field đọc thành null, không tự backfill.

- Trim chuỗi; giới hạn title160/location240/organizer160/summary300/description5000 ký tự.
- Category: Công nghệ / Thiết kế / Kỹ năng / Cộng đồng. Capacity nguyên 1–100000, không nhận boolean/thập phân. dateTime có timezone, năm 2000–2100; tạo mới cần tương lai. Form admin nhập giờ Việt Nam.
- ID `event-<uuid hex>` do server tạo. Không nhận id/remainingSeats/status/PK/SK/role/trường lạ từ client.
- AdminEvent = Event + registrationOpen/version/occupiedSeats/deleting (boolean). Version mới=1, legacy thiếu=0. occupiedSeats=capacity−remainingSeats, có thể gồm chỗ giả từ seed cũ.
- Sửa capacity giữ chỗ đã dùng; kiểm tra version/capacity/remainingSeats tại DB. Xung đột 409 EVENT_CHANGED. Admin được xóa cả sự kiện có người đăng ký; xem quy trình dưới đây.
- Ưu tiên status: tới dateTime → ended; manual đóng → closed; chưa tới salesOpenAt → not_open; hết chỗ → full; còn lại open. Chưa có endTime riêng.
- Giờ server quyết định. Đúng salesOpenAt thì mở; đúng dateTime thì dừng. Transaction kiểm tra epoch milliseconds, không dựa đồng hồ UI. Legacy startsAtEpoch giây vẫn được hỗ trợ.

Health: `{status:"ok",database:{status:"ready",table:string},apiContractVersion:"4.1",serverTime:ISO_UTC}`. Health chỉ đọc, không tạo/seed bảng. serverTime giúp đối chiếu clock, không bảo đảm request đến đúng thời điểm client phát.

## 5. Đặt vé, replay và quyền xem

Body chỉ nhận phone tùy chọn, trim, tối đa32 ký tự; `{}` tương đương `{"phone":""}`. Tên/email/userId lấy từ phiên server. Ticket:

```json
{"id":"91aa116c-9ba1-4e9f-b192-fcf9178882c8","eventId":"event-example","userId":"65e81330-cf1a-4b7f-9c31-8df1d61065b5","fullName":"Người tham gia","email":"buyer@example.com","phone":"","createdAt":"2026-10-23T02:00:00+00:00"}
```

`Idempotency-Key` bắt buộc là UUID v4 chuẩn chữ thường. Scope theo User. Fingerprint gồm method, eventId và phone chuẩn hóa; không gồm token phiên/CSRF. Một ý định giữ nguyên key khi timeout/retry/reload; ý định khác sinh key mới.

| Tình huống | Kết quả |
| --- | --- |
| User/event chưa có vé, key mới, đủ điều kiện | 201, Location=/registrations/id, Idempotent-Replayed=false |
| Cùng User/key/path/body đã lưu | 200, Ticket cũ, Idempotent-Replayed=true |
| Cùng User/key, khác event hoặc body | 409 IDEMPOTENCY_KEY_REUSED |
| Cùng User/event, key mới | 409 DUPLICATE_REGISTRATION + details.registrationId của chính User |
| User khác dùng cùng chuỗi key | Yêu cầu độc lập |

Thứ tự: auth/Origin/CSRF/input → event tồn tại và không đang xóa → đọc replay nhất quán → User/event reference (đọc lại replay nếu reference vừa xuất hiện) → đóng/kết thúc → chưa mở bán → hết chỗ → transaction. Vì replay được đọc trước điều kiện bán nên vẫn nhận lại vé sau khi full/closed/ended.

Transaction gồm bốn ghi atomic: giảm ghế có điều kiện bán; tạo User/event reference duy nhất; tạo Ticket; tạo idempotency record chứa fingerprint và Ticket snapshot. Cả bốn thành công hoặc không có ghi dở. Xung đột đọc lại rồi retry tối đa4 lượt có jitter; chưa phân loại được sau giới hạn trả503 REGISTRATION_BUSY, Retry-After1. Record idempotency chưa đặt TTL, giữ cùng vòng đời vé.

Timeout/mất phản hồi là chưa rõ kết quả. Retry cùng key/body hoặc xem Vé của tôi; không tự cho rằng thất bại. UI lưu key/phone đang chờ trong sessionStorage theo User/event, giữ qua reload, không lưu secret. Kết quả rõ thì xóa ý định đang chờ. Không tự retry ghi trong nền.

GET result/me cần User. Thiếu/hết hạn phiên401; vé không có, thuộc người khác hoặc legacy không userId đều404 REGISTRATION_NOT_FOUND. Sự kiện đang xóa/đã xóa không trả lại vé hoặc replay; danh sách vé bỏ qua vé đã mất/sự kiện đang xóa, vẫn trả vé còn lại. Không gán vé cũ theo email chưa xác minh. Dữ liệu/chỗ legacy được giữ nguyên; chưa có API nhận lại vé legacy. Admin cookie không tự cấp quyền xem mọi vé.

### Xóa sự kiện và ghi danh

DELETE giữ body version và quyền admin/Origin/CSRF. Admin không bị chặn vì đã dùng ghế, kể cả ghế seed. Khóa deleting=true và registrationOpen=false trước khi dọn, cùng điều kiện version; booking transaction từ chối sự kiện đang xóa, sửa sự kiện cũng không được ghi đè khóa. Public GET/list ẩn sự kiện đang xóa; admin list giữ để tiếp tục, deleting=true.

Dọn Ticket, User/event reference, idempotency snapshot và email reference legacy của đúng event. Không xóa tài khoản, phiên, email unique hoặc vé ở event khác. Đọc scan nhất quán từng trang tối đa100 item; batch_writer xử lý batch/retry. Lưu deletionCursor sau trang hoàn tất; tối đa5trang/request. Nếu còn việc trả202, gọi lại DELETE cùng version; UI hiển thị Tiếp tục xóa. Khi hết trang mới xóa event và trả200 deleted=true. Lỗi giữa chừng có thể retry; không báo hoàn tất sớm. Gọi lại ID đã mất trả200 deleted=true sau khi kiểm tra quyền/schema. Version sai khi event còn tồn tại trả409 EVENT_CHANGED.

Không phải transaction xóa nguyên khối. Hiện scan toàn bảng để hỗ trợ dữ liệu cũ chưa có index theo event; chưa phù hợp đánh giá chi phí/scaling production. Sau khóa, người dùng mất quyền xem vé sự kiện đó ngay cả khi quá trình dọn chưa xong. Không tạo Undo/khôi phục.

## 6. Lỗi

Envelope: `{"error":{"code":"EVENT_FULL","message":"Sự kiện đã hết chỗ.","requestId":"...","details":{}}}`. details chỉ xuất khi có; không trả stacktrace. Gateway/SAM có thể trả lỗi riêng trước handler.

| HTTP | code |
| --- | --- |
| 400 | VALIDATION_ERROR |
| 401 | AUTH_REQUIRED, INVALID_CREDENTIALS |
| 403 | FORBIDDEN, FORBIDDEN_ORIGIN, CSRF_FAILED |
| 404 | EVENT_NOT_FOUND, REGISTRATION_NOT_FOUND, ROUTE_NOT_FOUND |
| 409 | EMAIL_ALREADY_EXISTS, SALES_NOT_OPEN, REGISTRATION_CLOSED, EVENT_FULL, DUPLICATE_REGISTRATION, IDEMPOTENCY_KEY_REUSED |
| 409 | EVENT_CHANGED, CAPACITY_TOO_SMALL |
| 413 / 415 | PAYLOAD_TOO_LARGE / UNSUPPORTED_MEDIA_TYPE |
| 429 | AUTH_RATE_LIMITED (User), LOGIN_RATE_LIMITED (admin) |
| 503 | REGISTRATION_BUSY, DATABASE_UNAVAILABLE |
| 500 | INTERNAL_ERROR |

429/503/timeout không gộp vào hết vé. 201 mới và200 replay phải đếm riêng. Chưa thanh toán, hủy vé, OTP, Organizer nhiều đơn vị hoặc triển khai AWS.

## 7. Bàn giao kiểm thử và nguồn

Chuẩn bị100 tài khoản qua register/login ngoài khoảng đo; mỗi người ảo có cookie jar/CSRF riêng, không tắt auth. Mỗi run dùng bảng/sự kiện mới, kiểm tra health trỏ đúng prefix test và khớp manifest. Dùng helper password_record/AuthRepository hiện có khi cần admin fixture; không copy schema/hash sang harness. Không reset bảng ứng dụng.

Kỳ vọng trên sự kiện mới:100 người/200 chỗ →100 vé; tranh10 →10 vé; tranh1 →1 vé. Đây là mục tiêu cho phía tải, chưa là kết quả đã đo100 người. Đối chiếu ghế, Ticket, reference, idempotency theo đúng event/run; local không chứng minh AWS autoscaling. Xem [phối hợp](../quan-worklog/phoi-hop.md).

- Triển khai: [buyer_auth.py](../backend/lambda/buyer_auth.py), [booking.py](../backend/lambda/booking.py), [repository.py](../backend/lambda/repository.py), [template](../backend/template.yaml), [data model](data-model.md), [security](security.md).
- [DynamoDB transactions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html), [AWS idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/): nguyên tắc atomic/retry; tên header/status ở đây do dự án chọn.
- [OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [k6 cookies](https://grafana.com/docs/k6/latest/using-k6/cookies/): tham khảo bảo vệ thao tác và tách phiên thử.

Mốc v3 để bên kiểm thử đối chiếu: `feat/buyer-flow@a6ba0f21e41cc73cfadb3242ff9bd9d30e2f234a`. Không đọc contract v4 rồi áp dụng cho API v3; lấy code và tài liệu cùng commit.

## Quản lý User — bổ sung ở 4.1

`ManagedUser` gồm `userId,fullName,email,role,createdAt,version,deleting`. Chỉ Admin được dùng ba route quản lý tài khoản; không liệt kê hay sửa tài khoản Admin. `userId` phải là UUID v4 chuẩn. Không nhận password/role hoặc trường lạ trong body. Tìm kiếm theo tên/email thực hiện trên frontend, không dùng query API.

Sửa tên/email cần đúng `version` đang hiển thị. Tên được trim (1–120 ký tự); email trim/lowercase, đúng dạng, tối đa 254 ký tự và duy nhất. Profile và ánh xạ email được đổi trong cùng transaction, version tăng một. Vé đã đặt giữ tên/email tại lúc đặt; vé mới dùng thông tin mới. Session đọc lại profile nên nhận thông tin vừa sửa.

Xóa dùng `version` để tránh xóa nhầm dữ liệu vừa được người khác sửa. Backend đánh dấu `deleting` trước: đăng nhập, session và đặt vé của User đó bị từ chối ngay (401 `AUTH_REQUIRED`). Transaction mua vé nay có **5 thao tác: 4 ghi + 1 ConditionCheck profile User đang hoạt động**; dữ liệu test phải có profile thật, không chỉ cookie hoặc userId tự tạo.

Mỗi vé bị hủy bằng một transaction gồm kiểm tra tài khoản đang xóa, xóa liên kết User–vé, xóa vé và trả một chỗ cho sự kiện còn hoạt động. Vì liên kết và trả chỗ cùng commit, gửi lại không trả chỗ lần hai. Sự kiện đã bị xóa/đang xóa không được tạo lại hoặc trả chỗ. Vé của người khác không bị tác động.

Một lần DELETE xử lý tối đa 10 liên kết vé; metadata User theo lô 25; dọn session/vé còn sót bằng tối đa 5 trang Scan, mỗi trang 100 item. Cursor được lưu trong profile để tiếp tục. Response 202 yêu cầu gọi lại DELETE cùng version cho tới 200; UI có nút tiếp tục xóa. Tài khoản vẫn bị khóa trong thời gian này. Xóa lại tài khoản đã mất trả 200. Backend chỉ dọn vé sót sau xóa sự kiện nếu sự kiện đã mất/đang xóa; vé mất liên kết nhưng sự kiện còn hoạt động trả `ACCOUNT_BUSY` để tránh đoán sai số chỗ.

Lỗi mới: 404 `ACCOUNT_NOT_FOUND`; 409 `ACCOUNT_CHANGED` (tải lại danh sách), email trùng trả 409 `EMAIL_ALREADY_EXISTS` kèm trường email; 503 `ACCOUNT_BUSY` khi cần xử lý tiếp/đối chiếu dữ liệu. Các kiểm tra quyền, Origin và CSRF giống nhóm Admin hiện có. Bản này dùng Scan cho danh sách và dọn session trong phạm vi local; chưa phải bằng chứng hiệu năng hoặc thiết kế tối ưu cho AWS.
