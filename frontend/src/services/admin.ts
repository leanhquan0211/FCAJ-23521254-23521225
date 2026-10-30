import { DATA_MODE } from '@/services/events'
import { request } from '@/services/http-client'
import type { AdminEvent, AdminSession, EventInput, ManagedAccount } from '@/types/admin'
import { RegistrationError } from '@/types/registration'

function requireApi() {
  if (DATA_MODE !== 'api') throw new RegistrationError('configuration', 'Quản trị viên cần chế độ API. Hãy chuyển VITE_DATA_MODE sang api và khởi động lại frontend.')
}

export async function getSession(): Promise<AdminSession | null> {
  requireApi()
  try { return await request<AdminSession>('/admin/session') }
  catch (cause) { if (cause instanceof RegistrationError && cause.code === 'unauthorized') return null; throw cause }
}

export function login(username: string, password: string) {
  requireApi()
  return request<AdminSession>('/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) })
}

export function logout(session: AdminSession) {
  return request('/admin/logout', { method: 'POST', headers: { 'X-CSRF-Token': session.csrfToken } })
}

export async function getAdminEvents() {
  requireApi()
  const body = await request<{ events: AdminEvent[] }>('/admin/events')
  return body.events
}

export function saveEvent(input: EventInput, session: AdminSession, existing?: AdminEvent) {
  return request<AdminEvent>(existing ? `/admin/events/${encodeURIComponent(existing.id)}` : '/admin/events', {
    method: existing ? 'PUT' : 'POST', headers: { 'X-CSRF-Token': session.csrfToken },
    body: JSON.stringify(existing ? { ...input, version: existing.version } : input),
  })
}

export function deleteEvent(event: AdminEvent, session: AdminSession) {
  return request<{ deleted: boolean; deleting?: boolean; version?: number }>(`/admin/events/${encodeURIComponent(event.id)}`, {
    method: 'DELETE', headers: { 'X-CSRF-Token': session.csrfToken }, body: JSON.stringify({ version: event.version }),
  })
}

export async function getAdminAccounts() {
  return (await request<{ users: ManagedAccount[] }>('/admin/users')).users
}

export function saveAccount(account: ManagedAccount, fullName: string, email: string, session: AdminSession) {
  return request<ManagedAccount>(`/admin/users/${account.userId}`, {
    method: 'PUT', headers: { 'X-CSRF-Token': session.csrfToken },
    body: JSON.stringify({ fullName, email, version: account.version }),
  })
}

export function deleteAccount(account: ManagedAccount, session: AdminSession) {
  return request<{ deleted: boolean; deleting?: boolean }>(`/admin/users/${account.userId}`, {
    method: 'DELETE', headers: { 'X-CSRF-Token': session.csrfToken }, body: JSON.stringify({ version: account.version }),
  })
}
