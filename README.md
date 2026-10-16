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

Chống trùng bằng `eventId` và email đã trim/chuyển chữ thường. `registrationId`
là mã xác nhận riêng của mỗi đăng ký thành công, không dùng làm điều kiện chống trùng.

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

- Frontend có trang chọn vai trò User/Admin; khách xem/tìm kiếm/đăng ký sự kiện, admin đăng nhập để thêm/sửa/xóa hoặc mở/đóng đăng ký. Luồng khách đã tích hợp HTTP API. Chọn API hoặc mock rõ ràng bằng `VITE_DATA_MODE`; xem [Frontend README](frontend/README.md).
- Backend SAM Python 3.13 có `GET /health`, `GET /events`, `GET /events/{eventId}`, `POST /events/{eventId}/registrations`, `GET /registrations/{registrationId}`. Đăng ký giữ chỗ và chống trùng bằng DynamoDB transaction; xem [Backend README](backend/README.md).
- Có [API contract](docs/api-contract.md), [mô hình dữ liệu](docs/data-model.md), seed không ghi đè, unit test, kiểm tra transaction đồng thời và HTTP smoke test local. Dữ liệu ứng dụng và dữ liệu kiểm thử dùng bảng riêng.
- Đã có quản trị sự kiện, session admin HttpOnly, CSRF và giới hạn đăng nhập; xem [quy tắc bảo mật](docs/security.md). Chặn xóa sự kiện có chỗ đã dùng. Chưa có email hoặc tài nguyên AWS; link kết quả khách vẫn dùng UUID, chưa có tài khoản khách.

## Chạy toàn bộ local

Từ repo root: bật DynamoDB bằng `docker compose -f backend/compose.yaml up -d dynamodb`, build bằng `sam build --use-container --template-file backend/template.yaml`, rồi chạy SAM trên cổng 3001 theo [lệnh cấu hình đầy đủ](backend/README.md#chạy-từ-thư-mục-gốc-repository). Giữ terminal SAM chạy.

Trong terminal khác, tạo `frontend/.env.local` từ `frontend/.env.example` nếu chưa có, chạy `cd frontend`, `npm ci` (khi cần cài dependency), `npm run dev`. Mở địa chỉ Vite in ra, thường là `http://localhost:5173`. Khi cập nhật code/template Backend phải build và restart phiên SAM đang chạy.
