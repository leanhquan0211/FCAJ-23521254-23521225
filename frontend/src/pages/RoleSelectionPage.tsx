import { ArrowRight, ShieldCheck, UserRound } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function RoleSelectionPage() {
  return <div className="max-w-4xl py-12 sm:py-16">
    <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">Bạn muốn tham gia như thế nào?</h1>
    <p className="mt-4 max-w-2xl text-base text-muted-foreground">Khám phá một sự kiện phù hợp hoặc vào không gian quản lý của bạn.</p>
    <div className="mt-10 grid gap-6 md:grid-cols-2">
      <Card><CardHeader className="gap-4"><UserRound aria-hidden="true" className="size-6 text-primary" /><CardTitle className="font-display text-xl font-semibold">Người tham gia</CardTitle></CardHeader>
        <CardContent className="flex flex-1 flex-col gap-6"><p className="text-base text-muted-foreground">Xem sự kiện, tìm kiếm theo tên và đăng ký tham gia. Không cần tài khoản.</p><Button asChild className="mt-auto min-h-11 w-fit"><Link to="/events">Khám phá sự kiện <ArrowRight aria-hidden="true" /></Link></Button></CardContent>
      </Card>
      <Card><CardHeader className="gap-4"><ShieldCheck aria-hidden="true" className="size-6 text-primary" /><CardTitle className="font-display text-xl font-semibold">Quản trị viên</CardTitle></CardHeader>
        <CardContent className="flex flex-1 flex-col gap-6"><p className="text-base text-muted-foreground">Thêm, chỉnh sửa thông tin và mở hoặc đóng đăng ký sự kiện. Cần đăng nhập bằng tài khoản được cấp.</p><Button asChild variant="outline" className="mt-auto min-h-11 w-fit"><Link to="/admin">Vào trang quản trị <ArrowRight aria-hidden="true" /></Link></Button></CardContent>
      </Card>
    </div>
  </div>
}
