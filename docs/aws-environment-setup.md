# Chuẩn bị môi trường AWS cho dự án fcaj-project

Ngày kiểm tra: **30/10/2026 — Tuần 5**. **Đã hoàn tất cài công cụ, kiểm tra build local, chuyển CLI sang tài khoản cá nhân và cấu hình budget theo xác nhận người dùng.** Chưa cấp/xác minh quyền triển khai, chưa viết Terraform hoặc triển khai ứng dụng AWS. Xem các bước tiếp theo của [nhiệm vụ 1](aws-deployment-plan.md).

Kết phiên **04/11/2026 — Tuần 6**: code main mới đã được tích hợp/push trong phuc **4896dfc**; frontend build/lint đạt trên workspace sau merge, dependency/backend không đổi. Không cài/build lại toàn bộ môi trường hoặc gọi AWS để ghi chép; trạng thái credit/phiên CLI vẫn là bằng chứng setup ngày 30/10. Các đoạn dưới có lịch sử tài khoản đã bỏ; lấy tài khoản cá nhân và kết quả cuối trong PROJECT_CONTEXT/handoff mới làm chuẩn tiếp tục.

**Máy triển khai:** máy Windows của người dùng; công cụ/build đã được kiểm tra qua đầu ra người dùng gửi. Workspace Codex hiện tại thuộc máy người bạn, có lượt cài/kiểm tra riêng được ghi rõ ở dưới. Codex chưa trực tiếp điều khiển máy triển khai; không tự chạy AWS login/apply từ workspace máy người bạn.

## 1. Công cụ trên máy

**Máy triển khai của người dùng:** bảng `Get-Command` ban đầu nhận diện Git/Node/npm/SAM/Docker/winget, thiếu AWS CLI/Terraform; hai công cụ thiếu đã được cài và xác minh phiên bản ở dưới. Đầu ra người dùng gửi xác nhận **Node 24.14.0, npm 11.9.0, SAM 1.167.0, Compose 5.1.4, Docker Linux engine 29.4.3**. Python trong `.venv` chạy boto3 qua profile **`fcaj-project`**, gọi STS và in **`SDK user: fcaj-project`** thành công. **Frontend và Lambda container build trên máy này đã thành công**; chi tiết ở mục 3.

Bước đang hướng dẫn: cài hai công cụ còn thiếu qua winget trên máy người dùng:

```powershell
winget install --id Amazon.AWSCLI --exact --source winget
winget install --id Hashicorp.Terraform --exact --source winget
```

Sau khi cài xong, đóng/mở lại PowerShell và kiểm tra:

```powershell
aws --version
terraform version
```

Người dùng đã gửi kết quả trên máy triển khai: **Terraform 1.17.1 windows_amd64**, **AWS CLI 2.39.2 Windows/11 AMD64**. Ban đầu chỉ PowerShell mới nhận hai công cụ; sau khi bổ sung PATH theo lệnh dưới, người dùng đã gửi đầu ra xác nhận **cả hai chạy được trong terminal dự án đang kích hoạt `.venv`**.

Trong terminal dự án, có thể bổ sung PATH mới vào cuối PATH hiện tại để giữ thứ tự đường dẫn `.venv`, rồi kiểm tra lại:

```powershell
$env:Path += ';' + [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
aws --version
terraform version
```

Thay đổi trên chỉ áp dụng cho process terminal hiện tại. Terminal mới của IDE còn chạy từ trước có thể tiếp tục thừa hưởng PATH cũ; đóng/mở lại IDE khi thuận tiện để nhận môi trường mới. Người dùng đã chạy `aws login` trên máy triển khai và gửi thông báo profile `event-lab-login` được cập nhật cho IAM user `fcaj-project`; chưa có kết quả STS.

**Kết quả đã kiểm tra trên máy người bạn (workspace Codex hiện tại):**

