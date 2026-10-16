# Frontend website đăng ký sự kiện

Frontend của Workshop chạy cục bộ với luồng **danh sách → chi tiết sự kiện → form đăng ký → kết quả đăng ký**. Đã tích hợp Backend SAM + DynamoDB Local qua HTTP; có thể chọn mock để phát triển UI. Chưa có email hoặc AWS. Quy tắc giao diện nằm trong [DESIGN.md](DESIGN.md). Ghi chú thiết lập nằm trong [frontend.md](frontend.md).

## Tiến độ

| Hạng mục | Trạng thái | Kết quả hiện tại / Việc còn lại |
| --- | --- | --- |
| Vite + React + TypeScript | Hoàn thành | Ứng dụng và lệnh dev/build/lint hoạt động. |
| Tailwind CSS, shadcn/ui, Lucide | Hoàn thành | Đã cấu hình và dùng trong các màn hình. |
| Hallmark và DESIGN.md | Hoàn thành | Có token và quy tắc responsive, trạng thái, component; mở rộng cho luồng mới. |
| Event Listing, tìm kiếm và lọc | Hoàn thành | Tìm không dấu; danh mục và trạng thái kết hợp; xóa bộ lọc. |
| Event Detail | Hoàn thành | Trang riêng cho từng ID, hiển thị nội dung và chỗ còn lại. |
| Registration Form | Hoàn thành | Kiểm tra tên/email, chặn sự kiện đóng, giữ form khi service báo lỗi. |
| Registration Result | Hoàn thành | API mode đọc kết quả từ DynamoDB nên tải lại vẫn xem được; mock mode dùng localStorage. |
| Mock service và localStorage | Hoàn thành | Giữ để phát triển UI, chỉ chạy khi chọn `mock`. |
| Admin Dashboard | Chưa thực hiện | Chưa có trang quản trị hoặc xác thực. |
| API contract | Hoàn thành | Có [contract v1](../docs/api-contract.md), HTTP adapter và trạng thái `closed`. |
| Kết nối Backend | Hoàn thành | Danh sách, chi tiết, đăng ký và đọc kết quả gọi HTTP ở API mode. |
| Triển khai AWS | Chưa thực hiện | Chưa có hosting hay hạ tầng cho Frontend. |

**Mức độ kiểm thử:** build và lint đạt (2 cảnh báo Fast Refresh ở `button.tsx`/`badge.tsx`). Chrome headless đã thử luồng API thật trên bảng test riêng, reload kết quả, validation, trùng email, trạng thái đóng/hết chỗ/kết thúc, lỗi mạng không fallback, loading, tìm kiếm/lọc và các độ rộng 320/375/414/768/1280 px. Chưa kiểm thử nhiều trình duyệt hoặc trình đọc màn hình.

## Công nghệ và cấu trúc

Phiên bản cài thực tế từ `npm ls --depth=0`: Vite **8.3.4**, React/React DOM **19.3.0**, TypeScript **6.0.3**, Tailwind CSS và plugin Vite **4.3.3**, React Router **8.4.0**, shadcn CLI **4.21.4**, Radix UI **1.7.0**, lucide-react **1.54.0**, oxlint **1.87.0**. Font: Be Vietnam Pro và Geist **5.3.0**. Dùng npm với `package-lock.json`.

| Vị trí | Vai trò |
| --- | --- |
| `src/pages/` | Bốn màn hình của luồng người dùng. |
| `src/components/` | Header/footer, bộ lọc, Card sự kiện, thông tin sự kiện và component shadcn trong `ui/`. |
| `src/data/events.ts` | Tám sự kiện mẫu ban đầu. |
| `src/services/events.ts` | Chọn HTTP hoặc mock theo cấu hình, cung cấp interface chung cho màn hình. |
| `src/services/http-events.ts` | Fetch API, map lỗi contract, không truy cập localStorage hoặc tự retry POST. |
| `src/services/mock-events.ts` | Service mô phỏng; chỉ service này thao tác localStorage. |
| `src/types/` | Kiểu dữ liệu sự kiện và đăng ký. |
| `src/lib/event-listing.ts` | Tìm kiếm/lọc và định dạng ngày. |
| `tokens.css`, `src/index.css` | Token và CSS giao diện theo [DESIGN.md](DESIGN.md). |

## Chạy tại localhost

Yêu cầu **Node.js >=22.22.0** (phù hợp Vite và React Router hiện cài), npm; môi trường đã kiểm tra dùng Node **26.10.0**, npm **11.19.1**. Từ **thư mục gốc repository**:

```bash
cd frontend
```

Nếu chưa có `.env.local`, copy `.env.example` thành `.env.local`, sau đó:

```bash
npm ci
npm run dev
```

