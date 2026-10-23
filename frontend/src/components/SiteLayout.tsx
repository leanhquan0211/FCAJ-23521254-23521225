import { useState } from 'react'
import { Link, Outlet } from 'react-router'
import { useBuyerSession } from '@/hooks/useBuyerSession'
import { logoutBuyer } from '@/services/buyer'

export function SiteLayout() {
  const buyer = useBuyerSession()
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
  return <div id="dau-trang" className="min-h-svh bg-background text-foreground flex flex-col">
    <header className="border-b border-border">
      <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link to="/" className="font-display inline-flex min-h-11 items-center gap-3 text-lg font-bold whitespace-nowrap focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <span aria-hidden="true" className="size-2.5 bg-primary" />Sự kiện
        </Link>
        <nav aria-label="Điều hướng chính" className="flex flex-wrap justify-end gap-x-4">
          <Link to="/" className="inline-flex min-h-11 items-center text-sm font-medium whitespace-nowrap text-muted-foreground hover:text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">Vai trò</Link>
          <Link to="/events" className="inline-flex min-h-11 items-center text-sm font-medium whitespace-nowrap text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">Danh sách sự kiện</Link>
          <Link to={buyer.session ? '/my-tickets' : '/login'} className="inline-flex min-h-11 items-center whitespace-nowrap text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">{buyer.session ? 'Vé của tôi' : 'Đăng nhập'}</Link>
          {buyer.session && <button type="button" disabled={loggingOut} onClick={logout} className="inline-flex min-h-11 items-center whitespace-nowrap text-sm font-medium text-muted-foreground hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:opacity-50">{loggingOut ? 'Đang thoát…' : 'Đăng xuất'}</button>}
        </nav>
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
