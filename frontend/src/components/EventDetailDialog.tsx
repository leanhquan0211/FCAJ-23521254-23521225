import { CalendarDays, MapPin, UsersRound } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatEventDateTime } from '@/lib/event-listing'
import { STATUS_LABELS, type EventItem } from '@/types/event'

interface EventDetailDialogProps {
  event: EventItem
}

export function EventDetailDialog({ event }: EventDetailDialogProps) {
  return (
    <DialogContent showCloseButton={false} className="max-h-[min(85svh,45rem)] overflow-y-auto p-6 sm:max-w-xl">
      <DialogHeader className="gap-3 pr-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">{event.category}</span>
          <Badge data-status={event.status} className="status-badge h-7 px-2.5 text-sm">
            {STATUS_LABELS[event.status]}
          </Badge>
        </div>
        <DialogTitle className="font-display text-2xl leading-snug font-semibold sm:text-3xl">
          {event.title}
        </DialogTitle>
        <DialogDescription className="text-base leading-relaxed">
          {event.summary}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 border-y border-border py-5 text-sm sm:grid-cols-2">
        <p className="flex items-start gap-2">
          <CalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          <span className="tabular-nums">{formatEventDateTime(event.dateTime)}</span>
        </p>
        <p className="flex items-start gap-2">
          <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          {event.location}
        </p>
        <p className="flex items-start gap-2 sm:col-span-2">
          <UsersRound aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          <span className="tabular-nums">
            {event.status === 'ended'
              ? `Sức chứa: ${event.capacity} người · Sự kiện đã diễn ra`
              : `Còn ${event.remainingSeats} / ${event.capacity} chỗ`}
          </span>
        </p>
      </div>

      <p className="text-base leading-relaxed text-muted-foreground">{event.description}</p>
      <p className="text-sm text-muted-foreground">
        Đây là thông tin minh hoạ. Chức năng đăng ký sẽ được bổ sung sau.
      </p>

      <DialogClose asChild>
        <Button type="button" variant="outline" className="min-h-11 justify-self-start">
          Đóng chi tiết
        </Button>
      </DialogClose>
    </DialogContent>
  )
}
