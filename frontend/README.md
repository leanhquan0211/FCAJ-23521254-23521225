# Frontend website đăng ký sự kiện

Frontend của Workshop chạy cục bộ với dữ liệu mẫu. Luồng hiện có: **danh sách → chi tiết sự kiện → form đăng ký → kết quả đăng ký**. Đây là prototype trong trình duyệt; chưa kết nối Backend, email hoặc AWS. Quy tắc giao diện nằm trong [DESIGN.md](DESIGN.md). Ghi chú thiết lập ban đầu nằm trong [frontend.md](frontend.md).

## Tiến độ

| Hạng mục | Trạng thái | Kết quả hiện tại / Việc còn lại |
| --- | --- | --- |
| Vite + React + TypeScript | Hoàn thành | Ứng dụng và lệnh dev/build/lint hoạt động. |
| Tailwind CSS, shadcn/ui, Lucide | Hoàn thành | Đã cấu hình và dùng trong các màn hình. |
| Hallmark và DESIGN.md | Hoàn thành | Có token và quy tắc responsive, trạng thái, component; mở rộng cho luồng mới. |
| Event Listing, tìm kiếm và lọc | Hoàn thành | Tìm không dấu; danh mục và trạng thái kết hợp; xóa bộ lọc. |
| Event Detail | Hoàn thành | Trang riêng cho từng ID, hiển thị nội dung và chỗ còn lại. |
| Registration Form | Hoàn thành | Kiểm tra tên/email, chặn sự kiện đóng, giữ form khi service báo lỗi. |
| Registration Result | Hoàn thành | Có mã, người tham dự, sự kiện; tải lại vẫn xem được trên cùng trình duyệt. |
| Mock service và localStorage | Hoàn thành | Đăng ký có ID, trừ chỗ, chống email trùng cho cùng sự kiện. |
| Admin Dashboard | Chưa thực hiện | Chưa có trang quản trị hoặc xác thực. |
| API contract | Chưa thực hiện | Cần thống nhất dữ liệu và lỗi với Backend. |
| Kết nối Backend | Chưa thực hiện | Hiện chỉ gọi mock service trong trình duyệt. |
| Triển khai AWS | Chưa thực hiện | Chưa có hosting hay hạ tầng cho Frontend. |

**Mức độ kiểm thử:** build và lint chạy thành công; Chrome headless đã kiểm tra luồng chính, lỗi form/service, URL sai, reload kết quả, tìm kiếm/lọc và độ rộng 320/375/414/768/1280 px. Chưa kiểm thử nhiều trình duyệt hay truy cập đồng thời từ nhiều tab/thiết bị. Hai cảnh báo Fast Refresh của `button.tsx` và `badge.tsx` không làm lint thất bại.

## Công nghệ và cấu trúc

Phiên bản cài thực tế từ `npm ls --depth=0`: Vite **8.3.4**, React/React DOM **19.3.0**, TypeScript **6.0.3**, Tailwind CSS và plugin Vite **4.3.3**, React Router **8.4.0**, shadcn CLI **4.21.4**, Radix UI **1.7.0**, lucide-react **1.54.0**, oxlint **1.87.0**. Font: Be Vietnam Pro và Geist **5.3.0**. Dùng npm với `package-lock.json`.

| Vị trí | Vai trò |
| --- | --- |
| `src/pages/` | Bốn màn hình của luồng người dùng. |
| `src/components/` | Header/footer, bộ lọc, Card sự kiện, thông tin sự kiện và component shadcn trong `ui/`. |
| `src/data/events.ts` | Tám sự kiện mẫu ban đầu. |
| `src/services/mock-events.ts` | API bất đồng bộ mô phỏng đọc sự kiện, đăng ký và đọc kết quả; chỉ service này thao tác localStorage. |
| `src/types/` | Kiểu dữ liệu sự kiện và đăng ký. |
| `src/lib/event-listing.ts` | Tìm kiếm/lọc và định dạng ngày. |
| `tokens.css`, `src/index.css` | Token và CSS giao diện theo [DESIGN.md](DESIGN.md). |

## Chạy tại localhost

Yêu cầu **Node.js >=22.22.0** (phù hợp Vite và React Router hiện cài), npm; môi trường đã kiểm tra dùng Node **26.10.0**, npm **11.19.1**. Từ **thư mục gốc repository**:

