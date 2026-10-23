# Event Test Lab — local

Phần kiểm thử tách khỏi giao diện người mua/Admin. Mã này nằm trên `feat/test-lab`, worktree `.worktrees/test-lab`, xuất phát từ `f4e20b9`. Không sửa `backend/`, `frontend/`, contract chính thức hoặc các test ứng dụng hiện có.

## Trạng thái thật

- Commit nền của worktree test vẫn là v2. Bản ứng dụng v3 bàn giao là `a6ba0f21e41cc73cfadb3242ff9bd9d30e2f234a` trên `feat/buyer-flow`, được lấy vào worktree riêng `../buyer-app`. Không chạy purchase bằng backend của worktree test.
- Adapter đã được đối chiếu với `docs/api-contract.md`, `docs/data-model.md` và code của bản bàn giao. Tên file `tests/load/contract-v3-draft.json` được giữ để không làm gãy đường dẫn cũ; nội dung có commit nguồn, trạng thái reviewed và id `buyer-v3-a6ba0f2`. Đây là cấu hình client test; canonical contract nằm ở ứng dụng.
- Đã chạy thật bài 2 User / 4 chỗ trên v3: 2 vé mới, còn 2 chỗ; replay, key đổi nội dung, duplicate, owner/cross-account và audit DB đạt. Run `b7153b3305494121a9fdcfa6`. Không suy rộng kết quả nhỏ thành bài 100 User đạt.
- Bài 2 User / 1 chỗ cũng đạt: 1 vé mới, 1 `EVENT_FULL`, còn 0 chỗ, audit và replay sau full đạt. Run `fb38b4b3a867424caeb7cca4`.
- Vẫn hỗ trợ public trên v2. Purchase gặp v2 trả `blocked / WAITING_FOR_V3` trước khi tạo User/sự kiện.
- Ba nhóm chính: `hot` (đủ vé), `ramp` (tăng/giữ/giảm, chọn public hoặc purchase), `scarce` (tranh vé). Preset 100/200, 100/10 và 100/1 là cấu hình, chưa phải kết quả đạt.
- Kết quả local không chứng minh AWS autoscaling. k6 script tách khỏi runner để tái sử dụng về sau; runner hiện chủ động chỉ cho loopback. Chạy AWS cần review cấu hình/allowlist, dữ liệu, credentials và observability riêng.

## Thành phần và cách đọc code

1. `tests/load/config.py`: tham số hợp lệ, giới hạn, URL và guard bảng test.
2. `tests/load/contract-v3-draft.json`: path/header/cookie/data model đã đối chiếu với commit ứng dụng nêu trên.
3. `tests/load/client.py`: HTTP thật, cookie jar riêng, không redirect/proxy và không ghi response nhạy cảm.
4. `tests/load/fixtures.py`: health → kiểm tra v3 → tạo admin bằng factory của ứng dụng → User register/login thật → tạo sự kiện qua API Admin. Không tự ghi User/session giả.
5. `tests/load/scenarios.js`: k6 đọc hoặc đặt vé, một User/session riêng, retry giữ cùng key, metric phân loại.
6. `tests/load/metrics.py`, `audit.py`, `supplemental.py`: tổng hợp điểm đo; đọc DB theo event/User/key của run; kiểm tra replay, đổi nội dung cùng key, duplicate, owner-only.
7. `tests/runner/engine.py`: chuẩn bị → chạy k6 → đối chiếu → kết luận; stop, watchdog và lưu lịch sử.
8. `tests/runner/server.py`: HTTP local có Host/Origin guard. CLI và dashboard dùng cùng controller này, không mở hai engine k6 độc lập.
9. `tests/dashboard/src/App.tsx`: giao diện thật; không giữ secret của User và không chạy k6 trong browser.

Code project nằm trong các file trên. Vite/React/TypeScript/Lucide/font và k6 là dependency. Không chạy scaffold; package dashboard được tạo tối thiểu và có lock riêng.

## Chuẩn bị

Tất cả lệnh bên dưới chạy từ **worktree test**, không từ root main:

```powershell
cd "N:\OneDrive\UIT\TTDN\fcaj-workshop\FCAJ-23521254-23521225\.worktrees\test-lab"
$env:PYTHONDONTWRITEBYTECODE='1'
$env:APP_SOURCE_ROOT = (Resolve-Path ../buyer-app).Path
```

Cần Docker Desktop/Linux engine, SAM CLI, Python 3.11+ trên host, Node/npm. SDK boto3 lấy từ SAM build của đúng `APP_SOURCE_ROOT`; không cần dùng venv hỏng của workspace chính. Khi bàn giao API buyer, dùng worktree ứng dụng đã thống nhất hoặc tích hợp commit của họ theo quy trình nhóm; không tự lấy artifact của workspace khác mà không ghi nguồn.

