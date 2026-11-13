# Event Lab — kiểm thử trên AWS hiện tại

Code tại worktree `.worktrees/test-aws`, nhánh `feat/test-aws`. Dashboard local 5174 → runner 3100 → k6 → CloudFront /api → API Gateway → Lambda → DynamoDB đang phục vụ ứng dụng. Kế hoạch: [AWS-TEST-PLAN.md](../AWS-TEST-PLAN.md).

## 1. Kiểm tra trước, chưa nhập mật khẩu

Tại thư mục gốc worktree test:

```powershell
.\tests\start-aws.ps1 -CheckOnly
```

Script đọc Terraform state từ `infra/` ở repository gốc, chọn các output website/table và thông tin Lambda. Không refresh/apply, không copy raw state. Kiểm tra health, Lambda ARN, bảng và quyền DescribeTable/Scan giới hạn một item, không xuất nội dung record. State không còn tài nguyên sau destroy thì dừng; không dùng link cũ.

Nếu folder triển khai khác, thêm `-DeploymentRoot 'đường-dẫn-repository-triển-khai'`. Profile mặc định `default` (IAM user terraform-deployer); dùng `-Profile <tên-profile>` nếu thay đổi. Sau destroy/apply lại, restart script để đọc URL mới; không đổi URL trong khi có run.

## 2. Nhập Admin và mở runner

Chỉ thực hiện khi đã thống nhất cửa sổ đo, không có apply/destroy/update Lambda và không có writer test khác:

```powershell
.\tests\start-aws.ps1 -AllowWrites
```

Script preflight chỉ đọc trước, rồi yêu cầu nhập mật khẩu `admin_test` kín. Không dán mật khẩu vào chat hoặc lệnh. Mật khẩu chỉ chuyển vào process runner, không ghi file/report/browser/k6 env; kết thúc script xóa biến đó. Khởi động chưa tạo User, sự kiện hoặc vé. Mỗi run ghi cần xác nhận ARN Lambda và tên bảng khớp chính xác mục tiêu.

Terminal khác mở dashboard nếu chưa chạy:

```powershell
npm.cmd --prefix tests/dashboard ci
npm.cmd --prefix tests/dashboard run dev
```

Mở http://127.0.0.1:5174. Chọn 2 người và bài đủ vé trước (4 chỗ), sau đó 2 người tranh 1 chỗ. Chọn preset chỉ thiết lập, Bắt đầu kiểm tra mới phát request thật. Chỉ tăng 10/50/100/200/500 sau khi kiểm tra kết quả trước. Dừng có thể còn request xử lý phía server; stopped/incomplete không phải passed.

Chỉ muốn xem/đọc, chạy start-aws.ps1 không có -AllowWrites. Bài đặt vé bị khóa và không yêu cầu mật khẩu.

## 3. Tài khoản và giới hạn

Runner tự đăng ký/login User qua API 4.1 thật; mỗi User có cookie event_session, CSRF và idempotency key riêng. Admin chỉ dùng tạo/xóa sự kiện và dọn đúng tài khoản test. Không cung cấp sẵn 500 tài khoản.

Runner đọc giới hạn signup/login từ cấu hình Lambda, kiểm đủ số người cộng 20 lượt dự phòng. AWS đã được xác minh là 2.000/IP/900 giây. Không còn chờ cứng 15 phút mỗi 100 User. Nếu các lượt khác đã tiêu ngân sách, 429 vẫn là lỗi thật; không giả IP, reset counter hoặc bỏ guard. Việc tạo User có chi phí và mất thời gian, không nằm trong latency tải.

Ba bài: hot đủ vé, scarce tranh vé, ramp tăng–giữ–giảm. Tối đa 500 VU, 50.000 request đo, lịch ramp 540 giây. Purchase một ý định/User/event là burst, không phải ghi mới kéo dài; pool dùng hết không còn POST mới. Trần request chạm sớm được ghi là cảnh báo, không suy đoạn không tải thành kết quả chịu tải.

## 4. Manifest và dọn đúng dữ liệu

Từ bản pool: ưu tiên dùng lại User test còn hoạt động và có thông tin đăng nhập trong pool. Thiếu bao nhiêu tạo thêm bấy nhiêu; mỗi lượt vẫn có sự kiện và idempotency key mới. Credential pool lưu mã hóa Windows DPAPI theo Windows user dưới tests/results/accounts-*.dpapi (gitignore), không phải mật khẩu plaintext. Sau khi môi trường đổi URL hoặc database mất User, kiểm tra và tạo lại phần thiếu; không tìm tài khoản thật theo email để tự nhận quyền.

Các User của bản cũ chưa có mật khẩu trong pool không tự dùng lại được; không reset mật khẩu để lấy lại. Cleanup giữ User pool để tái sử dụng, chỉ xóa event/vé của run; User từ manifest lịch sử không thuộc pool vẫn theo kế hoạch cleanup cũ. Tạo pool lớn không đồng nghĩa hệ thống chịu được burst lớn: quota10 không chặn lưu500 User nhưng có thể chặn500 request đặt vé cùng lúc. Bắt đầu2/5/10 User và đo trước khi tăng.

