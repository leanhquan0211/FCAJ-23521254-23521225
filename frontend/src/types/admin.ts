import type { EventCategory, EventItem } from '@/types/event'

export interface AdminSession {
  username: string
  role: 'admin'
  csrfToken: string
  expiresAt: number
}

export interface AdminEvent extends EventItem {
  registrationOpen: boolean
  version: number
  occupiedSeats: number
}

export interface EventInput {
  title: string
  category: EventCategory
  dateTime: string
  location: string
  organizer: string
  capacity: number
  registrationOpen: boolean
  summary: string
  description: string
}
