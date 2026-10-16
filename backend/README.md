# Backend local — sự kiện và đăng ký

Backend dùng Lambda **Python 3.13**, API Gateway **HTTP API payload v2** do SAM giả lập, và **DynamoDB Local 3.3.1** trong Docker. Đã có năm API trong [contract](../docs/api-contract.md): health, danh sách/chi tiết sự kiện, tạo đăng ký và đọc kết quả. Frontend đã có HTTP adapter, đồng thời giữ chế độ mock độc lập.

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

POST đăng ký validate và chuẩn hóa email, kiểm tra sự kiện rồi dùng `TransactWriteItems` để giảm chỗ, tạo khóa chống trùng và tạo đăng ký cùng nhau. Các điều kiện về chỗ, mở đăng ký và thời gian được kiểm tra lại trong transaction. Khi transaction bị hủy, service đọc lại để phân loại lỗi và retry có giới hạn. GET kết quả chỉ trả trường contract; mã UUID v4 khó đoán nhưng endpoint local hiện chưa có đăng nhập/ủy quyền.

Dependency được khóa trong `lambda/requirements.txt`: **boto3 1.43.114**. `backend/requirements.txt` tham chiếu file này cho công cụ chạy trên host nếu cần. SAM build cài dependency vào `.aws-sam/build/EventsFunction`, không phụ thuộc boto3 hay Python 3.13 cài trên Windows.

Endpoint DB là bắt buộc và bị giới hạn vào hostname local. Boto3 dùng credentials giả `local`/`local` ngay trong client, region mặc định `us-east-1`; không dùng profile/metadata hay fallback tới AWS. `env.local.example.json` là cấu hình mẫu an toàn để chạy ngay. Có thể copy thành `backend/env.local.json` nếu cần cấu hình riêng (đã gitignore). Khi đổi origin phải cập nhật cả `CorsConfiguration` trong template và `ALLOWED_ORIGINS`, rồi build/restart SAM.

## Chạy từ thư mục gốc repository

Yêu cầu: Docker Desktop chạy **Linux containers**, Docker Compose, SAM CLI. Môi trường đã kiểm tra: Docker Desktop 4.95.0 / Engine 29.8.2, Compose 5.6.0, SAM CLI 1.167.0. Python Windows hiện là 3.14.7; runtime Lambda/build/test vẫn là 3.13 qua container. Venv cũ tại root đang thiếu `pyvenv.cfg`, không cần sử dụng nó cho các lệnh Docker/SAM dưới đây.

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
curl.exe http://127.0.0.1:3001/events/thiet-ke-de-dung
curl.exe -i http://127.0.0.1:3001/events/no-such-event
```

Frontend: trong terminal riêng ở repo root, copy `frontend/.env.example` thành `frontend/.env.local` nếu chưa có, giữ `VITE_DATA_MODE=api` và `VITE_API_BASE_URL=http://127.0.0.1:3001`, rồi chạy `cd frontend`, `npm ci` (nếu cần), `npm run dev`. Giữ cả terminal SAM và Vite chạy. Trên giao diện, chọn sự kiện còn chỗ và hoàn thành form; kết quả được lưu trong DynamoDB, không nằm trong localStorage. Đổi sang `VITE_DATA_MODE=mock` và restart Vite để phát triển UI không cần Backend.

PowerShell cũng có thể dùng `Invoke-RestMethod`. `curl.exe` dùng được trong cả PowerShell và Git Bash trên Windows. Health thành công chỉ khi bảng ACTIVE và Query đọc thử thành công. Xem [contract](../docs/api-contract.md) cho response/lỗi. API không trả stack trace cho client.

## Khởi tạo và kiểm tra dữ liệu

Seed giữ tám ID/nội dung/số chỗ từ Frontend. Ngày được tạo tương đối theo ngày seed đầu tiên ở múi giờ `+07:00`: có sự kiện tương lai còn chỗ, hết chỗ và quá khứ đã kết thúc. Chạy lại lệnh seed ở trên chỉ thêm ID còn thiếu, không ghi đè dữ liệu hoặc dời ngày của bản ghi đã tồn tại. Kết quả in số `created` và `preserved`.