| Công cụ | Kết quả đã kiểm tra | Vai trò |
| --- | --- | --- |
| Git | 2.46.0.windows.1 | Quản lý mã nguồn |
| Node.js / npm | 24.14.0 / 11.9.0 | Build frontend |
| AWS CLI | 2.39.2, đã cài cho Windows user | Đăng nhập và gọi AWS |
| Terraform | 1.17.1, đã cài cho Windows user | Quản lý tài nguyên ở bước tiếp theo |
| SAM CLI | 1.167.0, có sẵn | Build Lambda bằng container |
| Docker / Compose | 29.4.3 / 5.1.4 | Chạy môi trường build Linux |
| WSL | 2.7.3.0, distro docker-desktop dùng WSL 2 | Nền chạy Docker |
| Python trên host | Có Python 3.13.0 tại thư mục user; lệnh python mặc định vẫn là 3.11.9 | Build Lambda sẽ dùng Python 3.13 trong container |

AWS CLI được cài từ MSI chính thức, kiểm tra chữ ký Authenticode hợp lệ của Amazon trước cài. Terraform được tải từ HashiCorp, đối chiếu SHA256 với tệp checksum chính thức trước giải nén. Docker và SAM có sẵn, không cài lại.

Các thư mục AWS CLI, Terraform và Docker đã được thêm vào **User PATH**, giữ các mục cũ. Mở terminal mới để nhận PATH; nếu IDE vẫn giữ môi trường cũ, đóng/mở lại IDE. Trong PowerShell hiện tại có thể bổ sung các đường dẫn đã cài:

```powershell
$env:Path = @(
  "$env:LOCALAPPDATA\Programs\Amazon\AWSCLIV2"
  "$env:LOCALAPPDATA\Programs\HashiCorp\Terraform\1.17.1"
  "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin"
  $env:Path
) -join ';'

aws --version
terraform version
docker info --format '{{.OSType}} / {{.ServerVersion}}'
sam --version
```

Kỳ vọng Docker báo `linux / 29.4.3`. SAM hiện nằm trong thư mục công cụ riêng đã có trên máy; không thay đổi vị trí cài đó. Installer nằm trong `.local-data/installers/`, được Git bỏ qua.

## 2. Danh tính và đăng nhập AWS

**QUYẾT ĐỊNH MỚI — tài khoản đang chuẩn bị triển khai:** người dùng chuyển sang **tài khoản của chính mình**, gói **Paid**, xác nhận **đã có budget/cảnh báo**. Ảnh Explore AWS hiển thị **3/5 hoạt động**, **60/100 USD earned**; EC2/Bedrock/Budgets Completed, Lambda/RDS chưa bắt đầu. 60 USD là tổng phần thưởng hoạt động, **không phải số dư còn lại**; chưa cộng với khoản 100 USD trước đó hoặc coi là credit khả dụng. Người dùng đã xác nhận tạo/test đăng nhập IAM theo nhóm hướng dẫn `fcaj-project`/Console/SignInLocalDevelopmentAccess/MFA. **Đầu ra STS mới qua cầu nối `fcaj-project` đã trả Account của tài khoản cá nhân đã chọn ở prompt login và IAM user `fcaj-project`**; không lưu ID/ARN đầy đủ. CLI đã chuyển tài khoản thành công, chưa kiểm tra policies trực tiếp hoặc SDK mới. Công cụ/build trên máy đã đạt giữ nguyên. Dừng điều tra tài khoản người bạn. Các kết quả ở hai đoạn ngay dưới là lịch sử của tài khoản đã bỏ.

Trình tự chuyển đã hướng dẫn: tạo IAM user **`fcaj-project`**, Console access, policy **`SignInLocalDevelopmentAccess`** và MFA trong tài khoản cá nhân; logout phiên cũ rồi login lại profile **`fcaj-project-login`**, chấp thuận đổi login_session sau khi kiểm tra đúng tài khoản. Profile cầu nối **`fcaj-project`** giữ nguyên credential_process. STS qua cầu nối đã xác minh chuyển sang tài khoản cá nhân; không yêu cầu tạo lại profile/build hoặc lặp login khi chưa có lỗi mới.

