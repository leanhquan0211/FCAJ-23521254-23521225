import { EVENTS } from '@/data/events'
import type { EventItem } from '@/types/event'
import { RegistrationError, type Registration, type RegistrationInput } from '@/types/registration'

export const REGISTRATIONS_KEY = 'event-workshop:registrations:v1'
export const FAIL_NEXT_REGISTRATION_KEY = 'event-workshop:fail-next-registration'

function pause() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 180))
}

function readRegistrations(): Registration[] {
  try {
    const raw = window.localStorage.getItem(REGISTRATIONS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('invalid data')
    return parsed.filter((item): item is Registration =>
      typeof item === 'object' && item !== null &&
      typeof item.id === 'string' && typeof item.eventId === 'string' &&
      typeof item.email === 'string' && typeof item.fullName === 'string',
    )
  } catch {
    throw new RegistrationError('storage', 'Không thể đọc dữ liệu đăng ký trên trình duyệt.')
  }
}

function withCurrentSeats(event: EventItem, registrations: Registration[]): EventItem {
  const taken = registrations.filter((item) => item.eventId === event.id).length
  const remainingSeats = Math.max(0, event.remainingSeats - taken)
  const ended = event.status === 'ended' || new Date(event.dateTime).getTime() <= Date.now()
  return {
    ...event,
    remainingSeats,
    status: ended ? 'ended' : remainingSeats === 0 ? 'full' : 'open',
  }
}

export async function getEvents(): Promise<EventItem[]> {
  await pause()
  const registrations = readRegistrations()
  return EVENTS.map((event) => withCurrentSeats(event, registrations))
}

export async function getEvent(eventId: string): Promise<EventItem | null> {
  const events = await getEvents()
  return events.find((event) => event.id === eventId) ?? null
}

export async function getRegistration(registrationId: string): Promise<Registration | null> {
  await pause()
  return readRegistrations().find((item) => item.id === registrationId) ?? null
}

export async function registerForEvent(input: RegistrationInput): Promise<Registration> {
  await pause()
  if (window.sessionStorage.getItem(FAIL_NEXT_REGISTRATION_KEY) === '1') {
    window.sessionStorage.removeItem(FAIL_NEXT_REGISTRATION_KEY)
    throw new RegistrationError('simulated', 'Không thể xử lý đăng ký lúc này. Vui lòng thử lại.')
  }

  const event = EVENTS.find((item) => item.id === input.eventId)
  if (!event) throw new RegistrationError('not-found', 'Không tìm thấy sự kiện.')

  const fullName = input.fullName.trim()
  const email = input.email.trim().toLowerCase()
  const phone = input.phone.trim()
  if (!fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new RegistrationError('invalid', 'Vui lòng kiểm tra họ tên và email.')
  }

  // Đọc lại ngay trước khi lưu. Mock này không bảo đảm giao dịch giữa nhiều tab hoặc thiết bị.
  const registrations = readRegistrations()
  const current = withCurrentSeats(event, registrations)
  if (current.status === 'ended') throw new RegistrationError('closed', 'Sự kiện đã kết thúc đăng ký.')
  if (registrations.some((item) => item.eventId === event.id && item.email.toLowerCase() === email)) {
    throw new RegistrationError('duplicate', 'Email này đã đăng ký sự kiện. Vui lòng dùng email khác.')
  }
  if (current.status === 'full') throw new RegistrationError('full', 'Sự kiện đã hết chỗ.')

  const registration: Registration = {
    id: crypto.randomUUID(), eventId: event.id, fullName, email, phone,
    createdAt: new Date().toISOString(),
  }
  try {
    window.localStorage.setItem(REGISTRATIONS_KEY, JSON.stringify([...registrations, registration]))
  } catch {
    throw new RegistrationError('storage', 'Không thể lưu đăng ký trên trình duyệt. Vui lòng thử lại.')
  }
  return registration
}
