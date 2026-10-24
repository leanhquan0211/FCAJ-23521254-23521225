# Bối cảnh dự án

Mốc cập nhật nội dung: **23/10/2026**. File này mô tả hệ thống hiện hành và phần còn lại; lịch sử đóng góp xem [WORKLOG.md](WORKLOG.md), quy tắc cộng tác xem [AI_RULE.md](AI_RULE.md).

## 1. Mục tiêu và phạm vi

Website đăng ký sự kiện có giới hạn số chỗ, dùng để kiểm chứng tính đúng dữ liệu, chống gửi lặp, tranh chỗ và tải tăng. “Mua vé” hiện là đặt chỗ và nhận mã xác nhận, chưa thanh toán. Phát triển/kiểm thử local trước, sau đó dự kiến triển khai AWS để trình diễn hệ thống serverless trong doanh nghiệp.

Nền đã có trước đợt quản trị 16/10: prototype React, API đọc/đăng ký, DynamoDB transaction và tích hợp frontend/backend. Không tự tính lại phần nền thành công việc mới của các ngày sau. Phạm vi triển khai hiện gồm **User và Admin**, chưa có Organizer đa đơn vị, OTP/xác minh email, khôi phục mật khẩu, gửi email hoặc thanh toán.

## 2. Luồng sử dụng hiện tại

- Chưa đăng nhập: giao diện API mode tới `/login`, có liên kết `/signup`. API đọc sự kiện vẫn công khai, nhưng khung UI sản phẩm hiện yêu cầu đăng nhập.
- User: tạo tài khoản bằng tên/email/mật khẩu → đăng nhập → xem/tìm sự kiện → đặt vé → nhận mã → Vé của tôi. Danh tính lấy từ phiên, mỗi User tối đa một vé/sự kiện; chỉ chủ vé được xem.
- Admin: tài khoản cấp qua CLI, dùng cùng form login; quản lý sự kiện và User. Được xóa sự kiện có người, tìm/sửa/xóa User; không có tự đăng ký hoặc giao diện quản lý tài khoản Admin.
- Cùng browser/profile chỉ có một tài khoản đang dùng; đổi tài khoản/đăng xuất cập nhật các tab. Browser/profile và cookie jar khác độc lập. Sidebar/navbar theo vai trò, desktop thu gọn được, mobile giữ menu đầy đủ.

`VITE_DATA_MODE=api`, `VITE_API_BASE_URL=/api` dùng backend thật; API lỗi phải hiển thị lỗi, không tự chuyển mock. Chế độ mock chỉ dùng phát triển UI, không là bằng chứng dữ liệu hoặc hiệu năng.

## 3. Kiến trúc local

```mermaid
flowchart LR
    Person[User hoặc Admin] --> UI[React + TypeScript / Vite]
    UI -->|/api, cookie và CSRF| API[SAM HTTP API / Lambda Python 3.13]
    API --> Services[Auth, session, sự kiện, booking, quản lý User]
    Services --> Repository[Repository / DynamoDB transaction]
    Repository --> MainDB[(DynamoDB Local - bảng ứng dụng)]
    MainDB --> Volume[Volume giữ dữ liệu]
    Dashboard[Dashboard kiểm thử riêng] --> Runner[Runner / k6]
    Runner -.->|Adapter cần đồng bộ| TestAPI[SAM API test riêng]
    TestAPI --> TestDB[(Bảng test theo lượt)]
```

Frontend hiển thị/gọi HTTP; handler nhận request và trả response; service xử lý nghiệp vụ; repository đọc/ghi DB. Test lab là phần bên đồng hành bàn giao, tách khỏi UI sản phẩm; đã hợp nhất mã nguồn nhưng chưa đồng bộ adapter với contract hiện tại.

| Thành phần | Địa chỉ / cấu hình |
| --- | --- |
| Web sản phẩm / API | 127.0.0.1:5173, proxy /api tới SAM3001 |
| SAM test / web thử browser | 3002 / 5175; dùng env test riêng |
| Runner / dashboard test | 3100 / 5174 theo cấu hình lab, không phải thành phần UI sản phẩm |
| DB từ host / Lambda | http://127.0.0.1:8000 / http://fcaj-dynamodb-local:8000 |
| Docker network | fcaj-event-workshop-local |
| Bảng ứng dụng | fcaj-event-workshop-local |
| Bảng kiểm thử | Prefix fcaj-event-workshop-local-test-, mới theo lượt |
| Volume DB | fcaj-event-workshop-dynamodb-data |

## 4. Quy tắc dữ liệu và bảo vệ

- Mật khẩu băm bằng scrypt với salt riêng. Cookie HttpOnly `event_session` dùng chung hai role; server lưu hash token và kiểm phiên/quyền. Ghi sau login cần Origin hợp lệ và X-CSRF-Token; không lấy role/userId client gửi để cấp quyền.
- Booking dùng transaction **4 thao tác ghi + 1 ConditionCheck**: giảm chỗ có điều kiện, kiểm profile User hoạt động, tạo liên kết User/event, Ticket và idempotency. Thành công cùng nhau hoặc không ghi phần nào.
- Idempotency-Key là UUID v4: cùng User/key/nội dung trả 200 và vé đã lưu, tạo mới trả 201; key cũ khác nội dung bị từ chối. Không đổi key khi chưa rõ request trước đã lưu hay chưa.
- Backend dùng giờ server để kiểm salesOpenAt, trạng thái mở, số chỗ và thời điểm diễn ra. Dữ liệu legacy thiếu userId được giữ, không tự gán owner theo email trùng.
- Sửa User kiểm email duy nhất và version; vé cũ giữ thông tin lúc đăng ký. Xóa User khóa truy cập trước, hủy vé và trả chỗ một lần cho event còn hoạt động, giữ dữ liệu người khác.
- Xóa event chỉ dọn vé/ghi danh/idempotency của event, giữ tài khoản và event khác. DELETE User/event dọn theo lô, có thể trả 202 để tiếp tục; không mở khóa hoặc coi là hoàn tất khi chưa xong.
- Init mặc định chỉ tạo bảng nếu thiếu. Demo có ghế giả đã dùng nhưng không có vé tương ứng; không dùng số đó làm số người thật. Không seed đè, reset remainingSeats, xóa volume hoặc ghi test vào bảng ứng dụng.

