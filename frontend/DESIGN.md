# Thiết kế Frontend — Sakura Night

## Phạm vi được duyệt — 30/10/2026

Redesign giao diện trên nhánh quan theo screenshot người dùng cung cấp. Đây là hệ thiết kế hiện hành, thay thế bảng màu Almanac trước đó. Giữ route, ownership component, state nghiệp vụ, validation, API, dữ liệu, handlers nghiệp vụ và luồng User/Admin. Thay đổi state UI đã được duyệt: bỏ thu gọn menu desktop và thêm sáng/tối. Các thay đổi mật khẩu có sẵn trước đợt này được bảo toàn.

## Điều chỉnh được duyệt tiếp — thanh trong suốt và sáng/tối

Thanh trên cùng chuyển sang nền trong suốt nhạt dần, không bo tròn; nút và liên kết trên thanh dùng hình chữ nhật. Menu desktop luôn hiện nhãn; bỏ state/nút thu gọn desktop theo yêu cầu mới. Drawer mobile và các đường dẫn theo role giữ nguyên. Logo là SVG hoa có chiều sâu bằng geometry/gradient/highlight, không phải ký tự hoặc text art. Tăng nhịp vật thể lên khoảng 6.5 giây, cánh hoa khoảng 8.5 giây; tăng số cánh và sắc neon. Reduced motion vẫn dừng hoàn toàn.

Thêm nút giao diện sáng/tối trên cả hai header. Chỉ lưu tùy chọn giao diện trong localStorage, mặc định tối; không dùng theme để thay đổi quyền hoặc dữ liệu. Biến màu của hai mode cùng nằm trong tokens.css, focus/label/trạng thái luôn đọc được.

## Hallmark và ảnh tham chiếu

### Bổ sung được yêu cầu — kính mờ và cánh hoa toàn trang

Ảnh tham chiếu mới được dùng cho chất liệu: khung kính lớn, viền bắt sáng, lớp nền tán mờ và các phần thông tin phân cấp bên trong. Không sao chép hình nền, nội dung tuyển dụng, màu be hoặc font serif của ảnh. Giữ Sakura Night hồng–navy, hai theme và typography hỗ trợ tiếng Việt hiện có.

