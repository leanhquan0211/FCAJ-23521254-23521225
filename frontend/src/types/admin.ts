import type { EventCategory, EventItem } from '@/types/event'
import type { Buyer } from '@/types/buyer'

export interface ManagedAccount extends Buyer {
  version: number
  deleting: boolean
}

export interface AdminSession {
  username: string
  role: 'admin'
  csrfToken: string
  expiresAt: number
}

export interface AdminEvent extends EventItem {
  registrationOpen: boolean
  version: number
  deleting: boolean
  occupiedSeats: number
}

export interface EventInput {
  title: string
  category: EventCategory
  dateTime: string
  salesOpenAt: string | null
  location: string
  organizer: string
  capacity: number
  registrationOpen: boolean
  summary: string
  description: string
}
