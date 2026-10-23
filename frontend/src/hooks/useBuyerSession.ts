import { createContext, useContext } from 'react'
import type { BuyerSession } from '@/types/buyer'

interface BuyerSessionState {
  session: BuyerSession | null
  loading: boolean
  error: string
  setSession: (session: BuyerSession | null) => void
}

export const BuyerSessionContext = createContext<BuyerSessionState | null>(null)

export function useBuyerSession() {
  const context = useContext(BuyerSessionContext)
  if (!context) throw new Error('Thiếu BuyerSessionProvider.')
  return context
}
