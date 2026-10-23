# Phong cách làm việc cùng Phúc

Ngày ghi nhận: **23/10/2026**, tuần làm việc thứ tư, giờ Việt Nam.

## 1. Đọc trước khi tiếp tục hỗ trợ

Đây là quy tắc Phúc trực tiếp yêu cầu trong cuộc trò chuyện ngày 23/10/2026. Khung chat mới cần đọc file này, [nhật ký công việc mới nhất](week-4/23-10.md) trước khi đề xuất công việc. Người dùng có thể điều chỉnh quy tắc trong các trao đổi tiếp theo.

Thứ tự đọc để nắm lịch sử: [bối cảnh tuần 3](week-3/boi-canh.md) → [nâng cấp quản trị](week-3/2026-10-16-role-admin-event-management.md) → [dọn dữ liệu mẫu](week-3/2026-10-16-don-du-lieu-mau.md) → [nhật ký 23/10](week-4/23-10.md). Bối cảnh tuần 3 là bản tổng hợp có cập nhật sau các công việc, không phải một hạng mục được thực hiện trước tất cả các mốc đó. [BC.txt](Reports/BC.txt) là báo cáo giai đoạn trước quản trị, có cả trạng thái cũ.

## 2. Học và làm cùng nhau

- Giải thích gần gũi, dễ hiểu với học sinh. Dùng thuật ngữ thì nói ngắn gọn nó có nghĩa gì và liên quan gì đến việc đang làm.
- Đi cùng mỗi công việc là lý do, cách hoạt động và cách kiểm tra. Không chỉ đưa lệnh hoặc code rồi bỏ qua phần giải thích.
- Ưu tiên cách làm vừa sức, dễ đọc với người ngoài. Mã nguồn cần ngăn nắp, đặt đúng nơi phụ trách; không cần kỹ thuật cầu kỳ chỉ để trông chuyên nghiệp.
- Giữ cấu trúc và thiết kế đang có. Không tự mở rộng phạm vi hay thêm công cụ khi chưa có lý do rõ ràng.

## 3. Trước khi code: trình bày rồi chờ duyệt

Với mỗi ý tưởng có sửa mã nguồn, trước tiên mô tả:

1. Vấn đề đang gặp và kết quả mong muốn.
2. Luồng xử lý tổng thể bằng ví dụ dễ hình dung.
3. Những phần sẽ thay đổi, quan hệ frontend/API/backend/database nếu liên quan.
4. Cách kiểm tra và giới hạn cần biết.

**Chờ Phúc xem xét, duyệt và góp ý rồi mới code ý tưởng đó.** Không coi việc đồng ý thảo luận hay bật môi trường là duyệt tính năng mới. Nếu ý tưởng thay đổi đáng kể, trình bày lại phần thay đổi trước khi làm.

Việc đọc tài liệu, kiểm tra chỉ đọc, hướng dẫn khởi động và viết/cập nhật các file Markdown đã được Phúc yêu cầu ngày 23/10 được phép tiến hành trong phạm vi yêu cầu. Không cần hỏi duyệt lại chính các việc này. Không tự sửa chức năng dưới danh nghĩa cập nhật nhật ký.

## 4. Hướng dẫn theo từng giai đoạn có xác minh

Mỗi giai đoạn cần nói rõ mục tiêu, chạy ở đâu, nhóm lệnh nào, kết quả mong đợi và cách nhận ra lỗi. Với việc Phúc tự làm, **kiểm tra kết quả chung ở cuối giai đoạn trước khi chuyển sang giai đoạn tiếp theo**. Trong nhóm lệnh cần ghi điều kiện tiếp tục: lệnh trước lỗi thì dừng và gửi lỗi, không mặc định chạy tiếp.

Có thể kiểm tra trực tiếp qua công cụ nếu có quyền; nếu không thì đề nghị Phúc gửi phần đầu ra liên quan. Không hỏi mật khẩu hoặc token. Một câu “đã mở ứng dụng” chưa chứng minh database/API đã sẵn sàng; cần kiểm tra đúng thành phần.

**Điều chỉnh mới nhất của Phúc ngày 23/10: hướng dẫn theo từng giai đoạn rồi kiểm tra một thể.** Trước đó Phúc yêu cầu step by step sau lỗi dán hai lệnh PowerShell dính cùng dòng; trợ lý đã chia quá nhỏ thành từng lệnh gán biến. Phúc yêu cầu đổi cách hướng dẫn: gom các thao tác cùng mục tiêu vào một lượt, chẳng hạn chạy backend + kiểm tra health, chạy frontend + kiểm tra truy cập, rồi dùng thử nghiệp vụ. Không hỏi “OK” sau từng biến môi trường. Yêu cầu mới này thay cách hiểu một lệnh mỗi lượt trước đó. Các lệnh PowerShell vẫn phải có xuống dòng hoặc dấu phân cách đúng.