k6 portable (chỉ lần đầu):

```powershell
.\tests\runner\install-k6.ps1
```

Script tải release chính thức `grafana/k6`, kiểm tra SHA256 rồi đặt binary tại `tests/runner/.tools/k6.exe` (gitignore). Có thể pin release bằng `-Version v2.3.0`, hoặc dùng k6 đã cài và đặt `K6_BIN` khi mở runner. Lượt triển khai này đã kiểm tra k6 2.3.0.

## Terminal 1 — DB, build đúng nguồn, tạo môi trường mới, SAM test

Chạy từng bước; nếu bước trước lỗi thì dừng, không chạy tiếp. Nếu DB đang do bên ứng dụng quản lý, chỉ dùng lại container/network hiện có; không bật hai stack khác tên hoặc xóa volume.

```powershell
$env:SAM_CLI_TELEMETRY='0'
$env:AWS_ACCESS_KEY_ID='local'
$env:AWS_SECRET_ACCESS_KEY='local'
$env:AWS_DEFAULT_REGION='us-east-1'
$env:AWS_EC2_METADATA_DISABLED='true'

Push-Location $env:APP_SOURCE_ROOT
docker compose -f backend/compose.yaml up -d dynamodb
sam build --use-container --template-file backend/template.yaml
Pop-Location
$lab = python -B tests/load/lab.py environment | ConvertFrom-Json
$lab
sam local start-api --template "$env:APP_SOURCE_ROOT/.aws-sam/build/template.yaml" --env-vars $lab.envFile --docker-network fcaj-event-workshop-local --host 127.0.0.1 --port 3002 --warm-containers LAZY
```

`environment` tạo bảng trống mới, không seed/reset bảng ứng dụng. Env/manifest lưu dưới `tests/results/environments/` và gitignore. Bảng tên `fcaj-event-workshop-local-test-<random>`. Log request/Lambda ở terminal SAM. Nếu build lỗi, dừng và sửa trước khi chạy tiếp. Không dùng build v2 cho bài purchase.

Nếu dùng source khác: `python -B tests/load/lab.py --app-root <buyer-worktree> environment`, build/start SAM từ chính buyer-worktree đó, và đặt `APP_SOURCE_ROOT=<buyer-worktree>` ở terminal runner. Factory đọc từ `backend/lambda`, SDK đọc từ `.aws-sam/build/EventsFunction` trong source ấy. Record có app commit/dirty và hash adapter; dirty có thể bao gồm file lab chưa commit.

## Terminal 2 — runner

```powershell
python -B tests/runner/server.py --app-root ../buyer-app
```

Mặc định API test `127.0.0.1:3002`, DB host `127.0.0.1:8000`, Origin ứng dụng `http://127.0.0.1:5173`. Có thể cấu hình lúc mở runner bằng `--api-url`, `--app-root`, `--k6`, hoặc env `API_TEST_URL`, `APP_SOURCE_ROOT`, `K6_BIN`, `DYNAMODB_ENDPOINT`, `LAB_RESULTS_DIR`.

Runner chỉ bind `127.0.0.1:3100`, không cho browser sửa URL, table, executable, file path hay shell command. POST cần JSON, Origin trong allowlist và Host đúng. Không có CORS wildcard, không nhận quyền Admin từ dashboard. Không bật rate limit bypass hoặc giả source IP.

## Terminal 3 — dashboard

```powershell
cd tests/dashboard
npm ci
npm run dev
```

Mở **http://127.0.0.1:5174/**. Chọn bài nhỏ 1–2 User trước. Dashboard `/runner` → proxy đến 3100; không thêm Origin 5174 vào bảo mật của ứng dụng. Kết quả không có điểm đo dùng `—`, không tạo mẫu P95/throughput. JSON tải xuống từ chính report đã lọc, không phải dữ liệu demo.

Build/lint riêng: `npm run build`, `npm run lint`. Package dùng React 19.3.0, TypeScript 6.0.3, Vite 8.3.5, Lucide 1.54.0 và font local 5.3.0; không thay package sản phẩm.

## Chạy bằng CLI qua cùng runner

Sau khi runner đã chạy, tại worktree root:

```powershell
python -B tests/load/lab.py preflight
python -B tests/load/lab.py run --scenario ramp --mode public --users 1 --ramp-up 1 --hold 2 --ramp-down 1 --max-requests 4 --timeout 10
```

