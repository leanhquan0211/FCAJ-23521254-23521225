# 23/10/2026 — Bàn giao phần kiểm thử local

> C?p nh?t: ph?n ??u ghi m?c x?y d?ng Test Lab tr?n n?n v2. Xem m?c ?T?ch h?p b?n ?ng d?ng v3 tr??c khi push? cu?i file ?? bi?t tr?ng th?i m?i nh?t; kh?ng d?ng gi?i h?n l?ch s? ? ph?n ??u thay cho k?t qu? t?ch h?p m?i.

## Phạm vi được giao và hiện trạng xác minh

Người dùng giao trực tiếp thực hiện phần kiểm thử trong attachment `d818db61-a0b4-47e5-88fa-6c4225d4329c/Pasted text.txt`, cho phép làm độc lập trong lúc bên ứng dụng hoàn thiện người mua, và yêu cầu ghi tóm tắt vào `quan-worklog`. Đây là ủy quyền triển khai phần test của lượt này; không coi các chức năng nháp của v3 là đã được ứng dụng cài đặt.

Đã đọc hướng dẫn repository, README, contract v2, data model/security, cấu hình Compose/SAM, code auth/service/repository, các test hiện có và bộ bàn giao theo thứ tự README → yêu cầu → phối hợp → API dự kiến → nhật ký. Không có AGENTS.md trong repository được kiểm tra. Có đọc quy tắc `phuc-worklog/phong-cach.md` trong bộ bàn giao (hiện chuyển thành [AI_RULE.md](../../phuc-worklog/AI_RULE.md)); yêu cầu trực tiếp mới cho phép thực hiện phần đã giao, không dừng để xin duyệt lại chính phần đó.

Repository thật: `N:\OneDrive\UIT\TTDN\fcaj-workshop\FCAJ-23521254-23521225`, không phải đường dẫn D: trong tài liệu bên ứng dụng. Điểm nền hiện tại là `f4e20b90095e2519b0dfefd212fb1a1146abbe57` (`added quan-worklog`). Những ghi chép branch phuc/c13f4a9 ở tài liệu trước là bối cảnh máy/lượt khác, không được dùng thay trạng thái Git vừa kiểm tra.

Code ứng dụng vẫn là v2: GET công khai, đăng ký khách theo email, Admin auth/CRUD. Chưa có `/auth/*` của User, `salesOpenAt`, User ownership, `/me/registrations` hoặc HTTP idempotency. File `quan-worklog/api-du-kien.md` là dự kiến; canonical contract không được phía test sửa.

## Git và phân chia công việc

- Tạo nhánh `feat/test-lab` và linked worktree tại `.worktrees/test-lab`, không switch nhánh của cửa sổ chính.
- Giữ nguyên sáu file đang sửa trên main: `backend/README.md`, `backend/lambda/auth.py`, `backend/tools/create_admin.py`, `docs/api-contract.md`, `frontend/src/pages/admin/AdminLoginPage.tsx`, `tests/backend/test_admin.py`.
- Tài liệu bàn giao đã nằm trong commit nền nên có sẵn trong worktree test; không di chuyển, stash, reset hoặc clean công việc bên kia.
- Thêm `/.worktrees/` vào `.git/info/exclude` local để folder linked worktree không hiện thành hàng nghìn file mới ở main; không sửa `.gitignore` chung.
- Mã mới chỉ thuộc `tests/load/`, `tests/runner/`, `tests/dashboard/`, `tests/results/` và nhật ký này. Không sửa Backend, Frontend sản phẩm, canonical docs hoặc test hồi quy của bên ứng dụng.
- Không commit, push, merge hoặc triển khai AWS. Các thay đổi trong worktree test hiện chưa commit.

Nếu đọc bản nhật ký được chép vào workspace chính, mã test mới thực tế đang ở `.worktrees/test-lab`. Khi tích hợp về nhánh chung, chỉ stage/commit từ đúng worktree sau khi người dùng yêu cầu; không coi việc có tên branch là code mới đã nằm trong commit.

## Đã triển khai

