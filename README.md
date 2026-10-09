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

Chống trùng dựa trên mã người tham gia, không xác minh một người thật.

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

Đã kiểm tra công cụ, tạo bộ khung dự án và môi trường Python riêng.
Chưa chạy DynamoDB Local, API hoặc frontend.
Chưa triển khai tài nguyên AWS.

Hướng dẫn bật và tắt hệ thống sẽ được bổ sung sau khi chạy thử thành công.