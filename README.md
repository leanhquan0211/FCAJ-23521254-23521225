# Xây dựng website đăng ký sự kiện serverless trên AWS

Building a Serverless Event Registration Website on AWS

## Mục tiêu

Xây dựng website đăng ký sự kiện có giới hạn số chỗ.
Dự án phục vụ học tập và demo trong workshop AWS.

## Chức năng dự kiến

Người tham gia:
- Xem danh sách và chi tiết sự kiện.
- Xem số chỗ còn lại và đăng ký.
- Nhận kết quả thành công, trùng đăng ký, hết chỗ hoặc đã đóng.

Quản trị viên:
- Đăng nhập.
- Tạo sự kiện và đặt số chỗ.
- Mở hoặc đóng đăng ký.
- Xem số lượt đăng ký.

API v4 chống trùng bằng `userId` và `eventId`. Người tham gia tự tạo tài khoản,
đăng nhập rồi đặt vé; tên/email lấy từ phiên. `Idempotency-Key` giữ nguyên khi thử
lại để nhận vé cũ, tránh trừ chỗ lần nữa. `registrationId` là mã vé, chỉ chủ vé được xem.

## Ngoài phạm vi

Thanh toán, chat, ứng dụng di động, email cho từng người tham gia
và hệ thống microservices.

## Kiến trúc AWS dự kiến

- S3 riêng tư: lưu frontend HTML/CSS/JavaScript.
- CloudFront và OAC: phục vụ frontend qua HTTPS và đọc S3.
- API Gateway HTTP API: tiếp nhận yêu cầu từ frontend.
- Lambda Python: xử lý dữ liệu và logic đăng ký.
- DynamoDB: lưu sự kiện và đăng ký.
- CloudWatch và SNS: giám sát và cảnh báo quản trị.
- Terraform: quản lý hạ tầng.
- GitHub Actions và OIDC: kiểm thử và triển khai tự động.

Phương án hiện tại chuyển từ ECS/Fargate sang serverless.
Tuần 1–5 phát triển local; tuần 6 mới triển khai ứng dụng lên AWS.

## Công cụ phát triển local

- VS Code
- Git
- Python 3.13 và venv
- Docker Desktop dùng Linux containers
- Docker Compose
- AWS SAM CLI

SAM phục vụ chạy thử Lambda local.
Terraform sẽ quản lý hạ tầng AWS.

## Cấu trúc thư mục

- frontend/: giao diện.
- backend/: Lambda và thư viện Python.
- tests/: kiểm thử.
- infra/: cấu hình hạ tầng.
- docs/: tài liệu và worklog.

## Trạng thái hiện tại

- Frontend có đăng nhập chung, sidebar/navbar theo role; User xem sự kiện và vé của mình, admin quản lý/tạo/sửa/xóa hoặc mở/đóng đăng ký. Không còn trang chọn khu vực; các tab cùng browser dùng một tài khoản. Chọn API hoặc mock rõ ràng bằng `VITE_DATA_MODE`; xem [Frontend README](frontend/README.md).
- Backend SAM Python 3.13 có `GET /health`, `GET /events`, `GET /events/{eventId}`, `POST /events/{eventId}/registrations`, `GET /registrations/{registrationId}`. Đăng ký giữ chỗ và chống trùng bằng DynamoDB transaction; xem [Backend README](backend/README.md).
- Có [API contract](docs/api-contract.md), [mô hình dữ liệu](docs/data-model.md), unit test, kiểm tra transaction đồng thời và HTTP smoke test local. Khởi tạo mặc định không thêm dữ liệu mẫu; chỉ seed demo khi chủ động dùng `--seed-demo`, không ghi đè bản ghi cũ. Dữ liệu ứng dụng và dữ liệu kiểm thử dùng bảng riêng.
- Bản v4 trên `feat/unified-account` kế thừa User/booking/lịch mở bán/idempotency, chuyển sang cookie chung và cho admin xóa vé/ghi danh theo sự kiện, giữ tài khoản/vé khác. Event đang dọn bị khóa;202 cần tiếp tục. [Contract](docs/api-contract.md), [data model](docs/data-model.md), [nhật ký mục15](quan-worklog/week-4/23-10.md) ghi chi tiết kết quả và giới hạn. Bản v3 bàn giao cũ `feat/buyer-flow@a6ba0f2` được giữ nguyên. Code/tài liệu phải lấy cùng commit; nâng cấp cần đăng nhập lại, không reset bảng. Chưa email, thanh toán hoặc AWS.


## Chạy toàn bộ local

Từ repo root: bật DynamoDB bằng `docker compose -f backend/compose.yaml up -d dynamodb`, build bằng `sam build --use-container --template-file backend/template.yaml`, rồi chạy SAM trên cổng 3001 theo [lệnh cấu hình đầy đủ](backend/README.md#chạy-từ-thư-mục-gốc-repository). Giữ terminal SAM chạy.

Trong terminal khác, tạo `frontend/.env.local` từ `frontend/.env.example` nếu chưa có, chạy `cd frontend`, `npm ci` (khi cần cài dependency), `npm run dev`. Mở địa chỉ Vite in ra, thường là `http://localhost:5173`. Khi cập nhật code/template Backend phải build và restart phiên SAM đang chạy.