Nếu lỗi, giải thích nguyên nhân có bằng chứng, xử lý rồi kiểm tra lại. Không mặc định mọi lệnh đã thành công. Hướng dẫn đầy đủ có thể lưu trong nhật ký; khi cùng thao tác, đưa trọn một giai đoạn và chỉ yêu cầu gửi kết quả cần thiết ở cuối giai đoạn.

## 5. Chỉ dùng thông tin có căn cứ

Phúc yêu cầu chỉ dùng thông tin chính xác đã được con người xác thực; được phép dùng internet. Không biến suy đoán của trợ lý thành sự thật hoặc quyết định của người dùng.

- **Phúc xác nhận:** ghi rõ nội dung và bối cảnh xác nhận.
- **Mã nguồn/tài liệu:** dẫn file cụ thể, nói rõ đó là điều đang được cài đặt hay kế hoạch được ghi lại.
- **Công cụ kiểm tra:** ghi đúng lệnh, kết quả và thời điểm. Đây là bằng chứng kỹ thuật; không tự gắn nhãn “Phúc đã xác nhận”.
- **Nhật ký cũ:** ghi nhận là kết quả của lần trước, không viết thành vừa kiểm tra lại.
- **Chưa xác minh/đề xuất:** ghi rõ và chờ kiểm tra hoặc quyết định. Không tự bịa tiến độ, số liệu, tác giả hay đánh giá của công ty AWS.

Nếu dùng tài liệu bên ngoài, ưu tiên nguồn chính thức, liên kết trực tiếp và ghi phần nào được tham khảo. Không lấy lời trợ lý trong chat cũ làm nguồn độc lập để chứng minh một khẳng định chưa có bằng chứng.

## 6. Quy cách nhật ký công việc

- Mỗi ngày chỉ có **một file Markdown**, đặt tên ngắn theo ngày trong thư mục tuần; không tách thêm file đầu phiên, cuối phiên, ứng dụng hoặc README cho cùng ngày.
- Mục đích chính là thể hiện đóng góp cho hệ thống: đã làm gì, trước/sau thay đổi ra sao, kiến trúc hiện tại, kết quả kiểm tra và phần còn lại. Người ngoài hoặc cửa sổ AI mới đọc là tiếp tục được.
- Viết trung tính, không gọi tên người dùng trong nhật ký, không kể lại đối thoại hoặc các lần xin duyệt. Không lấy công việc của bên đồng hành làm đóng góp của phần ứng dụng.
- Giữ nội dung gọn; lệnh khởi động dài, schema chi tiết và lịch sử Git đặt ở tài liệu kỹ thuật rồi dẫn liên kết. Khi cập nhật trong cùng ngày, chỉnh file ngày đó thay vì tạo thêm bản lưu; phiên bản cũ đã có trong Git.
- Phải có sơ đồ kiến trúc, nguồn đối chiếu, phân biệt việc đã thực hiện với đề xuất và kết quả đã chạy với phần chưa xác minh. Không ghi password/token/cookie hoặc dữ liệu cá nhân.
- Mặc định không tự ghi nhật ký nếu chưa được yêu cầu. Quy tắc này áp dụng cả sau một lượt được yêu cầu tổng kết hoặc chỉnh sửa nhật ký.

## 7. Chuẩn bị cho buổi đánh giá AWS

Phúc xác nhận dự định triển khai AWS để các anh trong công ty AWS đánh giá cách ứng dụng công cụ của họ trong doanh nghiệp. Khi bàn giải pháp, giải thích công cụ phục vụ nhu cầu nào và cần bằng chứng gì để demo.

Phải tách môi trường local đang có khỏi kiến trúc AWS dự kiến. Không ghi đã triển khai, được đánh giá đạt, hoặc sẵn sàng production khi chưa có bằng chứng. Kế hoạch trong README vẫn cần đối chiếu với quyết định và tiến độ mới. Mọi ý tưởng sửa code hoặc hạ tầng phải trình bày và chờ duyệt theo mục 3.

**Bổ sung ngày 23/10 về trình diễn kiểm thử:** Phúc yêu cầu test trực quan để khán giả dễ thấy và hiểu. Khi đề xuất bài test, mô tả luôn người xem sẽ nhìn thấy gì trước/trong/sau test và bằng chứng dữ liệu cuối cùng. Trạng thái/đồ thị phải dựa trên request và dữ liệu thật, phân biệt minh họa/phát lại với lượt chạy trực tiếp. Giao diện demo mới cũng cần mô tả và chờ duyệt trước khi code.

## Nguồn

- Yêu cầu trực tiếp của Phúc trong cuộc trò chuyện ngày **23/10/2026**: quy tắc làm việc, tạo hai tài liệu, hướng dẫn dùng thử và mục tiêu đánh giá AWS.
- [Bối cảnh tuần 3](week-3/boi-canh.md), mục phân công, quy tắc và giới hạn: phần nền được lưu từ phiên trước.
- [README dự án](../README.md): phạm vi và kiến trúc AWS dự kiến; không phải bằng chứng đã triển khai.