| Nhóm | File và trách nhiệm |
| --- | --- |
| Adapter/cấu hình | `tests/load/contract-v3-draft.json`: path/header/cookie/model nháp; `config.py`: local URL, guard test table và allowlist tham số |
| HTTP/fixture | `client.py`: cookie jar riêng, không redirect/proxy, không log body riêng; `fixtures.py`: health/readiness, môi trường trống, admin qua factory ứng dụng, User qua register/login thật và event qua Admin API |
| Tạo tải | `scenarios.js`: hot, ramp và scarce; per-VU/ramping executor; User/session riêng; key ổn định qua retry; giới hạn request/thời gian |
| Kết quả | `metrics.py`: P50/P95/max, throughput, series, từng nhóm lỗi và retry; `audit.py`: read-only so sánh vé/chỗ/reference/idempotency theo event/User/key; `supplemental.py`: replay, key đổi body, duplicate, vé của tôi và owner-only |
| Điều phối | `tests/runner/engine.py`: một run, prepare/load/verify, watchdog, stop và lịch sử; `server.py`: HTTP loopback 3100, Host/Origin/JSON guard, không nhận shell/path tùy ý |
| CLI | `tests/load/lab.py`: tạo môi trường, preflight, điều khiển run qua cùng runner và cleanup có guard; không có engine CLI thứ hai |
| k6 | `tests/runner/install-k6.ps1`: tải release Grafana/GitHub, kiểm tra SHA256, portable trong `.tools/` được gitignore; đã dùng k6 2.3.0 |
| Dashboard | React/TypeScript/Vite riêng trong `tests/dashboard/`, lock riêng, cổng 5174, proxy `/runner` đến 3100. Chọn tham số, start/stop, metric/biểu đồ thật, đối chiếu, lịch sử/reload và tải JSON |
| Test công cụ | `tests/runner/test_lab.py`: 26 unit test; `tests/dashboard/check-browser.mjs`: Chrome DevTools Protocol trên browser profile riêng |
| Tài liệu | `tests/runner/README.md`: lệnh theo terminal, giải thích code, giới hạn, cleanup và mục Gửi bên ứng dụng. `tests/dashboard/DESIGN.md`/tokens/log: quyết định giao diện |

Kết quả/raw/profile/browser ảnh ở `tests/results/` đều gitignore. Không lưu mật khẩu/cookie/CSRF vào manifest, report, argv, VITE env hoặc dashboard. Session đi qua stdin k6; stderr không được đưa vào báo cáo. Có unit test xác minh cả stdin và các kênh không được chứa secret.

Fixture không tạo User hoặc session giả bằng DB. Admin fixture sử dụng đúng factory hiện có `password_record`, `AuthRepository.create`, `configuration.local_table` của ứng dụng và chỉ trong bảng test. Nếu factory thay đổi, cần bàn giao interface mới; không sửa schema ứng dụng để chiều bài test.

## Hallmark

Đã đọc `.agents/skills/hallmark/SKILL.md` và các tham chiếu liên quan tới bố cục, genre/theme, typography, màu, spacing, states, motion, responsive và tự đánh giá. Dashboard chọn **Workbench / Cobalt**, N3 rail, Ft1 footer; khác Catalogue/Almanac của sản phẩm. Phục vụ người kiểm thử, ưu tiên thiết lập và số đo thực, không dùng hero quảng cáo hoặc số liệu mẫu. Font Space Grotesk và Be Vietnam Pro hỗ trợ tiếng Việt, đóng gói local. Token nằm ở `tests/dashboard/src/tokens.css`.

Đã xem screenshot desktop 1280 và mobile 375; tự đánh giá P4/H4/E4/S5/R5/V4. Chrome kiểm tra overflow ở 320/375/414/768/1280 và phản hồi nút thật. Không tự tuyên bố đã chạy kiểm định accessibility đầy đủ hoặc mọi trình duyệt. Không ghi 58/58 tự động nếu chưa có bộ máy xác minh toàn bộ các gate.

## Kiểm tra thực sự đã chạy

