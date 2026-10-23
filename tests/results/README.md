# Kết quả local

Runner lưu mỗi run ở `<runId>/report.json` và `metrics.ndjson`. File kết quả được gitignore; dashboard đọc qua runner, không đọc file tùy ý. Không chứa mật khẩu/cookie/CSRF. Session chỉ đi vào stdin của k6, không ghi thành fixture JSON.

Không coi unit test dùng HTTP giả lập là kết quả tải thật. Báo cáo `blocked` có nghĩa chưa đo được kịch bản đó; `stopped` có thể còn request đang xử lý phía server.
