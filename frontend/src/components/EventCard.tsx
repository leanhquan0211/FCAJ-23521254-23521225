import { ArrowUpRight, CalendarDays, MapPin, UsersRound } from 'lucide-react'
import { Link } from 'react-router'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatEventDateTime } from '@/lib/event-listing'
import { STATUS_LABELS, type EventItem } from '@/types/event'

interface EventCardProps {
  event: EventItem
}

export function EventCard({ event }: EventCardProps) {
  return (
      <Card className="event-card h-full bg-card py-6">
        <CardHeader className="gap-5">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {event.category}
            </span>
            <Badge data-status={event.status} className="status-badge h-7 px-2.5 text-sm">
              {STATUS_LABELS[event.status]}
            </Badge>
          </div>
          <CardTitle className="event-title min-w-0">
            <h3 className="font-display text-xl leading-snug font-semibold">
              {event.title}
            </h3>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-5">
          <p className="text-base leading-relaxed text-muted-foreground">
            {event.summary}
          </p>

          <div className="mt-auto space-y-3 border-t border-border pt-5 text-sm">
            <p className="flex items-start gap-2">
              <CalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="tabular-nums">{formatEventDateTime(event.dateTime)}</span>
            </p>
            <p className="flex items-start gap-2">
              <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              {event.location}
            </p>
            <p className="flex items-start gap-2">
              <UsersRound aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="tabular-nums">
                {event.status === 'ended'
                  ? 'Sự kiện đã diễn ra'
                  : `Còn ${event.remainingSeats} chỗ`}
              </span>
            </p>
          </div>

            <Button asChild variant="outline" className="min-h-11 w-fit">
              <Link to={`/events/${event.id}`}>
              Xem chi tiết
              <ArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
        </CardContent>
      </Card>
  )
}
