# Kế hoạch Test Lab AWS — mục tiêu hiện hành

Cập nhật 13/11/2026 sau khi người dùng làm rõ: test trên CHÍNH CloudFront/API/Lambda/DynamoDB đang triển khai. Không tạo stack hoặc bảng test song song. Quy tắc mới này thay phương án môi trường riêng trong bản nháp trước.

## Luồng và phân công

Dashboard local5174 → runner3100 → k6 → CloudFront /api → API Gateway → Lambda → DynamoDB hiện tại. Runner đọc metrics/alarm và audit; request tạo User/sự kiện/vé đi qua API thật. Bên triển khai giữ quyền thay infra/backend; bên test làm trong feat/test-aws. Không tự apply/destroy.

## Những việc đã cấu hình

- Bootstrap đọc website/table outputs và Lambda ARN/region từ Terraform state của thư mục triển khai gốc. Chỉ xuất tọa độ công khai đã chọn; không copy raw state/credentials vào report hoặc Git.
- Mỗi lần khởi động đọc lại địa chỉ. State thiếu hoặc đã destroy thì dừng; không dùng URL cũ dự phòng. Sau apply lại cần restart runner. Trước mỗi lượt, kiểm health API4.1, table và Lambda ARN; lưu hash/LastModified trước-sau để nhận biết deployment thay đổi.
- AWS profile là default (IAM user terraform-deployer); Admin website admin_test nhập kín bằng start-aws.ps1 -AllowWrites. Chưa có mật khẩu thì chưa đăng nhập hoặc tạo dữ liệu.
- Mở ghi bằng xác nhận chính xác function ARN + table khi khởi động. Dashboard không được đổi mục tiêu, executable hoặc shell command.
- Rate limit đọc từ Lambda trước fixture; kiểm đủ User cộng20 lượt dự phòng. Signup/login2000/IP/900s đã được xác minh bằng preflight. Không còn chờ cứng15phút mỗi100 User. Nếu ngân sách thực tế bị lượt khác dùng hết,429 vẫn là lỗi thật, không reset counter/giả IP.
- Fixture journal ghi ID/email test ngay sau signup, trước login; event ID ngay sau tạo. Request chưa rõ kết quả giữ pending để kiểm tra, không tự đoán khi cleanup. Không lưu password/cookie/CSRF.

## Thứ tự chạy sau khi người dùng nhập mật khẩu

1. Smoke2người/4vé, rồi2người/1vé; audit chỗ/vé/profile/reference/idempotency, replay/duplicate và quyền sở hữu.
2. Khi đạt mới tăng10/50/100/200/500; giữ ba kịch bản hot/scarce/ramp. Chọn preset chưa phát tải.
3. Tối đa50.000 request đo; ramp tối đa540giây; cap chạm trước lịch phải ghi nhận phần còn lại không có tải.
4. Đo đọc để quan sát tải duy trì; purchase một ý định/User/event là burst, không coi pool dùng hết là ghi liên tục.
5. Giữ deployment trong cửa sổ đo. Chưa xác minh quota/concurrency ceiling bằng bài tải thật.

## Dữ liệu và cleanup

Dùng event mới LAB <runId>, email lab-<runId>-NNN@example.test. Manifest trong report gitignore. Cleanup mặc định chỉ xem kế hoạch; thực thi cần xác nhận đúng run ID, Admin kín, mục tiêu khớp, runner đã dừng và không có writer khác. Kiểm toàn bộ email/title/ID trước DELETE đầu tiên. Xóa event trước rồi User qua API versioned, xử lý202 có giới hạn; không truncate bảng, scan-delete, seed/reset ghế, xóa counter hoặc đụng Admin. Pending request phải giải quyết thủ công trước cleanup. Chưa chạy cleanup AWS thật.

## Quan sát và giới hạn

CloudWatch ConcurrentExecutions Maximum, Invocations, Throttles, Errors, Duration p95 có độ phân giải phút và độ trễ; có thể gồm truy cập người khác. Không có dữ liệu khác số0. Concurrency không phải số máy giữ ấm. Dashboard phản ánh request, latency, lỗi và số xử lý đồng thời. Alarm hiện có không nhất thiết kích hoạt với hết vé; SNS/email và thay đổi ngưỡng thuộc bên triển khai, chưa coi là kiểm chứng cảnh báo.

Đã chạy bài ghi AWS nhỏ và bài đọc10/100/500người; kết quả đối chiếu trong project-worklog/WORKLOG.md mục13/11. Bài500không đạt và quota10được giữ; không coi phần công cụ đã kiểm tra là chứng minh scaling500đạt. Không tự chạy lại tải khi hợp nhất mã.

## Nguồn đã đọc

Chẩn đoán bài đọc 500 người ngày 13/11: 13.084 HTTP503 trên 26.514 request; CloudWatch các phút đo ghi concurrency Maximum10 và Throttles13.087 (có thể gồm request ngoài lượt). GetAccountSettings và ServiceQuotas xác nhận concurrency tài khoản us-east-1 là10, Adjustable=true; không đặt reserved concurrency cho function. Không thấy log Database unavailable trong khoảng đo. Giới hạn sync RPS tương ứng100, thấp hơn tải gửi khi500người nghỉ2giây. Đây là giới hạn AWS cần phối hợp bên triển khai; không sửa test để bỏ qua lỗi hoặc tự yêu cầu quota. Hai alarm Errors/Duration hiện OK, chưa có action; Throttles không được tính vào Errors nên không coi alarm im lặng là test không tạo lỗi.

Bài 10người/1vé gửi sớm: tất cả10POST nhận SALES_NOT_OPEN, không có vé. Runner đã đổi sang chờ API event.status=open trước k6; không còn dùng riêng ước lượng clock+.1giây để quyết định mở đo. Report cũ giữ nguyên, chưa chạy lại ghiAWS sau sửa vì cần người dùng restart runner nhập Admin kín.

- https://docs.aws.amazon.com/lambda/latest/dg/monitoring-concurrency.html — concurrency Maximum, độ phân giải phút.
- https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html — Invocations/Errors/Throttles/Duration.
- https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-vus/ — tải tăng/giữ/giảm và graceful ramp-down.
- https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html — giới hạn request đồng bộ theo concurrency quota.