| Kiểm tra | Kết quả |
| --- | --- |
| Unit test harness | 26 đạt, Python host 3.14.7; gồm bảng ứng dụng bị chặn, command/URL/path injection, type/range, metric, orphan/duplicate/counter, readiness v2, secret chỉ qua stdin, Host/Origin, một controller/cổng và phục hồi report gián đoạn |
| `k6 inspect tests/load/scenarios.js` | Đạt trên k6 2.3.0; đọc được script/options, chưa gọi API trong bước inspect |
| Dashboard build/lint | Đạt, không lỗi hoặc cảnh báo ở lint dashboard; React/DOM 19.3.0, TypeScript 6.0.3, Vite 8.3.5, Lucide 1.54.0, font 5.3.0 |
| SAM build riêng | Đạt, Python 3.13 tại worktree test, không dùng artifact workspace main |
| SAM validate/lint | Template hợp lệ |
| Health thật | 200, bảng `fcaj-event-workshop-local-test-68cf238da2414bfd` ready |
| Public k6 nhỏ qua SAM | Có các lượt hoàn tất thật, số đo và runId bên dưới; chỉ đọc danh sách trống, chưa kiểm tra tải detail trên event do User tạo |
| Purchase khi v2 | Bị chặn `WAITING_FOR_V3`, 0 request đo, P95/throughput null; không có kết quả mua đạt giả |
| Browser thật | Chrome headless: start, live chart, stop sau khi có request, lịch sử, reload, preset v3 bị chặn; lỗi mạng được inject riêng rồi phục hồi; widths 320/375/414/768/1280; 0 uncaught JS errors |
| Read-only DB sau test | Bảng test vẫn 0 item, không có trang Scan tiếp; các lượt đọc và blocked không tạo User/vé |

Ví dụ run thật được giữ ở `tests/results/`:

| RunId | Nội dung | Kết quả |
| --- | --- | --- |
| `f2631500c76442c0b6744c7a` | Public ramp nhỏ qua UI | 8 request đọc thành công; P95 1861.78 ms; 0.98 req/s; passed |
| `9d9895969e514379a6707047` | Chạy lại public trên phiên bản runner đã sửa | 8/8 request đọc; P95 1843.72 ms; 0.98 req/s; passed |
| `cff7d31d3b0f4dc3a38be493` | Preset 100 tranh 10 vé trên v2 | blocked, WAITING_FOR_V3; 0 request đo; không có vé mới |
| `6e282f9e181a4b85a9bba71b` | Dừng qua UI sau khi có request thật | 1 request đã đo; stopped/incomplete, không kết luận đạt |
| `67d917b8a7e0454aa0266dc5` | CLI qua cùng runner, public nhỏ | 2/2 request; P95 1054.11 ms; 1.29 req/s; passed |

Số đo trên chỉ là mẫu rất nhỏ trên SAM/Docker/OneDrive của máy local, không phải SLA, tải tối đa, so sánh sản phẩm hoặc bằng chứng autoscaling AWS. Lỗi mạng trong browser được mô phỏng có nhãn riêng, không viết thành DB/Backend đã ngừng thật trong đợt này.

## Các lỗi môi trường đã gặp và xử lý

- npm metadata cache cũ báo thiếu version dù registry có version: dùng metadata online để cài, không force peer dependency; package-lock riêng được tạo và build đạt.
- PowerShell nhận checksum download ở dạng byte-array: giải mã UTF-8 trước đối chiếu; chỉ chạy binary sau SHA256 khớp.
- Python console Windows cp1252 không in được banner tiếng Việt: đổi banner terminal sang ASCII, JSON/file/UI vẫn UTF-8.
- Sandbox chặn temp/spawn/Docker: kiểm tra thực tế ngoài sandbox theo quyền công cụ. Unit test lỗi quyền trong lượt đầu không được ghi là code đã đạt; lượt chạy lại thành công mới được ghi kết quả.
- Docker Desktop lúc bắt đầu đang tắt: đã khởi động nền và dùng lại Compose/network/volume hiện có, không tạo stack DB trùng hoặc xóa volume.

## Giới hạn và việc chờ tích hợp