Preflight trên đúng API v3/bảng test trả `ready: true`, version `3.0`. Nếu trỏ v2 sẽ trả `WAITING_FOR_V3`, exit 2; đó là trạng thái chờ, không phải v3 đạt. CLI run không cần preflight v3 để chạy public.

Chạy nhỏ trước, sau đó mới tăng. Mỗi lệnh cần runner đã khởi động với đúng `--app-root`:

```powershell
python -B tests/load/lab.py run --scenario hot --users 2 --capacity 4 --max-requests 10 --timeout 45 --sales-lead 15
python -B tests/load/lab.py run --scenario scarce --users 2 --capacity 1 --max-requests 10 --timeout 45 --sales-lead 15
python -B tests/load/lab.py run --scenario hot --users 100 --capacity 200 --max-requests 400
python -B tests/load/lab.py run --scenario scarce --users 100 --capacity 10 --max-requests 400
python -B tests/load/lab.py run --scenario scarce --users 100 --capacity 1 --max-requests 400
python -B tests/load/lab.py run --scenario ramp --mode purchase --users 10 --capacity 20 --ramp-up 5 --hold 10 --ramp-down 5 --max-requests 40
```

Hai lệnh 2 User đã chạy đạt; các bài 100 User chưa được xác nhận. Nên tạo bảng/env mới và restart SAM cho mỗi bài 100 User để không lẫn fixture hoặc tiêu hết cửa sổ rate limit từ lượt trước; không reset counter để vượt policy.

CLI exit: 0=đạt, 2=chờ tích hợp, 1=thất bại/chưa kết luận. Ctrl+C của CLI yêu cầu runner dừng run, không tự kill process không thuộc nó. Dashboard cũng có nút Dừng. Nếu mất kết nối CLI, đọc lại lịch sử runner trước khi chạy thêm.

## Ý nghĩa và giới hạn số đo

- `hot/scarce` dùng per-VU-iterations: mỗi User một GET xem và một ý định POST mua. Mỗi retry giữ cùng key, tối đa 2; mặc định 0. User đã login trước khoảng đo.
- `ramp/public` dùng ramping-vus, GET list/detail luân phiên khi có event, còn bảng trống chỉ GET list. Có trần request toàn cục; hết trần thì VU đợi tới cuối lịch, không tiếp tục gửi.
- `ramp/purchase` dùng pool tối đa 100 tài khoản, một ý định mua/User. Không tạo 100 lượt duplicate để giả tải ghi thành công. Khi pool đã dùng hết, phần hold còn lại có thể không còn POST mới. Muốn đo tải ghi bền vững lâu hơn phải bàn giao thêm danh tính/sự kiện và chiến lược pool; chưa coi bài hiện tại là sustained-write benchmark.
- 1–100 User; ramp mỗi đoạn 1–60 giây; tối đa 5.000 request đo; timeout request 1–75 giây; watchdog k6 360 giây; tổng điều phối HTTP 900 giây. Chuẩn bị và kiểm tra bổ trợ có số request riêng, không nằm trong trần request đo hoặc P95 tải. Audit tối đa 100.000 item và có deadline.
- P95 dùng nội suy tuyến tính từ điểm `lab_latency`; timeout vẫn có latency riêng. P95 tổng và P95 POST được lưu riêng. Thông lượng lấy số request / khoảng điểm đầu–cuối (ít nhất 1 giây), không phải mức tải cam kết.
- Các loại timeout, busy, 429, quyền, 5xx, lỗi khác được giữ riêng; lỗi đầu không biến mất sau replay/retry. 201 vé mới khác 200 replay. Kết quả burst chỉ đạt khi đúng số vé mong đợi, không có lỗi kỹ thuật và DB khớp.
- Dừng k6 không đảm bảo request server bị hủy. Run dừng luôn `incomplete`; audit purchase sau dừng là `inconclusive`, dù hai snapshot quan sát được bằng nhau. Lỗi engine sau khi gửi mua cũng cố đối chiếu nhưng không tự kết luận đạt.
- Phiên/cookie/CSRF/mật khẩu ở bộ nhớ và stdin k6, không ở argv, VITE env hoặc report. stderr k6 không được xuất ra dashboard vì có thể chứa source/config. Raw output chỉ dùng system tags không có URL/header và được gitignore.

## API runner

| API | Tác dụng |
| --- | --- |
| GET `/meta` | Cấu hình công khai, trạng thái adapter |
| GET `/runs` | Lịch sử đã lọc |
| GET `/runs/<runId>` | Số đo, trạng thái, đối chiếu, lỗi |
| POST `/runs` | Chỉ nhận tham số allowlist, trả 202 |
| POST `/runs/<runId>/stop` body `{}` | Yêu cầu dừng |

