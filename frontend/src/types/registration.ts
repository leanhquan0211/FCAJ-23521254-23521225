export interface Registration {
  id: string
  eventId: string
  fullName: string
  email: string
  phone: string
  createdAt: string
}

export type RegistrationInput = Pick<Registration, 'eventId' | 'fullName' | 'email' | 'phone'>

export type RegistrationErrorCode = 'not-found' | 'closed' | 'full' | 'duplicate' | 'invalid' | 'storage' | 'simulated' | 'unavailable' | 'internal' | 'configuration'

export class RegistrationError extends Error {
  code: RegistrationErrorCode
  details?: Partial<Record<'fullName' | 'email' | 'phone', string>>

  constructor(code: RegistrationErrorCode, message: string, details?: Partial<Record<'fullName' | 'email' | 'phone', string>>) {
    super(message)
    this.name = 'RegistrationError'
    this.code = code
    this.details = details
  }
}
