import { useEffect, useState } from 'react'
import { ArrowDown, CalendarDays, Flower2, HeartHandshake, Lightbulb, PenTool, SearchX } from '@/components/DimensionalIcons'
import { BlossomArtwork } from '@/components/BlossomArtwork'
import { EventCard } from '@/components/EventCard'
import { EventFilters } from '@/components/EventFilters'
import { PageState } from '@/components/PageState'
import { Button } from '@/components/ui/button'
import { filterEvents, type CategoryFilter, type StatusFilter } from '@/lib/event-listing'
import { getEvents } from '@/services/events'
import type { EventItem } from '@/types/event'

export function EventListPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [announcedCount, setAnnouncedCount] = useState(0)
  const visibleEvents = filterEvents(events, { query, category, status })
  const hasActiveFilters = query.trim() !== '' || category !== 'all' || status !== 'all'

  useEffect(() => {
    let active = true
    getEvents().then((items) => { if (active) { setEvents(items); setLoading(false) } })
      .catch((cause) => { if (active) { setError(cause instanceof Error ? cause.message : 'Không thể tải danh sách sự kiện.'); setLoading(false) } })
    return () => { active = false }
  }, [])
  useEffect(() => {
    const timeout = window.setTimeout(() => setAnnouncedCount(visibleEvents.length), 250)
    return () => window.clearTimeout(timeout)
  }, [visibleEvents.length])

  function clearFilters() { setQuery(''); setCategory('all'); setStatus('all') }
  if (error) return <PageState title="Không thể tải danh sách" message={error} />

  return <>
    <div className="event-hero">
      <div className="event-hero-copy">
      <p className="intro-label"><Flower2 size={16} aria-hidden="true" /> Hẹn nhau ở một trải nghiệm mới</p>
      <h1 className="font-display event-display">Tìm sự kiện<br /><span>phù hợp với bạn.</span></h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">Tìm theo tên, chọn danh mục và xem tình trạng đăng ký trước khi quyết định tham gia.</p>
      <Button asChild className="mt-7 min-h-11"><a href="#kham-pha">Khám phá sự kiện<ArrowDown size={16} aria-hidden="true" /></a></Button>
      </div>
      <BlossomArtwork className="event-hero-artwork" />
    </div>
    <div className="category-ribbon" aria-label="Các chủ đề sự kiện"><span><CalendarDays aria-hidden="true" />Công nghệ</span><span><PenTool aria-hidden="true" />Thiết kế</span><span><Lightbulb aria-hidden="true" />Kỹ năng</span><span><HeartHandshake aria-hidden="true" />Cộng đồng</span></div>
    <section className="discovery-story" aria-labelledby="discovery-heading">
      <div><h2 id="discovery-heading" className="font-display">Từ một sở thích,<br /><span>đến những kết nối mới.</span></h2><p>Một buổi học, một cuộc trò chuyện hay một trải nghiệm cùng cộng đồng. Bắt đầu bằng điều khiến bạn tò mò.</p></div>
      <BlossomArtwork variant="branch" className="discovery-artwork" />
      <div className="discovery-notes"><article><Flower2 aria-hidden="true" size={20} /><h3>Tìm điều bạn yêu thích</h3><p>Khám phá các chủ đề và chọn một sự kiện phù hợp với mình.</p></article><article><CalendarDays aria-hidden="true" size={20} /><h3>Dành thời gian để trải nghiệm</h3><p>Xem thời gian, địa điểm và số chỗ còn lại trước khi đăng ký.</p></article></div>
    </section>
    <div id="kham-pha" className="discovery-content">
    <EventFilters query={query} category={category} status={status} hasActiveFilters={hasActiveFilters} onQueryChange={setQuery} onCategoryChange={setCategory} onStatusChange={setStatus} onClear={clearFilters} />
    <section id="danh-sach" aria-labelledby="event-list-heading" className="mt-12 scroll-mt-8">
      <div className="event-section-heading mb-6 flex flex-wrap items-end justify-between gap-2 border-b border-border pb-4">
        <h2 id="event-list-heading" className="font-display text-2xl font-semibold">Danh sách <span>sự kiện</span></h2>
        <p className="tabular-nums text-sm text-muted-foreground">{visibleEvents.length} sự kiện</p>
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
    </div>
  </>
}
