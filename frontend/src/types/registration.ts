export interface Registration {
  id: string
  eventId: string
  userId?: string
  fullName: string
  email: string
  phone: string
  createdAt: string
}

export type RegistrationInput = Pick<Registration, 'eventId' | 'fullName' | 'email' | 'phone'>

export type RegistrationErrorCode = 'not-found' | 'closed' | 'full' | 'duplicate' | 'invalid' | 'storage' | 'simulated' | 'unavailable' | 'internal' | 'configuration' | 'unauthorized' | 'forbidden' | 'conflict' | 'rate-limited'

export class RegistrationError extends Error {
  code: RegistrationErrorCode
  details?: Record<string, string>

  constructor(code: RegistrationErrorCode, message: string, details?: Record<string, string>) {
    super(message)
    this.name = 'RegistrationError'
    this.code = code
    this.details = details
  }
}
