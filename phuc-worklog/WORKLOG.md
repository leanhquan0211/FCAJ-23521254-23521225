# Nhật ký công việc

Ghi các công việc chính đã hoàn thành và kết quả kiểm tra theo ngày, phục vụ báo cáo tiến độ. Bối cảnh hiện hành xem [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md); quy cách cộng tác xem [AI_RULE.md](AI_RULE.md).

Tài liệu tham khảo là nguồn trên internet dùng để giải thích, đề xuất và áp dụng giải pháp; được đối chiếu lại ngày **24/10/2026**. Mã nguồn, commit và kết quả kiểm tra được dẫn riêng ở phần minh chứng thực hiện.

## Giai đoạn nền — trước 16/10/2026

Báo cáo cũ chưa có đủ mốc ngày chi tiết; giữ riêng giai đoạn này, không tính lại thành công việc mới ngày 16/10 hoặc 23/10.

- Hoàn thiện frontend prototype: danh sách/chi tiết, tìm kiếm/lọc, form đăng ký, kết quả và lựa chọn API/mock.
- Xây backend SAM/DynamoDB Local với API health, danh sách/chi tiết sự kiện, tạo/đọc đăng ký; transaction giữ chỗ và chống trùng email. Tích hợp toàn bộ luồng người tham gia với API thật, xử lý lỗi và lưu dữ liệu bền vững.
- Báo cáo giai đoạn ghi nhận 26 unit, 2 integration đạt cùng HTTP/browser/build; đây là bằng chứng cũ, chưa có tài khoản User hoặc idempotency giữa các lần gửi HTTP ở mốc đó.

### Tài liệu tham khảo

- [AWS — Deploying DynamoDB locally](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html): hướng dẫn chạy DynamoDB Local bằng Docker; áp dụng cho môi trường database local trong Compose.
- [AWS — AWS::Serverless::HttpApi](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-httpapi.html): tham khảo khai báo HTTP API và CORS; áp dụng trong template SAM của backend.
- [AWS — DynamoDB Transactions: How it works](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html): tham khảo nguyên tắc các thao tác cùng thành công hoặc cùng thất bại; áp dụng khi giảm chỗ và ghi đăng ký/khóa chống trùng.

Các nguồn này đã được dẫn trong tài liệu backend/contract, nhưng chưa xác định được ngày tham khảo ban đầu của giai đoạn nền; không gán ngày đối chiếu lại thành ngày triển khai.

### Minh chứng thực hiện

