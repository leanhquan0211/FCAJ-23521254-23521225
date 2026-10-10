# Thiết kế màn hình danh sách sự kiện

## Mục tiêu và định hướng

Người dùng cần tìm một sự kiện phù hợp, đọc nhanh thời gian/địa điểm và biết ngay còn đăng ký được hay không. Màn hình dùng tiếng Việt, nội dung ngắn và trạng thái bằng cả chữ lẫn màu. Dữ liệu hiện là mock cho prototype local; không đưa kiến trúc kỹ thuật vào giao diện.

Hallmark: **Catalogue** làm cấu trúc chính vì các sự kiện là những mục ngang hàng cần so sánh và lọc. Phong cách **Almanac** dùng nền giấy sáng, chữ mực đậm, đường kẻ mảnh và một điểm nhấn xanh thông. Header theo **N9 Edge-aligned minimal**, footer theo **Ft2 Inline rule**. Không dùng hero chiếm màn hình, ảnh giả, thống kê quảng cáo hay hiệu ứng cuộn. Bộ lọc đứng ngay trước lưới để hành động tìm sự kiện luôn rõ ràng.

## Token thị giác

| Vai trò | Giá trị/Quy tắc |
| --- | --- |
| Nền giấy | `oklch(0.975 0.009 95)`; bề mặt Card `oklch(0.992 0.005 95)` |
| Mực chính | `oklch(0.245 0.024 166)` |
| Chữ phụ | `oklch(0.45 0.018 166)` |
| Đường kẻ | `oklch(0.855 0.016 150)` |
| Điểm nhấn/xu hướng còn chỗ | xanh thông `oklch(0.43 0.105 169)` |
| Focus | viền xanh `oklch(0.37 0.12 169)`, hiện tức thì và đủ tương phản |
| Hết chỗ | nền vàng giấy nhạt, chữ nâu đậm; luôn ghi “Hết chỗ” |
| Đã kết thúc | nền xám giấy, chữ xám đậm; luôn ghi “Đã kết thúc” |

Mọi màu và font trong code tham chiếu token CSS; token bổ sung nằm ở `tokens.css`. Token `--background`, `--foreground`, `--primary`, `--card`, `--border` của shadcn được ánh xạ sang bảng màu này để Button, Input, Card và Dialog cùng một hệ. Không dùng màu làm tín hiệu trạng thái duy nhất.

Typography: **Be Vietnam Pro** (weight 600/700) cho tiêu đề/wordmark, **Geist Variable** hiện có cho nội dung và nhãn. Cả hai hỗ trợ dấu tiếng Việt; font dự phòng là `system-ui, sans-serif`. Chữ nội dung tối thiểu 16 px, dòng 1.5; tiêu đề gọn, không in nghiêng; số chỗ và ngày dùng số tabular. Các mức chữ chính: 14, 16, 20, 30/36 px. Dùng không quá hai font trên màn hình.

Spacing theo nhịp 4 px: 4, 8, 12, 16, 24, 40, 64 px. Card và Input bo 10–12 px, Button 8–10 px, Badge bo tròn vừa phải. Viền mảnh là cách phân tách chính; bóng đổ chỉ dùng rất nhẹ khi hover. Icon chỉ dùng Lucide nét đều 1.75–2 px, cỡ 16–20 px, đặt cạnh thông tin thời gian, địa điểm hoặc hành động; không dùng icon như hình minh họa độc lập.

## Bố cục

- Desktop: khung nội dung tối đa khoảng 1200 px, header trái/phải. Tiêu đề và mô tả căn trái. Thanh tìm kiếm rộng hơn hai bộ lọc. Danh sách 3 cột ở màn rộng, 2 cột ở cỡ trung bình; các Card cùng nhịp thông tin.
- Mobile: header gọn, tiêu đề tự xuống dòng, tìm kiếm và bộ lọc xếp dọc, danh sách 1 cột. Không có cuộn ngang ở 320, 375, 414 hoặc 768 px; nhãn nút/điều hướng không xuống hai dòng.
- Mỗi Card trình bày danh mục và trạng thái ở đầu, tên sự kiện ở giữa, thời gian/địa điểm/số chỗ phía dưới, “Xem chi tiết” ở cuối. Không lồng Card trong Card.
- Không có kết quả: nêu rõ không tìm thấy sự kiện phù hợp và có nút “Xóa bộ lọc”. Số kết quả được thông báo qua vùng `aria-live`.

## Quy tắc thành phần và trạng thái

