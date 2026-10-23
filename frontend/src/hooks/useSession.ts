import { createContext, useContext } from 'react'
import type { Session } from '@/types/session'

export interface SessionState {
  session: Session | null
  loading: boolean
  error: string
  setSession: (session: Session | null) => void
  refresh: () => void
}

export const SessionContext = createContext<SessionState | null>(null)

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) throw new Error('Thiếu SessionProvider.')
  return context
}
