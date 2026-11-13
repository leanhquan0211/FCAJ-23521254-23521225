# Minh chứng kiểm thử local — 23/10/2026

Tổng hợp ngày **13/11/2026** từ [báo cáo gốc lưu trong Git](https://github.com/leanhquan0211/FCAJ-23521254-23521225/blob/a01d9b8f8641dda2ea65c24fad776752c06da05f/quan-worklog/week-4/23-10-test-lab.md) và [Runner README](../../tests/runner/README.md). Đây là kết quả lịch sử, không phải các bài vừa chạy lại khi thống nhất nhật ký.

## Phạm vi và phiên bản

- Giai đoạn đầu kiểm công cụ trên API 2.0: bài đọc công khai chạy được, bài mua vé bị chặn khi chưa có API User.
- Giai đoạn tích hợp chạy trên API **3.0**, app commit **a6ba0f21e41cc73cfadb3242ff9bd9d30e2f234a**, bảng test riêng; adapter lưu id `buyer-v3-a6ba0f2`.
- Ứng dụng hiện hành là API **4.1**, cookie `event_session`; [adapter](../../tests/load/contract-v3-draft.json) vẫn dùng health 3.0 và `event_user_session`. Những run dưới đây không chứng minh tương thích bản hiện hành hoặc tải AWS.

## Công cụ và kiểm tra đã ghi nhận

| Nội dung | Kết quả ngày 23/10 |
| --- | --- |
| Bộ tạo tải và điều phối | Có fixture, k6 hot/ramp/scarce, runner HTTP, CLI dùng chung engine, metric và audit DB chỉ đọc. |
| Dashboard | Có start/stop, số đo và biểu đồ thật, lịch sử/reload và xuất JSON; tách khỏi giao diện sản phẩm. |
| Unit test harness | Giai đoạn đầu 26 bài đạt; sau bổ sung kiểm tra snapshot Ticket/idempotency là 28/28. Hai mốc không cộng thành 54 bài khác nhau. |
| Build/cấu hình | Dashboard build/lint, SAM build/validate và k6 inspect đạt trong lượt kiểm tra tương ứng. |
| Trình duyệt dashboard | Chrome headless kiểm start/stop, lịch sử, reload, phục hồi lỗi mạng mô phỏng; kích thước 320/375/414/768/1280 px, không có uncaught exception. Không coi đây là kiểm thử lại UI sản phẩm. |

## Các lượt đọc và kiểm tra trạng thái

| RunId | Bối cảnh | Kết quả được ghi nhận |
| --- | --- | --- |
| `f2631500c76442c0b6744c7a` | Public ramp nhỏ qua dashboard, giai đoạn API 2.0 | 8 request đọc thành công; P95 1861.78 ms; 0.98 request/s; passed. |
| `9d9895969e514379a6707047` | Public sau sửa runner | 8/8 request đọc; P95 1843.72 ms; 0.98 request/s; passed. |
| `cff7d31d3b0f4dc3a38be493` | Preset 100 User/10 chỗ khi ứng dụng còn API 2.0 | blocked, WAITING_FOR_V3; 0 request đo; không tạo vé. Đây là kiểm tra guard, không phải bài tranh chỗ đạt. |
| `6e282f9e181a4b85a9bba71b` | Dừng qua dashboard sau khi có request | 1 request đã đo; stopped/incomplete. |
| `67d917b8a7e0454aa0266dc5` | CLI dùng chung runner, public nhỏ | 2/2 request; P95 1054.11 ms; 1.29 request/s; passed. |
| `f491317026ad46efa3f6ca21` | Browser smoke dashboard sau tích hợp API 3.0 | Public run đạt; không có số đo chi tiết trong phần tổng kết gốc. |
| `8f8eada6f1ff447a913858a9` | Browser smoke dừng run sau tích hợp API 3.0 | Có request thật, kết luận incomplete. |

Các lượt public đầu chạy trên danh sách trống. Đó là kiểm tra công cụ/đọc API ở quy mô nhỏ, không đại diện tải danh sách lớn hoặc năng lực tối đa của hệ thống.

## Các lượt đặt vé trên API 3.0

| RunId | Kịch bản | Kết quả và audit |
| --- | --- | --- |
| `b7153b3305494121a9fdcfa6` | 2 User / 4 chỗ | 2 GET thành công, 2 POST tạo vé, còn 2 chỗ; 0 retry/lỗi kỹ thuật. Audit khớp 2 Ticket, 2 reference, 2 idempotency. P95 POST 2205.37 ms. |
| `fb38b4b3a867424caeb7cca4` | 2 User / 1 chỗ | 2 GET thành công, 1 POST tạo vé, 1 EVENT_FULL, còn 0 chỗ; 0 retry/lỗi kỹ thuật. Audit khớp 1 Ticket, 1 reference, 1 idempotency; không có ghi dở hoặc ghế âm trong snapshot cuối. P95 POST 2045.03 ms. |

Các kiểm tra bổ trợ ngoài khoảng đo đạt: owner GET/Vé của tôi, replay cùng key, cùng key khác nội dung, key mới trùng User/event và tài khoản khác đọc vé trả 404. Run tranh một chỗ còn xác nhận replay trả đúng vé sau khi sự kiện đầy.

User được đăng ký/đăng nhập qua API thật, mỗi User có cookie jar/CSRF riêng. Báo cáo ghi appDirty=false, observedContractVersion=3.0 và hash adapter; không tạo session giả hoặc tắt rate limit. Các run dùng chung bảng test nhỏ nhưng tách User/event/key.

## Giới hạn và dữ liệu cần giữ

- Chưa chạy 100/200, 100/10, 100/1, benchmark purchase ramp hoặc đo autoscaling AWS. Các P95 trên chỉ là mẫu local rất nhỏ.
- Chưa kiểm thử proxy mất response sau commit, replay mới song song hoặc ranh giới mở bán chính xác trong lượt lab này. Các kiểm thử tương tự của ứng dụng được ghi riêng trong WORKLOG.
- Dừng runner không bảo đảm hủy request đã tới server; run stopped/incomplete không được nâng thành passed. Audit khi stop/lỗi engine có thể inconclusive.
- Report/raw metric tại `tests/results/<runId>/` được Git bỏ qua. Bảng runId này giữ nội dung đã được báo cáo; không bảo đảm các file raw còn có ở clone hiện tại.
- Bảng test API 3.0 được chuẩn bị bằng công cụ của ứng dụng, không có manifest sở hữu của lab; không dùng cleanup của lab để xóa bảng đó. Giữ env/report/dữ liệu cần truy nguyên, không tác động bảng ứng dụng.

Trạng thái hiện hành và điều kiện chạy lượt mới xem [PROJECT_CONTEXT](../PROJECT_CONTEXT.md); cách chạy xem [Runner README](../../tests/runner/README.md). Báo cáo gốc đầy đủ vẫn có trong Git, gồm cả các ghi chú môi trường và diễn biến trước tích hợp.
