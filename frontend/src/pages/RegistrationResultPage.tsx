import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { EventFacts } from '@/components/EventFacts'
import { PageState } from '@/components/PageState'
import { Button } from '@/components/ui/button'
import { getEvent, getRegistration } from '@/services/mock-events'
import type { EventItem } from '@/types/event'
import type { Registration } from '@/types/registration'

export function RegistrationResultPage() {
  const { registrationId } = useParams()
  const [state, setState] = useState<{ registration: Registration | null; event: EventItem | null; loading: boolean; error: boolean }>({ registration: null, event: null, loading: true, error: false })
  useEffect(() => {
    let active = true
    if (!registrationId) return
    getRegistration(registrationId).then(async (registration) => {
      const event = registration ? await getEvent(registration.eventId) : null
      if (active) setState({ registration, event, loading: false, error: false })
    }).catch(() => { if (active) setState({ registration: null, event: null, loading: false, error: true }) })
    return () => { active = false }
  }, [registrationId])
  if (state.loading) return <p role="status" className="pt-16">Đang tải kết quả đăng ký…</p>
  if (state.error) return <PageState title="Không thể tải kết quả" message="Không thể đọc dữ liệu đăng ký trên trình duyệt này." />
  if (!state.registration || !state.event) return <PageState title="Không tìm thấy đăng ký" message="Mã đăng ký không tồn tại trên trình duyệt này." />
  return <div className="max-w-3xl pt-12 sm:pt-16">
    <CheckCircle2 aria-hidden="true" className="size-10 text-primary" />
    <h1 className="font-display mt-5 text-3xl font-bold leading-tight sm:text-4xl">Đăng ký thành công</h1>
    <p className="mt-4 text-base text-muted-foreground">Thông tin đã được lưu trong trình duyệt hiện tại.</p>
    <div className="mt-10 border-y border-border py-8"><dl className="space-y-5"><div><dt className="text-sm text-muted-foreground">Mã đăng ký</dt><dd className="mt-1 break-all font-medium tabular-nums">{state.registration.id}</dd></div><div><dt className="text-sm text-muted-foreground">Người tham dự</dt><dd className="mt-1 font-medium">{state.registration.fullName}</dd></div><div><dt className="text-sm text-muted-foreground">Sự kiện</dt><dd className="mt-1 font-medium">{state.event.title}</dd></div></dl></div>
    <div className="mt-8"><EventFacts event={state.event} /></div>
    <Button asChild variant="outline" className="mt-10 min-h-11"><Link to="/events">Về danh sách sự kiện</Link></Button>
  </div>
}
