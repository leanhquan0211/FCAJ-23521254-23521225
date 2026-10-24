# Quy tắc cộng tác với AI

Áp dụng cho các cửa sổ AI tiếp tục hỗ trợ dự án. Yêu cầu trực tiếp mới nhất của người dùng được ưu tiên; phạm vi đã duyệt không cần xin lại. Không tự mở rộng phạm vi từ một lần duyệt cũ.

## 1. Bắt đầu một nhiệm vụ

1. Đọc file này, [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) và phần ngày gần nhất trong [WORKLOG.md](WORKLOG.md).
2. Đọc file bàn giao được chỉ định trong handoffs/. Nếu không có tên cụ thể, kiểm tra bản bàn giao mới nhất liên quan đến nhiệm vụ; nếu thư mục trống thì tiếp tục từ PROJECT_CONTEXT/WORKLOG, không tự suy ra đã có nhiệm vụ được giao.
3. Kiểm tra Git status/branch và mã nguồn liên quan. Tài liệu là bối cảnh, không thay kiểm tra process/health hoặc bằng chứng hiện tại.

## 2. Giải thích và duyệt trước khi code

- Dùng ngôn từ gần gũi, dễ hiểu với học sinh; giải thích vấn đề, lý do và cách kiểm tra cùng công việc.
- Trước ý tưởng sửa code, trình bày mục tiêu, luồng xử lý, phần frontend/API/backend/DB sẽ đổi và cách kiểm tra; chờ người dùng duyệt/góp ý rồi thực hiện.
- Khi đã duyệt rõ phạm vi, tiếp tục hoàn tất mà không hỏi lại từng thao tác. Nếu thay đổi đáng kể giải pháp/phạm vi, mô tả lại phần mới trước khi code.
- Ưu tiên code đơn giản, dễ đọc, ngăn nắp và đúng lớp; tái sử dụng thiết kế/component sẵn có, không thêm dependency hoặc kiến trúc chỉ để làm cầu kỳ.
- Đọc/kiểm tra chỉ đọc và sắp xếp tài liệu đã được yêu cầu được làm trong phạm vi đó; không tự sửa tính năng dưới danh nghĩa chỉnh nhật ký.

## 3. Kiểm tra và dùng bằng chứng

- Hướng dẫn theo **giai đoạn**: nêu mục tiêu, chạy ở đâu, nhóm lệnh, kết quả mong đợi. Nếu bước trước lỗi, dừng bước phụ thuộc để xử lý.
- Với thao tác người dùng tự làm, kiểm tra đầu ra trực tiếp hoặc yêu cầu phần kết quả cần thiết; chỉ đi tiếp khi đã xác minh. Không chia nhỏ thành hỏi OK sau từng biến/lệnh.
- Chỉ khẳng định điều có nguồn: phân biệt người dùng xác nhận, code đang cài đặt, kết quả công cụ đã chạy và đề xuất/chưa xác minh. Không tự gán đầu ra công cụ thành xác nhận con người.
- Được dùng internet; nếu dùng tài liệu ngoài, ưu tiên nguồn chính thức, dẫn liên kết và nêu phần áp dụng. Không bịa tiến độ, số liệu, tác giả hoặc kết quả đánh giá.
- Chạy kiểm tra phù hợp với thay đổi, ghi đúng phần đạt/skip/chưa chạy. Kết quả cũ không phải vừa chạy lại; local không chứng minh AWS autoscaling.
- Demo phải dùng dữ liệu test/request/metric/audit thật; phân biệt minh họa và lượt chạy trực tiếp. Không tắt auth, sửa số chỗ hoặc giả số môi trường để có kết quả đẹp.

## 4. Phân chia ba tài liệu

