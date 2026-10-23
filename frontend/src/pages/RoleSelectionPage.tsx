import { ArrowRight, ShieldCheck, UserRound } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function RoleSelectionPage() {
  return <div className="max-w-4xl py-12 sm:py-16">
    <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">Bạn muốn vào khu vực nào?</h1>
    <p className="mt-4 max-w-2xl text-base text-muted-foreground">Chọn nơi phù hợp với việc bạn muốn làm: tìm sự kiện để tham gia hoặc quản lý các sự kiện.</p>
    <div className="mt-10 grid gap-6 md:grid-cols-2">
      <Card><CardHeader className="gap-4"><UserRound aria-hidden="true" className="size-6 text-primary" /><CardTitle className="font-display text-xl font-semibold">Người tham gia</CardTitle></CardHeader>
        <CardContent className="flex flex-1 flex-col gap-6"><p className="text-base text-muted-foreground">Khám phá sự kiện không cần đăng nhập. Khi muốn đặt vé, bạn cần tài khoản người tham gia để đặt và xem lại vé của mình.</p><Button asChild className="mt-auto min-h-11 w-fit"><Link to="/events">Khám phá sự kiện <ArrowRight aria-hidden="true" /></Link></Button></CardContent>
      </Card>
      <Card><CardHeader className="gap-4"><ShieldCheck aria-hidden="true" className="size-6 text-primary" /><CardTitle className="font-display text-xl font-semibold">Khu vực quản trị</CardTitle></CardHeader>
        <CardContent className="flex flex-1 flex-col gap-6"><p className="text-base text-muted-foreground">Tạo, chỉnh sửa và mở hoặc đóng đăng ký sự kiện. Khu vực riêng dành cho quản trị viên có tài khoản được cấp.</p><Button asChild variant="outline" className="mt-auto min-h-11 w-fit"><Link to="/admin">Vào khu vực quản trị <ArrowRight aria-hidden="true" /></Link></Button></CardContent>
      </Card>
    </div>
  </div>
}
