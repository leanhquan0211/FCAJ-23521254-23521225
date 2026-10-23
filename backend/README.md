> Bản hiện hành trên phuc là API4.1: cookie chung event_session, login identifier/password, sai role403; admin xóa có dọn ghi danh,202 cần tiếp tục cùng version. [Contract](../docs/api-contract.md) và [nhật ký 23/10](../phuc-worklog/week-4/23-10.md). Mốc feat/buyer-flow@a6ba0f2 vẫn giữ API3.0; lấy code/tài liệu cùng commit. Nâng cấp cần đăng nhập lại, không reset bảng.

# Backend local — sự kiện và đăng ký

Backend dùng Lambda **Python 3.13**, API Gateway **HTTP API payload v2** do SAM giả lập, và **DynamoDB Local** trong Docker. API ứng dụng đã nâng lên [contract v4](../docs/api-contract.md): User/account, session chung hai role, đặt vé có key, owner-only và giờ mở bán. Payload v2 của Gateway là định dạng sự kiện Lambda, khác phiên bản contract ứng dụng v4. Mock chỉ để xem giao diện sự kiện.

## Kiến trúc và cấu hình

| Thành phần | Địa chỉ / cấu hình |
| --- | --- |
| SAM local API | `http://127.0.0.1:3001` |
| DynamoDB từ Windows host | `http://127.0.0.1:8000` |
| DynamoDB từ container Lambda/tools | `http://fcaj-dynamodb-local:8000` |
| Docker network | `fcaj-event-workshop-local` |
| Bảng | `fcaj-event-workshop-local` |
| Volume bền vững | `fcaj-event-workshop-dynamodb-data` |
| Frontend origin CORS | `http://localhost:5173`, `http://127.0.0.1:5173` |

`localhost` trong Lambda là chính container Lambda, vì vậy không dùng nó làm endpoint DB của Lambda. Compose chỉ publish DB trên loopback. Thư mục `lambda/` tách handler (`app.py`), logic (`service.py`), repository và cấu hình. Xem [mô hình dữ liệu](../docs/data-model.md) cho khóa bảng, seed và transaction đã triển khai.

`buyer_auth.py` xử lý tài khoản User, `session.py` giữ phiên chung, `event_deletion.py` dọn ghi danh, `booking.py` xử lý vé/replay, repository ghi DB. POST đặt vé lấy danh tính từ phiên; transaction giảm chỗ + reference User/event + Ticket + idempotency. Retry tối đa4 lượt khi xung đột, phân biệt503 busy với409 hết chỗ. GET kết quả và Vé của tôi chỉ cho chủ vé. Admin vẫn dùng `auth.py` và `admin_events.py`.

Dependency được khóa trong `lambda/requirements.txt`: **boto3 1.43.114**. `backend/requirements.txt` tham chiếu file này cho công cụ chạy trên host nếu cần. SAM build cài dependency vào `.aws-sam/build/EventsFunction`, không phụ thuộc boto3 hay Python 3.13 cài trên Windows.

Endpoint DB là bắt buộc và bị giới hạn vào hostname local. Boto3 dùng credentials giả `local`/`local` ngay trong client, region mặc định `us-east-1`; không dùng profile/metadata hay fallback tới AWS. `env.local.example.json` là cấu hình mẫu an toàn để chạy ngay. Có thể copy thành `backend/env.local.json` nếu cần cấu hình riêng (đã gitignore). Khi đổi origin phải cập nhật cả `CorsConfiguration` trong template và `ALLOWED_ORIGINS`, rồi build/restart SAM.

## Chạy từ thư mục gốc repository

Yêu cầu: Docker Desktop chạy **Linux containers**, Docker Compose, SAM CLI. Build/test Lambda dùng Python3.13 qua container, không dựa vào phiên bản Python hay venv trên Windows. Các script HTTP dùng boto3 trên host thì cần cài `backend/requirements.txt`. Dùng `docker version` và `sam --version` để kiểm tra môi trường hiện tại trước khi chạy; không suy phiên bản công cụ từ nhật ký cũ.

**Terminal 1 — PowerShell** (giữ terminal này chạy ở bước cuối):