1. Chưa chạy 100 người mua 200 vé hoặc 100 người tranh 10/1; chưa có API User/vé v3 thật để nghiệm thu. Kịch bản, fixture và audit đã chuẩn bị theo draft, chưa được chứng minh tương thích end-to-end với bản ứng dụng mới.
2. Chưa chứng minh salesOpenAt/transaction/idempotency/ownership bằng DB thật của v3. Các unit test audit dùng item giả để phát hiện sai lệch, không thay cho integration test ứng dụng.
3. Bài public hiện chạy trên bảng trống; luồng detail cần test tiếp khi có event v3 được tạo đúng fixture. Không seed mẫu vào bảng ứng dụng để làm đầy biểu đồ.
4. Ramp purchase hữu hạn: tối đa 100 User, một ý định mới/User/event; pool dùng hết thì phần hold còn lại có thể không còn POST. Đo sustained write lâu hơn cần bổ sung chiến lược danh tính/sự kiện đã thống nhất, không giả duplicate thành mua mới.
5. Test bổ trợ hiện là replay tuần tự sau tải, đổi body cùng key, duplicate, owner detail/me/cross-account. Chưa có proxy mô phỏng chính xác mất response sau commit, race replay mới song song hoặc ranh giới giờ mở bán chính xác.
6. Dừng process không hủy chắc chắn request phía server. Run stop luôn incomplete; purchase audit sau stop/lỗi engine là inconclusive, không biến snapshot tạm thời thành kết luận toàn vẹn cuối cùng.
7. Chưa chạy cleanup; giữ bảng/env/report để xem lại. Chưa kiểm tra Firefox/Safari/screen reader hoặc AWS.

## Gửi bên ứng dụng

- Bàn giao commit v3 và canonical contract đã duyệt; health trả apiContractVersion/serverTime thực.
- Register/login/session/logout User, cookie riêng, CSRF/Origin và policy 100 signup/login ngoài khoảng đo; không tắt auth/giả source IP.
- Admin event có salesOpenAt; GET event/status not_open và điều kiện thời gian/sức chứa tại transaction.
- POST đặt vé theo session, key UUID, 201/200 replay/header, 409 khác body hoặc key mới trùng nghiệp vụ. GET owner-only, GET me, legacy giữ nguyên/không tự nhận theo email.
- Xác nhận factory admin để fixture dùng lại; xác nhận mapping Ticket/User reference/idempotency cho audit. Adapter JSON là nơi phía test sẽ cập nhật khi nhận schema chính thức, không tự đổi canonical docs.
- Khi ready, bên test chạy 1–2 User trước, rồi lần lượt 100/200, 100/10 và 100/1 trên bảng/env mới. Bàn giao lỗi bằng runId, API status/code và số liệu đã lọc.

## Cách mở/chạy lại

Hướng dẫn đầy đủ theo terminal và trách nhiệm từng file ở `tests/runner/README.md` trong worktree test. Địa chỉ dashboard: **http://127.0.0.1:5174/**; runner **http://127.0.0.1:3100**; API test **3002**, DB **8000**.

Quick start công cụ sau khi API test đúng bảng đã chạy:

```powershell
cd "N:\OneDrive\UIT\TTDN\fcaj-workshop\FCAJ-23521254-23521225\.worktrees\test-lab"
python -B tests/runner/server.py
```

Terminal khác:

```powershell
cd "N:\OneDrive\UIT\TTDN\fcaj-workshop\FCAJ-23521254-23521225\.worktrees\test-lab\tests\dashboard"
npm run dev
```

Report hiện có có thể xem lại mà không cần API test online. Muốn bắt đầu run mới phải khởi động API/bảng test đúng nguồn theo README. Dừng SAM test riêng trước khi bàn giao cổng 3002 cho bản buyer mới; không tự dừng DB/cổng 3001 của bên ứng dụng.

Nguồn kỹ thuật đã đối chiếu: Grafana k6 cookies, JSON output, per-VU iterations, ramping VUs và release/checksum chính thức; link trực tiếp nằm trong README test. Không sử dụng tài liệu nháp hoặc câu trả lời AI cũ như bằng chứng endpoint đã hoạt động.

## Trạng thái lúc bàn giao