- [Báo cáo nền lưu trong Git](https://github.com/leanhquan0211/FCAJ-23521254-23521225/blob/b7e1b889029938e0a68ab1acd89bf1f6dffc156b/phuc-worklog/Reports/BC.txt): đối chiếu các chức năng và kết quả kiểm tra đã ghi nhận trước đợt quản trị; báo cáo không đủ mốc ngày chi tiết.

## 16/10/2026 — Tuần 3

### Công việc chính

| Hạng mục | Kết quả |
| --- | --- |
| Xác thực và quản trị sự kiện | Thêm đăng nhập/session/đăng xuất Admin, API và giao diện tạo/sửa/xóa, mở/đóng đăng ký. Backend kiểm tra quyền, Origin/CSRF, giới hạn đăng nhập và version khi cập nhật. |
| Bảo toàn số chỗ | Khi sửa sức chứa, giữ số chỗ đã dùng; không giảm dưới mức đã đăng ký. Ở mốc này chặn xóa sự kiện có người; quy tắc xóa được thay đổi ngày 23/10. |
| Tích hợp giao diện | Thêm chọn vai trò, trang quản trị, proxy API cùng origin; giữ thiết kế và component hiện có, không thêm dependency. |
| Dọn dữ liệu mẫu | Xác minh tám sự kiện mẫu không có đăng ký thật rồi xóa đúng tám sự kiện, giữ tài khoản Admin và volume dữ liệu. Đổi init mặc định thành chỉ tạo bảng; thêm mẫu phải dùng --seed-demo, không ghi đè bản ghi cũ. |

### Kiểm tra

- Đợt quản trị: 45 unit và 2 integration đạt; HTTP, trình duyệt, SAM build/validate và frontend build/lint đạt. Kiểm tra tranh chỗ, chống trùng, quyền, CSRF, xung đột version và responsive.
- Đợt dọn mẫu: 46 unit đạt, 2 integration bỏ qua; handler/service với DB thật xác nhận danh sách trống và dữ liệu ngoài sự kiện không đổi. Không chạy lại SAM HTTP/browser trong đợt dọn.
- Các số liệu trên thuộc từng lượt kiểm tra ngày 16/10, không cộng thành một suite hoặc coi là trạng thái DB hiện tại.

### Tài liệu tham khảo

- [OWASP — Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): kiểm tra quyền ở backend trên từng request; áp dụng để chặn truy cập API Admin khi chưa đủ quyền.
- [OWASP — Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): tham khảo băm mật khẩu với salt riêng; áp dụng scrypt cho tài khoản Admin.
- [OWASP — Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html): tham khảo thông báo đăng nhập sai và giới hạn lượt thử; áp dụng trong luồng đăng nhập Admin.
- [OWASP — Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): tham khảo cookie HttpOnly/SameSite, thời hạn và thu hồi phiên; áp dụng cho session và đăng xuất Admin.
- [OWASP — CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html): tham khảo CSRF token và kiểm tra Origin; áp dụng cho thao tác ghi đã xác thực.
- [Schema.org — Event](https://schema.org/Event): tham khảo thông tin tên, mô tả, thời gian, địa điểm, đơn vị tổ chức và sức chứa; chọn các trường phù hợp cho mô hình sự kiện của dự án.
- [AWS — DynamoDB Transactions: How it works](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html): tham khảo transaction có điều kiện; áp dụng để dọn đúng dữ liệu mẫu đã xác minh và dừng nếu bản ghi vừa thay đổi.

Nhật ký gốc ghi nhận các nguồn này được dùng và kiểm tra ngày 16/10/2026. Thời hạn phiên, ngưỡng giới hạn đăng nhập và quy tắc xóa là lựa chọn của dự án, không phải giá trị bắt buộc từ tài liệu.

### Minh chứng thực hiện

- [Bản ghi nâng cấp quản trị](https://github.com/leanhquan0211/FCAJ-23521254-23521225/blob/b7e1b889029938e0a68ab1acd89bf1f6dffc156b/phuc-worklog/week-3/2026-10-16-role-admin-event-management.md): chức năng Admin, quy tắc giữ chỗ và các lượt kiểm tra của đợt nâng cấp.
- [Bản ghi dọn dữ liệu mẫu](https://github.com/leanhquan0211/FCAJ-23521254-23521225/blob/b7e1b889029938e0a68ab1acd89bf1f6dffc156b/phuc-worklog/week-3/2026-10-16-don-du-lieu-mau.md): xác minh tám sự kiện mẫu, điều kiện bảo toàn dữ liệu và kiểm tra sau dọn.

Đây là nguồn lịch sử được giữ trong Git, không phải hướng dẫn chạy hoặc trạng thái hệ thống hiện hành.

## 23/10/2026 — Tuần 4

### Công việc chính

| Hạng mục | Trước cập nhật | Kết quả sau cập nhật |
| --- | --- | --- |
| Tài khoản người tham gia | Chỉ Admin có tài khoản; khách đăng ký sự kiện bằng tên/email | Thêm đăng ký, đăng nhập, kiểm tra phiên và đăng xuất cho User; mật khẩu được băm, email duy nhất, không tự cấp quyền Admin. |
| Đặt vé và chống trùng | Ghi danh theo email trong từng sự kiện | Gắn vé với userId; mỗi User tối đa một vé/sự kiện. Mở rộng transaction giữ chỗ để kiểm tra tài khoản và ghi vé, liên kết sở hữu, idempotency cùng nhau. |
| Khôi phục yêu cầu gửi lặp | Chưa có key ổn định giữa các lần gửi HTTP | Thêm Idempotency-Key; gửi lại cùng key/nội dung nhận đúng vé đã lưu, không trừ thêm chỗ. Cùng key nhưng đổi nội dung bị từ chối. |
| Giờ mở bán | Chủ yếu mở/đóng đăng ký thủ công | Thêm salesOpenAt; backend kiểm tra giờ mở bán, trạng thái, thời điểm diễn ra và số chỗ theo giờ server. |
| Quyền xem vé | Kết quả đăng ký chưa gắn tài khoản sở hữu | Thêm Vé của tôi và kiểm tra chủ vé ở backend. Dữ liệu cũ chưa có userId được giữ nguyên, không tự gán theo email. |
| Điều hướng và phiên đăng nhập | Trang chọn khu vực, điều hướng User/Admin dễ lẫn; từng có hai phiên riêng | Chuyển sang một form đăng nhập, menu theo vai trò và một tài khoản đang dùng trong cùng browser/profile; đồng bộ đổi tài khoản/đăng xuất giữa các tab. |
| Giao diện ứng dụng | Chưa có khung điều hướng thống nhất | Thêm sidebar trái, navbar, vị trí trang hiện tại và đăng xuất. Sidebar cả hai vai trò thu gọn được, có nhãn hướng dẫn bằng chuột/bàn phím, nhớ lựa chọn; điện thoại dùng menu đầy đủ. |
| Xóa sự kiện | Chặn xóa khi có chỗ đã dùng | Cho Admin xóa cả sự kiện có người; dọn vé, ghi danh và idempotency của sự kiện, giữ tài khoản và dữ liệu sự kiện khác. |
| Quản lý User | Chưa có trang quản lý | Thêm danh sách hiện tên/email, tìm theo tên/email, sửa thông tin và xóa User. Sửa email có kiểm tra trùng và version để tránh ghi đè; vé cũ giữ thông tin lúc đăng ký. |
| Xóa User | Chưa hỗ trợ | Khóa truy cập trước, hủy vé và trả chỗ cho sự kiện còn hoạt động; gửi lại thao tác không trả chỗ hai lần, không ảnh hưởng người khác. |
| Tổ chức mã nguồn và bàn giao | Ứng dụng và bộ kiểm thử ở nhiều nhánh riêng | Chuẩn hóa API contract/data model, hợp nhất các nhánh vào phuc, giữ main và xóa nhánh feature đã gộp. Bộ test lab của bên kiểm thử được giữ nguyên, chưa tự đổi adapter. |

Đã sửa các lỗi tìm thấy khi kiểm tra: vé còn sót sau khi xóa sự kiện bị gián đoạn; vùng bấm icon sai khi ghép tooltip với menu; thông báo lỗi xóa bị mất sau tải lại; form sửa tài khoản giữ version cũ. Các trường hợp này đã được kiểm tra lại.

### Kiểm tra

| Phạm vi | Kết quả đã ghi nhận trong ngày |
| --- | --- |
| Backend với DynamoDB Local | 75/75 bài đạt, gồm 63 bài không cần DB và 12 integration. Có tranh chỗ cuối, chống trùng, replay, quyền xem vé, xóa đồng thời và tiếp tục sau gián đoạn. |
| HTTP và trình duyệt | Luồng tài khoản, đặt/xem vé, quản lý sự kiện/User và sidebar đạt. Đã thử mất phản hồi sau khi lưu để xác nhận không tạo thêm vé; kiểm tra giao diện ở 320/375/414/768/1280px. |
| Build và cấu hình | SAM build/validate, frontend build/lint đạt; còn hai cảnh báo Fast Refresh có sẵn. |
| Sau hợp nhất Git | 63 bài backend và 28 bài unit test lab đạt; build/lint cả web sản phẩm và dashboard đạt. 12 bài DB được bỏ qua ở lượt này vì Docker đã tắt, không phải chạy lại toàn bộ 75 bài. |

Các bài ghi/xóa dùng bảng test riêng. Bài tranh chỗ đã kiểm tra ở quy mô 8 người/1 chỗ; **chưa phải kết quả 100 người hoặc bằng chứng scaling AWS**. Unit/build của test lab chỉ xác nhận phần công cụ được kiểm tra, không thay bài tích hợp với ứng dụng hiện hành.

### Tài liệu tham khảo

- [AWS — DynamoDB Transactions: How it works](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html): áp dụng transaction và điều kiện ghi để kiểm tra tài khoản, giảm chỗ, lưu vé/liên kết/idempotency cùng nhau; cũng dùng khi hủy vé và trả chỗ để tránh hoàn hai lần.
- [AWS Builders’ Library — Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/): tham khảo khóa yêu cầu theo người gọi, gửi lại nhận kết quả tương đương và từ chối cùng khóa nhưng đổi nội dung; áp dụng vào luồng đặt vé khi mất phản hồi. Tên header, mã HTTP và thời gian giữ key là lựa chọn của dự án.
- [OWASP — Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): áp dụng kiểm tra quyền từng request cho User/Admin và kiểm tra chủ sở hữu vé; menu theo vai trò chỉ hỗ trợ điều hướng.
- [OWASP — Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): tiếp tục áp dụng băm mật khẩu bằng scrypt với salt riêng khi bổ sung tài khoản User.
- [OWASP — Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): áp dụng cookie HttpOnly, kiểm tra và thu hồi phiên phía server khi thống nhất đăng nhập User/Admin. Quyết định dùng một cookie chung trong browser/profile đến từ yêu cầu dự án.
- [OWASP — CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html): tiếp tục kiểm tra Origin và CSRF token khi đặt vé, sửa/xóa sự kiện và quản lý User.
- [Git — git-worktree](https://git-scm.com/docs/git-worktree): tham khảo cách tạo thư mục làm việc riêng để phát triển ứng dụng song song với bộ kiểm thử. Sau đó các nhánh được hợp nhất vào phuc theo yêu cầu; giữ thư mục detached có dữ liệu local cần bảo toàn.

Nguồn transaction, idempotency, session, CSRF và worktree đã được ghi nhận trong tài liệu phối hợp của phiên 23/10; nguồn phân quyền và mật khẩu được kế thừa từ đợt 16/10. Đây là cơ sở giải pháp, không phải xác nhận từ AWS/OWASP rằng hệ thống đã vượt qua kiểm thử.

### Minh chứng thực hiện

- [Commit tài khoản và đặt vé](https://github.com/leanhquan0211/FCAJ-23521254-23521225/commit/1688c9809ec27eed1a03a01cde262b6afce0f8c3): thay đổi User, lịch mở bán, quyền sở hữu vé và idempotency.
- [Commit phiên chung và xóa ghi danh](https://github.com/leanhquan0211/FCAJ-23521254-23521225/commit/a10907f0287acd7c664b3902b55968565e66042b): đăng nhập chung, điều hướng theo vai trò và xóa sự kiện kèm ghi danh.
- [Commit quản lý User và sidebar](https://github.com/leanhquan0211/FCAJ-23521254-23521225/commit/9d47cff71a8f75e9c42845700d497cf029a56b16): quản lý tài khoản, hủy vé/trả chỗ và thu gọn sidebar.
- [booking.py](../backend/lambda/booking.py): quy tắc đặt vé, chống trùng, gửi lại và quyền xem vé.
- [session.py](../backend/lambda/session.py): cookie chung, kiểm tra phiên và phân quyền.
- [event_deletion.py](../backend/lambda/event_deletion.py): khóa và dọn dữ liệu theo sự kiện.
- [account_repository.py](../backend/lambda/account_repository.py): sửa/xóa User, hủy vé và hoàn chỗ bằng transaction.
- [AppShell.tsx](../frontend/src/components/AppShell.tsx): menu theo vai trò, navbar và sidebar thu gọn.
- [AdminAccountsPage.tsx](../frontend/src/pages/admin/AdminAccountsPage.tsx): tìm kiếm, chỉnh sửa và xác nhận xóa tài khoản.
- [Test backend](../tests/backend/test_unified_integration.py): các ca hồi quy session, xóa đồng thời, tiếp tục sau gián đoạn và bảo toàn dữ liệu.
- [HTTP account](../backend/tools/check_accounts_api.py): kịch bản kiểm tra API quản lý tài khoản trên bảng test riêng.
- [Browser account](../tests/frontend/check-accounts-browser.mjs): kịch bản kiểm tra thao tác quản lý tài khoản và sidebar trên trình duyệt.

Kết quả đạt ở trên dựa trên đầu ra kiểm tra trong phiên phát triển. Các file test mô tả ca kiểm tra, không tự chứng minh đã chạy đạt; lượt chỉnh tài liệu này không chạy lại các bài chức năng.

## 30/10/2026 — Tuần 5 (26/10–01/11)

### Công việc chính

| Hạng mục | Trước nghiên cứu | Kết quả |
| --- | --- | --- |
| Đối chiếu bối cảnh và mã nguồn | Hướng AWS trong README ở mức dự kiến, chưa có quy trình triển khai cụ thể | Rà frontend/backend, contract/data model, cấu hình và lab; xác định các điểm đang khóa local, phần proxy Vite cần thay trên AWS và giới hạn tích hợp bộ test. Không sửa chức năng hoặc adapter. |
| Kế hoạch triển khai | Chưa có tài liệu cho lần triển khai đầu dành cho người mới | Tạo kế hoạch với sơ đồ, phần mã nguồn cần chuẩn bị, bước build/deploy, đầu ra và điều kiện nghiệm thu. Làm rõ hosting frontend và vai trò build/deploy của GitHub Actions. |
| Phân chia công việc | Ứng dụng và giám sát cùng nằm trong hướng tổng thể | Chốt hai nhiệm vụ: triển khai ứng dụng trước; CloudWatch/giám sát và SNS sau. Giữ log Lambda kỹ thuật tối thiểu ở nhiệm vụ 1 để tìm lỗi, chưa dựng dashboard/alarm/SNS. |
| Dự toán và kiểm soát chi phí | Chưa có dự toán theo nhu cầu học/demo | Tra nguồn chính thức cho bảy dịch vụ, lập kịch bản có giả định và ngân sách 5–10 USD/tháng; phân biệt giá gốc, allowance/credit và phí còn lại khi ít truy cập. Chưa xác minh billing tài khoản thực tế. |
| Vòng đời lab | Chưa có cách thu hồi gắn với lần test ngắn | Lập quy trình test vài giờ, lưu bằng chứng về máy, destroy và kiểm kê tài nguyên còn sót; nêu cách xử lý S3 versions, log, backup nếu có, state và độ trễ billing. Chưa tạo hoặc xóa tài nguyên AWS. |
| Tài liệu tiếp tục | Chưa có handoff trong thư mục hiện tại | Tạo và theo dõi handoff theo yêu cầu đầu phiên; Checkpoint cập nhật nhật ký, bối cảnh và trạng thái kế hoạch đã chốt. |

Kiến trúc/trạng thái hiện hành xem [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md); luồng triển khai, dự toán và cách thu hồi chi tiết nằm trong [kế hoạch AWS](../docs/aws-deployment-plan.md). Hoàn thành phần nghiên cứu và chốt kế hoạch; chưa thực hiện hai nhiệm vụ triển khai.

### Kiểm tra và giới hạn bằng chứng

- Kiểm tra Git: nhánh `phuc`, HEAD `e356eb6`; khi bắt đầu repo sạch trên `main`, main/phuc cùng commit, sau đó chuyển sang `phuc`. Các thay đổi trong phiên là tài liệu, chưa commit/push.
- Đối chiếu code xác nhận backend vẫn dùng DB Local/credentials giả, SAM là template local, chưa có Terraform triển khai. App trả contract 4.1; lab còn health 3.0/cookie cũ, chỉ nhận HTTP loopback và giới hạn 5.000 request đo. Chưa dùng được lab hiện tại để kết luận tải AWS.
- Checkpoint kiểm tra 71 liên kết nội bộ và whitespace/code fence trong bốn file WORKLOG/PROJECT_CONTEXT/kế hoạch/handoff, không thiếu đích; xác nhận lịch sử WORKLOG được giữ, chỉ có một mục ngày 30/10, AI_RULE và code không đổi. Tính lại ví dụ API/Lambda/DB request units ở 100.000 và 1 triệu lượt được subtotal 0,62 và 6,20 USD. Đây là kiểm tra tài liệu/phép tính với duration/RRU/WRU giả định, chưa phải kết quả đo ứng dụng hoặc bill; chưa render Mermaid.
- Chưa chạy lại unit/integration, frontend build/lint, SAM, HTTP/browser hoặc test tải trong phiên; các kết quả 23/10 ở trên là lịch sử. Chưa truy cập tài khoản AWS, xác minh Free Tier/credit, tạo cảnh báo, deploy hoặc destroy. Không bật/tắt môi trường local và không ghi/xóa dữ liệu.
- Điểm tiếp tục là xác minh tài khoản/quyền/region/ngân sách và công cụ trước khi chuẩn bị cấu hình/IaC theo nhiệm vụ 1; giữ phạm vi kế hoạch đã chốt. Thông số tài khoản/quota/ngưỡng tải và kết quả AWS vẫn cần bằng chứng ở giai đoạn tương ứng.

### Tài liệu tham khảo

Các nguồn sau được đọc trong phiên **30/10/2026** để nghiên cứu, giải thích và lập kế hoạch; các ứng dụng vào AWS dưới đây **chưa triển khai**.

- [AWS — CloudFront với S3 origin](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/GettingStarted.SimpleDistribution.html) và [OAC cho S3](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html): cơ sở đề xuất lưu bản build frontend trên bucket riêng tư và phân phối qua HTTPS.
- [AWS — Managed origin request policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html) và [managed cache policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html): cơ sở đề xuất chuyển cookie/header tới API Gateway và không cache API có phiên đăng nhập.
- [AWS — HTTP API/Lambda integration](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html): đề xuất giữ payload v2/cookie và các route cụ thể tương thích handler hiện tại.
- [AWS — Python deployment package](https://docs.aws.amazon.com/lambda/latest/dg/python-package.html): đề xuất đóng gói handler/dependency tương thích Lambda, không upload venv Windows.
- [AWS — Lambda logs](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs.html): làm rõ log cơ bản cần quyền execution role và có phí CloudWatch, tách khỏi dashboard/alarm của nhiệm vụ 2.
- [AWS — Giá S3](https://aws.amazon.com/s3/pricing/), [Calculator assumptions](https://aws.amazon.com/calculator/calculator-assumptions/) và [CloudFront pay-as-you-go](https://aws.amazon.com/cloudfront/pricing/pay-as-you-go/): tham chiếu dự toán dung lượng/request, allowance và giới hạn của phép ước tính, chưa xác minh ưu đãi account.
- [AWS — Giá HTTP API](https://aws.amazon.com/api-gateway/pricing/) và [giá Lambda](https://aws.amazon.com/lambda/pricing/): tham chiếu phép tính theo lượt gọi, bộ nhớ và thời gian chạy; số lượt/duration trong plan là giả định.
- [AWS — Giá DynamoDB](https://aws.amazon.com/dynamodb/pricing/) và [DynamoDB transactions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html): tham chiếu dự toán theo đơn vị đọc/ghi và lưu trữ, không quy một booking thành một lần ghi.
- [AWS — Giá CloudWatch](https://aws.amazon.com/cloudwatch/pricing/) và [SNS FAQ, mục Billing](https://aws.amazon.com/tr/sns/faqs/): tham chiếu dự toán log/alarm và SNS Standard/email; phần giám sát đầy đủ thuộc nhiệm vụ 2.
- [AWS — Free Tier](https://aws.amazon.com/free/) và [AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html): đề xuất kiểm tra gói/credit và cảnh báo ngân sách, không coi Budget là trần chi tiêu tự ngắt.
- [AWS — IAM best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html): đề xuất quyền tạm thời, MFA và role có phạm vi phù hợp cho người làm việc/runtime.
- [HashiCorp — Terraform plan](https://developer.hashicorp.com/terraform/cli/commands/plan), [local backend](https://developer.hashicorp.com/terraform/language/backend/local) và [destroy](https://developer.hashicorp.com/terraform/cli/commands/destroy): đề xuất xem trước tài nguyên, giữ state local cho lab một người/một máy và thu hồi theo state kèm kiểm kê.
- [GitHub — Actions overview](https://docs.github.com/en/actions/get-started/understand-github-actions), [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) và [OIDC in AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws): phân biệt CI/CD với hosting, đề xuất tự động hóa deploy bằng quyền tạm thời sau lần đầu từ máy.
- [AWS — Delete CloudFront distribution](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/HowToDeleteDistribution.html): đề xuất pay-as-you-go cho lab thu hồi ngay; disable phải chờ cập nhật, flat-rate có ràng buộc hủy gói/chu kỳ trước xóa.
- [AWS — Empty S3 bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/empty-bucket.html) và [DeleteLogGroup](https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_DeleteLogGroup.html): đề xuất kiểm tra object versions/delete markers/upload dở và dọn log group trong teardown.
- [AWS — DynamoDB TTL](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html) và [PITR](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Point-in-time-recovery.html): đề xuất dọn session/counter có kiểm soát, giữ kiểm tra hạn ở backend và phân biệt backup/PITR khi tính phí/thu hồi.
- [AWS — Cost Explorer data](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-exploring-data.html): làm rõ dữ liệu phí có thể trễ hơn 24 giờ, cần kiểm tra lại sau thu hồi và vẫn tính phần sử dụng trước đó.

### Minh chứng thực hiện

- [Kế hoạch AWS đã chốt](../docs/aws-deployment-plan.md): sơ đồ, hai nhiệm vụ, bước triển khai, giả định chi phí, kiểm tra và thu hồi; là tài liệu chuẩn bị, không phải bằng chứng đã deploy.
- [Handoff đang theo dõi](handoffs/2026-10-30-0956.md): mục tiêu, quyết định và điểm tiếp tục của phiên; được tạo theo yêu cầu riêng đầu phiên và cập nhật tại Checkpoint.
- [Cấu hình DB](../backend/lambda/configuration.py), [handler](../backend/lambda/app.py), [SAM local](../backend/template.yaml), [profile lab](../tests/load/contract-v3-draft.json) và [guard lab](../tests/load/config.py): minh chứng cho hiện trạng local và phần cần chuẩn bị; chưa thay đổi các file này trong phiên.