Nhóm lệnh chuyển/xác minh đang hướng dẫn chạy trên máy người dùng sau khi IAM Console đã test thành công:

```powershell
aws login --profile fcaj-project-login --region us-east-1
aws sts get-caller-identity --profile fcaj-project --region us-east-1 --query '{Account:Account,Arn:Arn}' --output json --no-cli-pager
```

Chỉ chạy STS sau khi login thành công; kiểm tra Account trùng với tài khoản cá nhân trong Console và Arn đúng IAM user. Người dùng chỉ cần báo kết quả khớp/không khớp, không cần gửi Account ID/ARN đầy đủ. Nếu wizard AI xuất hiện chọn `n`.

Lượt đầu người dùng chọn `n` ở overwrite nên profile giữ tài khoản người bạn và STS lỗi token cũ. Sau hướng dẫn chọn **`y` ở overwrite**, **`n` chỉ ở prompt AI**, STS mới đã thành công vào tài khoản cá nhân. Lỗi chuyển phiên đã giải quyết; không đổi credential_process. Không lưu ARN/account ID/authorization URL vào tài liệu.

**Chi phí tài khoản cá nhân theo người dùng cung cấp:** credit còn **40 USD**, hết hạn khoảng **tháng 05/2027**, chưa có ngày cụ thể. Budget ban đầu 100 USD; sau hướng dẫn/ảnh các ngưỡng và scope, người dùng xác nhận **đã hoàn tất lưu budget 10 USD/tháng, email nhận cảnh báo**. Actual **30%/50%/80%** (= 3/5/8 USD), forecast **100%** (= 10 USD), filter loại **Credit/Refund** đã thấy trong ảnh; chưa xác minh gửi/nhận email cảnh báo thật. Người dùng dự kiến dừng dùng AWS sau **tháng 12/2026**; chuẩn bị thu hồi/kiểm kê dự án, không tự đóng tài khoản hoặc xóa tài nguyên ngoài dự án. Không dùng ảnh 60 USD earned làm số dư hoặc lấy Paid/0 của tài khoản người bạn áp cho tài khoản này.

**Lịch sử tài khoản người bạn — không còn dùng triển khai:** tạo **24/09/2026** theo người dùng; GetAccountPlanState trả **PAID / ACTIVE / Credits 0 USD / PlanExpires null**. Chưa xác minh nguyên nhân Paid/0; không cần tiếp tục điều tra sau quyết định đổi tài khoản. Khoản Free/100 USD nhắc ban đầu thuộc tài khoản cá nhân khác.

**Bằng chứng ảnh Console tài khoản hiện tại:** Credits có **Active credits (0)** và các tổng **0 USD**; Bills tháng **10/2026** có **Estimated grand total 0 USD**, kèm **No data**. Billing Home có **Data unavailable** ở Cost summary, không thấy khối plan/credit trong ảnh; Free Tier có **0 service offers in use**. Không suy ra từ dữ liệu sử dụng trống rằng ưu đãi đã hết, tài khoản Paid hoặc triển khai chắc chắn miễn phí. Không ghi account ID/thông tin cá nhân vào tài liệu; đây là đọc ảnh, không phải Codex truy cập AWS API trực tiếp.

Người dùng đã tạo IAM user tên **`fcaj-project`**, dùng mật khẩu tự sinh, xác nhận đã nhận username/password/Console sign-in URL, đã thấy thiết bị trong danh sách MFA và đăng nhập Console bằng user thành công. Đã hướng dẫn chọn policy `SignInLocalDevelopmentAccess`; chưa kiểm tra policy trực tiếp qua Console/API. Policy này phục vụ đăng nhập local, **chưa cấp quyền triển khai tài nguyên**. Không yêu cầu tạo access key.

Đã thử mở `aws login` trên máy người bạn trước khi biết vị trí máy thực tế; khi người dùng làm rõ đã dừng process chờ đăng nhập. Không có kết quả CLI login thành công hoặc kiểm tra STS. Không tiếp tục login trên máy người bạn; chuẩn bị công cụ trên máy người dùng trước.