- Đăng nhập/đăng ký: phần giới thiệu nằm riêng bên trái, không có khung; chỉ form bên phải dùng kính trong suốt. Mobile xếp dọc. Vùng đầu form có logo nổi, liên kết chuyển đăng nhập/đăng ký rõ ràng. Giữ nguyên field, validation, submit và điều hướng. Trên desktop rộng, bốn field đăng ký chia hai cột để bớt chiều cao.
- Thanh trên cùng phẳng, cao khoảng 56px; nền hồng mặc định che phủ 25%, nhạt dần. Card, bộ lọc, Dialog và form mặc định che phủ khoảng 35–43%, blur 8px để thấy được cánh hoa phía sau. Chỉ giảm alpha nền, không giảm opacity chữ hoặc control. Có fallback nền đặc khi không hỗ trợ backdrop-filter.
- Icon chức năng giữ hình nghĩa Lucide nhưng render bằng nhiều lớp SVG: cạnh đùn, mặt gradient và ánh sáng tạo khối; đây là vector có chiều sâu mô phỏng 3D, không phải mô hình WebGL. Không dùng emoji/ký tự ghép hình; logo hoa SVG hiện có được giữ và dùng cả trên form.
- Cánh hoa SVG nằm ở một lớp nền fixed dùng chung toàn ứng dụng, dưới nội dung, không nhận click/focus và không đọc bởi screen reader. Chuyển động rơi có độ trễ so le, chỉ transform/opacity, giảm mật độ trên mobile. Reduced motion dừng cánh hoa; không tác động dữ liệu hay state nghiệp vụ.
- Kiểm tra lại cả hai theme, 320/375/414/768/1280px, form đăng nhập/đăng ký, bộ lọc, drawer/Dialog và khả năng thao tác qua lớp nền. Không thêm dependency hoặc sửa Backend.
- Hai icon nổi cạnh nút sáng/tối mở Popover chứa range mảnh: Trong suốt 0–100% (mặc định 65%), Neon 0–100% (mặc định 70%). Ba nút có khoảng cách giữa vùng bấm bằng 0, vẫn giữ target 44px; icon 24px để dễ nhận biết. Mặc định ẩn thanh kéo; Escape/bấm ngoài đóng và trả focus. Giá trị lưu riêng trong localStorage dưới khóa event-workshop:appearance; không liên quan phiên đăng nhập. Không còn thanh cố định ở cuối trang. Tại 100% trong suốt, alpha nền kính và blur đều về 0, giữ nguyên chữ, viền và nút chính. Bỏ nút Khám phá ở entry header vì API mode yêu cầu đăng nhập; các nút đăng nhập/đăng ký và điều hướng sau đăng nhập giữ nguyên.
- Ảnh Liquid Glass bổ sung được dùng cho chất liệu: mặt cong bắt sáng, viền sáng, cạnh nổi và bóng mềm trên Card/form/khung lọc; nút primary có khối hồng, nút phụ dùng kính xuyên nền. Input có phản xạ nhẹ và bóng phía trong, vẫn là native Input. Không sao chép chữ, màu tím/xanh hoặc layout demo trong ảnh. Header vẫn phẳng; chỉ các nút nội dung dùng dạng kính nổi. Reduced motion tắt hover lift; không làm biến dạng chữ hoặc thêm hiệu ứng khúc xạ nặng.
- Bổ sung icon lớp xếp chồng mở thanh Bóng nổi 0–100% (mặc định 60%), cùng nhóm Trong suốt/Neon/Theme. Bóng nổi điều chỉnh độ đùn cạnh, highlight và bóng của Card/form/nút/ô nhập; 0% bỏ các lớp bóng này, 100% tăng chiều sâu. Bóng có quầng neon hồng: cường độ phụ thuộc cả Bóng nổi và Neon; Neon 0% tắt quầng nhưng giữ bóng tạo khối. Lưu thêm elevation trong tùy chọn appearance; giá trị cũ chưa có trường này tự dùng 60%. Ở 320px, brand của khung sau đăng nhập hiện logo đồ họa với aria-label, giữ các vùng bấm 44px và không tràn header.
- Danh sách xổ xuống của select dùng nền đặc theo theme và chữ tương phản, mục đang chọn có nền nhấn riêng. Không áp dụng alpha kính hoặc neon cho option/optgroup vì menu native có thể được vẽ ngoài khung trang. Ô select khi đóng vẫn dùng kính; giữ nguyên native select, giá trị và sự kiện thay đổi.
- Chuyển mục điều hướng dùng PageMotion với Web Animations API, tương thích BrowserRouter hiện có: nội dung vào mờ/lướt nhẹ 320ms. Không remount nội dung bằng pathname hoặc giữ trang cũ để tránh tác động state nghiệp vụ. Giảm chuyển động tắt animation. Logo cạnh dòng Những kết nối bắt đầu từ đây dùng BrandMark có cánh hoa tô khối thay glyph nét.

- Genre: atmospheric; theme: studied-DNA, tên nội bộ Sakura Night.
- DNA ảnh: nền navy liền mạch, điểm nhấn hồng hoa, thanh điều hướng bo tròn, hero hai cột, vật thể đồ họa riêng, Card tối và nhịp khoảng trống thoáng.
- Không sao chép ảnh chân dung, nội dung portfolio, thống kê hoặc logo trong screenshot.
- Ảnh tĩnh không xác định được font hoặc chuyển động chính xác. Dùng Be Vietnam Pro và Geist Variable đã cài, cùng chuyển động nhẹ theo yêu cầu bổ sung.
- Khung ứng dụng: thanh điều hướng ngang nền trong suốt chuyển mờ (N9), thay sidebar desktop. Giữ các mục theo role, đăng xuất và drawer mobile; bỏ điều khiển thu gọn, thêm theme toggle.
- Đăng nhập/đăng ký: Split Hero + form. Danh sách: hero giới thiệu + Catalogue có bộ lọc. Admin và các form: Workbench, ưu tiên thao tác và khả năng đọc.

## Bảng màu và typography

Nguồn duy nhất: tokens.css; màu khai báo OKLCH, component dùng biến hoặc semantic utility Tailwind.
- Nền: navy đậm; Card: navy sáng hơn; chữ chính: trắng hồng nhạt; chữ phụ: xanh xám sáng.
- Primary: hồng sáng/chữ navy ở mode tối; hồng đậm/chữ sáng ở mode sáng để giữ tương phản.
- Header: trong suốt nhạt dần, chữ theo theme, thanh và control không bo tròn. Mode sáng dùng nền hồng trắng và Card sáng. Không dùng chữ gradient hoặc glow sau mọi đoạn chữ.
- Còn chỗ: hồng nhạt trên nền hồng tối; hết chỗ: vàng nhạt trên nền vàng tối; kết thúc/đóng/chưa mở: xám sáng trên nền navy.
- Trạng thái luôn có chữ, không chỉ màu. Error dùng semantic destructive.
- Heading: Be Vietnam Pro 600/700, roman. Body: Geist Variable, 16px trở lên, line-height 1.5–1.65.
- Display: clamp 2rem–3.75rem; dòng không vượt khung. Heading/body tối đa hai font; giữ hỗ trợ tiếng Việt.

