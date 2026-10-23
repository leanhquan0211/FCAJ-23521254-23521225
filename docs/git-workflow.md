# Làm việc sau khi gộp nhánh vào phuc

Theo yêu cầu trực tiếp của Phúc, dùng **phuc** làm nhánh làm việc chung; giữ **main** ở mốc cũ. Các nhánh `feat/*` đã được hợp nhất rồi xóa tên nhánh, không xóa commit hoặc nội dung của chúng. Lượt này hợp nhất Git, không đổi chức năng ứng dụng hoặc adapter test.

## 1. Nội dung đã giữ

| Mốc trước khi gộp | Commit đầu nhánh được giữ trong lịch sử phuc |
| --- | --- |
| feat/buyer-flow | a6ba0f21e41cc73cfadb3242ff9bd9d30e2f234a |
| feat/role-navigation | e9e9bffbcd54ebf2238f704802b069e0a0603b91 |
| feat/unified-account | 9341aefb69f91587c4d8f782fc66e89f023c3cee |
| feat/admin-accounts-sidebar | fbfd05527aa0ca7cb6b42827aaf5ffd270eb48fd |
| feat/test-lab | 9e00d5a8757f60c6516e1bdbb2b4406bb3d05cad |

Bốn mốc ứng dụng nối tiếp nhau, bản fbfd055 đã chứa cả bốn. Commit merge **80c76263a5496d02f00dd236f74285bc28965b7e** đưa thêm test lab vào; không có xung đột nội dung. App giữ API **4.1**, code chức năng ở 9d47cff; test lab giữ nguyên cấu hình/logic đã bàn giao. Tên nhánh cũ trong nhật ký là mốc lịch sử, không phải nhánh hiện còn để clone.

## 2. Thư mục làm việc từ nay

- Folder chính `D:\aws-workshop\event-registration`, nhánh **phuc**, chứa ứng dụng, tài liệu và bộ kiểm thử.
- `.worktrees/buyer-flow` giữ lại ở detached HEAD để bảo toàn file local/SDK/cache/env đã có; không phải nhánh phát triển mới. Không tiếp tục sửa đồng thời hai folder hoặc xóa folder này khi chưa kiểm tra các file ignored.
- Các hướng dẫn đầu phiên nói repo gốc còn code cũ hoặc phải clone `feat/*` đã được thay bằng tài liệu này. Build artifact không nằm trong Git: `.aws-sam` ở folder gốc có thể cũ, cần build lại đúng code trước khi chạy SAM.
- main được giữ nguyên tại `f4e20b90095e2519b0dfefd212fb1a1146abbe57`; không tự deploy/merge main trong lượt này.

Máy đang có thay đổi chưa commit thì kiểm tra và giữ nguyên trước khi pull; không dùng reset/clean để lấy bản mới. Với một clone đang sạch, có thể cập nhật theo giai đoạn:

```powershell
git status --short
git fetch origin --prune
git switch phuc
git pull --ff-only origin phuc
```

Nếu có thay đổi local, branch chưa tồn tại hoặc pull không fast-forward thì dừng đọc lỗi, không tự bỏ công việc. Máy mới clone `--branch phuc` vào folder chưa tồn tại. Hai người dùng hai clone/folder riêng; thống nhất file trước sửa. Chỉ có một nhánh chung không tự ngăn xung đột Git: mỗi người commit phần mình, fetch/pull và xử lý khác biệt trước push, không force-push phuc.

## 3. Điểm tích hợp còn cần làm

**Gộp Git không có nghĩa hai contract đã đồng bộ.** Bộ test lab hiện ghim `healthVersion=3.0`, `event_user_session` và app SHA a6ba0f2 trong [profile](../tests/load/contract-v3-draft.json). App hiện trả health4.1 và cookie chung `event_session`. [fixtures.py](../tests/load/fixtures.py) chủ động chặn bài purchase khi health khác3.0; không bỏ guard hoặc sửa version trả ra của backend để chạy qua.

Đã đọc phần cấu hình/giao tiếp này và chạy unit test lab; chưa thực hiện migration adapter hoặc bài tải trên app4.1. Bước tiếp cần mô tả/duyệt plan đồng bộ adapter với [contract hiện hành](api-contract.md), chạy 1–2 User rồi mới 100/200,100/10,100/1. Kết quả 2 User/v3 trong nhật ký bên test là lịch sử do bên đó bàn giao, chưa phải được chạy lại trên4.1.

Đường dẫn chức năng: app ở backend/frontend, lab ở tests/load + tests/runner + tests/dashboard; nhật ký ứng dụng thuộc phuc-worklog, nhật ký test lab do bên đồng hành bàn giao giữ tại quan-worklog. Cùng nằm nhánh phuc không chuyển tác giả của hai phần.

## 4. Giữ dữ liệu và khả năng truy nguyên

Trước hợp nhất đã tạo Git bundle có kiểm tra tại `.local-data/git-backups/before-consolidate-20261023-223538.bundle`, chỉ local/ignored. Bundle chứa lịch sử và các ref trước khi gộp; không cần giữ thêm nhánh backup. Toàn bộ đầu nhánh phải là ancestor của phuc trước khi xóa tên nhánh trên GitHub/local. Nếu nhánh remote có commit mới trong lúc dọn, dừng xóa và tích hợp phần đó trước.

Lượt gộp không bật lại Docker hoặc sửa/reset DynamoDB. Các hướng dẫn kiểm thử thật vẫn dùng bảng test riêng; không suy kết quả unit/build thành bài 100 người hoặc AWS scaling. Phiên bản nhật ký cũ có thể tra trong lịch sử Git; mỗi ngày chỉ giữ một file nhật ký hiện hành, không tự ghi thêm ngoài yêu cầu.
