import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { EventFacts } from '@/components/EventFacts'
import { PageState } from '@/components/PageState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useEvent } from '@/hooks/useEvent'
import { STATUS_LABELS } from '@/types/event'

export function EventDetailPage() {
  const { eventId } = useParams()
  const { event, loading, error } = useEvent(eventId)
  if (loading) return <p role="status" className="pt-16">Đang tải sự kiện…</p>
  if (error) return <PageState title="Không thể tải sự kiện" message={error} />
  if (!event) return <PageState title="Không tìm thấy sự kiện" message="Đường dẫn hoặc mã sự kiện không tồn tại." />
  return <div className="max-w-4xl pt-12 sm:pt-16">
    <Link to="/events" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><ArrowLeft aria-hidden="true" className="size-4" />Danh sách sự kiện</Link>
    <div className="mt-8 flex flex-wrap items-center gap-3"><span className="text-sm font-medium text-muted-foreground">{event.category}</span><Badge data-status={event.status} className="status-badge h-7 px-2.5 text-sm">{STATUS_LABELS[event.status]}</Badge></div>
    <h1 className="font-display mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{event.title}</h1>
    <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{event.summary}</p>
    <div className="mt-10 border-y border-border py-8"><EventFacts event={event} /></div>
    <section className="mt-10 max-w-2xl"><h2 className="font-display text-xl font-semibold">Về sự kiện</h2><p className="mt-4 text-base leading-relaxed text-muted-foreground">{event.description}</p></section>
    <div className="mt-10 border-t border-border pt-8">
      {event.status === 'open' ? <Button asChild className="min-h-11"><Link to={`/events/${event.id}/register`}>Đăng ký tham gia <ArrowRight aria-hidden="true" /></Link></Button> : <p role="status" className="font-medium text-muted-foreground">{event.status === 'full' ? 'Sự kiện đã hết chỗ, hiện không thể đăng ký.' : 'Sự kiện đã kết thúc, hiện không thể đăng ký.'}</p>}
    </div>
  </div>
}