Mỗi run tạo event mới `LAB <runId>`, email `lab-<runId>-NNN@example.test`. Report ghi ID ngay sau từng thao tác tạo; không lưu mật khẩu/cookie/CSRF. Nếu mất response, giữ pending để kiểm tra, không đoán dữ liệu đã tạo hay chưa.

Xem kế hoạch dọn (không gửi request xóa):

```powershell
python -B tests/load/cleanup.py --run-id <runId>
```

Sau khi xem kế hoạch, dừng runner và chắc chắn không có writer khác. Lệnh sau yêu cầu nhập lại Admin và thực hiện xóa dữ liệu thuộc lượt đó:

```powershell
.\tests\start-aws.ps1 -AllowWrites -CleanupRunId <runId>
```

Không chạy nguyên placeholder. Công cụ kiểm mục tiêu cùng manifest, quyền sở hữu và version của tất cả entity trước DELETE đầu tiên. Xóa event trước rồi User qua API; 202 tiếp tục có giới hạn. Không truncate bảng, xóa bảng/volume, scan-delete, reset ghế hoặc xóa auth counter. Bản ghi đã mất được bỏ qua; dữ liệu đổi chủ hoặc pending chặn cleanup. Chưa chạy cleanup AWS thật trong giai đoạn xây công cụ.

## 5. Quan sát hạ tầng

Sơ đồ trên dashboard đổi theo bài đang chọn hoặc report đang xem: k6 → CloudFront → API Gateway → Lambda → DynamoDB và phản hồi ngược từng chặng. Bài đặt vé có thêm tuyến runner chuẩn bị qua API và đọc database để audit. Đường sáng chỉ minh họa hoạt động từ counter/trạng thái thật được polling, không phải trace từng request; không dùng chuyển động để kết luận vị trí lỗi hay latency từng hop. Preview/lượt kết thúc/mất kết nối dừng animation, reduced motion dùng đường tĩnh. Đổi cấu hình hiện bản xem trước; bấm lịch sử hiện lại sơ đồ của report đó.

CloudWatch ConcurrentExecutions Maximum, Invocations, Throttles, Errors, Duration p95 được đọc theo phút và có độ trễ. Số thiếu là —, khác 0. Có thể gồm truy cập người khác và fixture; không phải riêng lượt test. Concurrency không phải số môi trường giữ ấm. Hash và LastModified Lambda trước/sau phải ổn định để kết luận.

IAM đọc cần CloudWatch GetMetricData, Lambda GetFunctionConfiguration, DynamoDB DescribeTable/Scan trên bảng mục tiêu. Không cần quyền tạo/destroy hạ tầng cho runner. Alarm/SNS thuộc cấu hình triển khai, chưa coi biểu đồ concurrency tăng là toàn bộ tiêu chí scaling hoặc cảnh báo đã đạt.

## 6. Kiểm tra công cụ và log

```powershell
python -B -m unittest discover -s tests/runner -p 'test_*.py' -v
.\tests\runner\.tools\k6.exe inspect tests/load/scenarios.js
python -B tests/runner/check_k6_local.py
npm.cmd --prefix tests/dashboard run build
npm.cmd --prefix tests/dashboard run lint
```

k6 portable: `./tests/runner/install-k6.ps1 -Version v2.3.0` tải release chính thức và kiểm checksum. Python cần boto3. Browser `check-ui.mjs` dùng response fixture, không gửi tải AWS; `check-browser.mjs` cũ là lịch sử local/selector cũ, không dùng nghiệm thu AWS.

Report/raw tại tests/results/<runId>/ được gitignore. Log runner/Vite ở terminal đang chạy; log Backend ở CloudWatch. CloudMetrics được cập nhật khi dashboard đọc, JSON tải về chứa số đo đã thu. Không chia sẻ raw state, credentials, browser profile hoặc password.

## File chính

sync_aws.py đọc cấu hình triển khai; start-aws.ps1 nhận Admin kín và mở runner; check_aws.py chỉ đọc preflight; config.py kiểm mục tiêu và giới hạn; fixtures.py/client.py/scenarios.js tạo dữ liệu và chạy tải; audit.py/supplemental.py đối chiếu; cleanup.py dọn API theo manifest; cloud_metrics.py đọc số đo; engine.py/server.py điều phối; dashboard/src hiển thị tiếng Việt.

Các bài AWS thật và giới hạn kết quả đã được tổng hợp tại project-worklog/WORKLOG.md mục13/11; bài đọc100người và đặt vé nhỏ đạt,500người không đạt. Unit/browser fixture/k6 localhost vẫn là bằng chứng kiểm tra công cụ riêng. Không chạy lại AWS trong bước hợp nhất mã nguồn.