**Quy ước tên người dùng chốt:** đây là dự án **`fcaj-project`**; tên profile/tài nguyên mới phải có `fcaj` và `project`. Profile đăng nhập dùng **`fcaj-project-login`**, profile Terraform/SDK dùng **`fcaj-project`**; cả hai đã được người dùng gửi kết quả STS đúng IAM user `fcaj-project`. Tên profile độc lập với IAM user cùng tên. Profile cũ `event-lab-login` đã được dùng ở bước trước; hướng dẫn tiếp theo dùng tên mới.

**Tiến độ CLI trên máy người dùng:** người dùng đã gửi đầu ra login và STS của `fcaj-project-login`, sau đó cấu hình `credential_process` và gửi STS của `fcaj-project`; cả hai xác nhận đúng IAM user **`fcaj-project`**, không phải root. Ở lần login này đã chọn **`n`** để bỏ qua wizard AWS skills/MCP. Không lưu account ID, ARN đầy đủ hoặc authorization URL vào tài liệu. Bước tiếp theo: kiểm tra Python SDK dùng profile cầu nối và công cụ build trên đúng máy triển khai.

Sau khi xác nhận user/MFA, chạy trong terminal dành riêng cho AWS, không dùng terminal local đã đặt credential giả `local`:

```powershell
aws login --profile fcaj-project-login --region us-east-1
aws sts get-caller-identity --profile fcaj-project-login --region us-east-1 --query Arn --output text
```

Trình duyệt mở để người dùng đăng nhập và chấp thuận. Nếu CLI hỏi cấu hình AWS skills/MCP, chọn `n` để bỏ qua bước tùy chọn. Kiểm tra danh tính trả về thuộc đúng tài khoản và không phải root; không chép account ID/ARN, token hoặc thông tin đăng nhập vào nhật ký. `us-east-1` là region dự kiến theo kế hoạch; chưa xác minh tài nguyên/quota ở region này.

Để Terraform và SDK dùng được phiên đăng nhập thông qua cơ chế tiêu chuẩn, sau khi login thành công có thể tạo profile cầu nối:

```powershell
aws configure set credential_process 'aws configure export-credentials --profile fcaj-project-login --format process' --profile fcaj-project
aws configure set region us-east-1 --profile fcaj-project
aws configure set output json --profile fcaj-project
aws sts get-caller-identity --profile fcaj-project --query Arn --output text
$env:AWS_PROFILE = 'fcaj-project'
```

Các lệnh cấu hình chỉ lưu cách lấy credential, không chép khóa vào repository. **Không chạy riêng lệnh export-credentials để xem đầu ra** vì đầu ra chứa credential. STS qua cả profile login và profile cầu nối đã được xác minh bằng đầu ra người dùng gửi; Python SDK trong `.venv` cũng đã gọi STS qua `fcaj-project` và trả đúng user. Chưa kiểm tra Terraform provider. Quyền triển khai sẽ được xác định theo tài nguyên của nhiệm vụ 1 trước khi apply; không dùng việc STS thành công làm bằng chứng có đủ quyền deploy.

## 3. Kiểm tra build và điều kiện đi tiếp

Trên **máy triển khai của người dùng**, đã xác minh phiên bản AWS CLI/Terraform/Node/npm/SAM/Compose, Docker Linux engine, STS hai profile và Python SDK đúng `fcaj-project`. Người dùng đã gửi đầu ra chạy từ repo root: **npm ci thành công, frontend Vite 8.3.4 build thành công, SAM Python 3.13/x86_64 container build báo Build Succeeded**. Các lệnh đã thực hiện:

```powershell
npm.cmd --prefix frontend ci
npm.cmd --prefix frontend run build
$env:SAM_CLI_TELEMETRY = '0'
sam build --use-container --template-file backend/template.yaml --build-dir .aws-sam/build
```