```powershell
$env:SAM_CLI_TELEMETRY='0'
$env:AWS_ACCESS_KEY_ID='local'
$env:AWS_SECRET_ACCESS_KEY='local'
$env:AWS_DEFAULT_REGION='us-east-1'
$env:AWS_EC2_METADATA_DISABLED='true'

docker compose -f backend/compose.yaml up -d dynamodb
sam build --use-container --template-file backend/template.yaml
docker compose -f backend/compose.yaml run --rm tools backend/dynamodb_setup/init_db.py --endpoint-url http://fcaj-dynamodb-local:8000
sam local start-api --template .aws-sam/build/template.yaml --env-vars backend/env.local.example.json --docker-network fcaj-event-workshop-local --host 127.0.0.1 --port 3001 --warm-containers LAZY
```

**Terminal 1 — Git Bash**, dùng cùng lệnh Docker/SAM, thay phần biến môi trường bằng:

```bash
export SAM_CLI_TELEMETRY=0
export AWS_ACCESS_KEY_ID=local
export AWS_SECRET_ACCESS_KEY=local
export AWS_DEFAULT_REGION=us-east-1
export AWS_EC2_METADATA_DISABLED=true
```

Nếu Git Bash không tìm thấy `sam`, dùng `sam.cmd` thay cho `sam`. Tất cả đường dẫn của các lệnh trên là tương đối với repo root; Compose tự xử lý bind mount nên không cần chuyển đường dẫn Linux thủ công. Biến giả chỉ nằm trong terminal/process này; không ghi vào `~/.aws`. Có thể đóng terminal local khi xong để kết thúc phạm vi biến môi trường.

Build lần đầu cần tải image từ public ECR và dependency từ PyPI. Các lệnh chỉ build/chạy local; không chạy `sam deploy` hoặc `sam sync`.

**Terminal 2 — gọi API**, không cần giữ lệnh curl chạy:

```bash
curl.exe http://127.0.0.1:3001/health
curl.exe http://127.0.0.1:3001/events
# Sau khi admin tạo sự kiện, thay <eventId> bằng ID của sự kiện đó:
curl.exe "http://127.0.0.1:3001/events/<eventId>"
curl.exe -i http://127.0.0.1:3001/events/no-such-event
```

Frontend: trong terminal riêng ở repo root, copy `frontend/.env.example` thành `frontend/.env.local` nếu chưa có, giữ `VITE_DATA_MODE=api` và `VITE_API_BASE_URL=/api`, rồi chạy `cd frontend`, `npm ci` (nếu cần), `npm run dev`. Giữ cả terminal SAM và Vite chạy. Trên giao diện, chọn sự kiện còn chỗ và hoàn thành form; kết quả được lưu trong DynamoDB, không nằm trong localStorage. Đổi sang `VITE_DATA_MODE=mock` và restart Vite để phát triển UI không cần Backend.

PowerShell cũng có thể dùng `Invoke-RestMethod`. `curl.exe` dùng được trong cả PowerShell và Git Bash trên Windows. Health thành công chỉ khi bảng ACTIVE và Query đọc thử thành công. Xem [contract](../docs/api-contract.md) cho response/lỗi. API không trả stack trace cho client.

## Khởi tạo và kiểm tra dữ liệu

Lệnh `init_db.py` ở trên chỉ tạo bảng nếu chưa có; không tự thêm sự kiện mẫu và không xóa dữ liệu cũ. Database mới có danh sách sự kiện trống: tạo tài khoản admin rồi thêm sự kiện qua giao diện quản trị. Chạy lại lệnh khởi tạo vẫn giữ dữ liệu đã có. Hai số `created` và `preserved` chỉ đếm sự kiện mẫu được thêm hoặc bỏ qua; mặc định đều bằng 0.

Nếu chủ động cần dữ liệu demo, thêm `--seed-demo` (nên dùng bảng test riêng):

```bash
docker compose -f backend/compose.yaml run --rm tools backend/dynamodb_setup/init_db.py --endpoint-url http://fcaj-dynamodb-local:8000 --table-name fcaj-event-workshop-local-test-demo --seed-demo
```

Demo có tám sự kiện, gồm còn chỗ, hết chỗ và đã kết thúc. Số chỗ đã dùng là số giả lập, không có người đăng ký tương ứng, admin vẫn được xóa sự kiện demo; khi xóa không tạo thêm hay hoàn lại ghi danh giả. Ngày tính tương đối theo lần seed đầu ở múi giờ `+07:00`. Seed lại chỉ thêm ID còn thiếu, không ghi đè hoặc dời ngày bản ghi cũ. Chế độ mock của frontend vẫn giữ dữ liệu mẫu riêng, không phải dữ liệu trong database.

Đọc trạng thái bảng trực tiếp từ container tools:

