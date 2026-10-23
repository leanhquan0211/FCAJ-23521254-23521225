import { useEffect, useState } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router'
import { PageState } from '@/components/PageState'
import { AdminShell } from '@/components/AdminShell'
import { AdminSessionContext } from '@/hooks/useAdminSession'
import { getSession, logout } from '@/services/admin'
import type { AdminSession } from '@/types/admin'

export function AdminLayout() {
  const [session, setSession] = useState<AdminSession | null | undefined>(undefined)
  const [error, setError] = useState('')
  const [leaving, setLeaving] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const navigate = useNavigate()
  useEffect(() => {
    let active = true
    getSession().then((value) => { if (active) setSession(value) })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Không thể kiểm tra phiên đăng nhập.') })
    const expire = () => { if (active) setSession(null) }
    window.addEventListener('admin-session-expired', expire)
    return () => { active = false; window.removeEventListener('admin-session-expired', expire) }
  }, [])
  async function signOut() {
    if (!session || leaving) return
    setLeaving(true)
    setLogoutError('')
    try { await logout(session); navigate('/admin/login', { replace: true }) }
    catch (cause) { setLogoutError(cause instanceof Error ? cause.message : 'Không thể đăng xuất.'); setLeaving(false) }
  }
  if (error) return <AdminShell><PageState title="Không thể mở trang quản trị" message={error} /></AdminShell>
  if (session === undefined) return <AdminShell><p role="status" className="pt-16">Đang kiểm tra phiên đăng nhập quản trị…</p></AdminShell>
  if (!session) return <Navigate to="/admin/login" replace />
  return <AdminSessionContext.Provider value={session}>
    <AdminShell username={session.username} leaving={leaving} logoutError={logoutError} onLogout={signOut}><Outlet /></AdminShell>
  </AdminSessionContext.Provider>
}
