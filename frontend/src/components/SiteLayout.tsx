import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { useBuyerSession } from '@/hooks/useBuyerSession'
import { logoutBuyer } from '@/services/buyer'

export function SiteLayout() {
  const buyer = useBuyerSession()
  const { pathname } = useLocation()
  const isAuthPage = pathname === '/login' || pathname === '/signup'
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  async function logout() {
    if (!buyer.session || loggingOut) return
    setLoggingOut(true); setLogoutError('')
    try {
      await logoutBuyer(buyer.session)
      // Reload the public page after revoking the cookie, clearing all in-memory account data together.
      window.location.replace('/events')
    } catch (cause) { setLogoutError(cause instanceof Error ? cause.message : 'Không thể đăng xuất.') }
    finally { setLoggingOut(false) }
  }
  return <div id="dau-trang" className="min-h-svh bg-background text-foreground flex flex-col" data-area="buyer">
    <header className="border-b border-border">
      <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link to="/events" className="font-display inline-flex min-h-11 items-center gap-3 text-lg font-bold whitespace-nowrap focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
              <span aria-hidden="true" className="size-2.5 bg-primary" />Sự kiện
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">Khu vực người tham gia</p>
          </div>
          <Link to="/" className="inline-flex min-h-11 items-center whitespace-nowrap text-sm font-medium text-muted-foreground hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">Chọn khu vực khác</Link>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-border pt-4">
          <nav aria-label="Điều hướng người tham gia" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <NavLink to="/events" className={({ isActive }) => `inline-flex min-h-11 items-center whitespace-nowrap text-sm font-medium underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring ${isActive ? 'text-primary underline' : 'text-muted-foreground'}`}>Khám phá sự kiện</NavLink>
            {buyer.session && <NavLink to="/my-tickets" className={({ isActive }) => `inline-flex min-h-11 items-center whitespace-nowrap text-sm font-medium underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring ${isActive ? 'text-primary underline' : 'text-muted-foreground'}`}>Vé của tôi</NavLink>}
          </nav>
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            {buyer.loading ? <p role="status" className="text-sm text-muted-foreground">Đang kiểm tra tài khoản…</p> : buyer.session ? <>
              <p className="max-w-64 break-words text-sm">
                <span className="block text-xs text-muted-foreground">Người tham gia</span>
                <span className="font-medium" data-buyer-name>{buyer.session.user.fullName}</span>
              </p>
              <Button variant="outline" className="min-h-11" disabled={loggingOut} onClick={logout}>{loggingOut ? 'Đang thoát…' : 'Đăng xuất'}</Button>
            </> : !isAuthPage && <>
              <Button asChild variant="outline" className="min-h-11"><Link to="/login">Đăng nhập</Link></Button>
              <Button asChild className="min-h-11"><Link to="/signup">Tạo tài khoản</Link></Button>
            </>}
          </div>
        </div>
      </div>
    </header>
    {logoutError && <p role="alert" className="mx-auto w-full max-w-7xl px-5 pt-4 text-sm text-destructive sm:px-8">{logoutError}</p>}
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 pb-20 sm:px-8"><Outlet /></main>
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-5 py-5 text-sm text-muted-foreground sm:px-8">
        <span>Website đăng ký sự kiện</span><span>Đặt chỗ và lưu mã xác nhận</span>
      </div>
    </footer>
  </div>
}