```bash
docker compose -f backend/compose.yaml run --rm tools backend/check_db.py --endpoint-url http://fcaj-dynamodb-local:8000
```

Nếu chủ động dùng Python trên host với boto3 đã cài, lệnh tương đương là `python backend/check_db.py --endpoint-url http://127.0.0.1:8000`. Không bỏ `--endpoint-url`; thiếu endpoint sẽ dừng. Không có lệnh reset/xóa dữ liệu tự động.

## Kiểm thử

Nếu chạy Python trên host với `PYTHONPATH` trỏ vào `.aws-sam/build/EventsFunction`, đặt `$env:PYTHONDONTWRITEBYTECODE='1'` trước lệnh test để file cache không kích hoạt SAM warm watcher. Tool HTTP quản trị/người mua đã tự tắt ghi bytecode. Chờ `/health` báo đúng contract4.1 và bảng test rồi mới chạy smoke test.

Unit test dùng mock, không ghi DB/gọi AWS; chạy trong Python3.13 sau khi SAM build. Ba test integration được skip trong lệnh mặc định:

```bash
docker compose -f backend/compose.yaml run --rm tools -m unittest discover -s tests/backend -v
```

Smoke test chỉ GET/OPTIONS, dùng Python chuẩn trên Windows, cần SAM còn chạy:

```bash
python backend/tools/check_api.py --base-url http://127.0.0.1:3001
```

Script kiểm tra health, JSON/schema/số và timezone, danh sách/chi tiết, 404, validation, CORS và in fingerprint của danh sách để đối chiếu trước/sau seed hoặc restart. Chấp nhận danh sách trống; khi có sự kiện sẽ kiểm tra chi tiết bằng ID thật trong danh sách. Seed/restart là thao tác riêng có chủ đích; smoke test không thực hiện chúng.

Test ghi/tranh chỗ chỉ dùng bảng riêng. Từ repo root trong PowerShell, sau khi DB đã chạy và SAM đã build:

```powershell
$test = python backend/tools/new_test_environment.py | ConvertFrom-Json
docker compose -f backend/compose.yaml run --rm -e RUN_DYNAMODB_INTEGRATION=1 -e DYNAMODB_ENDPOINT=http://fcaj-dynamodb-local:8000 -e "DYNAMODB_TABLE=$($test.table)" tools -m unittest discover -s tests/backend -p test_registration_integration.py -v
```

Script tạo cấu hình test mới, không ghi đè file có sẵn. Integration test tạo bảng và fixture riêng; gửi transaction đồng thời rồi kiểm tra số chỗ và các item không bị dở dang. Cần tạo môi trường mới khi chạy lại; fixture có điều kiện không ghi đè. Bảng test được giữ lại, không tự xóa dữ liệu.

Trong terminal local có các biến SAM giả như phần chạy ở trên, khởi động API test bằng `sam local start-api --template .aws-sam/build/template.yaml --env-vars $test.envFile --docker-network fcaj-event-workshop-local --host 127.0.0.1 --port 3002 --warm-containers LAZY`. Terminal kiểm tra khác chạy:

```powershell
python backend/tools/check_registration_api.py --base-url http://127.0.0.1:3002
```

Smoke test ghi xác nhận `/health` trỏ bảng test và contract4.1, tự tạo admin fixture/User và session thật; thử owner, validation, lịch mở bán, replay sau full/closed, logout và8 request HTTP tranh chỗ cuối. Khi chạy trên host cần `python -m pip install -r backend/requirements.txt`; hoặc chạy tools container với `--endpoint-url http://fcaj-dynamodb-local:8000`. Khác `check_api.py` chỉ đọc.

Các kết quả lịch sử dưới đây được giữ để tham khảo; kết quả và phạm vi kiểm tra trong ngày nằm tại [nhật ký 23/10](../phuc-worklog/week-4/23-10.md).

