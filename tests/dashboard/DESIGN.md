# Dashboard kiểm thử local

Hallmark: Workbench / Cobalt, N3 side rail và Ft1 masthead. Người dùng là nhóm Workshop quan sát các bài test, không phải khách mua vé. Khác giao diện sản phẩm Catalogue/Almanac ở bố cục công cụ, display Space Grotesk và điểm nhấn cobalt. Body Be Vietnam Pro phục vụ nội dung tiếng Việt; font được đóng gói local.

Thiết lập bên trái, kết quả/biểu đồ rộng bên phải; đối chiếu và bằng chứng bên dưới; lịch sử theo dòng. Mobile xếp một cột, điều hướng ở đầu. Không có hero marketing, chỉ số mẫu hay ảnh trang trí. Metric chưa đo là `—`; run bị chặn không có biểu đồ giả. Màu/trạng thái luôn kèm chữ.

Token nằm ở `src/tokens.css`: nền lạnh gần trắng, mực xanh đen, cobalt tín hiệu, đỏ dành cho lỗi; spacing 4 px; viền 1 px; radius 6 px. Input có label, focus tức thì, disabled khi chạy. Bắt đầu/dừng có phản hồi và lỗi; thao tác dừng được ghi là chưa kết luận nếu server còn có thể xử lý request. Giới hạn số và tham số được kiểm tra lại tại runner.

Đánh giá trước bàn giao: Philosophy 4, Hierarchy 4, Execution 4, Specificity 5, Restraint 5, Variety 4. Mọi xác nhận responsive và chức năng trình duyệt phải ghi đúng lượt kiểm tra thực tế trong worklog; không suy từ CSS thành kiểm thử đã chạy.
