import type { EventCategory, EventItem, RegistrationStatus } from '@/types/event'

export type CategoryFilter = EventCategory | 'all'
export type StatusFilter = RegistrationStatus | 'all'

export interface EventFiltersValue {
  query: string
  category: CategoryFilter
  status: StatusFilter
}

function normalizeSearch(value: string) {
  return value
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim()
}

export function filterEvents(events: EventItem[], filters: EventFiltersValue) {
  const query = normalizeSearch(filters.query)

  return events.filter((event) => {
    const matchesName = !query || normalizeSearch(event.title).includes(query)
    const matchesCategory =
      filters.category === 'all' || event.category === filters.category
    const matchesStatus = filters.status === 'all' || event.status === filters.status

    return matchesName && matchesCategory && matchesStatus
  })
}

export function formatEventDateTime(dateTime: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(dateTime))
}