Browser dùng prefix `/runner` qua Vite. CLI dùng trực tiếp 3100 với Origin local. Không có API xóa bảng hoặc chạy lệnh tùy ý từ browser.

## Kiểm tra công cụ

```powershell
python -B -m unittest discover -s tests/runner -p test_lab.py -v
.\tests\runner\.tools\k6.exe inspect tests/load/scenarios.js
```

Unit test dùng HTTP/DB giả lập chỉ kiểm tra harness, không là bằng chứng ứng dụng chịu tải. Các lượt k6 qua SAM và browser thật được ghi bằng runId trong `quan-worklog/week-4/23-10-test-lab.md`.

Browser check: mở Chrome/Edge headless với profile riêng dưới `tests/results/`, remote-debugging-port 9242 (hoặc env `LAB_CHROME_PORT`), rồi chạy `node tests/dashboard/check-browser.mjs`. Script bắt đầu/dừng run public qua UI, kiểm tra lựa chọn preset 100 người nhưng KHÔNG bấm chạy purchase, đọc lịch sử/reload và responsive 320/375/414/768/1280. Lỗi mạng được cố ý chặn trong browser rồi gỡ, ghi nhãn injected, không coi là Backend downtime. Script cũ kiểm tra blocked trên v2 đã được thay vì nay API v3 có thể thực sự tạo 100 tài khoản. Không dùng profile trình duyệt sản phẩm.

## Dữ liệu và dừng dịch vụ

Report tại `tests/results/<runId>/report.json`; metric raw `metrics.ndjson`; mọi kết quả/profile/browser ảnh đều gitignore. Mỗi report ghi runId, config, app commit/dirty, adapter/hash, table/event, metric và kết luận. Xem log app ở SAM, trạng thái test qua report/dashboard, Vite ở terminal dashboard.

Ctrl+C ở dashboard, runner và SAM test khi xong. Không dừng Compose/DB đang được bên ứng dụng dùng và không xóa Docker volume.

Cleanup là thao tác CLI riêng, chỉ cho bảng do `environment` tạo; không tự chạy sau test. Dừng runner trước, bảo đảm không có writer khác, giữ SAM health trỏ đúng test table, rồi nếu **chủ động muốn xóa bảng test đó**:

```powershell
python -B tests/load/lab.py cleanup-environment --manifest <manifest-cua-lab> --confirm <TEN-BANG-TEST-CHINH-XAC> --confirm-no-other-writers
```

Không dùng prefix wildcard, không xóa bảng ứng dụng. Cleanup chưa được chạy trong đợt bàn giao; bảng test được giữ để xem lại. Nếu report ghi gián đoạn, mở runner để ghi nhận trạng thái rồi kiểm tra DB trước khi dọn.

## Phối hợp sau bàn giao v3

1. Nguồn ứng dụng để tái hiện: `feat/buyer-flow` tại `a6ba0f21e41cc73cfadb3242ff9bd9d30e2f234a`. Worktree test không chứa code v3; bên nhận cần cả source ứng dụng và source Test Lab.
2. Fixture dùng factory admin của đúng ứng dụng, tạo/login User qua API thật. Cookie/CSRF/session riêng; key UUID v4; không tắt rate limit hoặc giả IP.
3. Audit đọc snapshot tại `registration` trong idempotency item, đối chiếu đủ trường vé và ràng buộc key/owner với từng session, không giả định `eventId` ở cấp ngoài.
4. Khi ứng dụng thay đổi, gửi commit/contract mới; cập nhật adapter và chạy lại các ca liên quan. Không sửa canonical contract từ phía test.
5. Chưa xác minh bài 100/200, 100/10, 100/1; race mở bán chính xác, replay mới song song và mất response sau commit bằng proxy. Các kết quả nhỏ chỉ là smoke, không là kết luận chịu tải/AWS.

## Nguồn kỹ thuật

- [k6 cookies](https://grafana.com/docs/k6/latest/using-k6/cookies/): jar riêng mỗi VU; nạp cookie theo tài khoản, không dùng jar setup chung.
- [k6 JSON output](https://grafana.com/docs/k6/latest/results-output/real-time/json/): đọc điểm đo thật theo thời gian.
- [per-VU iterations](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/per-vu-iterations/), [ramping VUs](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-vus/): hai executor dùng cho ba nhóm kịch bản.
- [Grafana k6 releases](https://github.com/grafana/k6/releases): binary portable và checksum. Tài liệu đã đối chiếu ngày 23/10/2026; lựa chọn adapter và threshold là của project, không phải kết quả benchmark của Grafana.
