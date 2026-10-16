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

function App() {
  return <Routes>
    <Route element={<SiteLayout />}>
      <Route path="/" element={<RoleSelectionPage />} />
      <Route path="/events" element={<EventListPage />} />
      <Route path="/events/:eventId" element={<EventDetailPage />} />
      <Route path="/events/:eventId/register" element={<RegistrationPage />} />
      <Route path="/registrations/:registrationId" element={<RegistrationResultPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminEventListPage />} />
        <Route path="events/new" element={<EventEditorPage />} />
        <Route path="events/:eventId/edit" element={<EventEditorPage />} />
      </Route>
      <Route path="*" element={<PageState title="Không tìm thấy trang" message="Đường dẫn này không tồn tại." />} />
    </Route>
  </Routes>
}

export default App
