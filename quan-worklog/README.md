# Nhật ký và bàn giao luồng người mua

Ngày bắt đầu: **23/10/2026**, tuần 4. Đây là khu ghi chép cho phần **ứng dụng/người mua** theo biên bản Phúc gửi; không tự suy ra người đang chat đã đổi tên hoặc người nào đã thực hiện các commit cũ.

## Đọc theo thứ tự

1. [Phong cách làm việc chung](../phuc-worklog/phong-cach.md): giải thích dễ hiểu, mô tả trước khi code, chờ duyệt và kiểm tra theo giai đoạn.
2. [Biên bản gốc](yeu-cau.md): bản sao nội dung người dùng cung cấp, là nguồn yêu cầu.
3. [Nhật ký 23/10](week-4/23-10.md): kết quả rà soát, phần đã có/chưa có và điểm tiếp tục.
4. [Phối hợp Git và phân công](phoi-hop.md): ai sửa đâu, nhánh/thư mục làm việc, cổng và mốc bàn giao.
5. [Contract dự kiến](api-du-kien.md): phương án v3 để cả hai bên góp ý; **chưa được duyệt hoặc triển khai**.

## Trạng thái cần nhớ

- Mã nguồn hiện kiểm tra trên nhánh `phuc`, commit `c13f4a985a02960eaedd06ac9ccfba186de59220` (`System testing ideas`). Đầu lượt rà soát working tree sạch. Đây là trạng thái local, không khẳng định đã đồng bộ mới nhất từ GitHub.
- API thực tế vẫn là [contract v2](../docs/api-contract.md): khách đăng ký bằng tên/email; admin có login/session. Chưa có tài khoản người mua, giờ mở bán riêng, quyền sở hữu vé hoặc HTTP idempotency key.
- Tuần này chỉ local. Mua vé nghĩa là đặt chỗ + mã xác nhận, chưa thanh toán. Chưa chứng minh autoscaling AWS.
- Theo biên bản: bên ứng dụng phụ trách frontend người mua, API, nghiệp vụ/data model và canonical contract; bên test phụ trách dữ liệu thử, k6, đối chiếu, báo cáo, runner và frontend test riêng.
- Thư mục `tests/load/`, `tests/runner/`, `tests/dashboard/`, `tests/results/` và hai nhánh feature là **đề xuất mới**, chưa tạo.
- Lượt này chỉ đọc và viết tài liệu. Không đổi API/schema, không tạo nhánh/worktree, không chạy tải, không sửa/xóa database.

## Điểm cần duyệt trước khi code

Phạm vi User/Admin; contract v3 (đặc biệt body đặt vé, giờ mở bán và key gửi lặp); cách giữ/bảo vệ dữ liệu cũ; phân công file/nhánh và cách tạo dữ liệu test. Chi tiết và lựa chọn đề xuất nằm trong hai tài liệu bàn giao.

Sau khi thống nhất, bên ứng dụng cập nhật `docs/api-contract.md` và `docs/data-model.md` theo phiên bản được duyệt; không để hai bản nháp và canonical contract mâu thuẫn mà không ghi trạng thái. Bên test chỉ coi thay đổi đã chốt là giao diện ổn định để viết assertion.

## Quy tắc cập nhật

Ghi tiếp đúng nhật ký ngày đang làm. Phân biệt yêu cầu người dùng, đề xuất, mã đã có và kiểm tra thực tế. Không lưu mật khẩu/token/cookie hoặc dữ liệu thật của người tham gia vào Git. Mỗi mốc bàn giao ghi commit, phiên bản contract, API nào chạy được, lệnh kiểm tra và kết quả.

Nguồn nền: [bối cảnh tuần 3](../phuc-worklog/week-3/boi-canh.md), [nhật ký đầu ngày tuần 4](../phuc-worklog/week-4/23-10.md), README/backend/frontend và tài liệu `docs/`. Bản ghi mới này không chuyển công việc cũ thành công việc mới của Quân.
