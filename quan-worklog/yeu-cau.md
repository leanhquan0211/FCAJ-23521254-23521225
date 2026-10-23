# Biên bản người dùng cung cấp

Nhận ngày 23/10/2026. Nội dung bên dưới được sao chép nguyên văn từ attachment Pasted text.txt; đây là yêu cầu để rà soát/thống nhất, không phải bằng chứng chức năng đã được triển khai.

---

Bạn phụ trách hoàn thiện luồng người mua của dự án “Xây dựng website đăng ký sự kiện serverless trên AWS”. Một bên khác sẽ phụ trách kiểm thử tự động và frontend trực quan hóa kết quả kiểm thử.
Trước khi triển khai, hãy đọc repository, README, API contract, data model và hướng dẫn liên quan. Sau đó đối chiếu phương án bạn đang hướng tới với phương án dưới đây để hai bên thống nhất và có thể làm việc song song.
Trong phản hồi đầu tiên, hãy trình bày kết quả rà soát, các điểm cần thống nhất và kế hoạch triển khai. Chưa đổi cấu trúc API hoặc dữ liệu trước khi làm rõ contract giữa hai bên.
Mục tiêu của đồ án
Website là ứng dụng để kiểm chứng khả năng xử lý lượng truy cập tăng đột ngột khi một sự kiện hot mở bán, khả năng mở rộng của kiến trúc serverless và tính chính xác khi nhiều người tranh số vé giới hạn.
Tuần này chỉ hoàn thiện và kiểm thử local, chưa triển khai AWS. Các kết quả local không được dùng để kết luận đã chứng minh autoscaling trên AWS.
Hiện “mua vé” được hiểu là đặt chỗ và nhận mã xác nhận; chưa tích hợp thanh toán.
Luồng người mua chúng tôi đang chốt
Người chưa đăng nhập vẫn xem được danh sách, tìm kiếm, lọc và xem chi tiết sự kiện.
Muốn đặt vé phải có tài khoản và đăng nhập.
Nếu bấm mua khi chưa đăng nhập, người dùng được chuyển đến đăng nhập/đăng ký rồi quay lại đúng sự kiện.
Đăng ký tài khoản bằng tên, email và mật khẩu; trước mắt chưa xác minh email/SĐT bằng OTP.
Vẫn phải có băm mật khẩu, kiểm tra thông tin đầu vào, chống trùng email, quản lý phiên và kiểm tra quyền tại Backend.
Tài khoản tự đăng ký chỉ có quyền người tham gia, không được tự chọn quyền Admin.
Người dùng có thể đăng nhập trước giờ mở bán.
Backend kiểm tra thời điểm mở bán, trạng thái sự kiện và số vé còn lại.
Quy tắc hiện tại: một tài khoản đặt tối đa một vé cho mỗi sự kiện.
Đăng ký/vé gắn với userId cố định. Backend lấy người mua từ phiên đăng nhập, không tin userId do client tự gửi.
Có “Vé của tôi”; người dùng chỉ được xem vé thuộc tài khoản của mình.
Đặt vé sử dụng transaction để giảm số chỗ, chống trùng và lưu đăng ký cùng nhau.
Có idempotency: cùng yêu cầu được gửi lại sau timeout hoặc mất response phải nhận lại kết quả đã lưu, không cấp thêm vé.
Hãy xác nhận luồng bạn đang định làm có giống như trên không. Trình bày rõ điểm giống, điểm khác và lý do nếu bạn đề xuất điều chỉnh. Phân biệt những phần đã có trong code với phần cần bổ sung.
Với dữ liệu đăng ký cũ chưa có chủ sở hữu tài khoản, hãy đề xuất cách xử lý an toàn; không tự gán theo email chưa xác minh hoặc xóa dữ liệu đang dùng.
Ba vấn đề và hướng kiểm thử chúng tôi hướng tới
Sự kiện hot, người mua đã chuẩn bị tài khoản
Chuẩn bị sẵn 100 tài khoản và phiên đăng nhập riêng. Đến giờ mở bán, mô phỏng cùng vào xem sự kiện và đặt vé trong khoảng thời gian ngắn.
Dùng sự kiện có 200 vé để kiểm tra khả năng phục vụ khi còn đủ vé. Ghi nhận số thành công, lỗi, thời gian phản hồi và đối chiếu database.
Tải tăng–giảm và khả năng mở rộng
Có kịch bản tăng tải, giữ tải rồi giảm tải. Trước mắt chạy local để kiểm tra công cụ và hành vi ứng dụng; sau này dùng lại trên AWS để đo thêm concurrency, throttling và chỉ số database.
Mức tải phải cấu hình được, có giới hạn thời gian và số yêu cầu. Không cố định các con số thử nghiệm thành cam kết khả năng chịu tải của sản phẩm.
100 người tranh số vé giới hạn
Chuẩn bị 100 tài khoản đã đăng nhập; gửi yêu cầu đặt gần đồng thời vào sự kiện còn 10 vé. Có thể chạy lại cùng kịch bản với 1 vé.
Không được vượt sức chứa, cấp trùng hoặc lệch bộ đếm. Mục tiêu khi không còn lỗi kỹ thuật chưa xử lý là 10 thành công và 90 hết vé. Timeout, xung đột chưa phục hồi và lỗi server phải được thống kê riêng, không tính thành hết vé.
Các bài này dùng API thật và database test riêng. Không dùng mock làm bằng chứng hệ thống chịu tải được. Không cần mở 100 trình duyệt hoặc thao tác thủ công.
Phải tách bước tạo tài khoản/đăng nhập khỏi khoảng đo tải đặt vé. Kịch bản tăng tải công khai vào danh sách/chi tiết không cần tài khoản.
Phân chia công việc
Bạn phụ trách:
Luồng Frontend dành cho người mua.
API tài khoản, session, đặt vé và xem vé.
Data model, quyền sở hữu, transaction, chống trùng, idempotency.
Tài liệu contract và hướng dẫn chạy phần ứng dụng.
Sửa lỗi nghiệp vụ do phía test phát hiện.
Bên còn lại phụ trách:
Công cụ chuẩn bị tài khoản và sự kiện thử.
Kịch bản kiểm thử tự động/k6.
Đối chiếu response với dữ liệu thực.
Tổng hợp kết quả.
Frontend riêng để trực quan hóa kiểm thử và runner local nếu cần.
Hãy đề xuất thư mục, phạm vi file và nhánh Git cho từng bên theo cấu trúc repository thực tế. Không tự giả định đường dẫn mới đã tồn tại. Hạn chế hai bên cùng sửa một file; chỉ định người chịu trách nhiệm cập nhật contract.
API contract cần bàn giao để bên test bắt đầu trước
Với các chức năng đăng ký, đăng nhập, kiểm tra phiên, đăng xuất, xem sự kiện, đặt vé, xem kết quả và “Vé của tôi”, hãy trình bày:
HTTP method và đường dẫn chính xác.
Request, response mẫu và status code.
Cookie/header cần dùng; cách duy trì phiên trong công cụ test.
CSRF/Origin nếu có.
Các trường hợp chưa đăng nhập, không có quyền, chưa mở bán, hết vé, đã mua và lỗi tạm thời.
Cách tạo/truyền idempotency key; hành vi khi gửi lặp và khi cùng key nhưng khác nội dung.
Cách lấy eventId, registrationId và các định danh liên quan.
Quy tắc thời gian/múi giờ mở bán.
Các biến môi trường, địa chỉ và cổng local liên quan.
Cách tạo, đặt lại và dọn dữ liệu test riêng.
Nếu cách xác thực dùng cookie, hãy chỉ rõ cách mỗi người dùng ảo giữ phiên riêng. Không yêu cầu tắt xác thực/phân quyền chỉ để chạy test.
Hãy phân biệt API đã chạy được, API đang thay đổi và API mới đề xuất. Thông báo các thay đổi contract ảnh hưởng phía test.
Yêu cầu frontend trực quan hóa kiểm thử
Phía test cần một frontend riêng, không trộn với giao diện khách hàng hoặc Admin.
Mong muốn có:
Chọn kịch bản và cấu hình số người dùng, sự kiện, số vé, thời gian chạy.
Theo dõi trạng thái chuẩn bị, đang chạy, hoàn tất hoặc thất bại.
Hiển thị số yêu cầu, số mua thành công, hết vé, trùng, timeout và lỗi kỹ thuật.
Hiển thị thời gian phản hồi, P95, thông lượng và biểu đồ theo thời gian.
Hiển thị kết quả đối chiếu số vé còn lại, số đăng ký và trường hợp bất nhất.
Xem lại kết quả từng lượt chạy.
Dữ liệu hiển thị phải đến từ lần test thật. Nếu cần runner local để frontend khởi chạy/dừng k6 và đọc kết quả, hãy đề xuất kiến trúc tối thiểu. Trình duyệt không trực tiếp chạy tiến trình k6.
Bạn chưa cần xây phần frontend test. Hãy chỉ ra các thông tin/API hoặc công cụ ứng dụng cần cung cấp để bên test xây được nó. Làm rõ cách phối hợp cổng local, proxy/CORS và session để không ảnh hưởng cấu hình bảo mật của ứng dụng.
Cách bàn giao để không phải chờ toàn bộ luồng
Đề xuất bàn giao theo mốc:
Contract và cấu trúc dữ liệu được thống nhất.
API tài khoản/session chạy được.
API đặt vé và quyền xem vé chạy được.
Luồng Frontend hoàn chỉnh.
Hai bên chạy tích hợp và sửa lỗi.
Bên test có thể chuẩn bị công cụ theo contract ngay từ đầu, rồi nối từng API khi sẵn sàng.
Phản hồi tôi cần bạn trình bày lại
Hãy trả lời bằng nội dung có thể gửi cho bên phụ trách test, gồm:
Hiện trạng code đã kiểm tra và mức độ khớp với luồng nêu trên.
Những điểm bạn đồng ý, khác biệt hoặc cần quyết định.
Luồng cuối cùng bạn đề xuất.
Bảng API contract đủ để viết test.
Data model, dữ liệu cũ và cơ chế chuẩn bị dữ liệu thử.
Ranh giới công việc, thư mục/file của hai bên và các mốc bàn giao.
Phương án kết nối frontend test với runner/API/kết quả.
Những gì bên test làm được ngay và những gì phải chờ API.
Phân biệt rõ thông tin đã xác minh trong repository với đề xuất chưa triển khai. Không kết luận tính năng hoặc kiểm thử đã hoàn thành nếu chưa có bằng chứng.