```bash
cd frontend
npm ci
npm run dev
```

Mở địa chỉ Vite in ra trong terminal, thường là `http://localhost:5173/`. Không chạy `npm run dev` ở thư mục gốc vì `package.json` nằm trong `frontend/`.

```bash
npm run build
npm run lint
npm run preview
```

## Routes

| Đường dẫn | Chức năng |
| --- | --- |
| `/` | Chuyển đến `/events`. |
| `/events` | Danh sách, tìm kiếm và lọc. |
| `/events/:eventId` | Chi tiết; ví dụ `/events/thiet-ke-de-dung`. |
| `/events/:eventId/register` | Form đăng ký; chặn ID sai, hết chỗ hoặc đã kết thúc. |
| `/registrations/:registrationId` | Kết quả đã lưu; ID được tạo sau khi đăng ký. |
| Đường dẫn khác | Trang không tìm thấy. |

Vite dev server hỗ trợ truy cập/tải lại các URL con. Khi triển khai lên hosting sau này cần cấu hình **SPA fallback** để các URL con trả về `index.html`; hosting hiện chưa được triển khai.

## Dữ liệu mock và cách thử

Tám sự kiện gốc nằm trong `src/data/events.ts`. Service tính số chỗ hiện tại bằng số chỗ mẫu trừ số đăng ký đã lưu. Đăng ký thành công được lưu trong localStorage key **`event-workshop:registrations:v1`**; email được trim và chuyển về chữ thường trước khi kiểm tra trùng. Mỗi đăng ký tạo ID bằng `crypto.randomUUID()` và chiếm một chỗ. Dữ liệu chỉ tồn tại trong trình duyệt và origin đang dùng, không chia sẻ giữa người dùng hoặc thiết bị.

Để reset **riêng dữ liệu mock của ứng dụng**, mở DevTools Console tại trang rồi chạy:

```js
localStorage.removeItem('event-workshop:registrations:v1')
location.reload()
```

Để mô phỏng **một lần lỗi service** mà không có công cụ kiểm thử trong giao diện, chạy lệnh sau trong DevTools Console trước khi bấm xác nhận đăng ký:

```js
sessionStorage.setItem('event-workshop:fail-next-registration', '1')
```

Key này sẽ tự xóa sau lần gửi tiếp theo. Form giữ dữ liệu và hiển thị lỗi để thử lại. Nếu muốn xóa cờ lỗi thủ công: `sessionStorage.removeItem('event-workshop:fail-next-registration')`.

Thử luồng: mở `/events`, chọn sự kiện còn chỗ như **Thiết kế sản phẩm dễ dùng**, xem chi tiết, bấm **Đăng ký tham gia**, nhập tên và email hợp lệ, xác nhận, ghi lại mã trên trang kết quả rồi tải lại. Quay về sự kiện để kiểm tra chỗ giảm một; dùng lại email với chữ hoa/thường khác để xem lỗi trùng. Các sự kiện `cv-dung-nang-luc` và `nhiep-anh-ke-chuyen` dùng để thử hết chỗ và đã kết thúc.

## Kiểm thử và giới hạn

- **Đã đạt:** `npm run build`; `npm run lint` (2 cảnh báo Fast Refresh). Chrome headless đã thử đăng ký hợp lệ, reload kết quả, thiếu tên/email, email sai, email trùng khác hoa/thường, gửi hai lần liên tiếp, lỗi service, sự kiện hết chỗ/đã kết thúc, ID/URL sai, tìm kiếm/lọc kết hợp và xóa lọc. Đã kiểm tra không cuộn ngang ở 320/375/414/768/1280 px trên danh sách và form.
- **Chưa kiểm tra:** các trình duyệt ngoài Chrome, kiểm thử bằng trình đọc màn hình, xử lý đồng thời nhiều tab hoặc nhiều người dùng. Mock localStorage không cung cấp giao dịch và không thay thế Backend.
- **Chưa triển khai:** Backend/API thật, email xác nhận, Admin Dashboard/xác thực quản trị và AWS.

Bước tiếp theo của dự án: xây dựng Admin Dashboard, thống nhất API contract, sau đó kết nối Backend và triển khai hạ tầng theo kế hoạch Workshop.
