// Hallmark · genre: editorial · macrostructure: Workbench · design-system: DESIGN.md · designed-as-app
import { useEffect, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router'
import { CalendarDays, LayoutList, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Plus, Ticket, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useSession } from '@/hooks/useSession'
import { logout } from '@/services/session'
import { PageState } from '@/components/PageState'
import { EntryLayout } from '@/components/EntryLayout'
import { DATA_MODE } from '@/services/events'
import { SidebarHint } from '@/components/SidebarHint'

export function AppShell() {
  const account = useSession()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('event-workshop:sidebar-collapsed') === 'true' } catch { return false }
  })
  useEffect(() => {
    try { localStorage.setItem('event-workshop:sidebar-collapsed', String(collapsed)) } catch { /* Layout still works without storage. */ }
  }, [collapsed])
  const [leaving, setLeaving] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  if (DATA_MODE === 'mock') return <EntryLayout />
  if (account.loading) return <p role="status" className="p-6">Đang kiểm tra phiên đăng nhập…</p>
  if (account.error) return <div className="p-6"><PageState title="Chưa kết nối được máy chủ" message={account.error} /><Button onClick={account.refresh}>Thử lại</Button></div>
  if (!account.session) return <Navigate to={`/login?returnTo=${encodeURIComponent(pathname)}`} replace />
  const session = account.session
  const admin = session.role === 'admin'
  const name = admin ? session.username : session.user.fullName
  const role = admin ? 'Quản trị viên' : 'Người tham gia'
  const items = admin
    ? [{ to: '/admin', label: 'Quản lý sự kiện', icon: LayoutList }, { to: '/admin/events/new', label: 'Tạo sự kiện', icon: Plus }, { to: '/admin/users', label: 'Quản lý tài khoản', icon: Users }]
    : [{ to: '/events', label: 'Khám phá sự kiện', icon: CalendarDays }, { to: '/my-tickets', label: 'Vé của tôi', icon: Ticket }]
  const title = pathname.includes('/edit') ? 'Chỉnh sửa sự kiện' : pathname.endsWith('/register') ? 'Đăng ký sự kiện'
    : pathname.startsWith('/registrations/') ? 'Thông tin vé' : items.find((item) => item.to === pathname)?.label
      ?? (admin ? 'Quản lý sự kiện' : 'Chi tiết sự kiện')
  async function signOut() {
    if (leaving) return
    setLeaving(true); setLogoutError('')
    try { await logout(session); account.setSession(null) }
    catch (cause) { setLogoutError(cause instanceof Error ? cause.message : 'Không thể đăng xuất.'); setLeaving(false) }
  }
  function menu(compact = false) {
    return <>
      <div className={`shrink-0 py-7 ${compact ? 'px-4 text-center' : 'px-6'}`}><Link to={admin ? '/admin' : '/events'} aria-label="Sự kiện" title={compact ? 'Sự kiện' : undefined} onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center whitespace-nowrap font-display text-2xl font-bold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{compact ? <CalendarDays aria-hidden="true" /> : 'Sự kiện'}</Link>{!compact && <p className="mt-2 text-sm text-muted-foreground">{role}</p>}</div>
      <nav aria-label="Điều hướng chính" className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {items.map(({ to, label, icon: Icon }) => <SidebarHint key={to} label={label} enabled={compact}><NavLink to={to} aria-label={label} end={to === '/admin'} onClick={() => setOpen(false)} className={`flex min-h-11 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-3 text-base font-medium transition-colors hover:bg-muted active:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${compact ? 'justify-center' : ''} ${(pathname === to || (to !== '/admin' && pathname.startsWith(to + '/'))) ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}><Icon size={20} className="shrink-0" aria-hidden="true" />{!compact && label}</NavLink></SidebarHint>)}
      </nav>
      <div className={`shrink-0 space-y-3 border-t border-border ${compact ? 'p-3' : 'p-4'}`}>{!compact && <p className="break-words text-sm text-muted-foreground">Đang dùng tài khoản<br /><span className="font-medium text-foreground">{name}</span></p>}
        {logoutError && <p role="alert" className="text-sm text-destructive">{logoutError}</p>}
        <Button variant="outline" aria-label={leaving ? 'Đang đăng xuất' : 'Đăng xuất'} title={compact ? 'Đăng xuất' : undefined} className={`min-h-11 w-full ${compact ? 'justify-center' : 'justify-start'}`} disabled={leaving} onClick={signOut}><LogOut aria-hidden="true" />{!compact && (leaving ? 'Đang đăng xuất…' : 'Đăng xuất')}</Button>
      </div>
    </>
  }
  return <div className={`min-h-dvh ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-background focus:p-3">Đến nội dung chính</a>
    <aside id="desktop-sidebar" className={`fixed inset-y-0 left-0 hidden flex-col border-r border-border bg-card lg:flex ${collapsed ? 'w-20' : 'w-64'}`}>{menu(collapsed)}</aside>
    <header className="sticky top-0 z-30 flex min-h-20 min-w-0 items-center gap-3 border-b border-border bg-background px-4 py-4 sm:px-6">
      <Button variant="outline" size="icon" className="hidden size-11 shrink-0 lg:inline-flex" aria-controls="desktop-sidebar" aria-expanded={!collapsed} aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'} title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'} onClick={() => setCollapsed((value) => !value)}>{collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button variant="outline" size="icon" className="size-11 shrink-0 lg:hidden" aria-label="Mở menu"><Menu aria-hidden="true" /></Button></DialogTrigger>
        <DialogContent className="inset-y-0 left-0 top-0 flex h-dvh w-72 max-w-[calc(100%-2rem)] translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 sm:max-w-72 [&_[data-slot=dialog-close]]:size-11">
          <DialogTitle className="sr-only">Menu {role}</DialogTitle><DialogDescription className="sr-only">Chọn chức năng hoặc đăng xuất tài khoản.</DialogDescription>{menu()}
        </DialogContent>
      </Dialog>
      <div className="min-w-0 flex-1"><p className="text-sm text-muted-foreground">{role}</p><p className="break-words font-display text-base font-semibold sm:text-lg">{title}</p></div>
      <p className="hidden max-w-64 break-words text-right text-sm sm:block">{name}</p>
    </header>
    <main id="main-content" className="mx-auto w-full min-w-0 max-w-7xl px-4 pb-8 sm:px-6 lg:px-8"><Outlet key={session.csrfToken} /></main>
  </div>
}