| Tài liệu | Nội dung và cách cập nhật |
| --- | --- |
| WORKLOG.md | Công việc chính đã thực hiện, thay đổi trước–sau, kết quả kiểm tra và nguồn. Chia mục theo ngày; sửa cùng ngày thì cập nhật mục đó. Không tạo thêm file ngày/tuần hoặc kể lại hội thoại. |
| PROJECT_CONTEXT.md | Mục tiêu, phạm vi, kiến trúc, luồng dữ liệu, code liên quan, trạng thái đã xác minh và điểm còn lại. Cập nhật khi bối cảnh thay đổi, không chép timeline hoặc lệnh dài. |
| AI_RULE.md | Luật cộng tác và quy cách ghi chép/bàn giao được người dùng thống nhất. Chỉ thay quy tắc khi có căn cứ từ yêu cầu mới. |

- Mặc định **không tự ghi nhật ký** nếu chưa được yêu cầu. Hai lệnh **Checkpoint** và **Kết phiên** là yêu cầu cập nhật rõ ràng theo mục 5; không cần xin xác nhận lại việc ghi chép/bàn giao đó. Sau khi hoàn tất lệnh, không bật tự ghi cho mọi lượt sau.
- Nhật ký phục vụ báo cáo đóng góp, viết trung tính, không gọi tên người dùng, không ghi các lần xin duyệt/lỗi dán lệnh hoặc quy công việc bên đồng hành thành phần ứng dụng.
- **Mỗi giai đoạn/mục ngày trong WORKLOG.md phải có phần “Tài liệu tham khảo” riêng, viết thành danh sách gạch đầu dòng.** Đây là các tài liệu trên internet AI thực sự đã tham khảo để giải thích, gợi ý giải pháp và áp dụng vào dự án; ưu tiên tài liệu chính thức. Mỗi mục nêu tên tài liệu, liên kết trực tiếp và phần cụ thể đã áp dụng; nếu mới dùng để đề xuất thì ghi rõ chưa triển khai.
- Mã nguồn của dự án, commit, nhật ký cũ và báo cáo kiểm tra là **minh chứng thực hiện**, không thay thế tài liệu tham khảo dù được đặt trên GitHub. Nếu cần dẫn, đặt riêng dưới mục “Minh chứng thực hiện”. Tài liệu bên ngoài không chứng minh dự án đã chạy đạt.
- Không thêm nguồn chưa đọc cho đủ danh sách hoặc gán nguồn vừa tìm được thành nguồn đã dùng trong quá khứ. Khi bổ sung/kiểm tra lại nguồn sau đợt thực hiện, ghi rõ thời điểm đó; nếu chưa xác định được nguồn lịch sử thì nêu đúng phần thiếu.
- Không lặp kiến trúc/trạng thái vào WORKLOG; dẫn PROJECT_CONTEXT. Schema/lệnh khởi động chi tiết giữ trong docs/README tương ứng. Phiên bản cũ tra Git, không tạo bản lưu trùng trong thư mục.
- Không ghi password, cookie, token, credential hoặc dữ liệu cá nhân vào tài liệu/Git.

## 5. Hai lệnh cập nhật và kết phiên

Nhận diện theo ý định người dùng: yêu cầu thực hiện **Checkpoint** hoặc **Kết phiên** kích hoạt quy trình tương ứng, kể cả khi có thêm nội dung đi kèm. Việc trích dẫn từ khóa để giải thích, sửa rule hoặc đưa ví dụ không phải lệnh thực hiện.

### Checkpoint — cập nhật tiến độ hiện tại

1. Rà công việc và các quyết định đến thời điểm nhận lệnh, đối chiếu nhật ký hiện có với code và bằng chứng kiểm tra; không chỉ ghi lại tin nhắn cuối.
2. Cập nhật mục ngày tương ứng trong WORKLOG.md: công việc chính, thay đổi trước–sau, phần hoàn thành/đang dở và kết quả kiểm tra đúng thực tế. Bổ sung phần còn thiếu, sửa trạng thái đã lỗi thời, không ghi trùng hoặc xóa lịch sử công việc ngày trước.
3. Nếu bối cảnh, kiến trúc hoặc điểm tiếp tục đã thay đổi, cập nhật PROJECT_CONTEXT.md cho khớp. Không đổi AI_RULE.md khi chưa có yêu cầu thay quy tắc.
4. Kiểm tra nội dung/liên kết và tóm tắt ngắn những phần đã cập nhật. Checkpoint không tự tạo file bàn giao hoặc kết thúc công việc đang thực hiện.

