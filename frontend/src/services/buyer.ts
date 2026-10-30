import { request } from '@/services/http-client'
import { RegistrationError, type Registration } from '@/types/registration'
import type { Buyer, BuyerSession } from '@/types/buyer'

export function registerBuyer(fullName: string, email: string, password: string) {
  return request<{ user: Buyer }>('/auth/register', { method: 'POST', body: JSON.stringify({ fullName, email, password }) })
}

export function loginBuyer(email: string, password: string) {
  return request<BuyerSession>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
}

export async function getBuyerSession() {
  try { return await request<BuyerSession>('/auth/session') }
  catch (cause) { if (cause instanceof RegistrationError && cause.code === 'unauthorized') return null; throw cause }
}

export function logoutBuyer(session: BuyerSession) {
  return request<{ loggedOut: boolean }>('/auth/logout', { method: 'POST', headers: { 'X-CSRF-Token': session.csrfToken }, body: '{}' })
}

export function bookTicket(eventId: string, phone: string, key: string, session: BuyerSession) {
  return request<Registration>(`/events/${encodeURIComponent(eventId)}/registrations`, {
    method: 'POST', headers: { 'X-CSRF-Token': session.csrfToken, 'Idempotency-Key': key }, body: JSON.stringify({ phone }),
  })
}

export function getMyTickets() { return request<{ registrations: Registration[] }>('/me/registrations') }

export function safeReturnPath(value: string | null) {
  if (value && (/^\/events\/[a-z0-9][a-z0-9-]{0,79}\/register$/.test(value)
    || /^\/registrations\/[a-f0-9-]{36}$/.test(value) || value === '/my-tickets')) return value
  return '/events'
}
