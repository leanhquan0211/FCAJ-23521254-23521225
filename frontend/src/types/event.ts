export const EVENT_CATEGORIES = [
  'Công nghệ',
  'Thiết kế',
  'Kỹ năng',
  'Cộng đồng',
] as const

export type EventCategory = (typeof EVENT_CATEGORIES)[number]
export type RegistrationStatus = 'open' | 'full' | 'ended'

export interface EventItem {
  id: string
  title: string
  category: EventCategory
  dateTime: string
  location: string
  organizer: string
  remainingSeats: number
  capacity: number
  status: RegistrationStatus
  summary: string
  description: string
}

export const STATUS_LABELS: Record<RegistrationStatus, string> = {
  open: 'Còn chỗ',
  full: 'Hết chỗ',
  ended: 'Đã kết thúc',
}
