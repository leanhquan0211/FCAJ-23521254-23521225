import { RegistrationError, type RegistrationErrorCode } from '@/types/registration'

const ERROR_CODES: Record<string, RegistrationErrorCode> = {
  ACCOUNT_NOT_FOUND: 'not-found', ACCOUNT_CHANGED: 'conflict', ACCOUNT_BUSY: 'unavailable',
  VALIDATION_ERROR: 'invalid', EVENT_NOT_FOUND: 'not-found', REGISTRATION_NOT_FOUND: 'not-found',
  DUPLICATE_REGISTRATION: 'duplicate', EVENT_FULL: 'full', REGISTRATION_CLOSED: 'closed',
  DATABASE_UNAVAILABLE: 'unavailable', INTERNAL_ERROR: 'internal',
  AUTH_REQUIRED: 'unauthorized', INVALID_CREDENTIALS: 'unauthorized',
  FORBIDDEN: 'forbidden', FORBIDDEN_ORIGIN: 'forbidden', CSRF_FAILED: 'forbidden',
  EVENT_CHANGED: 'conflict', CAPACITY_TOO_SMALL: 'conflict', EVENT_HAS_REGISTRATIONS: 'conflict',
  LOGIN_RATE_LIMITED: 'rate-limited',
  AUTH_RATE_LIMITED: 'rate-limited', EMAIL_ALREADY_EXISTS: 'duplicate',
  SALES_NOT_OPEN: 'closed', IDEMPOTENCY_KEY_REUSED: 'conflict', REGISTRATION_BUSY: 'unavailable',
}

function apiBaseUrl() {
  const base = import.meta.env.VITE_API_BASE_URL?.trim() || '/api'
  if (base === '/api') return base
  try {
    const url = new URL(base)
    if (!['http:', 'https:'].includes(url.protocol) || url.search || url.hash || url.username || url.password) throw new Error()
    return base.replace(/\/+$/, '')
  } catch {
    throw new RegistrationError('configuration', 'Địa chỉ VITE_API_BASE_URL không hợp lệ.')
  }
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = apiBaseUrl() + path
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 75_000)
  try {
    const response = await fetch(url, {
      ...options, credentials: 'include', signal: controller.signal,
      headers: { ...(options?.body ? { 'Content-Type': 'application/json' } : {}), ...options?.headers },
    })
    const body = await response.json().catch(() => null)
    if (!response.ok) {
      const error = body?.error
      if (error?.code === 'AUTH_REQUIRED') window.dispatchEvent(new Event('account-session-expired'))
      if (path.startsWith('/admin/') && error?.code === 'AUTH_REQUIRED') window.dispatchEvent(new Event('admin-session-expired'))
      if (!path.startsWith('/admin/') && error?.code === 'AUTH_REQUIRED') window.dispatchEvent(new Event('buyer-session-expired'))
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
