import { useEffect, useState } from 'react'
import { SearchX } from 'lucide-react'
import { EventCard } from '@/components/EventCard'
import { EventFilters } from '@/components/EventFilters'
import { PageState } from '@/components/PageState'
import { Button } from '@/components/ui/button'
import { filterEvents, type CategoryFilter, type StatusFilter } from '@/lib/event-listing'
import { getEvents } from '@/services/mock-events'
import type { EventItem } from '@/types/event'

export function EventListPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [announcedCount, setAnnouncedCount] = useState(0)
  const visibleEvents = filterEvents(events, { query, category, status })
  const hasActiveFilters = query.trim() !== '' || category !== 'all' || status !== 'all'

  useEffect(() => {
    let active = true
    getEvents().then((items) => { if (active) { setEvents(items); setLoading(false) } })
      .catch(() => { if (active) { setError(true); setLoading(false) } })
    return () => { active = false }
  }, [])
  useEffect(() => {
    const timeout = window.setTimeout(() => setAnnouncedCount(visibleEvents.length), 250)
    return () => window.clearTimeout(timeout)
  }, [visibleEvents.length])

  function clearFilters() { setQuery(''); setCategory('all'); setStatus('all') }
  if (error) return <PageState title="Không thể tải danh sách" message="Dữ liệu trình duyệt có thể đã bị lỗi. Vui lòng kiểm tra hoặc tải lại trang." />

  return <>
    <div className="max-w-3xl pt-12 pb-10 sm:pt-16 sm:pb-14">
      <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Tìm sự kiện phù hợp</h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">Tìm theo tên, chọn danh mục và xem tình trạng đăng ký trước khi quyết định tham gia.</p>
    </div>
    <EventFilters query={query} category={category} status={status} hasActiveFilters={hasActiveFilters} onQueryChange={setQuery} onCategoryChange={setCategory} onStatusChange={setStatus} onClear={clearFilters} />
    <section id="danh-sach" aria-labelledby="event-list-heading" className="mt-12 scroll-mt-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2 border-b border-border pb-4">
        <h2 id="event-list-heading" className="font-display text-xl font-semibold">Danh sách sự kiện</h2>
        <p className="tabular-nums text-sm text-muted-foreground">{visibleEvents.length} sự kiện · Dữ liệu minh hoạ</p>
      </div>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">Có {announcedCount} sự kiện phù hợp.</p>
      {loading ? <p role="status" className="py-12 text-muted-foreground">Đang tải sự kiện…</p> : visibleEvents.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{visibleEvents.map((event) => <EventCard key={event.id} event={event} />)}</div>
      ) : <div className="flex max-w-xl flex-col items-start gap-4 py-12">
        <SearchX aria-hidden="true" className="size-7 text-muted-foreground" />
        <h3 className="font-display text-xl font-semibold">Không tìm thấy sự kiện phù hợp</h3>
        <p className="text-base text-muted-foreground">Hãy thử tên khác hoặc xóa bộ lọc để xem lại toàn bộ sự kiện.</p>
        <Button type="button" variant="outline" className="min-h-11" onClick={clearFilters}>Xóa bộ lọc</Button>
      </div>}
    </section>
  </>
}
