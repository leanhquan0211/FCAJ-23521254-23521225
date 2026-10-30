import { useEffect, useState } from 'react'
import { CheckCircle2 } from '@/components/DimensionalIcons'
import { Link, Navigate, useParams } from 'react-router'
import { useBuyerSession } from '@/hooks/useBuyerSession'
import { EventFacts } from '@/components/EventFacts'
import { PageState } from '@/components/PageState'
import { Button } from '@/components/ui/button'
import { DATA_MODE, getEvent, getRegistration } from '@/services/events'
import type { EventItem } from '@/types/event'
import type { Registration } from '@/types/registration'

export function RegistrationResultPage() {
  const buyer = useBuyerSession()
  const { registrationId } = useParams()
  const [state, setState] = useState<{ registration: Registration | null; event: EventItem | null; loading: boolean; error: string }>({ registration: null, event: null, loading: true, error: '' })
  useEffect(() => {
    let active = true
    if (!registrationId || !buyer.session) return
    getRegistration(registrationId).then(async (registration) => {
      const event = registration ? await getEvent(registration.eventId) : null
      if (active) setState({ registration, event, loading: false, error: '' })
    }).catch((cause) => { if (active) setState({ registration: null, event: null, loading: false, error: cause instanceof Error ? cause.message : 'Không thể tải kết quả đăng ký.' }) })
    return () => { active = false }
  }, [registrationId, buyer.session])
  if (buyer.loading) return <p role="status" className="pt-16">Đang kiểm tra phiên…</p>
  if (!buyer.session) return <Navigate to={`/login?returnTo=${encodeURIComponent(`/registrations/${registrationId}`)}`} replace />
  if (state.loading) return <p role="status" className="pt-16">Đang tải kết quả đăng ký…</p>
  if (state.error) return <PageState title="Không thể tải kết quả" message={state.error} />
  if (!state.registration || !state.event) return <PageState title="Không tìm thấy đăng ký" message="Mã đăng ký không tồn tại trong dữ liệu hiện tại." />
  return <div className="max-w-3xl pt-12 sm:pt-16">
    <CheckCircle2 aria-hidden="true" className="size-10 text-primary" />
    <h1 className="font-display mt-5 text-3xl font-bold leading-tight sm:text-4xl">Đăng ký thành công</h1>
    <p className="mt-4 text-base text-muted-foreground">{DATA_MODE === 'mock' ? 'Thông tin đã được lưu trong trình duyệt hiện tại.' : 'Thông tin đăng ký đã được ghi nhận.'}</p>
    <div className="mt-10 border-y border-border py-8"><dl className="space-y-5"><div><dt className="text-sm text-muted-foreground">Mã đăng ký</dt><dd className="mt-1 break-all font-medium tabular-nums">{state.registration.id}</dd></div><div><dt className="text-sm text-muted-foreground">Người tham dự</dt><dd className="mt-1 font-medium">{state.registration.fullName}</dd></div><div><dt className="text-sm text-muted-foreground">Sự kiện</dt><dd className="mt-1 font-medium">{state.event.title}</dd></div></dl></div>
    <div className="mt-8"><EventFacts event={state.event} /></div>
    <div className="mt-10 flex flex-wrap gap-3"><Button asChild variant="outline" className="min-h-11"><Link to="/my-tickets">Vé của tôi</Link></Button><Button asChild variant="outline" className="min-h-11"><Link to="/events">Về danh sách sự kiện</Link></Button></div>
  </div>
}