Chạy lần lượt, dừng xử lý nếu lệnh báo lỗi trước khi chạy bước phụ thuộc. `npm ci` cài dependency theo lockfile; các lệnh build tạo artifact local, không triển khai AWS hoặc ghi dữ liệu DB. Build SAM chỉ cần Docker/image/dependency, không cần đặt credential AWS giả cho riêng bước build này.

**Dependency còn cần xử lý trước triển khai:** `npm ci` trên máy người dùng báo **4 mục: 1 low, 3 high**. Codex đã chạy `npm audit --json` chỉ đọc trên lockfile trong workspace máy người bạn: cùng tổng 4 mục, gồm `shadcn`, `@shadcn/registry`, `zod`, `deepmerge`. `npm explain` truy vết zod 3.25.76 và deepmerge 4.3.1 qua shadcn 4.21.4/registry; mã nguồn có import CSS `shadcn/tailwind.css`. Chưa kiểm chứng mức ảnh hưởng thực tế trên bản deploy, chưa sửa dependency. Audit đề xuất đổi shadcn xuống 1.0.0 với thay đổi major; không chạy `npm audit fix --force` tự động vì có thể làm hỏng tích hợp CSS hiện tại. Chưa xem bốn mục là bốn lỗ hổng độc lập hoặc kết luận toàn bộ được thực thi trong trình duyệt.

**Trạng thái:** công cụ/build local, IAM/STS CLI qua cầu nối tài khoản cá nhân và lưu budget đã đạt. Credit 40 USD/hạn 05/2027 theo người dùng; chưa kiểm thử email, cấp quyền deploy/quota, xử lý dependency hoặc xác minh Terraform provider. SDK gọi STS trước khi đổi tài khoản, chưa chạy lại trên tài khoản cuối. Chưa deploy/smoke AWS, không dùng template SAM local để deploy.

**Các kết quả build đã xác minh bên dưới thuộc máy người bạn:**

- Đã chạy `npm.cmd run build` trong `frontend/`: thành công, tạo `frontend/dist/` được Git bỏ qua. Đây là kiểm tra build, chưa phải kiểm thử chức năng trên trình duyệt. `npm.cmd run lint` trả exit code 0, có hai cảnh báo Fast Refresh tại `src/components/ui/badge.tsx` và `src/components/ui/button.tsx`; chưa sửa mã nguồn.
- Docker Desktop đã được khởi động; engine báo Linux 29.4.3. Chưa khởi động DynamoDB hoặc API local; không thay dữ liệu cũ.
- Đã chạy SAM container build theo lệnh bên dưới: **Build Succeeded**, tạo `.aws-sam/build/EventsFunction` và `.aws-sam/build/template.yaml`, được Git bỏ qua. Build thành công chưa chứng minh API chạy đúng hoặc có thể deploy bằng template local.

Trong PowerShell riêng cho local, từ thư mục gốc dự án:

```powershell
$env:SAM_CLI_TELEMETRY = '0'
$env:AWS_EC2_METADATA_DISABLED = 'true'
$env:AWS_ACCESS_KEY_ID = 'local'
$env:AWS_SECRET_ACCESS_KEY = 'local'
$env:AWS_DEFAULT_REGION = 'us-east-1'
sam build --use-container --template-file backend/template.yaml --build-dir .aws-sam/build
```

Credential giả chỉ nằm trong process local; không ghi vào profile AWS. Build dùng Python 3.13/Linux và dependency trong `backend/lambda/requirements.txt`. Template SAM hiện là **template local**, không dùng để deploy AWS.

Trước khi chuyển sang Terraform: đăng nhập non-root/profile CLI/SDK và build đã đạt; còn gói/credit/chi phí hiện có và quyền/quota phù hợp. Chưa chạy plan/apply/destroy, chưa tạo tài nguyên ứng dụng, chưa kiểm thử AWS. Dữ liệu local được giữ nguyên.

## 4. Quy trình kiểm tra gói qua API (đã chạy trên tài khoản người bạn)