| Kiểm tra | Kết quả |
| --- | --- |
| `sam build --use-container`, `sam validate --lint` | Đạt, runtime Python 3.13, dependency được đóng gói |
| 26 unit test | Đạt: các API đọc, validation đăng ký, chuẩn hóa email, UUID, response 201/Location, body v2, lỗi, transaction guard và retry |
| 2 integration test với DynamoDB Local | Đạt: 8 lượt tranh một chỗ chỉ có một người thành công, không có item dở dang; 6 lượt cùng email tạo đúng một đăng ký và giảm một chỗ |
| HTTP POST/GET đăng ký | Đạt: giảm một chỗ, đọc lại kết quả, email trùng khác hoa/thường, cùng email ở sự kiện khác, đầy/đóng/kết thúc, 400/404/415 và 6 request HTTP tranh chỗ cuối |
| Database ngừng chạy | Đạt: health, POST đăng ký và GET kết quả trả 503; đã bật DB lại sau kiểm tra |
| Frontend API mode trên Chrome headless | Đạt: luồng đăng ký/reload, trùng, lỗi API không fallback, loading, chặn sự kiện không mở, tìm kiếm/lọc; layout 320/375/414/768/1280 px |
| HTTP qua SAM → Lambda → DynamoDB Local | Đạt: health, danh sách 8 sự kiện, chi tiết, 404, ID/query sai, CORS GET/OPTIONS |
| Seed lần đầu / lần hai | `created=8,preserved=0` / `created=0,preserved=8`; fingerprint API không đổi |
| Giữ bản ghi đã chỉnh khi seed | Đạt trong unit test với bản ghi đã sửa số chỗ; không sửa dữ liệu DB thật để thử |
| Stop/start DB, không xóa volume | Đạt: health trả 503 khi DB dừng, API phục hồi sau start, fingerprint của 8 sự kiện giữ nguyên |
| Lần gọi Lambda đầu | Ban đầu timeout 15 giây; đã sửa cache client và timeout 60 giây, kiểm thử HTTP sau sửa đạt |

V4 đã có tài khoản User/ownership/idempotency. Chưa có email xác nhận/thanh toán/AWS. Frontend không tự retry POST trong nền; người dùng chủ động thử lại cùng key. Chưa kiểm tra Git Bash, Firefox/Safari hoặc nhiều thiết bị cho mốc mới.

Tham chiếu: [DynamoDB Local và Docker Compose](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html), [SAM HTTP API](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-httpapi.html).

## Dừng và xử lý lỗi

- Dừng SAM bằng **Ctrl+C tại Terminal 1**. Dừng DB bằng `docker compose -f backend/compose.yaml stop dynamodb`. Khởi động lại DB dùng `docker compose -f backend/compose.yaml up -d dynamodb`.
- Kiểm tra volume vẫn giữ dữ liệu: `docker compose -f backend/compose.yaml restart dynamodb`, sau khi DB sẵn sàng chạy lại health/smoke test. Không dùng `down -v` hoặc xóa volume.
- Docker pipe/permission lỗi: kiểm tra Docker Desktop và Linux engine đang chạy; môi trường agent có thể cần quyền truy cập Docker ngoài sandbox.
- Lỗi 503: kiểm tra container DB, network, bảng đã khởi tạo và endpoint trong env file. Thiếu endpoint không fallback sang AWS.
- Lỗi 502/timeout lúc gọi đầu: local bind mount trên Windows/OneDrive có thể tải model boto3 chậm. Đã đặt timeout local 60 giây và cache client cho container ấm. Giữ `--warm-containers LAZY`; sau khi sửa Python, build và restart SAM để dùng artifact mới.
- Port đã dùng: kiểm tra tiến trình đang nghe 3001/8000 trước khi đổi cổng; nếu đổi DB host port thì endpoint container vẫn dùng port 8000.

Bước tiếp theo: kiểm soát truy cập kết quả đăng ký và kiểm thử rộng hơn. Mốc local người đăng ký đã có luồng hai phía; không đồng nghĩa dự án hoặc phần triển khai AWS đã hoàn tất.

## Tạo tài khoản admin và dùng quản trị

Sau khi DynamoDB đã chạy, backend đã build và bảng ứng dụng đã được khởi tạo, mở terminal PowerShell tương tác tại repo root:

```powershell
docker compose -f backend/compose.yaml run --rm -it tools backend/tools/create_admin.py --endpoint-url http://fcaj-dynamodb-local:8000 --username phuc
```

Nhập mật khẩu 15–128 ký tự hai lần (terminal không hiện ký tự). Có thể thay `phuc` bằng tên đăng nhập 3–64 ký tự. Lệnh không ghi mật khẩu ra file/log và từ chối ghi đè tài khoản đã có. Không có tài khoản admin mặc định hoặc API tự đăng ký admin. Không cần tạo lại mỗi lần khởi động.

Chạy SAM như trên. Frontend dùng `VITE_DATA_MODE=api`, `VITE_API_BASE_URL=/api`, rồi `npm.cmd --prefix frontend run dev`. Truy cập `http://127.0.0.1:5173/`, chọn Quản trị viên và đăng nhập. Proxy `/api` của Vite chuyển đến SAM cổng 3001; không trộn localhost/127.0.0.1 giữa các địa chỉ khi dùng URL API tuyệt đối cũ.

