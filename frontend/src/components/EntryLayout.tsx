// Hallmark · studied-DNA · Sakura Night · fading bar / glass entry
import { Link, Outlet } from 'react-router'
import { BrandMark } from '@/components/BrandMark'
import { ThemeToggle } from '@/components/ThemeToggle'
import { PageMotion } from '@/components/PageMotion'
import { AppearanceControls } from '@/components/AppearanceControls'

export function EntryLayout() {
  return <div className="entry-shell flex min-h-svh flex-col bg-background text-foreground" data-area="entry">
    <header className="entry-header">
      <div className="entry-nav">
        <Link to="/" className="entry-wordmark font-display inline-flex min-h-11 items-center gap-2 text-lg font-bold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <BrandMark className="size-10" />Sự kiện
        </Link>
        <p className="entry-nav-note">Gặp gỡ. Kết nối. Trải nghiệm.</p>
        <div className="entry-actions"><AppearanceControls /><ThemeToggle /></div>
      </div>
    </header>
    <main className="entry-main mx-auto w-full max-w-7xl flex-1 px-5 pb-16 sm:px-8"><PageMotion><Outlet /></PageMotion></main>
    <footer className="entry-footer"><p>Website đăng ký sự kiện</p><span>Những cuộc gặp đáng nhớ.</span></footer>
  </div>
}