Mở địa chỉ Vite in ra trong terminal, thường là `http://localhost:5173/`. Không chạy `npm run dev` ở thư mục gốc vì `package.json` nằm trong `frontend/`.

```bash
npm run build
npm run lint
npm run preview
```

## Chọn API hoặc mock

Trong `frontend/.env.local` (các biến `VITE_` được đưa vào client, không đặt secret ở đây):

```dotenv
VITE_DATA_MODE=api
VITE_API_BASE_URL=http://127.0.0.1:3001
```

API mode cần DynamoDB Local và SAM chạy theo [Backend README](../backend/README.md). Frontend lấy số chỗ và kết quả từ Backend, không tự trừ chỗ, không dùng localStorage cho đăng ký và không fallback khi API lỗi. Nếu thiếu/sai cấu hình URL, giao diện báo lỗi. Chưa có `.env.local` thì mode mặc định là `api` nhưng vẫn cần `VITE_API_BASE_URL`.

CORS Backend hiện cho origin cổng 5173. Có thể dùng `npm run dev -- --port 5173 --strictPort` để tránh Vite tự chuyển cổng; nếu chủ động đổi cổng, cần cập nhật cả CORS template và `ALLOWED_ORIGINS` rồi build/restart SAM.

Muốn phát triển UI độc lập, đổi `VITE_DATA_MODE=mock`; mode này không cần Backend và dùng localStorage như mô tả dưới đây. Đã kiểm tra mock mode đọc 8 sự kiện, tạo/đọc lại đăng ký dù cấu hình API không truy cập được. Mode khác `api`/`mock` là lỗi cấu hình. Sau khi thay env phải restart Vite hoặc build lại. Request có timeout 75 giây để chờ Lambda cold start trên OneDrive; không tự retry POST.

## Routes

| Đường dẫn | Chức năng |
| --- | --- |
| `/` | Chuyển đến `/events`. |
| `/events` | Danh sách, tìm kiếm và lọc. |
| `/events/:eventId` | Chi tiết; ví dụ `/events/thiet-ke-de-dung`. |
| `/events/:eventId/register` | Form đăng ký; chặn ID sai, hết chỗ, đóng đăng ký hoặc đã kết thúc. |
| `/registrations/:registrationId` | Kết quả đã lưu; ID được tạo sau khi đăng ký. |
| Đường dẫn khác | Trang không tìm thấy. |

Vite dev server hỗ trợ truy cập/tải lại các URL con. Khi triển khai lên hosting sau này cần cấu hình **SPA fallback** để các URL con trả về `index.html`; hosting hiện chưa được triển khai.

## Dữ liệu mock và cách thử (chỉ khi chọn mock)

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

- **Đã đạt:** `npm run build`; `npm run lint` (2 cảnh báo Fast Refresh). Chrome headless đã thử luồng HTTP với Backend thật trên bảng local test: đăng ký hợp lệ, reload kết quả, thiếu tên/email, email sai, email trùng khác hoa/thường, bấm gửi liên tiếp, lỗi API không fallback, loading và chặn sự kiện hết chỗ/đóng/kết thúc. Danh sách, form và kết quả không cuộn ngang ở 320/375/414/768/1280 px; đã xem ảnh form mobile và kết quả desktop. Tìm kiếm/lọc kết hợp và xóa lọc vẫn đạt.
- **Chưa kiểm tra:** trình duyệt ngoài Chrome, trình đọc màn hình và nhiều thiết bị người dùng. Backend đã có kiểm tra transaction đồng thời riêng; mock localStorage vẫn không cung cấp giao dịch.
- **Chưa triển khai:** email xác nhận, Admin Dashboard/xác thực quản trị và AWS. Backend local đã tích hợp; API đọc kết quả chưa có đăng nhập/ủy quyền.

Backend đã có transaction và năm API trong [contract](../docs/api-contract.md). Bước tiếp theo: Admin Dashboard, quyết định kiểm soát truy cập dữ liệu đăng ký và kiểm thử rộng hơn. AWS vẫn nằm ngoài mốc local hiện tại.

Script trình duyệt nằm tại `tests/frontend/check-registration-browser.mjs`, dùng Node WebSocket và Chrome DevTools Protocol, không cài thêm framework test. Chỉ cho phép tạo đăng ký khi API đang trỏ bảng có prefix `fcaj-event-workshop-local-test-`. Xem [Backend README](../backend/README.md#kiểm-thử) để chuẩn bị bảng/API test. Ví dụ mở Chrome headless bằng profile riêng, remote debugging port 9240, rồi từ repo root chạy `node tests/frontend/check-registration-browser.mjs`. Mặc định script dùng Frontend 5173 và API 3002; có thể đổi bằng `FRONTEND_TEST_URL`, `API_TEST_URL`, `CHROME_DEBUG_PORT`.
