import { useEffect, useState } from 'react'
import { Link, Navigate, Outlet, useNavigate } from 'react-router'
import { PageState } from '@/components/PageState'
import { Button } from '@/components/ui/button'
import { AdminSessionContext } from '@/hooks/useAdminSession'
import { getSession, logout } from '@/services/admin'
import type { AdminSession } from '@/types/admin'

export function AdminLayout() {
  const [session, setSession] = useState<AdminSession | null | undefined>(undefined)
  const [error, setError] = useState('')
  const [leaving, setLeaving] = useState(false)
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
    try { await logout(session); navigate('/', { replace: true }) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể đăng xuất.'); setLeaving(false) }
  }
  if (error) return <PageState title="Không thể mở trang quản trị" message={error} />
  if (session === undefined) return <p role="status" className="pt-16">Đang kiểm tra phiên đăng nhập…</p>
  if (!session) return <Navigate to="/admin/login" replace />
  return <AdminSessionContext.Provider value={session}>
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-5">
      <Link to="/admin" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">Quản lý sự kiện</Link>
      <div className="flex flex-wrap items-center gap-4"><span className="text-sm text-muted-foreground">{session.username}</span><Button variant="outline" className="min-h-11" disabled={leaving} onClick={signOut}>{leaving ? 'Đang đăng xuất…' : 'Đăng xuất'}</Button></div>
    </div>
    <Outlet />
  </AdminSessionContext.Provider>
}