Nguồn chi tiết: [API contract 4.1](../docs/api-contract.md), [data model](../docs/data-model.md), [security](../docs/security.md). Các file này là chuẩn để sửa code/viết assertion, không sao chép schema dài vào nhật ký.

## 5. Nơi tìm mã nguồn và hướng dẫn

| Phần | File chính |
| --- | --- |
| HTTP và cấu hình SAM | [app.py](../backend/lambda/app.py), [template.yaml](../backend/template.yaml) |
| Account/session | [buyer_auth.py](../backend/lambda/buyer_auth.py), [session.py](../backend/lambda/session.py), [auth.py](../backend/lambda/auth.py) |
| Booking và truy cập DB | [booking.py](../backend/lambda/booking.py), [repository.py](../backend/lambda/repository.py), [buyer_repository.py](../backend/lambda/buyer_repository.py) |
| Quản trị/xóa | [admin_events.py](../backend/lambda/admin_events.py), [event_deletion.py](../backend/lambda/event_deletion.py), [admin_accounts.py](../backend/lambda/admin_accounts.py), [account_repository.py](../backend/lambda/account_repository.py) |
| UI | [App.tsx](../frontend/src/App.tsx), [AppShell.tsx](../frontend/src/components/AppShell.tsx), [AdminAccountsPage.tsx](../frontend/src/pages/admin/AdminAccountsPage.tsx) |
| Kiểm thử | tests/backend, tests/frontend, backend/tools/check_*; tests/load, tests/runner, tests/dashboard thuộc lab riêng |

Khởi động và lệnh kiểm tra xem [Backend README](../backend/README.md), [Frontend README](../frontend/README.md), [Runner README](../tests/runner/README.md). Giữ thiết kế Almanac và component hiện có trong [DESIGN.md](../frontend/DESIGN.md).

## 6. Trạng thái và phần còn lại

- Làm ở thư mục gốc `D:\aws-workshop\event-registration`, nhánh **phuc**; GitHub/local còn main/phuc. Các nhánh feature đã gộp, lịch sử commit được giữ. Xem [git-workflow.md](../docs/git-workflow.md); không quay lại sửa worktree detached như một nhánh đang phát triển.
- Cập nhật Git ngày **24/10/2026**: theo yêu cầu bàn giao, main được đồng bộ tới cùng bản phuc trong đợt này, gồm ứng dụng, test lab và tài liệu. Những lần phát triển tiếp vẫn dùng phuc; trạng thái chức năng và các giới hạn kiểm thử bên dưới không thay đổi vì đồng bộ nhánh.
- Ở lần kết thúc dùng thử gần nhất, web/API/Docker Desktop đã dừng; dữ liệu DynamoDB được giữ và kiểm hash trước–sau dọn tài nguyên. Phiên sau kiểm tra process/health rồi khởi động theo README, không suy trạng thái máy chỉ từ tài liệu.
- Trong ngày đã đạt 75 bài backend với DB và HTTP/browser/SAM/frontend checks. Sau gộp Git chạy lại 63 bài backend không DB, 28 unit lab và build/lint cả hai web; 12 integration bỏ qua vì Docker tắt. Chi tiết và nguồn tại [WORKLOG.md](WORKLOG.md); không diễn giải thành vừa chạy lại toàn bộ ở mọi lượt sửa tài liệu.
- **Điểm tiếp tục chính:** [adapter lab](../tests/load/contract-v3-draft.json) vẫn ghim health3.0/cookie `event_user_session`, app dùng4.1/`event_session`. Bài purchase bị guard chặn; cần mô tả/duyệt plan đồng bộ rồi thử 1–2 User trước 100/200,100/10,100/1. Không bỏ guard hoặc đổi version backend để làm test qua.
- Chưa có kết quả 100 người, ramp/spike/hold/overload/recovery trên bản hiện hành hoặc số đo scaling AWS. Scan dùng trong danh sách User/dọn dữ liệu còn là giới hạn; cần đánh giá chỉ mục/chi phí khi lên AWS.

## 7. Hướng AWS dự kiến

S3 riêng tư + CloudFront/OAC phục vụ frontend; API Gateway + Lambda xử lý API; DynamoDB lưu dữ liệu; CloudWatch/SNS giám sát; Terraform và GitHub Actions/OIDC cho hạ tầng/triển khai. Đây là hướng trong [README](../README.md), **chưa triển khai**. Cấu hình hiện chỉ cho DB Local/credentials giả, chưa phải cấu hình AWS.

Màn demo phải lấy request/metric/audit thật: tải tăng–giữ–giảm cạnh throughput, p95/lỗi, concurrency và DB; số thực thi Lambda đồng thời không phải số môi trường giữ ấm. Local/đồ thị minh họa không thay số đo AWS. Ngưỡng tải, chi phí và tiêu chí đạt cần chốt trước khi chạy.