Đọc trạng thái bảng trực tiếp từ container tools:

```bash
docker compose -f backend/compose.yaml run --rm tools backend/check_db.py --endpoint-url http://fcaj-dynamodb-local:8000
```

Nếu chủ động dùng Python trên host với boto3 đã cài, lệnh tương đương là `python backend/check_db.py --endpoint-url http://127.0.0.1:8000`. Không bỏ `--endpoint-url`; thiếu endpoint sẽ dừng. Không có lệnh reset/xóa dữ liệu tự động.

## Kiểm thử

Unit test dùng mock, không ghi DB/gọi AWS; chạy trong Python 3.13 sau khi SAM build. Hai test integration được skip trong lệnh mặc định:

```bash
docker compose -f backend/compose.yaml run --rm tools -m unittest discover -s tests/backend -v
```

Smoke test chỉ GET/OPTIONS, dùng Python chuẩn trên Windows, cần SAM còn chạy:

```bash
python backend/tools/check_api.py --base-url http://127.0.0.1:3001
```

Script kiểm tra health, JSON/schema/số và timezone, danh sách/chi tiết, 404, validation, CORS và in fingerprint của danh sách để đối chiếu trước/sau seed hoặc restart. Seed/restart là thao tác riêng có chủ đích; smoke test không thực hiện chúng.

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

Smoke test ghi tự xác nhận `/health` trả bảng test trước khi gửi POST. Nó thử tạo/đọc đăng ký, email trùng và đăng ký sự kiện khác, validation, đóng/hết chỗ và nhiều request HTTP tranh chỗ cuối. Lệnh này có tạo dữ liệu trên bảng test, khác `check_api.py` chỉ đọc.

Kết quả đã chạy trong mốc này:

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

Chưa có Admin, email, xác thực/ủy quyền khi đọc kết quả và AWS. Mã UUID ngẫu nhiên không thay thế quyền truy cập. Chưa có HTTP idempotency key để khôi phục kết quả khi client mất response sau commit; Frontend không tự retry POST, gửi lại email trùng sẽ trả 409. Chưa chạy các lệnh tài liệu bằng Git Bash thực tế; Docker/SAM đã chạy từ PowerShell. Chưa kiểm thử trình duyệt ngoài Chrome hoặc nhiều thiết bị.

Tham chiếu: [DynamoDB Local và Docker Compose](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html), [SAM HTTP API](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-httpapi.html).

## Dừng và xử lý lỗi

- Dừng SAM bằng **Ctrl+C tại Terminal 1**. Dừng DB bằng `docker compose -f backend/compose.yaml stop dynamodb`. Khởi động lại DB dùng `docker compose -f backend/compose.yaml up -d dynamodb`.
- Kiểm tra volume vẫn giữ dữ liệu: `docker compose -f backend/compose.yaml restart dynamodb`, sau khi DB sẵn sàng chạy lại health/smoke test. Không dùng `down -v` hoặc xóa volume.
- Docker pipe/permission lỗi: kiểm tra Docker Desktop và Linux engine đang chạy; môi trường agent có thể cần quyền truy cập Docker ngoài sandbox.
- Lỗi 503: kiểm tra container DB, network, bảng đã seed và endpoint trong env file. Thiếu endpoint không fallback sang AWS.
- Lỗi 502/timeout lúc gọi đầu: local bind mount trên Windows/OneDrive có thể tải model boto3 chậm. Đã đặt timeout local 60 giây và cache client cho container ấm. Giữ `--warm-containers LAZY`; sau khi sửa Python, build và restart SAM để dùng artifact mới.
- Port đã dùng: kiểm tra tiến trình đang nghe 3001/8000 trước khi đổi cổng; nếu đổi DB host port thì endpoint container vẫn dùng port 8000.

Bước tiếp theo: Admin Dashboard, kiểm soát truy cập kết quả đăng ký và kiểm thử rộng hơn. Mốc local người đăng ký đã có luồng hai phía; không đồng nghĩa dự án hoặc phần triển khai AWS đã hoàn tất.
