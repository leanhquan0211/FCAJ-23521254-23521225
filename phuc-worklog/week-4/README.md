# Tuần 4 — điểm bắt đầu của Phúc

Ngày ghi nhận: **23/10/2026**. Toàn bộ công việc ứng dụng xuyên suốt phiên thuộc Phúc; bên đồng hành làm bộ kiểm thử riêng.

## Thứ tự đọc cho người mới hoặc cửa sổ AI mới

1. [Phong cách làm việc](../phong-cach.md): giải thích trước code, chờ duyệt ý tưởng mới, kiểm tra theo giai đoạn; không tự ghi nhật ký ngoài yêu cầu.
2. [Tổng kết toàn phiên](23-10.md): trạng thái hiện tại, diễn biến, kiến trúc, dữ liệu, test, Git, cách mở lại và việc tiếp theo.
3. [Phối hợp kiểm thử/Git](../../quan-worklog/phoi-hop.md), [contract 4.1](../../docs/api-contract.md), [data model](../../docs/data-model.md), [security](../../docs/security.md).
4. Khi cần truy nguyên: [lịch sử đầu phiên](23-10-dau-phien.md), rồi [lịch sử ứng dụng](23-10-ung-dung.md). Không dùng hướng dẫn cũ làm trạng thái hiện tại.

## Mốc cần nhớ

- Code app: `feat/admin-accounts-sidebar@9d47cff71a8f75e9c42845700d497cf029a56b16`, API 4.1. Commit docs kết phiên đi sau mốc code; chưa merge main/phuc.
- User/Admin, phiên chung, transaction/idempotency, quản lý event/User và sidebar đã có; 75/75 backend cùng HTTP/browser/build đạt local.
- Test lab đã có GitHub tại `9e00d5a8757f60c6516e1bdbb2b4406bb3d05cad` lúc kết phiên; chưa xác minh tích hợp/bài 100 người.
- App API3001/web5173/bảng ứng dụng ready khi kiểm lúc 22:12 ngày 23/10. Lần sau phải kiểm health lại; kết phiên chat không tự tắt môi trường.

[23-10.md](23-10.md) là bản cần đọc trước. Tổng kết theo yêu cầu lần này không thay quy tắc mặc định chỉ ghi nhật ký khi Phúc yêu cầu.
