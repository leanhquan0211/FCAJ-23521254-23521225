# Nhật ký phát triển dự án

`project-worklog/` là thư mục nhật ký chung của dự án từ **13/11/2026**. Công việc ứng dụng, hạ tầng và kiểm thử được ghi theo ngày thực hiện, cùng một cách viết và một nguồn trạng thái hiện hành.

## Nơi đọc và cập nhật

| Tài liệu | Mục đích |
| --- | --- |
| [WORKLOG.md](WORKLOG.md) | Công việc đã thực hiện, thay đổi chính, kết quả và nguồn tham khảo theo ngày. Đây là nhật ký duy nhất. |
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | Bối cảnh hệ thống, kiến trúc, trạng thái hiện tại và phần còn lại; gồm điều kiện tích hợp bộ kiểm thử. |
| [AI_RULE.md](AI_RULE.md) | Cách cộng tác, kiểm tra, viết nhật ký và bàn giao. |
| [handoffs/](handoffs/) | Các bản bàn giao có mốc thời gian. Ghi chú cũ mô tả trạng thái tại ngày tạo; đọc phần cập nhật đầu file và PROJECT_CONTEXT trước khi tiếp tục. |
| [Minh chứng kiểm thử local](references/test-lab-local.md) | RunId và kết quả kiểm thử nhỏ ngày 23/10 trên API 2.0/3.0; dùng truy nguyên, không thay trạng thái tương thích API 4.1. |

Trước nhiệm vụ kỹ thuật, đọc AI_RULE → PROJECT_CONTEXT → mục ngày liên quan trong WORKLOG → bản bàn giao liên quan. Khi ghi tiến độ, chỉ cập nhật WORKLOG theo ngày thực hiện; kết quả ngày 04/11 vẫn thuộc tuần 02–08/11 dù được bổ sung sau đó.

API hiện hành nằm trong [API contract](../docs/api-contract.md), [data model](../docs/data-model.md) và [security](../docs/security.md). Lệnh chạy ứng dụng/bộ kiểm thử giữ ở các README tương ứng; nhật ký không sao chép contract hoặc duy trì thêm bản hướng dẫn chạy riêng.

## Nội dung được hợp nhất ngày 13/11/2026

- Giữ lịch sử phát triển, quy tắc làm việc và hai bản bàn giao hiện có; chuyển toàn bộ sang thư mục chung.
- Bổ sung vào mục **23/10** phần xây dựng bộ kiểm thử, dashboard và kết quả nhỏ đã ghi nhận. Giữ rõ phiên bản ứng dụng dùng khi đo; kết quả trên API 3.0 không được tính là đã thử lại API 4.1.
- Chọn lọc điều kiện tích hợp, cách giữ dữ liệu test, giới hạn tải và việc chuẩn bị tài khoản vào PROJECT_CONTEXT; chi tiết vận hành dùng [Runner README](../tests/runner/README.md).
- Bản nháp API, yêu cầu ban đầu và trạng thái nhánh cũ được truy nguyên trong Git. Các chi tiết đã được thay bằng contract/code hiện hành không tiếp tục làm hướng dẫn trong thư mục chung.

## Nguồn lịch sử

Các bản gốc dưới đây được ghim ở commit trước khi thống nhất thư mục; đường dẫn trong Git giữ nguyên để đọc đúng nội dung lịch sử.

| Nguồn | Thông tin đã giữ hoặc nơi thay thế |
| --- | --- |
| [Nhật ký phát triển gốc](https://github.com/leanhquan0211/FCAJ-23521254-23521225/tree/a01d9b8f8641dda2ea65c24fad776752c06da05f/phuc-worklog) | WORKLOG, PROJECT_CONTEXT, AI_RULE và handoffs trong thư mục hiện tại. |
| [Báo cáo kiểm thử local gốc](https://github.com/leanhquan0211/FCAJ-23521254-23521225/blob/a01d9b8f8641dda2ea65c24fad776752c06da05f/quan-worklog/week-4/23-10-test-lab.md) | Công việc ngày 23/10 trong WORKLOG và bảng minh chứng kiểm thử local. |
| [Hướng dẫn phối hợp cũ](https://github.com/leanhquan0211/FCAJ-23521254-23521225/blob/a01d9b8f8641dda2ea65c24fad776752c06da05f/quan-worklog/phoi-hop.md) | Điều kiện kiểm thử trong PROJECT_CONTEXT; API/schema trong docs; cách chạy trong Runner README. |
| [Yêu cầu ban đầu](https://github.com/leanhquan0211/FCAJ-23521254-23521225/blob/a01d9b8f8641dda2ea65c24fad776752c06da05f/quan-worklog/yeu-cau.md) | Mục tiêu tính đúng dữ liệu, tranh chỗ và tải tăng; chi tiết sản phẩm dùng contract hiện hành. |
| [Bản nháp API lịch sử](https://github.com/leanhquan0211/FCAJ-23521254-23521225/blob/a01d9b8f8641dda2ea65c24fad776752c06da05f/quan-worklog/api-du-kien.md) | Được thay bằng docs/api-contract.md; không dùng cookie, schema hoặc trạng thái đề xuất cũ để viết test hiện tại. |
| [Mục lục bối cảnh cũ](https://github.com/leanhquan0211/FCAJ-23521254-23521225/blob/a01d9b8f8641dda2ea65c24fad776752c06da05f/quan-worklog/README.md) | Được thay bằng mục lục này và PROJECT_CONTEXT. |