## Khoảng cách và component

Nhịp 4px; token khoảng cách 8/12/16/24/40/64/96px. Container tối đa 1280px. Card bo 20px, input bo 12px; CTA nội dung dạng pill, header/control trên header không bo.
- Button: tối thiểu 44px với thao tác chính; hover tăng tương phản, active dịch 1px, focus hiện ngay, disabled giảm nhấn và không thao tác.
- Input/select/textarea: nhãn thật, nền navy, border cố định 1px; focus hồng, lỗi gắn aria-invalid và thông báo; không thay validation.
- Card: bề mặt tối, border mềm; hover nâng tối đa 2px trên thiết bị có hover. Nội dung sự kiện và các liên kết hiện có được giữ.
- Badge: nhãn trạng thái hiện có, đủ tương phản, không giả thành nút.
- Dialog: giữ shadcn/Radix, tên/mô tả, focus trap, Escape và trả focus về trigger.
- Icon: hình nghĩa Lucide cho chức năng, dùng chung DimensionalIcons.tsx để dựng cạnh đùn, mặt gradient và nét bắt sáng. Logo hoa có khối dùng BrandMark.tsx. Không dùng emoji hoặc ký tự ghép thành hình minh họa.

## Đồ họa và chuyển động

BlossomArtwork.tsx là SVG vector nguyên bản: đường path quạt giấy, nan quạt, cành và cánh hoa; không phải ASCII, text art hoặc emoji. SVG trang trí có aria-hidden, không nhận focus hay che thao tác.
- Chuyển động theo yêu cầu người dùng: vật thể nổi nhẹ và cánh hoa dịch chuyển chậm, chỉ animate transform/opacity.
- Vật thể 6.5 giây, cánh hoa 8.5 giây; 16 cánh quanh quạt và 5 quanh cành. Không parallax theo chuột, không chạy chữ hoặc animation layout.
- prefers-reduced-motion: reduce dừng hoàn toàn animation trang trí và hover lift.
- Không dùng thư viện animation, CDN hoặc asset bên thứ ba.
- Minh họa quạt/cành lớn chỉ dùng ở hero và vùng giới thiệu tài khoản. Theo yêu cầu bổ sung, lớp cánh hoa nền nhẹ dùng chung toàn ứng dụng, kể cả trang quản trị; nằm dưới nội dung và không nhận tương tác.

## Responsive và kiểm tra

Desktop dùng thanh điều hướng ngang ở đầu và nội dung toàn chiều rộng container bên dưới, hero chữ trái–đồ họa phải, dải chủ đề, phần giới thiệu ngắn rồi danh sách Card ba cột. Form vẫn có nhãn phía trên. Dưới 768px, hero/form xếp một cột; minh họa thu gọn. Drawer mobile giữ breakpoint hiện có; menu desktop luôn có nhãn, không có nút thu gọn.
Kiểm tra 320/375/414/768/1280px: không cuộn ngang, heading xuống dòng trong khung, nút/nav không bị cắt hay xuống hai dòng, input đọc được. Overflow-x: clip ở html/body. Grid có hình dùng minmax(0,1fr).
Kiểm tra build/lint, các điều hướng/tương tác hiện có và reduced motion. Báo riêng kết quả giả lập giao diện với kiểm tra Backend thật.

## Exports

### CSS tokens

tokens.css chứa toàn bộ màu, font, spacing, radius và motion. src/index.css giữ nguyên import Tailwind/shadcn/font; các style mới được thêm ở cuối.

### Tailwind v4

Dùng mapping @theme inline hiện có:
~~~css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-card: var(--card);
  --font-sans: var(--font-body);
}
~~~

### DTCG

~~~json
{
  "color": {
    "paper": { "$type": "color", "$value": "oklch(0.195 0.032 263)" },
    "accent": { "$type": "color", "$value": "oklch(0.75 0.17 350)" }
  },
  "font": {
    "display": { "$type": "fontFamily", "$value": "Be Vietnam Pro" },
    "body": { "$type": "fontFamily", "$value": "Geist Variable" }
  }
}
~~~

### shadcn/ui

~~~css
html:root {
  --background: var(--color-paper);
  --foreground: var(--color-ink);
  --card: var(--color-card-paper);
  --primary: var(--color-accent);
  --primary-foreground: var(--color-accent-ink);
  --border: var(--color-rule);
  --ring: var(--color-focus);
}
~~~
