import { Route, Routes } from 'react-router'
import { PageState } from '@/components/PageState'
import { SiteLayout } from '@/components/SiteLayout'
import { EventDetailPage } from '@/pages/EventDetailPage'
import { EventListPage } from '@/pages/EventListPage'
import { RegistrationPage } from '@/pages/RegistrationPage'
import { RegistrationResultPage } from '@/pages/RegistrationResultPage'
import { RoleSelectionPage } from '@/pages/RoleSelectionPage'
import { AdminLayout } from '@/components/AdminLayout'
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage'
import { AdminEventListPage } from '@/pages/admin/AdminEventListPage'
import { EventEditorPage } from '@/pages/admin/EventEditorPage'
import { BuyerSessionProvider } from '@/components/BuyerSessionProvider'
import { BuyerAuthPage } from '@/pages/BuyerAuthPage'
import { MyTicketsPage } from '@/pages/MyTicketsPage'
import { EntryLayout } from '@/components/EntryLayout'
import { AdminShell } from '@/components/AdminShell'

function App() {
  return <Routes>
    <Route element={<EntryLayout />}>
      <Route path="/" element={<RoleSelectionPage />} />
      <Route path="*" element={<PageState title="Không tìm thấy trang" message="Đường dẫn này không tồn tại." />} />
    </Route>
    <Route element={<BuyerSessionProvider><SiteLayout /></BuyerSessionProvider>}>
      <Route path="/events" element={<EventListPage />} />
      <Route path="/login" element={<BuyerAuthPage key="login" mode="login" />} />
      <Route path="/signup" element={<BuyerAuthPage key="signup" mode="signup" />} />
      <Route path="/my-tickets" element={<MyTicketsPage />} />
      <Route path="/events/:eventId" element={<EventDetailPage />} />
      <Route path="/events/:eventId/register" element={<RegistrationPage />} />
      <Route path="/registrations/:registrationId" element={<RegistrationResultPage />} />
    </Route>
    <Route path="/admin/login" element={<AdminShell><AdminLoginPage /></AdminShell>} />
    <Route path="/admin" element={<AdminLayout />}>
      <Route index element={<AdminEventListPage />} />
      <Route path="events/new" element={<EventEditorPage />} />
      <Route path="events/:eventId/edit" element={<EventEditorPage />} />
      <Route path="*" element={<PageState title="Không tìm thấy trang quản trị" message="Đường dẫn này không tồn tại trong khu vực quản trị." />} />
    </Route>
  </Routes>
}

export default App
