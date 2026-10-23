import { SessionProvider } from '@/components/SessionProvider'
import { AppShell } from '@/components/AppShell'
import { useSession } from '@/hooks/useSession'
import { DATA_MODE } from '@/services/events'
import { Navigate, Route, Routes } from 'react-router'
import { PageState } from '@/components/PageState'
import { SiteLayout } from '@/components/SiteLayout'
import { EventDetailPage } from '@/pages/EventDetailPage'
import { EventListPage } from '@/pages/EventListPage'
import { RegistrationPage } from '@/pages/RegistrationPage'
import { RegistrationResultPage } from '@/pages/RegistrationResultPage'
import { AdminLayout } from '@/components/AdminLayout'
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage'
import { AdminEventListPage } from '@/pages/admin/AdminEventListPage'
import { EventEditorPage } from '@/pages/admin/EventEditorPage'
import { BuyerAuthPage } from '@/pages/BuyerAuthPage'
import { MyTicketsPage } from '@/pages/MyTicketsPage'
import { EntryLayout } from '@/components/EntryLayout'

function Home() {
  const { session, loading } = useSession()
  if (DATA_MODE === 'mock') return <Navigate to="/events" replace />
  if (loading) return <p role="status" className="p-6">Đang kiểm tra phiên đăng nhập…</p>
  return <Navigate to={session?.role === 'admin' ? '/admin' : session ? '/events' : '/login'} replace />
}

function App() {
  return <SessionProvider><Routes>
    <Route element={<EntryLayout />}>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<BuyerAuthPage key="login" mode="login" />} />
      <Route path="/signup" element={<BuyerAuthPage key="signup" mode="signup" />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
    </Route>
    <Route element={<AppShell />}>
      <Route element={<SiteLayout />}>
        <Route path="/events" element={<EventListPage />} />
        <Route path="/my-tickets" element={<MyTicketsPage />} />
        <Route path="/events/:eventId" element={<EventDetailPage />} />
        <Route path="/events/:eventId/register" element={<RegistrationPage />} />
        <Route path="/registrations/:registrationId" element={<RegistrationResultPage />} />
      </Route>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminEventListPage />} />
        <Route path="events/new" element={<EventEditorPage />} />
        <Route path="events/:eventId/edit" element={<EventEditorPage />} />
      </Route>
      <Route path="*" element={<PageState title="Không tìm thấy trang" message="Vui lòng kiểm tra lại đường dẫn." />} />
    </Route>
  </Routes></SessionProvider>
}

export default App
