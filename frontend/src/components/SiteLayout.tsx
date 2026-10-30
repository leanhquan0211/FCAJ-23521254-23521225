import { Navigate, Outlet } from 'react-router'
import { useSession } from '@/hooks/useSession'
import { DATA_MODE } from '@/services/events'

export function SiteLayout() {
  const { session } = useSession()
  return DATA_MODE === 'mock' || session?.role === 'user' ? <Outlet /> : <Navigate to="/admin" replace />
}
