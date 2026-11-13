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
| Bộ kiểm thử tải local | Chưa có công cụ điều khiển và tổng hợp lượt tải riêng | Xây fixture tài khoản/sự kiện, kịch bản k6 hot/ramp/scarce, runner HTTP/CLI, metric và audit DB chỉ đọc. Thêm dashboard riêng để cấu hình, start/stop, theo dõi số đo và xem lại lịch sử. |
| Tổ chức mã nguồn và bàn giao | Ứng dụng và bộ kiểm thử ở nhiều nhánh riêng | Chuẩn hóa API contract/data model, hợp nhất các nhánh vào phuc, giữ main và xóa nhánh feature đã gộp. Bộ kiểm thử giữ cấu hình API 3.0; còn cần đồng bộ adapter với API 4.1. |

Đã sửa các lỗi tìm thấy khi kiểm tra: vé còn sót sau khi xóa sự kiện bị gián đoạn; vùng bấm icon sai khi ghép tooltip với menu; thông báo lỗi xóa bị mất sau tải lại; form sửa tài khoản giữ version cũ. Các trường hợp này đã được kiểm tra lại.

### Kiểm tra

| Phạm vi | Kết quả đã ghi nhận trong ngày |
| --- | --- |
| Backend với DynamoDB Local | 75/75 bài đạt, gồm 63 bài không cần DB và 12 integration. Có tranh chỗ cuối, chống trùng, replay, quyền xem vé, xóa đồng thời và tiếp tục sau gián đoạn. |
| HTTP và trình duyệt | Luồng tài khoản, đặt/xem vé, quản lý sự kiện/User và sidebar đạt. Đã thử mất phản hồi sau khi lưu để xác nhận không tạo thêm vé; kiểm tra giao diện ở 320/375/414/768/1280px. |
| Build và cấu hình | SAM build/validate, frontend build/lint đạt; còn hai cảnh báo Fast Refresh có sẵn. |
| Tích hợp lab trên API 3.0 | Lượt 2 User/4 chỗ tạo 2 vé, còn 2 chỗ; lượt 2 User/1 chỗ tạo 1 vé, 1 EVENT_FULL, còn 0 chỗ. Audit Ticket/reference/idempotency và kiểm tra bổ trợ đạt. Dashboard build/lint và browser smoke đạt; harness từ 26 bài ban đầu lên 28 bài sau bổ sung. Chi tiết runId trong minh chứng kiểm thử local. |
| Sau hợp nhất Git | 63 bài backend và 28 bài unit test lab đạt; build/lint cả web sản phẩm và dashboard đạt. 12 bài DB được bỏ qua ở lượt này vì Docker đã tắt, không phải chạy lại toàn bộ 75 bài. |

Các bài ghi/xóa dùng bảng test riêng. Ứng dụng đã kiểm tra tranh chỗ ở quy mô 8 người/1 chỗ; lab có hai lượt nhỏ trên API 3.0 nêu trên. **Chưa phải kết quả 100 người hoặc bằng chứng scaling AWS.** Kết quả lab được chọn lọc bổ sung ngày **13/11/2026** khi thống nhất nhật ký; adapter vẫn ghim API 3.0, chưa được xác nhận tương thích API 4.1. Unit/build không thay bài tích hợp với ứng dụng hiện hành.

### Tài liệu tham khảo

