import type { EventItem } from '@/types/event'
import { RegistrationError, type Registration } from '@/types/registration'

import { request } from '@/services/http-client'

export async function getEvents(): Promise<EventItem[]> {
  const result = await request<{ events: EventItem[] }>('/events')
  if (!Array.isArray(result.events)) throw new RegistrationError('internal', 'Danh sách sự kiện trả về không hợp lệ.')
  return result.events
}

export async function getEvent(eventId: string): Promise<EventItem | null> {
  try { return await request<EventItem>(`/events/${encodeURIComponent(eventId)}`) }
  catch (cause) { if (cause instanceof RegistrationError && cause.code === 'not-found') return null; throw cause }
}

export async function getRegistration(registrationId: string): Promise<Registration | null> {
  try { return await request<Registration>(`/registrations/${encodeURIComponent(registrationId)}`) }
  catch (cause) { if (cause instanceof RegistrationError && cause.code === 'not-found') return null; throw cause }
}
