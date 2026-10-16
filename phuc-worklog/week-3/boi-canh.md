# Bối cảnh dự án đăng ký sự kiện

Ngày cập nhật: **16/10/2026**. Nhánh làm việc được kiểm tra: **`phuc`**.

## 1. File này dùng để làm gì?

File này dành cho khung chat mới hoặc người tổng hợp báo cáo tuần: đọc để hiểu dự án đang xây dựng gì, những phần đã có từ trước, tiến độ hiện tại và quy tắc làm việc. Đây là **tài liệu bối cảnh**, không phải một hạng mục lập trình mới hay bản ghi toàn bộ công việc của tuần.

Đọc file này trước, sau đó đọc [worklog nâng cấp vai trò và quản trị](2026-10-16-role-admin-event-management.md) để biết chính xác thay đổi và kiểm thử của đợt nâng cấp. Không tính toàn bộ các chức năng đã có từ trước thành công việc mới của ngày 16/10 hoặc tự gán vào tuần 3.

## 2. Mục tiêu và phạm vi

Dự án xây dựng **website đăng ký sự kiện có giới hạn số chỗ**, phục vụ học tập và demo trong workshop AWS. Người tham gia tìm sự kiện, đọc chi tiết, đăng ký và nhận mã xác nhận. Quản trị viên quản lý thông tin sự kiện và việc mở/đóng đăng ký.

Hướng kiến trúc đã chuyển từ phương án ECS/Fargate sang **serverless**. Hiện dự án phát triển và dùng thử **trên máy local**, chưa có ứng dụng triển khai lên AWS hay cluster production.

Kiến trúc AWS dự kiến trong README: S3 riêng tư + CloudFront/OAC cho frontend; API Gateway HTTP API + Lambda Python cho backend; DynamoDB lưu dữ liệu; CloudWatch/SNS giám sát; Terraform quản lý hạ tầng; GitHub Actions/OIDC phục vụ CI/CD. Đây là kế hoạch, không được ghi thành tài nguyên đã triển khai. Kế hoạch README là tuần 1–5 làm local, tuần 6 triển khai AWS; tiến độ thực tế cần đối chiếu riêng.

Phạm vi hiện tại không gồm thanh toán, chat, ứng dụng di động, email xác nhận cho từng người tham gia hoặc microservices.

## 3. Phân công và cách phối hợp

- Người dùng (Phúc) phụ trách chính **frontend**; một người bạn phụ trách **backend**. Hai bên có thể đổi vai trò khi cần.
- Codex hỗ trợ thảo luận, giải thích, viết/sửa mã và kiểm tra theo ý tưởng được thống nhất.
- Hai phía phối hợp qua **API contract**: thống nhất đường dẫn, dữ liệu gửi/nhận, lỗi và quy tắc trước khi kết nối.
- Không tự quy toàn bộ backend hoặc công sức của cả nhóm cho Phúc khi viết báo cáo cá nhân. Cần đối chiếu phân công, worklog và commit nếu cần xác định người thực hiện.

MVC đã được trao đổi như một cách chia trách nhiệm. Mã hiện tại tổ chức frontend và backend thành các lớp riêng; không cần ép thành ba thư mục tên Model/View/Controller. Local/production là môi trường chạy, khác với cách tổ chức mã nguồn.

## 4. Dự án đã đi qua những giai đoạn nào?

| Giai đoạn | Phần đã có | Cách hiểu khi viết báo cáo |
| --- | --- | --- |
| Bộ khung và công cụ local | Cấu trúc frontend/backend/tests/infra/docs, công cụ phát triển | Là nền tảng đã có; không tự suy ra ngày hoàn thành nếu thiếu bằng chứng. |
| Frontend prototype | React, danh sách/chi tiết/form/kết quả, tìm kiếm/lọc, thiết kế và dữ liệu mẫu; đăng ký lưu localStorage | Có trước đợt nâng cấp quản trị. `frontend/frontend.md` ghi nhận prototype tuần 2. |
| Backend và tích hợp người tham gia | SAM, DynamoDB Local, năm API công khai, transaction giữ chỗ/chống trùng, frontend gọi HTTP | Đã có trước worklog quản trị ngày 16/10. Bằng chứng tổng hợp nằm trong `phuc-worklog/Reports/BC.txt` và tài liệu backend. Không tự gán toàn bộ giai đoạn này vào một ngày/tuần. |
| Nâng cấp vai trò và quản trị | Trang chọn vai trò, login/session/logout admin, thêm/sửa/xóa và mở/đóng đăng ký, bảo vệ API | Là đợt thay đổi được ghi trong worklog `2026-10-16-role-admin-event-management.md`. |
| Người dùng tự dùng thử và thảo luận | Bật lại local, tạo admin, kiểm tra health, xem giao diện, kiểm tra số đăng ký, trao đổi cấp tài khoản production | Là hoạt động xác minh/tìm hiểu sau nâng cấp; các ý tưởng thảo luận chưa tự trở thành chức năng đã code. |

