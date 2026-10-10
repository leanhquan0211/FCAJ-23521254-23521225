import { Navigate, Route, Routes } from 'react-router'
import { PageState } from '@/components/PageState'
import { SiteLayout } from '@/components/SiteLayout'
import { EventDetailPage } from '@/pages/EventDetailPage'
import { EventListPage } from '@/pages/EventListPage'
import { RegistrationPage } from '@/pages/RegistrationPage'
import { RegistrationResultPage } from '@/pages/RegistrationResultPage'

function App() {
  return <Routes>
    <Route element={<SiteLayout />}>
      <Route path="/" element={<Navigate to="/events" replace />} />
      <Route path="/events" element={<EventListPage />} />
      <Route path="/events/:eventId" element={<EventDetailPage />} />
      <Route path="/events/:eventId/register" element={<RegistrationPage />} />
      <Route path="/registrations/:registrationId" element={<RegistrationResultPage />} />
      <Route path="*" element={<PageState title="Không tìm thấy trang" message="Đường dẫn này không tồn tại." />} />
    </Route>
  </Routes>
}

export default App
