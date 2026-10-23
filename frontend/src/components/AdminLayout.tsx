import { Navigate, Outlet } from 'react-router'
import { useSession } from '@/hooks/useSession'
import { AdminSessionContext } from '@/hooks/useAdminSession'

export function AdminLayout() {
  const { session } = useSession()
  if (session?.role !== 'admin') return <Navigate to="/events" replace />
  return <AdminSessionContext.Provider value={session}><Outlet /></AdminSessionContext.Provider>
}
