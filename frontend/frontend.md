# Frontend prototype (tuần 2)

Ứng dụng chạy trên localhost với dữ liệu sự kiện mẫu. Đã có luồng danh sách → chi tiết → đăng ký → kết quả, tìm kiếm/lọc và lưu đăng ký trong localStorage. Tài liệu trạng thái, routes, cách kiểm thử và hướng phát triển nằm tại [README.md](README.md). Chưa kết nối Backend hoặc AWS.

## Công nghệ đã cài

| Công nghệ | Phiên bản cài thực tế |
| --- | --- |
| Node.js / npm khi thiết lập | 26.10.0 / 11.19.1 |
| Vite | 8.3.4 |
| React / React DOM | 19.3.0 |
| TypeScript | 6.0.3 |
| Tailwind CSS / `@tailwindcss/vite` | 4.3.3 / 4.3.3 |
| shadcn/ui CLI | 4.21.4 |
| Radix UI | 1.7.0 |
| lucide-react | 1.54.0 |
| oxlint | 1.87.0 |
| Be Vietnam Pro | 5.3.0 |
| React Router | 8.4.0 |

shadcn/ui đã khởi tạo bằng preset `radix-nova`. Các component hiện có: Button, Card, Input, Label, Badge và Dialog; Dialog từng dùng cho chi tiết tạm và hiện không còn trong luồng chính. Alias `@/` trỏ đến `src/` trong TypeScript và Vite. Tailwind dùng plugin Vite phiên bản 4, không dùng cấu hình Tailwind v3. Quy tắc giao diện nằm trong [`DESIGN.md`](DESIGN.md); dữ liệu mẫu nằm tại `src/data/events.ts`.

## Chạy tại máy cá nhân

Từ thư mục `frontend/`:

```bash
npm ci
npm run dev
```

Mở địa chỉ do Vite in ra, mặc định là <http://localhost:5173/> nếu cổng này còn trống.

Các lệnh khác:

```bash
npm run build
npm run lint
npm run preview
```

`npm ci` cài dependency đúng theo `package-lock.json`. Khi chủ động thay đổi dependency, dùng `npm install` để cập nhật cả `package.json` và lockfile.