Quản trị cho phép thêm/sửa tên, danh mục, thời gian (giờ Việt Nam), địa điểm, đơn vị tổ chức, sức chứa, giới thiệu, nội dung và mở/đóng đăng ký. Không giảm sức chứa xuống dưới số chỗ đã dùng. Admin xóa được sự kiện có người; vé/ghi danh của sự kiện bị dọn, tài khoản/vé khác được giữ. Nếu trả202, tiếp tục DELETE cùng version đến khi deleted=true.

Session chung trong cookie HttpOnly, hạn 8 giờ; thao tác ghi kiểm tra Origin và CSRF. Đăng xuất thu hồi session ở server. Chi tiết tại [contract](../docs/api-contract.md) và [bảo mật](../docs/security.md). API đọc sự kiện công khai; UI mặc định yêu cầu đăng nhập, đặt vé/xem vé cần User.

### Kiểm tra quản trị trên bảng riêng

Tạo bảng/API test theo mục kiểm thử phía trên. Khi SAM test đã chạy, có thể dùng Python host với PYTHONPATH gồm `backend/lambda` và `.aws-sam/build/EventsFunction` để chạy:

```powershell
python backend/tools/check_admin_api.py --base-url http://127.0.0.1:3002
```

Script kiểm tra health trỏ bảng test trước khi ghi, tạo admin với mật khẩu ngẫu nhiên chỉ trong bộ nhớ, rồi kiểm tra quyền, login/logout, cookie, CSRF và CRUD. Không tạo admin thật trong bảng ứng dụng. Các test bổ sung nằm tại `tests/backend/test_admin.py`.

Lịch sử mốc quản trị v2: 45 unit test đạt trên Python 3.13 container; hai integration test tranh chỗ/trùng email đạt trên DynamoDB Local (lượt integration chạy bằng Python host 3.11). SAM build và validate/lint đạt. HTTP admin đạt thêm/sửa/xóa, chống CSRF, giữ chỗ, chặn xóa có đăng ký, logout và hai lượt sửa cùng version chỉ một lượt thành công. Edge headless đã kiểm tra luồng quản trị và responsive 320/375/414/768/1280 px. Đây là bằng chứng cũ; v4 đã đổi quy tắc xóa, xem nhật ký 23/10 cho kết quả hiện hành.

Để kiểm tra UI, dùng browser profile riêng có remote-debugging port 9241, frontend proxy trỏ cùng API test, đặt `API_TEST_URL` theo cổng API rồi thêm `--browser`. Script truyền credentials test trực tiếp qua stdin cho `tests/frontend/check-admin-browser.mjs`, không ghi mật khẩu vào file.

### Giảm tài nguyên sau dùng thử

Ctrl+C ở SAM và Vite, rồi `docker compose -f backend/compose.yaml down` để gỡ container/network của dự án và giữ volume. Nếu muốn tiết kiệm đĩa hơn, sau khi không còn container SAM dùng image, có thể gỡ riêng image `public.ecr.aws/sam/build-python3.13:latest-x86_64` và các image Lambda Python 3.13 đã dùng. Lần build/chạy sau cần tải lại. Không dùng `docker system prune -a --volumes` vì ảnh hưởng dự án khác và dữ liệu.

Bài xóa/phiên chung opt-in: cùng RUN_DYNAMODB_INTEGRATION=1, bảng mới prefix test, chạy unittest discover để bao gồm test_unified_integration.py. File này chỉ dọn dữ liệu event fixture trong bảng test, không xóa bảng/volume. Không chạy lại fixture transaction vào cùng bảng đã có dữ liệu; tạo env test mới mỗi lượt.

## Bổ sung bàn giao API 4.1

Nhánh `phuc` thêm quản lý User và khóa tài khoản trong transaction đặt vé. Fixture mua vé cần profile User thật. Xem [contract hiện hành](../docs/api-contract.md) và [data model](../docs/data-model.md).

Chạy `python backend/tools/check_accounts_api.py --base-url http://127.0.0.1:3002` trên API test/bảng riêng; thêm `--browser` khi đã có Vite 5175 proxy 3002 và Edge CDP 9241. Không chạy các bài ghi dữ liệu trên bảng ứng dụng. Trên Windows, dừng SAM/container Lambda dùng artifact trước khi build lại để tránh lỗi file đang bị mount; giữ container DynamoDB hoạt động.
