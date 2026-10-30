import { useSession } from '@/hooks/useSession'
import { createContext } from 'react'
import type { BuyerSession } from '@/types/buyer'

interface BuyerSessionState {
  session: BuyerSession | null
  loading: boolean
  error: string
  setSession: (session: BuyerSession | null) => void
}

export const BuyerSessionContext = createContext<BuyerSessionState | null>(null)

export function useBuyerSession() {
  const account = useSession()
  return { ...account, session: account.session?.role === 'user' ? account.session : null,
    setSession: (session: BuyerSession | null) => account.setSession(session ? { ...session, role: 'user' } : null) }
}