- Đã dừng SAM test 3002 và Chrome headless profile riêng; cổng 3002 được nhường để bên ứng dụng bàn giao API buyer đúng nguồn. Không dừng hoặc sửa cổng 3001 của bên ứng dụng.
- Giữ runner 3100 và dashboard 5174 chạy để người dùng quay lại xem lịch sử thật ngay. DynamoDB 8000/volume dùng chung được giữ; không xóa bảng test hoặc dữ liệu ứng dụng.
- Muốn chạy thêm, khởi động SAM test đúng env/source theo README. Khi đổi sang buyer-worktree, mở lại runner với `--app-root` đúng nguồn để manifest không ghi nhầm commit ứng dụng.
- Kiểm tra cuối: build/lint dashboard đạt; 26 unit test đạt; preflight process exit 2 đúng trạng thái WAITING_FOR_V3; 32 file nguồn mới được kiểm tra UTF-8/cú pháp/JSON/whitespace và 7 report được kiểm tra không có trường password/cookie/csrfToken.
- Bản nhật ký này được chép nguyên nội dung vào `quan-worklog/week-4/23-10-test-lab.md` của workspace chính theo yêu cầu người dùng, để bên ứng dụng và người dùng đọc được mà không phải tìm trong folder worktree ẩn. Chỉ thêm file nhật ký mới, không ghi đè nhật ký 23-10.md của bên kia.


## T?ch h?p b?n ?ng d?ng v3 tr??c khi push

### Ngu?n v? m?i tr??ng ?? x?c minh

- Ng??i d?ng ?? fetch v? t?o `.worktrees/buyer-app`, detached HEAD t?i `a6ba0f21e41cc73cfadb3242ff9bd9d30e2f234a`. Source ?ng d?ng s?ch; kh?ng s?a backend/frontend/contract ho?c test c?a b?n ?ng d?ng.
- ??c canonical contract 3.0, data model, code auth/booking/repository/factory v? Compose/SAM c?a ??ng commit. B?n d? ki?n kh?ng c?n l? ngu?n contract ch?nh.
- Ng??i d?ng build v? ch?y SAM 3002 v?i b?ng ri?ng `fcaj-event-workshop-local-test-70188853a21c`. Ki?m tra HTTP th?t: health ok, database ready, version 3.0, c? serverTime; Scan tr??c fixture c? 0 item. Kh?ng seed, reset ho?c ghi v?o b?ng ?ng d?ng.
- D?ng runner c? do b?n test m? qua ??ng exec session; ch?y l?i `python -B tests/runner/server.py --app-root ../buyer-app --api-url http://127.0.0.1:3002`. Dashboard 5174 v? DynamoDB 8000 ???c gi? nguy?n; SAM c?a ng??i d?ng ???c gi? ch?y.

### File thay ??i trong ph?n ki?m th?

- `tests/load/contract-v3-draft.json`: gi? t?n file cho t??ng th?ch, c?p nh?t id `buyer-v3-a6ba0f2`, tr?ng th?i reviewed, SHA v? ngu?n canonical contract. UUID key, cookie, CSRF, session v? c?c path ?? ph? h?p code th?t.
- `tests/load/audit.py`: ??i chi?u snapshot l?ng trong `registration` v?i ?? b?y tr??ng Ticket, g?n ??ng User/key v?i owner c?a Ticket. Kh?ng ch? so t?p registrationId, kh?ng gi? ??nh eventId n?m c?p ngo?i.
- `tests/runner/test_lab.py`: b? sung regression cho snapshot sai/m?t tr??ng ho?c key thu?c User kh?c; fixture unit m? ph?ng ??ng model ?? b?n giao.
- `tests/dashboard/check-browser.mjs`: kh?ng b?m ch?y preset 100 ng??i ?? ki?m tra blocked nh? v2, v? tr?n v3 ?? l? t?i th?t. Ch? ki?m tra l?a ch?n preset, ch?y/d?ng public nh? v? l?y ??ng run m?i; ch? UI polling c?p nh?t tr??c khi thao t?c ti?p.
- `tests/dashboard/src/App.tsx`: th?m name cho input s? ?? browser test ch?n ??ng tr??ng, b? nh?n draft m?c ??nh khi ch?a c? l??t ch?y. Gi? thi?t k? hi?n c?.
- `tests/runner/README.md`: c?ch build/ch?y ??ng source buyer-app, preflight v3, tr?ng th?i k?t qu? nh?, gi?i h?n 100 User v? h??ng d?n browser c?p nh?t.

### Ki?m tra ?? ch?y th?t

