# Dashboard kiểm thử AWS và local — 13/11/2026

## Sơ đồ hoạt động

Component FlowDiagram dùng SVG/CSS, cùng token Cobalt, không thêm dependency. Desktop có tuyến k6 → CloudFront → API Gateway → Lambda → DynamoDB và đường phản hồi ngược từng chặng; mobile xếp dọc. Runner có tuyến chuẩn bị qua API và tuyến SDK đọc database để audit, tránh mô tả sai k6 tự tạo User. Luồng đọc không vẽ ghi vé; hot/scarce nêu rõ mục tiêu đủ vé/tranh vé.

Đường sáng là minh họa hoạt động tổng hợp từ số request/preparedUsers được polling, không phải trace hoặc packet thật của từng hop. Chỉ chuyển động khi có tiến độ mới và kết nối còn tốt; completed/failed/stopped/disconnected dừng. Không dùng tốc độ animation để giả định concurrency hoặc latency. Reduced motion giữ đường tĩnh. Không có số liệu thì dùng dấu —, bản xem trước không chứa hoạt động giả. SVG có tên truy cập và phần giải thích bằng chữ; node có trạng thái kèm chữ, không chỉ màu. Kiểm tra 320/375/414/768/1280px và kịch bản bằng browser fixture.

Thiết kế hiện hành mở rộng Workbench/Cobalt đã có, theo Hallmark. Giữ token và font hỗ trợ tiếng Việt. Luồng chính: chọn tình huống → chọn mức người → chạy và đọc kết quả. Ba lựa chọn diễn đạt bằng tình huống thực tế; tham số request/retry/idempotency nằm trong phần nâng cao. Hiển thị rõ môi trường chỉ đọc hoặc được phép đặt vé; không để người dùng nghĩ chọn preset là đã chạy.

Tự đánh giá sau browser fixture 13/11: P4 H4 E4 S5 R4 V4. Đã xem ảnh desktop/mobile; Chromium kiểm 320/375/414/768/1280px không tràn ngang, khóa ghi/preset không tự chạy và không lỗi JavaScript. Đây là kiểm tra UI dùng response fixture, không phải nghiệm thu tải AWS hay chứng nhận toàn bộ accessibility.

Đồ thị request và Lambda dùng cùng thời gian thực tế, nhãn riêng cho mỗi đơn vị. CloudWatch có độ trễ và độ phân giải phút; chưa có điểm phải hiện “Đang chờ AWS cập nhật”, không thay bằng 0 hoặc dữ liệu giả. Không dùng các ô server sinh ngẫu nhiên để diễn tả autoscaling. Biểu đồ concurrency có mô tả “số lượt xử lý cùng lúc”, không gọi số máy/instance giữ ấm.

Button/field target tối thiểu 44px, focus-visible, loading/disabled và lỗi có hành động khắc phục. Màn hình 320/375/414/768/1280px không tràn ngang. Số liệu chính: số yêu cầu, thời gian chờ của 95% yêu cầu, lỗi; đối chiếu dữ liệu và chi tiết kỹ thuật thu gọn ở dưới. Giữ lịch sử/tải JSON và nút dừng.

Hallmark: Workbench / Cobalt, N3 side rail và Ft1 masthead. Người dùng là nhóm Workshop quan sát các bài test, không phải khách mua vé. Khác giao diện sản phẩm Catalogue/Almanac ở bố cục công cụ, display Space Grotesk và điểm nhấn cobalt. Body Be Vietnam Pro phục vụ nội dung tiếng Việt; font được đóng gói local.

Thiết lập bên trái, kết quả/biểu đồ rộng bên phải; đối chiếu và bằng chứng bên dưới; lịch sử theo dòng. Mobile xếp một cột, điều hướng ở đầu. Không có hero marketing, chỉ số mẫu hay ảnh trang trí. Metric chưa đo là `—`; run bị chặn không có biểu đồ giả. Màu/trạng thái luôn kèm chữ.

Token nằm ở `src/tokens.css`: nền lạnh gần trắng, mực xanh đen, cobalt tín hiệu, đỏ dành cho lỗi; spacing 4 px; viền 1 px; radius 6 px. Input có label, focus tức thì, disabled khi chạy. Bắt đầu/dừng có phản hồi và lỗi; thao tác dừng được ghi là chưa kết luận nếu server còn có thể xử lý request. Giới hạn số và tham số được kiểm tra lại tại runner.

Đánh giá trước bàn giao: Philosophy 4, Hierarchy 4, Execution 4, Specificity 5, Restraint 5, Variety 4. Mọi xác nhận responsive và chức năng trình duyệt phải ghi đúng lượt kiểm tra thực tế trong worklog; không suy từ CSS thành kiểm thử đã chạy.
