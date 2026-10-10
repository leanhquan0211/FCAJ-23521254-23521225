import { Link, Outlet } from 'react-router'

export function SiteLayout() {
  return <div id="dau-trang" className="min-h-svh bg-background text-foreground flex flex-col">
    <header className="border-b border-border">
      <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link to="/events" className="font-display inline-flex min-h-11 items-center gap-3 text-lg font-bold whitespace-nowrap focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <span aria-hidden="true" className="size-2.5 bg-primary" />Sự kiện
        </Link>
        <nav aria-label="Điều hướng chính">
          <Link to="/events" className="inline-flex min-h-11 items-center text-sm font-medium whitespace-nowrap text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">Danh sách sự kiện</Link>
        </nav>
      </div>
    </header>
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 pb-20 sm:px-8"><Outlet /></main>
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-5 py-5 text-sm text-muted-foreground sm:px-8">
        <span>Website đăng ký sự kiện</span><span>Dữ liệu minh hoạ cho bản prototype</span>
      </div>
    </footer>
  </div>
}
