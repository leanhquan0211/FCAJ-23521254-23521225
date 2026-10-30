import { request } from '@/services/http-client'
import { RegistrationError } from '@/types/registration'
import type { Session } from '@/types/session'

export async function getSession() {
  try { return await request<Session>('/auth/session') }
  catch (cause) {
    if (cause instanceof RegistrationError && ['unauthorized', 'forbidden'].includes(cause.code)) return null
    throw cause
  }
}

export function login(identifier: string, password: string) {
  return request<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) })
}

export function logout(session: Session) {
  return request('/auth/logout', { method: 'POST', headers: { 'X-CSRF-Token': session.csrfToken }, body: '{}' })
}