- [AWS — DynamoDB Transactions: How it works](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html): áp dụng transaction và điều kiện ghi để kiểm tra tài khoản, giảm chỗ, lưu vé/liên kết/idempotency cùng nhau; cũng dùng khi hủy vé và trả chỗ để tránh hoàn hai lần.
- [AWS Builders’ Library — Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/): tham khảo khóa yêu cầu theo người gọi, gửi lại nhận kết quả tương đương và từ chối cùng khóa nhưng đổi nội dung; áp dụng vào luồng đặt vé khi mất phản hồi. Tên header, mã HTTP và thời gian giữ key là lựa chọn của dự án.
- [OWASP — Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): áp dụng kiểm tra quyền từng request cho User/Admin và kiểm tra chủ sở hữu vé; menu theo vai trò chỉ hỗ trợ điều hướng.
- [OWASP — Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): tiếp tục áp dụng băm mật khẩu bằng scrypt với salt riêng khi bổ sung tài khoản User.
- [OWASP — Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): áp dụng cookie HttpOnly, kiểm tra và thu hồi phiên phía server khi thống nhất đăng nhập User/Admin. Quyết định dùng một cookie chung trong browser/profile đến từ yêu cầu dự án.
- [OWASP — CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html): tiếp tục kiểm tra Origin và CSRF token khi đặt vé, sửa/xóa sự kiện và quản lý User.
- [Git — git-worktree](https://git-scm.com/docs/git-worktree): tham khảo cách tạo thư mục làm việc riêng để phát triển ứng dụng song song với bộ kiểm thử. Sau đó các nhánh được hợp nhất vào phuc theo yêu cầu; giữ thư mục detached có dữ liệu local cần bảo toàn.
- [Grafana k6 — Cookies](https://grafana.com/docs/k6/latest/using-k6/cookies/): đối chiếu cơ chế cookie jar riêng theo User ảo trong kịch bản có phiên đăng nhập.
- [Grafana k6 — Metrics](https://grafana.com/docs/k6/latest/using-k6/metrics/): đối chiếu cách ghi nhận số request, lỗi và thời gian phản hồi; không dùng mẫu nhỏ để kết luận năng lực tối đa.
- [Grafana k6 — Per VU iterations](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/per-vu-iterations/): đối chiếu kịch bản hữu hạn theo số User và số vòng chạy, phù hợp với tập tài khoản/sự kiện chuẩn bị trước.

Nguồn transaction, idempotency, session, CSRF và worktree đã được ghi nhận trong tài liệu phối hợp của phiên 23/10; nguồn phân quyền và mật khẩu được kế thừa từ đợt 16/10. Đây là cơ sở giải pháp, không phải xác nhận từ AWS/OWASP rằng hệ thống đã vượt qua kiểm thử.

Ba tài liệu chính thức Grafana k6 được đọc và đối chiếu bổ sung ngày **13/11/2026** cho phần kiểm thử ngày 23/10; không gán mốc đối chiếu này thành ngày xây dựng hoặc chạy lại công cụ.

### Minh chứng thực hiện

- [Commit tài khoản và đặt vé](https://github.com/leanhquan0211/FCAJ-23521254-23521225/commit/1688c9809ec27eed1a03a01cde262b6afce0f8c3): thay đổi User, lịch mở bán, quyền sở hữu vé và idempotency.
- [Commit phiên chung và xóa ghi danh](https://github.com/leanhquan0211/FCAJ-23521254-23521225/commit/a10907f0287acd7c664b3902b55968565e66042b): đăng nhập chung, điều hướng theo vai trò và xóa sự kiện kèm ghi danh.
- [Commit quản lý User và sidebar](https://github.com/leanhquan0211/FCAJ-23521254-23521225/commit/9d47cff71a8f75e9c42845700d497cf029a56b16): quản lý tài khoản, hủy vé/trả chỗ và thu gọn sidebar.
- [Minh chứng kiểm thử local](references/test-lab-local.md): giữ runId, số đo và phiên bản API của các lượt public, blocked/stopped và hai lượt đặt vé nhỏ trên API 3.0 ngày 23/10.
- [Commit bộ kiểm thử 9e00d5a](https://github.com/leanhquan0211/FCAJ-23521254-23521225/commit/9e00d5a8757f60c6516e1bdbb2b4406bb3d05cad): fixture/k6/runner/dashboard và báo cáo kiểm thử gốc.
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

| Hạng mục | Trước thực hiện | Kết quả |
| --- | --- | --- |
| Đối chiếu bối cảnh và mã nguồn | Hướng AWS trong README ở mức dự kiến, chưa có quy trình triển khai cụ thể | Rà frontend/backend, contract/data model, cấu hình và lab; xác định các điểm đang khóa local, phần proxy Vite cần thay trên AWS và giới hạn tích hợp bộ test. Không sửa chức năng hoặc adapter. |
| Kế hoạch triển khai | Chưa có tài liệu cho lần triển khai đầu dành cho người mới | Tạo kế hoạch với sơ đồ, phần mã nguồn cần chuẩn bị, bước build/deploy, đầu ra và điều kiện nghiệm thu. Làm rõ hosting frontend và vai trò build/deploy của GitHub Actions. |
| Phân chia công việc | Ứng dụng và giám sát cùng nằm trong hướng tổng thể | Chốt hai nhiệm vụ: triển khai ứng dụng trước; CloudWatch/giám sát và SNS sau. Giữ log Lambda kỹ thuật tối thiểu ở nhiệm vụ 1 để tìm lỗi, chưa dựng dashboard/alarm/SNS. |
| Dự toán và kiểm soát chi phí | Chưa có dự toán và cấu hình theo dõi phù hợp ngân sách | Tra nguồn chính thức, lập kịch bản giả định theo ngân sách 5–10 USD/tháng. Đối chiếu tài khoản cá nhân Paid, credit còn 40 USD/hạn 05/2027 theo thông tin cung cấp. Hướng dẫn sửa budget hiện có từ 100 xuống 10 USD/tháng, actual 3/5/8 USD, forecast 10 USD; loại Credit/Refund và giữ email. Cấu hình ngưỡng/scope có ảnh, việc lưu có xác nhận; chưa thử gửi/nhận email. |
| Chuẩn bị máy triển khai | AWS CLI/Terraform chưa nhận diện; chưa kiểm tra build trên máy triển khai | Hoàn tất cài AWS CLI/Terraform qua winget trên máy Windows triển khai, cập nhật PATH terminal, kiểm tra Node/npm/SAM/Docker Linux. Có hướng dẫn setup riêng; tách kết quả máy triển khai được cung cấp khỏi lượt kiểm tra trực tiếp trong workspace máy khác. |
| Danh tính và phiên AWS | Ban đầu dùng root; tài khoản thử cấu hình chưa phải tài khoản triển khai cuối | Hướng dẫn tạo IAM user `fcaj-project`, MFA và đăng nhập browser bằng credential tạm thời. Chốt dùng tài khoản cá nhân; profile `fcaj-project-login` và cầu nối `fcaj-project` đã trả STS đúng tài khoản/user sau chuyển phiên. Chưa cấp/xác minh quyền triển khai tài nguyên. |
| Build và dependency | Chưa có kết quả kiểm tra trên máy triển khai | `npm ci`, frontend build và SAM Python 3.13/x86_64 container build thành công. Kiểm tra npm audit chỉ đọc, xác định 4 mục liên quan chuỗi shadcn; chưa sửa dependency hoặc tự áp dụng fix có thay đổi major. |
| Vòng đời triển khai thử | Chưa có cách thu hồi gắn với lần test ngắn | Lập quy trình test vài giờ, lưu bằng chứng, destroy/kiểm kê S3, log, backup nếu có và state. Dùng state local trên một máy; hai người cùng một phiên, không cần remote state/Actions cho lần đầu. Dự kiến dừng dùng AWS sau 12/2026; chưa tạo/xóa tài nguyên ứng dụng AWS. |
| Tài liệu tiếp tục | Chưa có handoff trong thư mục hiện tại | Tạo và theo dõi handoff theo yêu cầu đầu phiên; Checkpoint cập nhật nhật ký, bối cảnh và trạng thái kế hoạch đã chốt. |

Kiến trúc/trạng thái hiện hành xem [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md); luồng triển khai/dự toán/thu hồi nằm trong [kế hoạch AWS](../docs/aws-deployment-plan.md), lệnh cài đặt và xác thực nằm trong [hướng dẫn setup](../docs/aws-environment-setup.md). Tên dự án/profile/tài nguyên mới dùng `fcaj-project`. Đã hoàn thành nghiên cứu và phần chuẩn bị công cụ/build/đăng nhập/budget của nhiệm vụ 1; chưa triển khai ứng dụng hoặc giám sát AWS. Không đưa credit hoặc dữ liệu billing của tài khoản đã bỏ vào tài khoản triển khai hiện tại.

### Kiểm tra và giới hạn bằng chứng

- Đối chiếu các file thay đổi tại Checkpoint: chỉ tài liệu WORKLOG/PROJECT_CONTEXT/kế hoạch/setup/handoff; không sửa ứng dụng, lockfile hoặc AI_RULE.
- Đối chiếu code xác nhận backend vẫn dùng DB Local/credentials giả, SAM là template local, chưa có Terraform triển khai. App trả contract 4.1; lab còn health 3.0/cookie cũ, chỉ nhận HTTP loopback và giới hạn 5.000 request đo. Chưa dùng được lab hiện tại để kết luận tải AWS.
- Checkpoint nghiên cứu trước đó đã kiểm tra 71 liên kết và phép tính subtotal API/Lambda/DB 0,62/6,20 USD cho hai kịch bản giả định. Đây là lịch sử kiểm tra tài liệu, không phải đo ứng dụng/bill; chưa render Mermaid. Checkpoint hiện tại tiếp tục kiểm tra liên kết, whitespace, code fence và giữ nguyên lịch sử trước ngày 30/10; không chạy lại build chỉ để ghi chép.
- Checkpoint cập nhật setup đạt **72 liên kết nội bộ trong 5 file**, code fence/whitespace hợp lệ, không có Account ID hoặc URL authorize trong tài liệu. Đối chiếu hash xác nhận nội dung WORKLOG trước 30/10 và AI_RULE không đổi; số handoff vẫn là 1, không tạo file bàn giao mới.
- Đầu ra từ máy triển khai xác nhận AWS CLI **2.39.2**, Terraform **1.17.1 windows_amd64**, Node **24.14.0**, npm **11.9.0**, SAM **1.167.0**, Docker **Linux 29.4.3**, Compose **5.1.4**; `npm ci`/frontend Vite 8.3.4 build và SAM Python 3.13 container build thành công. STS qua `fcaj-project` đã đúng tài khoản cá nhân mới. Python SDK đã gọi STS qua credential_process trước lúc đổi tài khoản; chưa chạy lại SDK/Terraform provider trên tài khoản cuối.
- Trong workspace Codex cũng đã kiểm tra công cụ, bật Docker và chạy frontend/SAM build thành công; lint exit 0 với hai cảnh báo Fast Refresh. Không dùng kết quả workspace máy khác thay cho đầu ra máy triển khai. Không khởi động DB/API, không sửa/xóa dữ liệu local hoặc volume.
- `npm audit --json` tại workspace trả **4 mục: 1 low, 3 high**, gồm shadcn/registry/zod/deepmerge; `npm explain` truy vết qua shadcn 4.21.4. Chưa xác định mức ảnh hưởng tới bundle AWS, chưa sửa dependency; không tự downgrade shadcn theo đề xuất `audit fix --force`.
- Budget đã lưu theo xác nhận, ngưỡng và filter có ảnh; credit/hạn do thông tin được cung cấp, không phải Codex trực tiếp đọc billing tài khoản cuối. Chưa xác minh giao email, quyền deploy/quota hoặc tình trạng tài nguyên từ hoạt động kiếm credit. Không lưu Account ID, ARN đầy đủ hoặc thông tin đăng nhập.
- Chưa chạy lại unit/integration/HTTP/browser hoặc test tải; kết quả chức năng 23/10 là lịch sử. Chưa Terraform/plan/apply/destroy, chưa deploy/smoke/đo scaling AWS. Tiếp tục quyền triển khai/quota, tách local/AWS và xử lý dependency trong phạm vi nhiệm vụ 1 đã chốt.

### Tài liệu tham khảo

Các nguồn sau được đọc trong phiên **30/10/2026** để nghiên cứu, giải thích, lập kế hoạch và chuẩn bị môi trường. Phần cài công cụ/đăng nhập/budget đã áp dụng theo bằng chứng nêu trên; kiến trúc ứng dụng AWS, IaC và giám sát vẫn chưa triển khai.

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
- [AWS CLI installation](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html), [HashiCorp Terraform installation](https://developer.hashicorp.com/terraform/install) và [Microsoft winget install](https://github.com/microsoft/winget-cli/blob/master/doc/windows/package-manager/winget/install.md): áp dụng cài công cụ Windows, đối chiếu chữ ký MSI/checksum Terraform ở workspace và hướng dẫn cài qua winget trên máy triển khai.
- [Docker Desktop Windows](https://docs.docker.com/desktop/setup/install/windows-install/) và [SAM CLI installation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html): kiểm tra vị trí Docker per-user, WSL/Linux engine và công cụ build Lambda bằng container.
- [Create IAM user](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html), [assign MFA](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_enable_virtual.html) và [AWS CLI browser login](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sign-in.html): áp dụng user làm việc/MFA, phiên tạm thời và credential_process, hướng dẫn chuyển phiên giữa hai tài khoản.
- [AWS CLI agent-toolkit](https://docs.aws.amazon.com/cli/latest/reference/configure/agent-toolkit.html): giải thích và bỏ qua wizard skills/MCP tùy chọn, không coi là yêu cầu triển khai.
- [Choosing an account plan](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html), [Free Tier FAQ](https://aws.amazon.com/free/free-tier-faqs/) và [credit activities](https://docs.aws.amazon.com/en_en/awsaccountbilling/latest/aboutv2/free-tier-plans-activities.html): phân biệt Paid/Free, credit kiếm được và số dư; không đồng nhất hai tài khoản hoặc tự thực hiện thêm hoạt động kiếm credit.
- [GetAccountPlanState CLI](https://docs.aws.amazon.com/cli/latest/reference/freetier/get-account-plan-state.html) và [Free Tier IAM actions](https://docs.aws.amazon.com/service-authorization/latest/reference/list_freetier.html): chuẩn bị quyền chỉ đọc để đối chiếu tài khoản thử cấu hình trước khi đổi tài khoản triển khai; không cấp quyền nâng gói.
- [Viewing credits](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/useconsolidatedbilling-credits.html), [Bills](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/getting-viewing-bill.html), [edit budget](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-edit.html), [cost budget](https://docs.aws.amazon.com/cost-management/latest/userguide/create-cost-budget.html) và [budget filters](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-create-filters.html): hướng dẫn đọc thông tin chi phí, sửa budget và loại Credit/Refund; không tự đổi tên hoặc tạo budget trùng.
- [Budget best practices](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-best-practices.html) và [pricing](https://aws.amazon.com/aws-cost-management/aws-budgets/pricing/): áp dụng actual/forecast/email, làm rõ độ trễ và cảnh báo không tự chặn chi phí; chưa cấu hình Budget Actions/Reports/SNS.
- [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [deepmerge advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) và [shadcn CLI](https://ui.shadcn.com/docs/cli): tham khảo phân loại audit và vai trò dependency; chưa triển khai bản sửa.

### Minh chứng thực hiện

- [Kế hoạch AWS đã chốt](../docs/aws-deployment-plan.md): sơ đồ, hai nhiệm vụ, bước triển khai, giả định chi phí, kiểm tra và thu hồi; là tài liệu chuẩn bị, không phải bằng chứng đã deploy.
- [Handoff đang theo dõi](handoffs/2026-10-30-0956.md): mục tiêu, quyết định và điểm tiếp tục của phiên; được tạo theo yêu cầu riêng đầu phiên và cập nhật tại Checkpoint.
- [Hướng dẫn setup và kết quả xác minh](../docs/aws-environment-setup.md): phân biệt máy/tài khoản, phiên bản, nhóm lệnh build/CLI, budget và điểm còn lại; không chứa credential hoặc Account ID.
- [Cấu hình DB](../backend/lambda/configuration.py), [handler](../backend/lambda/app.py), [SAM local](../backend/template.yaml), [profile lab](../tests/load/contract-v3-draft.json) và [guard lab](../tests/load/config.py): minh chứng cho hiện trạng local và phần cần chuẩn bị; chưa thay đổi các file này trong phiên.

## 04/11/2026 — Tuần 6 (02–08/11)

Dự án được bổ sung hạ tầng AWS quản lý bằng Terraform và hoàn thành một vòng triển khai thử, sau đó thu hồi toàn bộ tài nguyên đã triển khai trong lần thử.

### Công việc chính

| Hạng mục | Trước thực hiện | Kết quả |
| --- | --- | --- |
| Danh tính triển khai AWS | Cần tài khoản làm việc riêng cho hoạt động triển khai | Tạo tài khoản IAM chuyên dụng phục vụ triển khai hạ tầng AWS. |
| Hạ tầng bằng Terraform | Dự án mới có kế hoạch AWS và môi trường chạy local | Bổ sung cấu hình Terraform cho S3 lưu frontend, CloudFront/OAC phân phối website, HTTP API Gateway kết nối Lambda, DynamoDB lưu dữ liệu, IAM role/policy và log Lambda. |
| Ứng dụng chạy trên AWS | Backend và công cụ tạo Admin phục vụ môi trường local | Bổ sung lựa chọn môi trường local/AWS, sử dụng cơ chế credential của SDK khi chạy AWS; điều chỉnh Origin/CORS và công cụ tạo Admin cho môi trường triển khai. |
| Tích hợp giao diện | Các cập nhật giao diện chưa được đồng bộ vào nhánh làm việc | Tích hợp tùy chỉnh màu sắc, bo góc, điều hướng danh mục và lưu tùy chọn giao diện; kiểm tra frontend build/lint sau tích hợp. |
| Triển khai thử và thu hồi | Chưa thực hiện vòng triển khai ứng dụng lên AWS | Triển khai thử ngày 04/11, sau đó dùng Terraform thu hồi toàn bộ tài nguyên đã triển khai trong lần thử cùng ngày. Bổ sung script kiểm kê tài nguyên sau thu hồi. |

### Kiểm tra và kết quả

- Frontend build thành công; lint exit 0, còn hai cảnh báo Fast Refresh tại badge/button.
- Đã triển khai thử và thu hồi toàn bộ tài nguyên của lượt thử ngày **04/11/2026**. Kết quả thu hồi được xác nhận bổ sung ngày **11/11/2026**.
- Chưa có kết quả kiểm thử tải lớn hoặc số đo scaling AWS trong báo cáo tuần này. Giám sát đầy đủ bằng dashboard/alarm/SNS vẫn thuộc giai đoạn tiếp theo.

### Tài liệu tham khảo

Các nguồn dưới đây là tài liệu chính thức do **AWS** và **HashiCorp** phát hành, được đọc và đối chiếu ngày **11/11/2026** để bổ sung cơ sở kỹ thuật cho công việc ngày 04/11.

- [AWS — Create an IAM user in your AWS account](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html): hướng dẫn tạo IAM user, lựa chọn phương thức truy cập và gán quyền; đối chiếu việc tạo danh tính chuyên dụng cho triển khai.
- [HashiCorp — Create infrastructure](https://developer.hashicorp.com/terraform/tutorials/aws-get-started/aws-create): hướng dẫn khai báo provider/resource, khởi tạo, kiểm tra cấu hình và áp dụng thay đổi; đối chiếu cách tổ chức Terraform và quy trình tạo hạ tầng AWS của dự án.
- [AWS — Restrict access to an Amazon S3 origin](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html): hướng dẫn CloudFront OAC và bucket policy; đối chiếu cấu hình phân phối frontend từ S3 riêng tư.
- [AWS — Create AWS Lambda proxy integrations for HTTP APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html): hướng dẫn kết nối HTTP API với Lambda và payload v2; đối chiếu cấu hình API Gateway của dự án.
- [AWS — Lambda execution role](https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html): hướng dẫn IAM role để Lambda truy cập dịch vụ AWS và ghi log; đối chiếu quyền DynamoDB/CloudWatch Logs trong cấu hình hạ tầng.
- [HashiCorp — terraform destroy](https://developer.hashicorp.com/terraform/cli/commands/destroy): hướng dẫn thu hồi các tài nguyên do cấu hình Terraform quản lý; đối chiếu bước dọn môi trường sau triển khai thử.

### Minh chứng thực hiện

- [Commit hạ tầng d4611f1](https://github.com/leanhquan0211/FCAJ-23521254-23521225/commit/d4611f127e64757ae7a5160136a09c0790139e86), ngày **04/11/2026**: mã Terraform, thay đổi backend hỗ trợ AWS và công cụ kiểm kê sau thu hồi.
- [Cấu hình hạ tầng](../infra/providers.tf), [cấu hình local/AWS](../backend/lambda/configuration.py), [công cụ tạo Admin](../backend/tools/create_admin.py) và [script kiểm kê](../infra/verify_cleanup.ps1): các phần mã nguồn được bổ sung trong đợt triển khai.
- [Thiết kế giao diện](../frontend/DESIGN.md) và [lưu tùy chọn giao diện](../frontend/src/lib/appearance-preferences.ts): phần frontend được tích hợp và kiểm tra build/lint.
- Xác nhận ngày **11/11/2026** về kết quả ngày **04/11/2026**: đã tạo IAM chuyên dụng, triển khai thử lên AWS và dùng Terraform thu hồi toàn bộ tài nguyên đã triển khai trong lần thử.

## 13/11/2026 — Tuần 7 (Giám sát CloudWatch và kiểm thử AWS)

### Công việc chính

| Hạng mục | Trước triển khai | Kết quả |
| --- | --- | --- |
| Thiết kế Dashboard giám sát | Chưa có dashboard trực quan, cần dùng AWS CLI hoặc vào từng service riêng lẻ | Thiết kế CloudWatch Dashboard (`fcaj-event-workshop-dashboard`) thân thiện với sinh viên/người dùng phổ thông: 3 widget chỉ số chính (Tổng lượt gọi, Số lỗi, Tốc độ phản hồi ms); 3 biểu đồ chuỗi thời gian (Thời gian xử lý Lambda, Lưu lượng API Gateway theo mã lỗi 4xx/5xx, Đơn vị đọc/ghi DynamoDB); 1 bảng nhật ký lỗi tự động lọc log qua CloudWatch Logs Insights. |
| Tự động hóa cảnh báo (Alarms) | Chưa có cảnh báo khi hệ thống gặp sự cố | Khởi tạo 2 CloudWatch Metric Alarms tự động: cảnh báo khi Backend phát sinh lỗi $\ge 1$ lỗi / 5 phút (`fcaj-event-workshop-lambda-errors`) và cảnh báo khi độ trễ trung bình $\ge 3000\text{ ms}$ (`fcaj-event-workshop-lambda-high-latency`). Trạng thái tự đánh giá `OK`. |
| Mã hóa hạ tầng Terraform | Chưa có cấu hình CloudWatch trong `infra/` | Viết mới `infra/cloudwatch.tf`, cập nhật `infra/outputs.tf` xuất ra tên Dashboard và đường link trực tiếp truy cập trên AWS Console (`cloudwatch_dashboard_url`). Đạt chuẩn Free Tier (3 dashboard, 10 alarms miễn phí). |
| Triển khai & Kiểm thử thực tế | Chưa kết nối metrics với lưu lượng thực | Chạy `terraform apply` thành công toàn bộ hạ tầng. Kiểm thử gọi API `/health`, đăng ký tài khoản mới và đăng nhập. Kiểm tra dữ liệu metrics thực tế ghi nhận qua AWS CLI `aws cloudwatch get-metric-data`. |
| Cập nhật quy trình thu hồi (Teardown) | `verify_cleanup.ps1` chưa kiểm tra CloudWatch Dashboards & Alarms | Bổ sung hàm kiểm tra dọn sạch CloudWatch Dashboards và Metric Alarms vào `infra/verify_cleanup.ps1`. |

### Kiểm tra và bằng chứng

- Kiểm tra cú pháp và validate Terraform: `terraform validate` và `terraform fmt` đạt chuẩn.
- Bằng chứng triển khai CloudWatch:
  - Dashboard ARN: `arn:aws:cloudwatch::059898286806:dashboard/fcaj-event-workshop-dashboard`
  - Lambda Errors Alarm: `arn:aws:cloudwatch:us-east-1:059898286806:alarm:fcaj-event-workshop-lambda-errors` (Trạng thái: `OK`)
  - Lambda Latency Alarm: `arn:aws:cloudwatch:us-east-1:059898286806:alarm:fcaj-event-workshop-lambda-high-latency` (Trạng thái: `OK`)
- Bằng chứng ghi nhận dữ liệu: Gọi API đăng ký/đăng nhập sinh ra các data points Invocations và Duration hiển thị trực tiếp trên Dashboard.

### Tài liệu tham khảo

- [AWS — Amazon CloudWatch Dashboards](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Dashboards.html): hướng dẫn cấu hình widget, single-value number và biểu đồ thời gian.
- [AWS — Using CloudWatch Alarms](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html): hướng dẫn tạo cảnh báo theo ngưỡng số lỗi và độ trễ.
- [AWS — CloudWatch Logs Insights Query Syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_AnalyzeLogData-insights.html): cú pháp truy vấn lọc log lỗi tự động hiển thị lên dashboard widget.


### Mở rộng Test Lab từ local API 3.0 sang AWS API 4.1

| Hạng mục | Trước | Kết quả |
| --- | --- | --- |
| Kết nối và contract | Runner chỉ nhận HTTP loopback, adapter 3.0/cookie cũ | Adapter 4.1, cookie event_session, login identifier/password; nhận HTTPS /api trên CloudFront, kiểm chính xác hostname/bảng/Lambda ARN. |
| Đồng bộ triển khai | URL mẫu cố định, dễ cũ sau destroy/apply | Đọc tọa độ công khai từ Terraform state gốc mỗi lần khởi động; state thiếu thì dừng. Preflight health/SDK, kiểm hash và LastModified Lambda trước/sau bài đo. |
| Môi trường và dữ liệu | Đề xuất nháp tách stack test | Phạm vi đã chốt là kiểm thử trên chính hạ tầng ứng dụng hiện tại, dùng event/User test có manifest theo run; không tạo stack song song, không reset bảng hoặc ghế có sẵn. |
| Tải và kịch bản | hot/scarce/ramp giới hạn 100 User, 5.000 request | Giữ ba kịch bản đủ vé/tranh vé/tăng–giữ–giảm; tối đa 500 người, 50.000 request đo, trần thời gian và nút dừng. Phân biệt tạo dữ liệu, khoảng đo và kiểm tra bổ trợ. |
| Chuẩn bị tài khoản | Mỗi bài đặt vé tạo User mới, không giữ mật khẩu | Pool mã hóa Windows DPAPI ngoài Git, dùng lại User còn hợp lệ và tạo thêm khi thiếu; login/CSRF/key riêng mỗi người, event mới mỗi lượt. User cũ không có credential pool không tự dùng lại/reset mật khẩu. |
| Rate limit | Signup/login IP là 120/900 giây | Cập nhật hai giới hạn IP lên 2.000/900 giây, giữ login-account=10. Terraform fmt-check/validate đạt; người dùng apply, sau đó đọc AWS xác nhận giá trị thực. Không xóa counter hoặc giả IP. |
| Lỗi giờ mở bán | Chờ dựa vào ước lượng clock và biên nhỏ | Phát hiện 10 POST đến trước mở bán; sửa runner chờ API xác nhận event mở trước k6. Đây không phải bài kiểm tra ranh giới mở bán chính xác. |
| Dashboard | Giao diện local nhiều nhãn kỹ thuật | Tiếng Việt theo bước, mức tải chọn sẵn, phần chi tiết thu gọn; số dùng lại/tạo mới, lịch sử/JSON, biểu đồ request và CloudWatch. |
| Trực quan luồng | Chưa có sơ đồ hoạt động | SVG k6 → CloudFront → API Gateway → Lambda → DynamoDB, tuyến runner chuẩn bị/audit; sáng theo tiến độ polling, dừng khi kết thúc/mất kết nối, hỗ trợ reduced motion/mobile. Ghi rõ không phải trace từng request. |
| Cleanup | Cleanup bảng local riêng | Thêm xem kế hoạch và xóa đúng event/User sở hữu qua API versioned, tiếp tục202 có giới hạn; giữ User pool. Pending response/đổi môi trường/chủ sở hữu chặn dọn. Chưa chạy cleanup AWS thật. |

### Kiểm tra và kết quả Test Lab

- Kiểm tra cuối trước hợp nhất: **48 unit test đạt**; k6 2.3.0 inspect đã đạt, smoke k6 thật gửi 4 request tới HTTP stub localhost đạt. Dashboard TypeScript/Vite build và Oxlint đạt; diff whitespace đạt. Không chạy lại tải AWS trong bước rà soát/hợp nhất.
- Chromium dùng response fixture chặn tại trình duyệt: 320/375/414/768/1280px không tràn ngang, chọn preset không tự chạy, khóa ghi, sơ đồ preview/preparing/running/failed/stopped/disconnected và reduced motion đạt, không có uncaught exception. Đây không phải dữ liệu nghiệm thu tải AWS.
- Preflight AWS thật đã đọc health4.1, đúng bảng/Lambda, hash triển khai; DescribeTable/Scan giới hạn để kiểm quyền audit đạt. Không xuất record, credential, cookie hoặc mật khẩu vào nhật ký/Git.
- Các bài do người dùng khởi động qua dashboard, kết quả được đối chiếu report/raw metric; số request dưới đây chỉ thuộc khoảng đo, không gồm signup/login/fixture hoặc kiểm tra bổ trợ.

| Run ID | Bài AWS đã chạy | Kết quả |
| --- | --- | --- |
| 599b627372c94a16900116d5 | 2 người / 4 vé | Đạt: 2 vé, còn 2 chỗ; audit và kiểm tra bổ trợ đạt. |
| 7dfc0319872547cdbed262db | 2 người / 1 vé | Đạt: 1 vé, 1 hết vé, còn 0; audit và kiểm tra bổ trợ đạt. |
| 68dab9d49b9c425998c7a75f | Ramp đọc 10 người | Đạt: 522/522 request thành công. |
| 47d1eb74a61348c9a2cef50f | Ramp đọc 100 người | Đạt: 5.281/5.281 request thành công. |
| 5cd3993996d049d6a3d0042b | Ramp đọc 500 người | Không đạt: 13.430 thành công, 13.084 HTTP503 trên 26.514 request. |
| b1490eda92cb4e09b3c451f1 | 10 người / 1 vé, trước sửa gate | Không đạt: 10 POST SALES_NOT_OPEN; chưa tạo vé, còn nguyên 1 chỗ. Đã sửa công cụ, giữ report lỗi gốc. |
| 3a0152a880d3455a9a1a1ff6 | 10 người / 20 vé | Đạt: 10 vé mới; audit đạt. |
| 68dbe7bad8eb4c69944ce28e | 10 người / 2 vé | Đạt: 2 vé, 8 hết vé; audit đạt. |
| 62e12325812f45d9b8a0e184 | 10 người / 1 vé, sau sửa gate và pool | Đạt: 1 vé, 9 hết vé; dùng lại 10 User, tạo mới 0; audit đạt. |
| 75428eac7d5146f9a40c94b0 | 20 người / 2 vé | Không đạt tải: 2 vé, 10 hết vé, 8 HTTP503; audit/kiểm tra bổ trợ đạt. Dùng lại 10 User, tạo thêm 10; CloudWatch phút đo concurrency10, Throttles8. |
| 9e32825120184999bab6f449 | 15 người / 1 vé | Không đạt: 1 vé, 11 hết vé, 5 HTTP5xx tính trên cả GET/POST; audit đạt, dùng lại15 User, tạo mới0. |
| 3745be907f8c459f91e0a7ed | Ramp đọc 110 người | Không đạt: 5.720 request, có30 HTTP5xx. Chưa đối chiếu nguyên nhân riêng của lượt này. |

### Chẩn đoán và giới hạn còn lại

- GetAccountSettings và Service Quotas xác nhận Lambda concurrency tài khoản us-east-1 là **10**, Adjustable=true, function không đặt reserved concurrency. Người dùng quyết định giữ mức10; không gửi yêu cầu tăng quota hoặc bật Provisioned Concurrency.
- Bài500: CloudWatch các phút đo concurrency Maximum10, tổng Throttles13.087, LambdaErrors0; đếm log Database unavailable trong đúng khoảng đo là0. Số theo phút có thể gồm truy cập ngoài run, không đòi trùng hoàn toàn với13.084 HTTP503 phía k6. Bằng chứng cho thấy nút giới hạn Lambda; trần gọi đồng bộ theo quota là100 request/giây, không phải throughput được bảo đảm.
- Audit đúng không đồng nghĩa toàn bài đạt: ví dụ20người vẫn giữ đúng2vé/0chỗ nhưng8request lỗi kỹ thuật. LambdaErrors không bao gồm throttled invocation; hai alarm Errors/Duration quan sát được làOK và chưa có AlarmActions. Chưa kiểm chứng SNS/email hoặc ngưỡng cảnh báo Throttles/API5xx.
- Chưa xác nhận hệ thống phục vụ ổn định500người hoặc đủ toàn bộ tiêu chí autoscaling. Không giảm tải/bỏ lỗi để đổi report thất bại thành đạt. Pool chỉ tái sử dụng tài khoản, không nâng năng lực hạ tầng.
- Report/raw metric/pool/browser profile giữ local tại tests/results và gitignore. Pool mã hóa phụ thuộc Windows user; chưa hỗ trợ kho bí mật đa máy. Không đưa mật khẩu Admin/User, session hoặc raw Terraform state vào Git. Dữ liệu thử AWS được giữ để đối chiếu, chưa tự dọn tài nguyên.

### Tài liệu tham khảo cho phần kiểm thử

- [AWS — Monitoring concurrency](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-concurrency.html): đọc ConcurrentExecutions Maximum theo phút, phân biệt concurrency với số môi trường giữ ấm.
- [AWS — Types of Lambda metrics](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html): phân biệt Invocations, Errors, Throttles và Duration; áp dụng chẩn đoán bài500/20người.
- [AWS — Understanding Lambda scaling](https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html): quota tài khoản và giới hạn gọi đồng bộ, phân biệt reserved/provisioned concurrency.
- [AWS — Requesting a quota increase](https://docs.aws.amazon.com/servicequotas/latest/userguide/request-quota-increase.html): hướng dẫn người dùng xem/yêu cầu quota; chưa gửi yêu cầu tăng trong đợt này.
- [Grafana — Ramping VUs](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-vus/): lịch tăng/giữ/giảm và graceful ramp-down, không coi VU bằng request/giây.

### Minh chứng phần kiểm thử

- [Kế hoạch hiện hành](../tests/AWS-TEST-PLAN.md), [hướng dẫn runner](../tests/runner/README.md), [thiết kế dashboard](../tests/dashboard/DESIGN.md), [bootstrap](../tests/start-aws.ps1) và [guard](../tests/load/config.py).
- [Fixture](../tests/load/fixtures.py), [pool mã hóa](../tests/load/account_pool.py), [audit](../tests/load/audit.py), [cleanup](../tests/load/cleanup.py), [CloudWatch](../tests/load/cloud_metrics.py), [sơ đồ](../tests/dashboard/src/FlowDiagram.tsx), [unit regression](../tests/runner/test_aws.py) và [browser fixture](../tests/dashboard/check-ui.mjs).
- Report và metric gốc theo runId nằm tại tests/results trong máy kiểm thử; không commit các tệp đó. Bảng trên là tổng hợp đã đọc trực tiếp, không thay raw evidence khi cần phân tích sâu.