- Unit Test Lab: 28/28 ??t, g?m hai regression m?i cho audit. Dashboard TypeScript/Vite build v? lint ??t sau thay ??i cu?i c?a UI.
- Run `b7153b3305494121a9fdcfa6`: 2 User / 4 ch?; 2 GET th?nh c?ng, 2 POST t?o v?, 0 retry/l?i k? thu?t, c?n 2 ch?. Audit: 2 Ticket, 2 reference, 2 idempotency, t?t c? ?i?u ki?n kh?p. P95 POST 2205.37 ms ch? l? m?u nh? tr?n m?y local.
- Run `fb38b4b3a867424caeb7cca4`: 2 User / 1 ch?; 2 GET th?nh c?ng, 1 POST t?o v?, 1 EVENT_FULL, 0 retry/l?i k? thu?t, c?n 0 ch?. Audit: 1 Ticket, 1 reference, 1 idempotency; kh?ng c? ghi d? ho?c gh? ?m trong snapshot sau run. P95 POST 2045.03 ms, kh?ng ph?i cam k?t hi?u n?ng.
- C? hai run: ki?m tra ngo?i kho?ng ?o ??t cho owner GET/me, replay c?ng key, ??i n?i dung c?ng key, key m?i c?ng User/event v? User kh?c ??c v? tr? 404. B?i tranh m?t ch? x?c nh?n replay v?n tr? ??ng v? sau khi event full. M?i User ???c register/login qua API th?t, cookie jar v? CSRF ri?ng; kh?ng ghi session gi? ho?c t?t rate limit.
- Hai run ghi appCommit ??ng SHA b?n giao, appDirty=false, observedContractVersion=3.0 v? hash adapter. D?ng chung b?ng test nh? nh?ng event/User/key ri?ng t?ng run; ch?a ch?y batch 100 User tr?n b?ng n?y.

### Gi?i h?n v? Git

- Ch?a ch?y 100/200, 100/10, 100/1 ho?c benchmark purchase ramp. Ch?a t? m? ph?ng proxy m?t response sau commit, replay m?i song song ho?c ranh gi?i gi? m? b?n ch?nh x?c; b?ng ch?ng b?n ?ng d?ng kh?ng ???c t?nh l? test b?n n?y ?? ch?y.
- Ch?a ki?m tra UI s?n ph?m buyer trong l??t n?y. Kh?ng tri?n khai AWS; k?t qu? local kh?ng ch?ng minh autoscaling.
- B?ng do tool `backend/tools/new_test_environment.py` c?a ?ng d?ng chu?n b?, kh?ng c? manifest s? h?u c?a lab; kh?ng d?ng cleanup c?a lab ?? x?a b?ng n?y. Gi? env/report/d? li?u test ?? xem l?i.
- Source ?ng d?ng v? s?u thay ??i c? s?n tr?n main ???c b?o to?n. Ch? s?a ph?n test v? nh?t k? n?y. Ch?a stage, commit, push ho?c merge.

### Browser v? ki?m tra cu?i c?a m?c t?ch h?p

- Browser smoke phi?n b?n m?i ??t: public run `f491317026ad46efa3f6ca21`, stop run `8f8eada6f1ff447a913858a9` c? request th?t v? k?t lu?n incomplete. Ki?m tra preset ch? thay l?a ch?n, kh?ng g?i purchase 100 User; l?ch s?/reload, l?i m?ng browser m? ph?ng r?i ph?c h?i ??t; responsive 320/375/414/768/1280 kh?ng tr?n ngang ho?c tr?n ch? n?t, 0 uncaught exception.
- L??t browser ??u g?p l?i script b?m preset tr??c khi UI c?p nh?t polling. ?? th?m ch? tr?ng th?i n?t v? ch?y l?i ??t; kh?ng ghi l?i ??ng b? c?a test th?nh l?i nghi?p v? ?ng d?ng.
- Browser ? l??t n?y l? dashboard Test Lab; kh?ng tuy?n b? ?? test l?i giao di?n s?n ph?m. Chrome headless/profile test ri?ng ???c ??ng sau ki?m tra; runner 3100, dashboard 5174, SAM c?a ng??i d?ng v? DB ???c gi? nguy?n.
