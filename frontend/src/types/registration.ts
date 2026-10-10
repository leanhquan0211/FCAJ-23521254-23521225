export interface Registration {
  id: string
  eventId: string
  fullName: string
  email: string
  phone: string
  createdAt: string
}

export type RegistrationInput = Pick<Registration, 'eventId' | 'fullName' | 'email' | 'phone'>

export type RegistrationErrorCode = 'not-found' | 'closed' | 'full' | 'duplicate' | 'invalid' | 'storage' | 'simulated'

export class RegistrationError extends Error {
  code: RegistrationErrorCode

  constructor(code: RegistrationErrorCode, message: string) {
    super(message)
    this.name = 'RegistrationError'
    this.code = code
  }
}
