# Quan-worklog — biên bản và phối hợp kiểm thử

> **Cập nhật sau yêu cầu gộp nhánh:** ứng dụng và test lab nay cùng nhánh **phuc**; tên feat/* bên dưới là mốc lịch sử đã hợp nhất. Đã đọc cấu hình lab và kiểm unit; adapter purchase vẫn3.0, chưa tích hợp với app4.1. Xem [trạng thái Git hiện hành](../docs/git-workflow.md).

Chuẩn hóa khi kết phiên **23/10/2026**, tuần 4. Khu này giữ **nguồn yêu cầu bên đồng hành, hướng dẫn phối hợp và đường dẫn lịch sử**. Theo đính chính của Phúc, toàn bộ công việc ứng dụng trong cuộc trò chuyện thuộc Phúc; nhật ký ứng dụng đặt tại [phuc-worklog/tuần 4](../phuc-worklog/week-4/README.md). Không suy tác giả hoặc mức hoàn thành từ tên thư mục.

## Đọc theo thứ tự

1. [Phong cách làm việc](../phuc-worklog/phong-cach.md) và [tổng kết phiên của Phúc](../phuc-worklog/week-4/23-10.md): quyết định, kiến trúc hiện hành, bằng chứng, trạng thái và việc tiếp theo.
2. [Biên bản gốc](yeu-cau.md): giữ nguyên văn người dùng cung cấp; đây là yêu cầu, không phải chứng nhận mọi chức năng/test đã đạt. Quyết định Phúc về UI/session/xóa sau đó có thể thay thế chi tiết ban đầu.
3. [Phối hợp hiện hành](phoi-hop.md): ranh giới file/nhánh, mốc GitHub, lấy code an toàn, env test, contract và checklist tích hợp.
4. [API contract 4.1](../docs/api-contract.md), [data model](../docs/data-model.md), [security](../docs/security.md): nguồn kỹ thuật để viết assertion, phải dùng cùng app commit.
5. [api-du-kien.md](api-du-kien.md): bản nháp **lịch sử v3**, không dùng thay contract hiện hành. [Đường dẫn nhật ký cũ](week-4/23-10.md) chuyển tiếp về Phúc.

## Tình trạng lúc kết phiên

| Nội dung | Đã xác minh / giới hạn |
| --- | --- |
| App bàn giao | `feat/admin-accounts-sidebar@9d47cff71a8f75e9c42845700d497cf029a56b16`, API 4.1; có thể có thêm commit docs sau mốc code |
| Nhánh kiểm thử | Remote `feat/test-lab@9e00d5a8757f60c6516e1bdbb2b4406bb3d05cad` đã tồn tại; cửa sổ app chưa review nội dung/tương thích hoặc chạy tích hợp |
| Bằng chứng app | 75/75 backend, HTTP/browser/build đạt local; không phải bài k6 100 người hoặc bằng chứng AWS scaling |
| Main/phuc | Vẫn `f4e20b9`, chưa merge các nâng cấp ứng dụng/test lab |
| Bước tiếp | Bên test gửi hướng dẫn đã review, đối chiếu 4.1, chạy 1–2 User rồi 100/200,100/10,100/1 trên bảng riêng; Phúc dùng thử UI cuối |

Thông báo “test lab còn local/chưa push” là trạng thái phía test báo trước đó; đã có remote ở lần kết phiên, nhưng chưa tự suy ra nội dung hoặc kết quả chạy mới. Không ghi thay nhật ký/nhận thành tích bộ kiểm thử khi chưa có bằng chứng. Mặc định không tự ghi nhật ký nếu Phúc chưa yêu cầu; lượt này là tổng kết được yêu cầu rõ ràng.