### Kết phiên — rà toàn bộ cuộc trò chuyện và bàn giao

1. Nhìn lại **toàn bộ cuộc trò chuyện từ đầu đến thời điểm nhận lệnh**, gồm mục tiêu ban đầu, các yêu cầu bổ sung, quyết định đã duyệt, thay đổi hướng làm, việc đã thực hiện và phần còn dở. Không chỉ tổng kết từ Checkpoint gần nhất.
2. Đối chiếu với code, Git và các kết quả có bằng chứng; cập nhật WORKLOG/PROJECT_CONTEXT nếu còn thiếu hoặc không khớp tiến độ cuối phiên. Không tự dựng lại phần hội thoại thiếu căn cứ; ghi rõ điểm chưa xác minh.
3. Tạo một file bàn giao trong handoffs/ để cửa sổ AI mới tiếp tục được công việc. Dùng tên `YYYY-MM-DD-HHmm.md` theo giờ Việt Nam, không ghi đè bản bàn giao cũ nếu tên đã tồn tại.
4. Kiểm tra bản bàn giao đủ mục ở phần 6, dẫn liên kết tài liệu/code liên quan và báo lại đường dẫn file. Không tự bắt đầu tính năng mới khi đang kết phiên.

Hai lệnh chỉ cho phép công việc ghi chép/bàn giao tương ứng, không thay quy tắc duyệt code hoặc quyền thao tác Git, dữ liệu và hạ tầng. Kết phiên không mặc định là yêu cầu tắt hoặc dọn môi trường.

## 6. Nội dung bàn giao trong handoffs/

Tạo file khi nhận lệnh **Kết phiên** hoặc yêu cầu bàn giao rõ ràng khác. Bản bàn giao cần ngắn gọn, đủ để AI mới làm tiếp, gồm:

- Mục tiêu, phạm vi đã duyệt và kết quả mong muốn.
- Các quyết định và ràng buộc còn hiệu lực trong toàn cuộc trò chuyện; phân biệt nội dung đã duyệt với ý tưởng mới đề xuất.
- Đã làm, đang dở, chưa làm; file/branch/commit liên quan, thay đổi chưa commit nếu có.
- Kiểm tra đã chạy, kết quả, lỗi còn lại và giới hạn bằng chứng.
- Bước tiếp theo cụ thể; quyết định cần người dùng; lệnh/điều kiện tái hiện nếu cần.
- Trạng thái môi trường, dữ liệu test và tài nguyên cần giữ; không chứa secret.

Không viết lại toàn bộ bối cảnh dự án trong từng handoff; dẫn tới PROJECT_CONTEXT/WORKLOG. AI nhận bàn giao kiểm tra lại code/status trước khi tiếp tục, không coi đề xuất trong handoff là đã được duyệt nếu chưa có bằng chứng.

## 7. Git, dữ liệu và môi trường

- Làm trên nhánh phuc theo [git-workflow.md](../docs/git-workflow.md). Cùng nhánh không có nghĩa sửa đồng thời cùng folder/file an toàn; kiểm tra thay đổi cửa sổ khác, không reset/clean/discard/force-push để lấy bản mới.
- App và test lab có trách nhiệm riêng; thống nhất contract/data model trước thay đổi ảnh hưởng bên kia. Gộp Git không chứng minh đã tích hợp chức năng.
- Kiểm thử ghi dùng bảng riêng có prefix test; không reset/seed đè bảng ứng dụng, tự gán owner legacy theo email hoặc xóa Docker volume giữ dữ liệu.
- Không dừng tiến trình chỉ vì kết phiên chat. Chỉ dừng/dọn khi được yêu cầu; xác minh đúng process/container và giữ dữ liệu cần dùng lại.
- Tách cấu hình local khỏi AWS dự kiến; không deploy hoặc ghi sẵn sàng production khi chưa có phạm vi được duyệt và bằng chứng.
