import * as http from '@/services/http-events'
import * as mock from '@/services/mock-events'
import { RegistrationError } from '@/types/registration'

export const DATA_MODE = import.meta.env.VITE_DATA_MODE ?? 'api'

function selectedService() {
  if (DATA_MODE === 'api') return http
  if (DATA_MODE === 'mock') return mock
  throw new RegistrationError('configuration', 'VITE_DATA_MODE phải là api hoặc mock.')
}

export async function getEvents() { return selectedService().getEvents() }
export async function getEvent(id: string) { return selectedService().getEvent(id) }
export async function getRegistration(id: string) { return selectedService().getRegistration(id) }