`phuc-worklog/Reports/BC.txt` có cả đoạn tổng hợp kết quả và đoạn trạng thái cũ, trong đó còn ghi chưa có admin. Khi gặp mâu thuẫn, đối chiếu mã nguồn, README cập nhật, contract v2 và worklog nâng cấp; không dùng nguyên trạng thái cũ làm tiến độ mới nhất.

## 5. Hệ thống hiện hoạt động thế nào?

```text
Trình duyệt / Frontend React (5173)
          → /api qua Vite proxy
          → SAM Local / Lambda Python (3001)
          → DynamoDB Local trong Docker (8000)
```

### Người tham gia

Trang chủ `/` chọn Người tham gia → `/events` xem/tìm kiếm/lọc → mở chi tiết → điền form → API kiểm tra → lưu đăng ký và giảm một chỗ → xem kết quả theo mã UUID.

Không cần tài khoản người tham gia. Tìm kiếm tên không phân biệt dấu, kết hợp danh mục/trạng thái ở frontend trên danh sách đã tải. Backend quyết định số chỗ và kết quả đăng ký.

Backend dùng một transaction để đồng thời giảm chỗ, tạo khóa chống trùng và ghi đăng ký. Chống trùng theo **eventId + email đã trim/chuyển chữ thường**. Mã UUID là mã xác nhận, không phải điều kiện chống trùng hoặc bằng chứng xác minh một người thật.

### Quản trị viên

Chọn Quản trị viên → kiểm tra session → đăng nhập nếu cần → quản lý sự kiện. Admin thêm/sửa tên, danh mục, thời gian theo giờ Việt Nam, địa điểm, đơn vị tổ chức, sức chứa, giới thiệu, nội dung và mở/đóng đăng ký.

Theo quyết định người dùng đã xác nhận: **chặn xóa sự kiện đã có chỗ được dùng**; có thể đóng đăng ký thay cho xóa. Không giảm sức chứa xuống dưới số chỗ đã dùng. Cập nhật/xóa có kiểm tra version và số chỗ tại DB để tránh ghi đè người vừa đăng ký.

Chọn vai trò chỉ điều hướng, không cấp quyền. Backend kiểm tra phiên và vai trò trên từng API admin. Session nằm trong cookie HttpOnly/SameSite, có kiểm tra CSRF/Origin và giới hạn đăng nhập. Mật khẩu dùng scrypt và salt riêng, không lưu dạng rõ.

### API và mock

- `VITE_DATA_MODE=api`, `VITE_API_BASE_URL=/api`: gọi backend thật, đăng ký lưu trong DynamoDB Local. API lỗi thì hiển thị lỗi, không tự chuyển sang dữ liệu giả.
- `VITE_DATA_MODE=mock`: phục vụ phát triển UI độc lập, đăng ký chỉ lưu trong localStorage của trình duyệt. Không mô phỏng/cấp quyền admin trong chế độ này.

## 6. Những điểm dữ liệu dễ gây hiểu nhầm

Database ban đầu được seed tám sự kiện, gồm sự kiện còn chỗ, hết chỗ và đã kết thúc. Một số sự kiện được đặt sẵn **remainingSeats nhỏ hơn capacity**, nhưng không tạo người đăng ký tương ứng.

Ví dụ: sự kiện sức chứa 50, còn 24 chỗ là mô phỏng 26 chỗ đã dùng; không thể kết luận DB có thông tin của 26 người. Dashboard hiện tính chỗ đã dùng bằng `capacity - remainingSeats`, bao gồm cả số chỗ mẫu này.

Trong lần đọc trực tiếp DB ngày **16/10/2026** sau khi người dùng bật lại ứng dụng, bảng `fcaj-event-workshop-local` có **tám sự kiện và 0 bản ghi REGISTRATION**. Đây là kết quả tại lần đọc đó, không phải số liệu cố định cho các lần dùng sau. Đăng ký thành công qua API sẽ tạo bản ghi thật trong DynamoDB Local.

