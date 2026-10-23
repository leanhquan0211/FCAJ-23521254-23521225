// Hallmark · Almanac · management navigation · critique: P4 H5 E4 S4 R5 V4
import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

type AdminShellProps = {
  children: ReactNode
  username?: string
  leaving?: boolean
  logoutError?: string
  onLogout?: () => void
}

export function AdminShell({ children, username, leaving, logoutError, onLogout }: AdminShellProps) {
  return <div className="flex min-h-svh flex-col bg-background text-foreground" data-area="admin">
    <header className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link to="/admin" className="font-display inline-flex min-h-11 items-center gap-3 text-lg font-bold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
              <ShieldCheck aria-hidden="true" className="size-5 text-primary" />Sự kiện · Quản trị
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">Khu vực quản trị</p>
          </div>
          <Link to="/events" className="inline-flex min-h-11 items-center whitespace-nowrap text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">Xem website</Link>
        </div>
        {username && <div className="mt-4 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-border pt-4">
          <nav aria-label="Điều hướng quản trị" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <NavLink to="/admin" end className={({ isActive }) => `inline-flex min-h-11 items-center whitespace-nowrap text-sm font-medium underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring ${isActive ? 'text-primary underline' : 'text-muted-foreground'}`}>Quản lý sự kiện</NavLink>
            <NavLink to="/admin/events/new" className={({ isActive }) => `inline-flex min-h-11 items-center whitespace-nowrap text-sm font-medium underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring ${isActive ? 'text-primary underline' : 'text-muted-foreground'}`}>Tạo sự kiện</NavLink>
          </nav>
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <p className="max-w-64 break-words text-sm">
              <span className="block text-xs text-muted-foreground">Quản trị viên</span>
              <span className="font-medium" data-admin-name>{username}</span>
            </p>
            <Button variant="outline" className="min-h-11" disabled={leaving} onClick={onLogout}>
              {leaving ? 'Đang thoát…' : 'Đăng xuất quản trị'}
            </Button>
          </div>
        </div>}
      </div>
    </header>
    {logoutError && <p role="alert" className="mx-auto w-full max-w-7xl px-5 pt-4 text-sm text-destructive sm:px-8">{logoutError}</p>}
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 pb-16 sm:px-8">{children}</main>
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-5 text-sm text-muted-foreground sm:px-8">
        <span>Quản trị sự kiện · Dành cho tài khoản được cấp</span>
        <Link to="/" className="inline-flex min-h-11 items-center whitespace-nowrap font-medium hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">Chọn khu vực khác</Link>
      </div>
    </footer>
  </div>
}
