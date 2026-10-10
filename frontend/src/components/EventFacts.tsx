import { CalendarDays, MapPin, UsersRound, Building2 } from 'lucide-react'
import { formatEventDateTime } from '@/lib/event-listing'
import type { EventItem } from '@/types/event'

export function EventFacts({ event }: { event: EventItem }) {
  return <dl className="grid gap-5 sm:grid-cols-2">
    <div className="flex gap-3"><CalendarDays aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary" /><div><dt className="text-sm text-muted-foreground">Thời gian</dt><dd className="mt-1 tabular-nums">{formatEventDateTime(event.dateTime)}</dd></div></div>
    <div className="flex gap-3"><MapPin aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary" /><div><dt className="text-sm text-muted-foreground">Địa điểm</dt><dd className="mt-1">{event.location}</dd></div></div>
    <div className="flex gap-3"><Building2 aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary" /><div><dt className="text-sm text-muted-foreground">Đơn vị tổ chức</dt><dd className="mt-1">{event.organizer}</dd></div></div>
    <div className="flex gap-3"><UsersRound aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary" /><div><dt className="text-sm text-muted-foreground">Sức chứa và chỗ còn lại</dt><dd className="mt-1 tabular-nums">{event.capacity} chỗ · Còn {event.remainingSeats} chỗ</dd></div></div>
  </dl>
}