Vì quy tắc bảo vệ chỗ đã dùng, sự kiện mẫu có capacity lớn hơn remainingSeats từng bị chặn xóa. **Cập nhật sau đó ngày 16/10/2026:** theo yêu cầu người dùng, đã xác minh lại không có đăng ký thực tế và xóa đúng tám sự kiện mẫu khỏi bảng ứng dụng. Kiểm tra sau dọn: 0 sự kiện, 0 đăng ký; một tài khoản admin và dữ liệu đăng nhập được giữ nguyên. Chi tiết tại [worklog dọn dữ liệu mẫu](2026-10-16-don-du-lieu-mau.md).

Khởi tạo mặc định hiện chỉ tạo bảng, không thêm dữ liệu mẫu trở lại. Chỉ khi truyền `--seed-demo` mới thêm các ID mẫu còn thiếu, không ghi đè dữ liệu cũ; frontend mock vẫn có mẫu riêng. Volume Docker giữ dữ liệu qua các lần stop/start. Không dùng `down -v` nếu muốn giữ dữ liệu.

## 7. Tình trạng kiểm thử đã được ghi nhận

Trước nâng cấp quản trị, báo cáo BC ghi nhận 26 unit test và hai integration test, cùng kiểm tra HTTP/trình duyệt cho luồng người tham gia. Đây là kết quả của giai đoạn trước.

Đợt nâng cấp quản trị đã ghi nhận:

- 45 unit test đạt trên Python 3.13 container.
- Cả suite 47 test đạt khi bật hai integration test với DynamoDB Local bằng Python host 3.11.
- SAM build và validate/lint đạt; frontend build/lint đạt, còn hai cảnh báo Fast Refresh cũ ở Button/Badge.
- HTTP thật kiểm tra quyền, cookie, CSRF, CRUD, đóng/mở, chặn xóa có đăng ký, xung đột phiên bản và logout.
- Edge headless kiểm tra chọn vai trò, login/reload/logout, quản trị, đăng ký khách, tìm kiếm và nội dung script hiển thị như văn bản.
- Các trang mới không tràn ngang và chữ hành động không xuống dòng ở 320/375/414/768/1280 px; đã xem ảnh form mobile.

Các kết quả trên là kết quả đã chạy của đợt nâng cấp, không phải khẳng định rằng mỗi lần mở chat đều vừa chạy lại. Chưa kiểm tra Firefox/Safari hoặc trình đọc màn hình.

## 8. Trạng thái dùng thử gần nhất

Sau nâng cấp đã có một đợt dọn container/image SAM, artifact build và browser test; giữ volume dữ liệu. Sau đó người dùng **đã bật lại Docker/DB, build lại backend, tạo thành công admin tên `phuc`, kiểm tra `/health` trả ok/ready và mở frontend để dùng thử**.

Do đó, ghi chú “đã dừng môi trường” trong worklog là trạng thái tại cuối đợt dọn trước đó. Tình trạng tiến trình hiện tại phải kiểm tra lại nếu cần; file này không phải trạng thái giám sát trực tiếp. Không tự dừng môi trường người dùng đang dùng chỉ vì đọc thấy ghi chú dọn cũ.

Tài khoản admin được cấp qua CLI nhập mật khẩu ẩn, không có mật khẩu mặc định. Không đưa mật khẩu, session token hoặc dữ liệu cá nhân vào báo cáo.

## 9. Đã làm, chưa làm và mới chỉ thảo luận

**Đã có:** luồng khách đầy đủ qua API local; giữ chỗ/chống trùng; lựa chọn API/mock; chọn vai trò; xác thực admin; quản lý sự kiện; contract, mô hình dữ liệu, hướng dẫn và kiểm thử.

**Chưa có:** AWS hosting/production, tài khoản khách, email xác nhận, MFA, khôi phục mật khẩu, giao diện quản lý/cấp/thu hồi tài khoản admin, dọn TTL tự động và rate limit toàn bộ API. Chưa có trang danh sách người đăng ký cho admin; chỗ đã dùng không phải danh sách người tham dự.

Link kết quả khách hiện là đường dẫn có UUID khó đoán; người có link vẫn xem được thông tin tương ứng. Chưa có cơ chế khôi phục mã nếu client mất response sau khi DB đã lưu. HTTP local với cookie Secure=false chưa phải cấu hình production.