| Thành phần | Mặc định và hover | Focus | Disabled / trạng thái khác |
| --- | --- | --- | --- |
| Button | Chữ hành động cụ thể, hit target tối thiểu 44 px; hover đổi sắc độ nhẹ | Viền focus nhìn rõ, không animate viền | Disabled giảm độ nhấn và chặn thao tác; nút xóa lọc chỉ hiện khi có lọc |
| Input | Nhãn hiển thị rõ; border 1 px cố định, hover tăng tương phản | Viền focus ngoài, không đổi độ dày border | Disabled có nền nhạt và chữ đọc được; tìm kiếm không cần trạng thái lỗi |
| Card | Nền sáng, đường viền mảnh; hover chỉ nâng nhẹ bằng viền/bóng | `focus-within` làm rõ ranh giới Card | Card hết chỗ/kết thúc vẫn mở được chi tiết, không giả vờ có hành động đăng ký |
| Badge | Chữ ngắn và màu nền nhẹ | Không nhận focus vì không tương tác | Ba nhãn: “Còn chỗ”, “Hết chỗ”, “Đã kết thúc” |

Nút “Xem chi tiết” mở trang chi tiết riêng. Trang chi tiết dùng cùng header, nhịp chữ, bảng màu và đường kẻ; khối thông tin thời gian, địa điểm, đơn vị tổ chức và sức chứa được trình bày thành các cặp nhãn/giá trị. Trạng thái hết chỗ hoặc đã kết thúc có giải thích rõ và không có CTA đăng ký. Form dùng một Card cho trường nhập và một Card tóm tắt sự kiện, xếp dọc trên mobile; lỗi hiển thị cạnh trường hoặc ngay trước nút gửi. Trang kết quả dùng cùng ngôn ngữ thị giác, nhấn vào mã đăng ký và thông tin sự kiện. Chuyển động chỉ giới hạn ở hover/nhấn và tôn trọng `prefers-reduced-motion`.

## Exports

**CSS nguồn:** [`tokens.css`](tokens.css) chứa bảng màu, font, spacing, radius và motion. `src/index.css` import file này sau các import Tailwind/shadcn/font và trước các rule sử dụng token.

**Tailwind v4 `@theme`** (ánh xạ để dùng khi tách hệ thống sang dự án khác):

```css
@theme inline {
  --color-almanac-paper: var(--color-paper);
  --color-almanac-card: var(--color-card-paper);
  --color-almanac-ink: var(--color-ink);
  --color-almanac-muted: var(--color-ink-muted);
  --color-almanac-rule: var(--color-rule);
  --color-almanac-accent: var(--color-accent);
  --font-almanac-display: var(--font-display);
  --font-almanac-body: var(--font-body);
  --radius-almanac-card: var(--radius-card);
}
```

**DTCG `tokens.json`** (các token gốc; trạng thái bổ sung theo cùng cấu trúc):

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$type": "color", "$value": "oklch(0.975 0.009 95)" },
    "card": { "$type": "color", "$value": "oklch(0.992 0.005 95)" },
    "ink": { "$type": "color", "$value": "oklch(0.245 0.024 166)" },
    "muted": { "$type": "color", "$value": "oklch(0.45 0.018 166)" },
    "rule": { "$type": "color", "$value": "oklch(0.855 0.016 150)" },
    "accent": { "$type": "color", "$value": "oklch(0.43 0.105 169)" },
    "focus": { "$type": "color", "$value": "oklch(0.37 0.12 169)" }
  },
  "space": {
    "md": { "$type": "dimension", "$value": "1rem" },
    "lg": { "$type": "dimension", "$value": "1.5rem" },
    "xl": { "$type": "dimension", "$value": "2.5rem" }
  },
  "radius": {
    "control": { "$type": "dimension", "$value": "0.625rem" },
    "card": { "$type": "dimension", "$value": "0.75rem" }
  },
  "font": {
    "display": { "$type": "fontFamily", "$value": "Be Vietnam Pro" },
    "body": { "$type": "fontFamily", "$value": "Geist Variable" }
  }
}
```

**shadcn/ui CSS variables** (đã áp dụng trong `tokens.css` bằng selector `html:root` để giữ nguyên stylesheet do CLI tạo):

```css
html:root {
  --background: var(--color-paper);
  --foreground: var(--color-ink);
  --card: var(--color-card-paper);
  --primary: var(--color-accent);
  --primary-foreground: var(--color-accent-ink);
  --muted-foreground: var(--color-ink-muted);
  --border: var(--color-rule);
  --ring: var(--color-focus);
}
```
