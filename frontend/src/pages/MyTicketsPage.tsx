// Hallmark · Almanac system · divided ticket list · critique: P4 H4 E4 S4 R5 V4
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { PageState } from '@/components/PageState'
import { useBuyerSession } from '@/hooks/useBuyerSession'
import { getMyTickets } from '@/services/buyer'
import { getEvents } from '@/services/events'
import { formatEventDateTime } from '@/lib/event-listing'
import type { Registration } from '@/types/registration'
import type { EventItem } from '@/types/event'

export function MyTicketsPage() {
  const buyer = useBuyerSession()
  const [state, setState] = useState<{ tickets: Registration[]; events: EventItem[]; loading: boolean; error: string }>({ tickets: [], events: [], loading: true, error: '' })
  useEffect(() => {
    if (!buyer.session) return
    let active = true
    Promise.all([getMyTickets(), getEvents()]).then(([result, events]) => {
      if (active) setState({ tickets: result.registrations, events, loading: false, error: '' })
    }).catch((cause) => { if (active) setState({ tickets: [], events: [], loading: false, error: cause instanceof Error ? cause.message : 'Không thể tải vé.' }) })
    return () => { active = false }
  }, [buyer.session])
  if (buyer.loading) return <p role="status" className="pt-12">Đang kiểm tra phiên…</p>
  if (!buyer.session) return <Navigate to="/login?returnTo=%2Fmy-tickets" replace />
  if (state.loading) return <p role="status" className="pt-12">Đang tải vé của bạn…</p>
  if (state.error) return <PageState title="Không thể tải vé" message={state.error} />
  return <div className="max-w-4xl py-12 sm:py-16"><h1 className="font-display text-3xl font-bold">Vé của tôi</h1><p className="mt-4 text-base text-muted-foreground">Các vé đã được ghi nhận cho tài khoản của bạn.</p>
    <div className="mt-8 divide-y divide-border border-y border-border">{state.tickets.map((ticket) => {
      const event = state.events.find((item) => item.id === ticket.eventId)
      return <article key={ticket.id} className="flex min-w-0 flex-wrap items-start justify-between gap-5 py-6"><div className="min-w-0 flex-1 basis-64"><h2 className="font-display text-xl font-semibold">{event?.title ?? 'Sự kiện'}</h2>{event && <p className="mt-2 text-sm text-muted-foreground">{formatEventDateTime(event.dateTime)} · {event.location}</p>}<p className="mt-3 break-all text-sm tabular-nums">Mã vé: {ticket.id}</p></div><Button asChild variant="outline" className="min-h-11"><Link to={`/registrations/${ticket.id}`}>Xem vé</Link></Button></article>
    })}</div>
    {!state.tickets.length && <p className="py-8 text-muted-foreground">Bạn chưa có vé. Hãy chọn một sự kiện phù hợp để tham gia.</p>}
    <Button asChild variant="outline" className="mt-8 min-h-11"><Link to="/events">Xem sự kiện</Link></Button>
  </div>
}