**Mới chỉ thảo luận:** cách production cấp admin đầu tiên, mời thêm quản trị viên, vai trò chủ hệ thống và dùng dịch vụ danh tính như Cognito. Chưa chốt/triển khai lời mời, super admin, SSO hoặc Cognito. Không viết các nội dung này vào mục “đã hoàn thành”.

## 10. Quy tắc làm việc và ghi báo cáo

- Thảo luận từng ý tưởng; ưu tiên cách làm đơn giản, dễ giải thích cho học sinh. Kiểm tra kết quả sau từng giai đoạn trước khi tiếp tục.
- Giữ cấu trúc thư mục rõ ràng, tái sử dụng thành phần và thiết kế sẵn có; không tạo file/thư mục hoặc thêm thư viện tùy tiện.
- Dùng mã nguồn thực tế và nguồn chính thức đáng tin cậy; thông tin chưa xác minh phải ghi rõ. Không bịa tiến độ, số liệu hoặc kết quả kiểm thử.
- Mỗi ý tưởng có thay đổi mã nguồn dùng một worklog riêng trong `phuc-worklog/week-3/`, hoàn thiện khi ý tưởng xong. Sửa tiếp cùng ý tưởng thì cập nhật chính file đó, không sinh thêm nhật ký nhỏ lẻ.
- Chỉ tìm hiểu, hướng dẫn hoặc dùng thử thì không tự tạo worklog tính năng mới. File bối cảnh này là tài liệu bổ sung được người dùng yêu cầu riêng.
- Worklog cần ghi mục tiêu, lý do, thay đổi, bằng chứng kiểm tra, giới hạn và **nguồn tham khảo trực tiếp**.
- Khi viết báo cáo tuần, tách nền tảng có sẵn, công việc thực hiện trong tuần, kiểm tra của người dùng và ý tưởng chưa triển khai. Nếu không có ngày/tuần hoặc người thực hiện đủ rõ thì ghi thiếu dữ kiện, không tự suy diễn.

## 11. Bản đồ tài liệu để đọc tiếp

| Tài liệu | Dùng để hiểu |
| --- | --- |
| [README gốc](../../README.md) | Mục tiêu, phạm vi, kế hoạch kiến trúc và chạy local |
| [Frontend README](../../frontend/README.md) | Giao diện, routes, API/mock và cách mở website |
| [Thiết kế frontend](../../frontend/DESIGN.md) | Font, màu, bố cục và cách giữ giao diện nhất quán |
| [Backend README](../../backend/README.md) | Docker/SAM, seed, tạo admin, kiểm tra và dừng hệ thống |
| [API contract v2](../../docs/api-contract.md) | Thỏa thuận frontend/backend, schema và lỗi |
| [Mô hình dữ liệu](../../docs/data-model.md) | Sự kiện, đăng ký, khóa chống trùng, admin/session và dữ liệu mẫu |
| [Quy tắc bảo mật](../../docs/security.md) | Biện pháp, kiểm tra và giới hạn bảo mật local |
| [Báo cáo BC trước nâng cấp](../Reports/BC.txt) | Bối cảnh tích hợp người tham gia; có đoạn trạng thái cũ cần đối chiếu |
| [Worklog nâng cấp](2026-10-16-role-admin-event-management.md) | Công việc, bằng chứng và nguồn tham khảo của ý tưởng vai trò/admin |

Mã chính nằm trong `frontend/src/`, `backend/lambda/`, công cụ tại `backend/tools/`, dữ liệu seed tại `backend/dynamodb_setup/`, kiểm thử tại `tests/`. `infra/` còn là bộ khung, không phải hạ tầng AWS đã triển khai.

## 12. Nguồn và mức độ xác nhận

Nội dung file được tổng hợp từ các tài liệu nội bộ liên kết ở trên, mã nguồn, kết quả công cụ đã chạy và trao đổi người dùng trong phiên phát triển. Lượt tạo file bối cảnh này chỉ đọc tài liệu và ghi Markdown; không sửa chức năng, không chạy lại toàn bộ kiểm thử hoặc đọc lại database.

Các nguồn chính thức đã dùng cho phần thiết kế/bảo mật được liệt kê đầy đủ trong worklog nâng cấp, gồm [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html), [Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) và [Schema.org Event](https://schema.org/Event).