Đã hướng dẫn cấp đúng một quyền đọc. Người dùng đã gửi đầu ra gọi API thành công, chứng minh quyền đọc đang có hiệu lực; Codex chưa liệt kê policies trực tiếp để xác nhận tên/nội dung policy đã lưu. Quy trình đã hướng dẫn trong phiên root: IAM → Users → fcaj-project → Permissions → Add permissions → Create inline policy → JSON:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "freetier:GetAccountPlanState",
      "Resource": "*"
    }
  ]
}
```

Lưu với tên **`fcaj-project-account-plan-readonly`**. Action chỉ đọc trạng thái gói; Free Tier không hỗ trợ ARN cụ thể trong Resource nên cần `*`, không đồng nghĩa cấp mọi action. Chưa thêm quyền deploy hoặc quyền nâng cấp gói.

Sau khi lưu policy, người dùng chạy trên **máy triển khai của mình**:

```powershell
aws freetier get-account-plan-state --profile fcaj-project --region us-east-1 --query '{Plan:accountPlanType,Status:accountPlanStatus,Credits:accountPlanRemainingCredits,PlanExpires:accountPlanExpirationDate}' --output json --no-cli-pager
```

Đầu ra người dùng gửi: **Plan PAID, Status ACTIVE, Credits amount 0.0/unit USD, PlanExpires null**. Account ID đã được lọc bỏ. `null` nghĩa là API không trả ngày hết hạn gói; không suy ra sử dụng miễn phí vô thời hạn. Chưa thay đổi gói. Paid plan thanh toán theo mức sử dụng vượt allowance/ưu đãi áp dụng; các thao tác login/STS/build local đã chạy không phải triển khai ứng dụng AWS.

Người dùng thắc mắc vì mô tả tài khoản mới tạo bằng Free Tier. Chưa xác minh tài khoản hiện tại từng nhận 100 USD hoặc từng là Free plan. GetAccountPlanState chỉ chứng minh trạng thái hiện tại, không chứng minh credit đã tiêu hoặc nguyên nhân chuyển gói. Các lệnh CLI đã hướng dẫn không gọi upgrade-account-plan. Bước điều tra tiếp theo: xem **Credits → Last 6 months of inactive credits** để tìm lịch sử credit và xem trạng thái **AWS Organizations** bằng phiên root; chỉ đọc, không tạo/join organization. AWS quy định tham gia Organizations có thể tự chuyển Paid và không còn dùng/kiếm Free Tier credits; đây là khả năng theo chính sách, chưa phải nguyên nhân đã xác minh của tài khoản này. Khách hàng đã có/từng có tài khoản có thể không đủ điều kiện Free plan/credit; không tự gán điều này cho người bạn. Chuyển Paid thông thường không tự làm mất mọi credit còn hiệu lực.

## 5. Kiểm tra cảnh báo chi phí trên tài khoản cá nhân mới

**Kết quả cuối bước này:** người dùng trả lời **“Xong”** sau yêu cầu kiểm tra Monthly/10 USD, email từng alert và Save. Ghi nhận đã lưu theo xác nhận của người dùng, kết hợp ảnh ngưỡng **Actual 30/50/80%, Forecasted 100%** và filter **Credit, Refund excluded** trước đó. Không yêu cầu tạo/lưu lại budget khi chưa có lỗi mới; không coi xác nhận lưu là kiểm thử email thực tế. Các đoạn dưới là quy trình và bằng chứng trong lúc cấu hình.

Người dùng cung cấp budget hiện tại **100 USD**, chưa có tên/chu kỳ hoặc threshold. Không tạo budget trùng; trong **root Billing → Budgets**, chọn budget này → **Edit**. Kiểm tra Monthly, đổi amount thành **10 USD** theo ngân sách đã chọn. Configure alerts: **Actual 30%/50%/80%** của 10 USD (= **3/5/8 USD**), **Forecast 100%** (= 10 USD, cần đủ dữ liệu). Dùng email nhận hiện có. Theo dõi chi phí toàn tài khoản **trước khi bù credit**: trong phần cost types/advanced options bỏ tính Credits, tránh credit làm che chi phí sử dụng; không thay các filter khác khi chưa đọc cấu hình thực tế. Review/Next → Save, chờ người dùng xác nhận amount/threshold đã lưu. Chưa coi thay đổi là hoàn tất.

AWS không cho đổi tên budget hiện có; giữ tên của budget đã tạo từ trước. `fcaj-project-monthly-budget` chỉ là tên dự kiến nếu có lý do cần budget riêng sau này, chưa tạo. Email giữ trong Console, không lưu vào tài liệu/chat.

Ảnh bước Alerts người dùng gửi đã có **Actual >30%/>50%/>80%, Forecasted >100%**, mỗi alert ghi **No actions**. Đây là xác minh ngưỡng trên màn hình, chưa xác minh budget amount 10 USD, đã Save, scope/cost types hoặc email recipients. No actions là chưa gán hành động tự động, không đồng nghĩa không có email. Đang giải thích: loại Credits khỏi phép tính budget chỉ để quan sát chi phí sử dụng trước khi bù credit, không vô hiệu hóa credit trên hóa đơn. Vị trí theo tài liệu AWS là **Budget scope → Advanced options** ở bước chi tiết budget; chọn cách theo dõi **Unblended costs**, kiểm tra Credits được loại khỏi phần cost types nếu UI hiển thị. Nếu UI không khớp, cần xem đúng khối này, không tự suy diễn từ ảnh Alerts. Email recipients nằm riêng trong từng alert và cần xác minh email theo luồng AWS.

**Ảnh Budget scope tiếp theo đã xác minh đúng cách loại credit trên giao diện thực tế:** đang chọn **Filter specific AWS cost dimensions**, có đúng filter hiển thị **Charge types excluded (2): Credit, Refund**; không có filter Service riêng trong ảnh. Giữ cấu hình này: credit/refund không bù giảm chi phí budget theo dõi, không cần tìm checkbox Credits trong Advanced options hoặc đổi sang All AWS services làm mất filter. Đây là đính chính vị trí thao tác so với hướng dẫn trước. Advanced options còn thu gọn, chưa xác minh cost aggregation. Còn kiểm tra **Monthly/10 USD**, recipients của các alert và **Save**; chưa kết luận budget đã lưu.

AWS miễn phí theo dõi và thông báo budget. Chưa cấu hình thêm Budget Actions/Budget Reports/SNS. Budget **không tự chặn chi phí**, dữ liệu/cảnh báo có độ trễ. Đây là kiểm soát chi phí ban đầu, không phải triển khai CloudWatch ở nhiệm vụ 2. Budget tồn tại theo người dùng xác nhận, chưa kiểm chứng việc nhận email. Cần kiểm kê riêng tài nguyên từng tạo làm activity (ví dụ EC2) trước triển khai/destroy dự án; chưa biết chúng còn chạy hay đã dọn, không tự xóa hoặc đưa vào Terraform state.

## Tài liệu tham khảo

- [AWS CLI installation](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html): MSI chính thức và cách cài cho Windows user.
- [Choosing an AWS account plan](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html), [Credits](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/useconsolidatedbilling-credits.html) và [Bills](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/getting-viewing-bill.html): đối chiếu ảnh Credits/Bills với thông tin credit đã cung cấp; dùng Billing Home để kiểm tra Free plan/credit, chưa xác nhận số dư 100 USD.
- [AWS official: when Free Tier starts/expires](https://www.repost.aws/knowledge-center/aws-free-tier-account-start-expire) và [AWS Free Tier benefits by account creation date](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html): đã đối chiếu ngày tạo 24/09/2026 người dùng cung cấp; kết luận gói hiện tại dựa vào GetAccountPlanState thực tế, không suy ra từ ngày tạo.
- [Budget templates](https://docs.aws.amazon.com/cost-management/latest/userguide/budget-templates.html), [Budgets pricing](https://aws.amazon.com/aws-cost-management/aws-budgets/pricing/) và [budget update/alerts](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-best-practices.html): hướng dẫn template budget 10 USD, email miễn phí, theo dõi có độ trễ và hạn chế forecast; chưa xác nhận đã tạo.
- [Editing a budget](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-edit.html) và [advanced cost types](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-best-practices.html): sửa amount/alerts của budget đang có, không đổi tên; cấu hình chi phí trước credit để theo dõi tiêu thụ, chưa xác nhận người dùng đã lưu thay đổi.
- [Creating a cost budget](https://docs.aws.amazon.com/cost-management/latest/userguide/create-cost-budget.html): vị trí Budget scope/Advanced options, cách chọn Unblended và phân biệt alert/recipients/automatic actions; đối chiếu ảnh Alerts, chưa xác minh cost types hoặc Save.
- [AWS CLI get-account-plan-state](https://docs.aws.amazon.com/cli/latest/reference/freetier/get-account-plan-state.html) và [Free Tier IAM authorization](https://docs.aws.amazon.com/service-authorization/latest/reference/list_freetier.html): xác minh lệnh/response và policy chỉ đọc với Resource wildcard; [IAM inline policy workflow](https://docs.aws.amazon.com/IAM/latest/UserGuide/access-keys_inline-policy.html) chỉ dùng để đối chiếu đường dẫn Add permissions → Create inline policy, không áp dụng các policy ví dụ về access key trong nguồn.
- [AWS Free Tier FAQ](https://aws.amazon.com/free/free-tier-faqs/) và [Free Tier terms](https://aws.amazon.com/free/terms/?loc=6&p=ft&z=subnav): đối chiếu điều kiện khách hàng mới, chuyển Paid vẫn dùng credit hợp lệ, và trường hợp Organizations làm mất quyền dùng/kiếm Free Tier credit; chưa xác minh nguyên nhân cụ thể của tài khoản triển khai.
- [Install Terraform](https://developer.hashicorp.com/terraform/install): bản Windows AMD64 và nguồn HashiCorp; đã đối chiếu [SHA256SUMS 1.17.1](https://releases.hashicorp.com/terraform/1.17.1/terraform_1.17.1_SHA256SUMS).
- [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/): vị trí cài per-user và điều kiện WSL.
- [SAM CLI installation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html): công cụ build Lambda local.
- [Create an IAM user](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html): Console access và chỉ tạo credential cần thiết, áp dụng giao diện IAM người dùng xác nhận.
- [Assign an MFA device](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_enable_virtual.html): đường dẫn gán MFA cho user và quyền cần thiết; hướng dẫn thao tác bằng phiên root trước khi chuyển sang user.
- [AWS CLI browser login](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sign-in.html): quyền SignInLocalDevelopmentAccess, credential tạm thời và profile credential_process; STS qua hai profile chính thức đã xác nhận đúng user.
- [AWS CLI agent-toolkit](https://docs.aws.amazon.com/cli/latest/reference/configure/agent-toolkit.html): wizard cài skills và cấu hình MCP cho AI coding agents; giải thích phần tùy chọn xuất hiện sau login, không yêu cầu cài cho nhiệm vụ 1.
- [Zod advisory GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [deepmerge advisory GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) và [shadcn CLI](https://ui.shadcn.com/docs/cli): đã tham khảo khi phân loại báo cáo audit; chưa triển khai sửa dependency.
- [winget install — Microsoft](https://github.com/microsoft/winget-cli/blob/master/doc/windows/package-manager/winget/install.md): cài bằng ID chính xác từ nguồn winget; hướng dẫn trên máy người dùng, chưa xác nhận thực hiện. Đã đối chiếu ID từ manifest [Amazon.AWSCLI](https://github.com/microsoft/winget-pkgs/blob/master/manifests/a/Amazon/AWSCLI/2.31.21/Amazon.AWSCLI.installer.yaml) và [Hashicorp.Terraform](https://github.com/microsoft/winget-pkgs/blob/master/manifests/h/Hashicorp/Terraform/1.13.2/Hashicorp.Terraform.installer.yaml); các phiên bản manifest tham khảo không phải phiên bản đã cài trên máy người dùng.
