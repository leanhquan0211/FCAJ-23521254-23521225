import type { EventItem } from '@/types/event'
import { RegistrationError, type Registration, type RegistrationErrorCode, type RegistrationInput } from '@/types/registration'

const ERROR_CODES: Record<string, RegistrationErrorCode> = {
  VALIDATION_ERROR: 'invalid', EVENT_NOT_FOUND: 'not-found', REGISTRATION_NOT_FOUND: 'not-found',
  DUPLICATE_REGISTRATION: 'duplicate', EVENT_FULL: 'full', REGISTRATION_CLOSED: 'closed',
  DATABASE_UNAVAILABLE: 'unavailable', INTERNAL_ERROR: 'internal',
}

function apiBaseUrl() {
  const base = import.meta.env.VITE_API_BASE_URL?.trim()
  if (!base) throw new RegistrationError('configuration', 'Chưa cấu hình địa chỉ API. Vui lòng kiểm tra VITE_API_BASE_URL.')
  try {
    const url = new URL(base)
    if (!['http:', 'https:'].includes(url.protocol) || url.search || url.hash || url.username || url.password) throw new Error()
    return base.replace(/\/+$/, '')
  } catch {
    throw new RegistrationError('configuration', 'Địa chỉ VITE_API_BASE_URL không hợp lệ.')
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = apiBaseUrl() + path
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 75_000)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal, headers: { 'Content-Type': 'application/json', ...options?.headers } })
    const body = await response.json().catch(() => null)
    if (!response.ok) {
      const error = body?.error
      throw new RegistrationError(ERROR_CODES[error?.code] ?? 'internal', error?.message ?? 'Không thể xử lý yêu cầu. Vui lòng thử lại.', error?.details)
    }
    if (body === null) throw new RegistrationError('internal', 'API trả về dữ liệu không hợp lệ.')
    return body as T
  } catch (cause) {
    if (cause instanceof RegistrationError) throw cause
    throw new RegistrationError('unavailable', 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.')
  } finally {
    window.clearTimeout(timeout)
  }
}

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

export async function registerForEvent(input: RegistrationInput): Promise<Registration> {
  const { eventId, ...body } = input
  return request<Registration>(`/events/${encodeURIComponent(eventId)}/registrations`, { method: 'POST', body: JSON.stringify(body) })
}
