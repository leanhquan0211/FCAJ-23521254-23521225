import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { SessionContext } from '@/hooks/useSession'
import { getSession } from '@/services/session'
import { DATA_MODE } from '@/services/events'
import type { Session } from '@/types/session'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, updateSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(DATA_MODE === 'api')
  const [error, setError] = useState('')
  const revision = useRef(0)
  const channel = useRef<BroadcastChannel | null>(null)
  const refresh = useCallback(() => {
    if (DATA_MODE !== 'api') return
    const requestRevision = ++revision.current
    getSession().then((value) => {
      if (requestRevision === revision.current) { updateSession(value); setError('') }
    }).catch((cause) => {
      if (requestRevision === revision.current) setError(cause instanceof Error ? cause.message : 'Không thể kiểm tra phiên.')
    }).finally(() => { if (requestRevision === revision.current) setLoading(false) })
  }, [])
  const setSession = useCallback((value: Session | null) => {
    revision.current++
    updateSession(value); setError(''); setLoading(false)
    channel.current?.postMessage('changed') // No credentials are sent between tabs.
  }, [])
  useEffect(() => {
    refresh()
    const connection = new BroadcastChannel('event-account')
    channel.current = connection
    connection.onmessage = () => {
      revision.current++; updateSession(null); setLoading(true); refresh()
    }
    const expired = () => { revision.current++; updateSession(null); setError(''); setLoading(false) }
    const invalidatePendingRequest = () => { revision.current++ }
    const visible = () => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('account-session-expired', expired)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', visible)
    return () => {
      invalidatePendingRequest(); connection.close()
      window.removeEventListener('account-session-expired', expired)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [refresh])
  useEffect(() => {
    if (!session) return
    const timer = window.setTimeout(() => setSession(null), Math.max(0, session.expiresAt * 1000 - Date.now()))
    return () => window.clearTimeout(timer)
  }, [session, setSession])
  return <SessionContext.Provider value={{ session, loading, error, setSession, refresh }}>{children}</SessionContext.Provider>
}
