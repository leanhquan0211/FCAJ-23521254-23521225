import { useEffect, useState, type ReactNode } from 'react'
import { BuyerSessionContext } from '@/hooks/useBuyerSession'
import { getBuyerSession } from '@/services/buyer'
import { DATA_MODE } from '@/services/events'
import type { BuyerSession } from '@/types/buyer'

export function BuyerSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<BuyerSession | null>(null)
  const [loading, setLoading] = useState(DATA_MODE === 'api')
  const [error, setError] = useState('')
  useEffect(() => {
    if (DATA_MODE !== 'api') return
    let active = true
    getBuyerSession().then((value) => { if (active) setSession(value) })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Không thể kiểm tra phiên đăng nhập.') })
      .finally(() => { if (active) setLoading(false) })
    const expired = () => { setSession(null); setError('') }
    window.addEventListener('buyer-session-expired', expired)
    return () => { active = false; window.removeEventListener('buyer-session-expired', expired) }
  }, [])
  useEffect(() => {
    if (!session) return
    const delay = Math.max(0, session.expiresAt * 1000 - Date.now())
    const timer = window.setTimeout(() => setSession(null), delay)
    return () => window.clearTimeout(timer)
  }, [session])
  return <BuyerSessionContext.Provider value={{ session, loading, error, setSession }}>{children}</BuyerSessionContext.Provider>
}
