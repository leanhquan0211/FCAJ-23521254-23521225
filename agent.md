# Quy tắc dành cho AI Agent (agent.md)

Tài liệu này ghi nhận các quy tắc bắt buộc mà mọi AI Agent (Antigravity, Claude, Copilot, v.v.) phải tuân thủ nghiêm ngặt khi hỗ trợ dự án này.

---

## 1. QUY ĐỊNH BẮT BUỘC VỀ HẠ TẦNG & TERRAFORM (QUAN TRỌNG NHẤT)

> [!CAUTION]
> **TUYỆT ĐỐI KHÔNG TỰ ĐỘNG CHẠY LỆNH `terraform apply`!**

- **Phạm vi AI được phép làm:**
  - Viết, chỉnh sửa, định dạng và hoàn thiện các file cấu hình Terraform (`*.tf`).
  - Kiểm tra cú pháp và tính hợp lệ: `terraform validate`, `terraform fmt`.
  - Chạy và hiển thị trước kế hoạch thay đổi tài nguyên: `terraform plan`.
- **Phạm vi BỊ CẤM đối với AI:**
  - **KHÔNG ĐƯỢC** tự ý thực thi `terraform apply` hoặc `terraform apply -auto-approve` dưới bất kỳ hình thức nào.
- **Quy trình chuẩn khi triển khai hạ tầng:**
  1. AI chuẩn bị mã nguồn hạ tầng, kiểm tra `validate` và `plan`.
  2. AI giải thích rõ ràng các tài nguyên sẽ được tạo/sửa đổi cho người dùng.
  3. AI cung cấp câu lệnh chính xác và **ĐỂ NGƯỜI DÙNG TỰ CHẠY** `terraform apply` trên terminal của họ.

---

## 2. QUY ĐỊNH VỀ CHI PHÍ & TÀI NGUYÊN CLOUD (AWS)

- Luôn thiết kế và lựa chọn dịch vụ nằm trong phạm vi **AWS Free Tier** ($0.00).
- Không tự ý bật các dịch vụ tính phí duy trì cố định (như NAT Gateway, Application Load Balancer riêng lẻ, v.v.) khi chưa có sự đồng ý của người dùng.
- Khi kiểm thử xong, luôn cung cấp hướng dẫn rõ ràng để người dùng dọn dẹp (`terraform destroy` hoặc kịch bản `infra/verify_cleanup.ps1`).

---

## 3. QUY TẮC BẢO MẬT & MÃ NGUỒN (GIT)

- **Tuyệt đối không commit** các file chứa thông tin nhạy cảm: credentials, AWS keys, `.env`, file `.tfstate`, `Bangiao.md`, hoặc danh sách tài khoản `.csv`.
- Luôn kiểm tra `git status` trước và sau khi thao tác.
- Tôn trọng các quy tắc phân chia tài liệu và nhật ký tại [phuc-worklog/AI_RULE.md](phuc-worklog/AI_RULE.md).

