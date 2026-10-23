// Hallmark · Almanac · neutral entry · critique: P4 H4 E4 S4 R5 V4
import { Link, Outlet } from 'react-router'

export function EntryLayout() {
  return <div className="flex min-h-svh flex-col bg-background text-foreground" data-area="entry">
    <header className="border-b border-border">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center px-5 sm:px-8">
        <Link to="/" className="font-display inline-flex min-h-11 items-center gap-3 text-lg font-bold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <span aria-hidden="true" className="size-2.5 bg-primary" />Sự kiện
        </Link>
      </div>
    </header>
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 pb-16 sm:px-8"><Outlet /></main>
    <footer className="border-t border-border"><p className="mx-auto max-w-7xl px-5 py-5 text-sm text-muted-foreground sm:px-8">Website đăng ký sự kiện</p></footer>
  </div>
}
