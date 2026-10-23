// Hallmark · Almanac system · booking form · critique: P4 H4 E4 S4 R5 V4
import { useRef, useState, type FormEvent } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { EventFacts } from '@/components/EventFacts'
import { PageState } from '@/components/PageState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEvent } from '@/hooks/useEvent'
import { useBuyerSession } from '@/hooks/useBuyerSession'
import { DATA_MODE } from '@/services/events'
import { bookTicket } from '@/services/buyer'
import { RegistrationError } from '@/types/registration'
import type { BuyerSession } from '@/types/buyer'

function pendingBooking(storageKey: string): { key: string; phone: string } | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null')
    return value && typeof value.key === 'string' && /^[a-f0-9-]{36}$/.test(value.key) && typeof value.phone === 'string' ? value : null
  } catch { return null }
}

export function RegistrationPage() {
  const { eventId } = useParams()
  const buyer = useBuyerSession()
  if (DATA_MODE !== 'api') return <PageState title="Đặt vé cần kết nối máy chủ" message="Chế độ xem mẫu chỉ phục vụ xem giao diện sự kiện." />
  if (buyer.loading) return <p role="status" className="pt-16">Đang kiểm tra phiên…</p>
  if (!buyer.session) return <Navigate to={`/login?returnTo=${encodeURIComponent(`/events/${eventId}/register`)}`} replace />
  return <BookingForm key={`${buyer.session.user.userId}:${eventId}`} eventId={eventId} session={buyer.session} />
}

function BookingForm({ eventId, session }: { eventId: string | undefined; session: BuyerSession }) {
  const { event, loading, error } = useEvent(eventId)
  const navigate = useNavigate()
  const storageKey = `event-workshop:pending:${session.user.userId}:${eventId}`
  const [initial] = useState(() => pendingBooking(storageKey))
  const requestKey = useRef<string | null>(initial?.key ?? null)
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [phoneError, setPhoneError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uncertain, setUncertain] = useState(!!initial)
  const sending = useRef(false)
  function clearPending() {
    requestKey.current = null
    try { sessionStorage.removeItem(storageKey) } catch { /* In-memory retry still works without browser storage. */ }
  }
  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault()
    if (sending.current || !event || (event.status !== 'open' && !requestKey.current)) return
    setPhoneError(''); setSubmitError('')
    if (phone.trim().length > 32) { setPhoneError('Vui lòng nhập tối đa 32 ký tự.'); return }
    requestKey.current ??= crypto.randomUUID()
    try { sessionStorage.setItem(storageKey, JSON.stringify({ key: requestKey.current, phone: phone.trim() })) } catch { /* No authentication secret is stored here. */ }
    sending.current = true; setSubmitting(true)
    try {
      const registration = await bookTicket(event.id, phone.trim(), requestKey.current, session)
      clearPending()
      navigate(`/registrations/${registration.id}`, { replace: true })
    } catch (cause) {
      if (cause instanceof RegistrationError && cause.code === 'duplicate' && cause.details?.registrationId) {
        clearPending(); navigate(`/registrations/${cause.details.registrationId}`, { replace: true }); return
      }
      setSubmitError(cause instanceof Error ? cause.message : 'Không thể đặt vé. Vui lòng thử lại.')
      if (!(cause instanceof RegistrationError) || ['unavailable', 'internal'].includes(cause.code)) setUncertain(true)
      else if (!(cause instanceof RegistrationError && cause.code === 'unauthorized')) { clearPending(); setUncertain(false) }
    } finally { sending.current = false; setSubmitting(false) }
  }
  if (loading) return <p role="status" className="pt-16">Đang tải sự kiện…</p>
  if (error) return <PageState title="Không thể tải sự kiện" message={error} />
  if (!event) return <PageState title="Không tìm thấy sự kiện" message="Đường dẫn hoặc mã sự kiện không tồn tại." />
  if (event.status !== 'open' && !uncertain) return <PageState title="Không thể đặt vé" message={event.status === 'full' ? 'Sự kiện đã hết chỗ.' : event.status === 'closed' ? 'Sự kiện đã đóng đăng ký.' : event.status === 'not_open' ? 'Sự kiện chưa đến giờ mở bán.' : 'Sự kiện đã kết thúc.'} />
  return <div className="pt-12 sm:pt-16">
    <Link to={`/events/${event.id}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><ArrowLeft aria-hidden="true" className="size-4" />Chi tiết sự kiện</Link>
    <div className="mt-7 max-w-2xl"><h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">Đặt vé tham gia</h1><p className="mt-4 text-base text-muted-foreground">Mỗi tài khoản được giữ một chỗ cho sự kiện. Chưa có thanh toán.</p></div>
    <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
      <Card><CardHeader><CardTitle className="font-display text-xl font-semibold">Thông tin người tham dự</CardTitle></CardHeader><CardContent>
        <form noValidate onSubmit={handleSubmit} className="space-y-6">
          <dl className="space-y-4"><div><dt className="text-sm text-muted-foreground">Họ và tên</dt><dd className="mt-1 break-words font-medium">{session.user.fullName}</dd></div><div><dt className="text-sm text-muted-foreground">Email tài khoản</dt><dd className="mt-1 break-all font-medium">{session.user.email}</dd></div></dl>
          <div className="space-y-2"><Label htmlFor="phone">Số điện thoại <span className="font-normal text-muted-foreground">(không bắt buộc)</span></Label><Input id="phone" name="phone" type="tel" autoComplete="tel" disabled={uncertain || submitting} value={phone} aria-invalid={!!phoneError} aria-describedby={phoneError ? 'phone-error' : undefined} onChange={(e) => setPhone(e.target.value)} className="h-11 text-base" />{phoneError && <p id="phone-error" className="text-sm text-destructive">{phoneError}</p>}</div>
          {submitError && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{submitError}</p>}
          {uncertain && <p role="status" className="text-sm text-muted-foreground">Lần gửi trước chưa rõ kết quả. Thử lại sẽ giữ nguyên yêu cầu; bạn cũng có thể kiểm tra trong Vé của tôi.</p>}
          <div className="flex flex-wrap gap-3"><Button type="submit" disabled={submitting} className="min-h-11">{submitting ? 'Đang đặt vé…' : uncertain ? 'Thử lại yêu cầu' : 'Xác nhận đặt vé'}</Button><Button asChild variant="outline" className="min-h-11"><Link to="/my-tickets">Vé của tôi</Link></Button></div>
        </form>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="font-display text-xl font-semibold">Sự kiện bạn chọn</CardTitle></CardHeader><CardContent><h2 className="font-display mb-6 text-lg font-semibold">{event.title}</h2><EventFacts event={event} /></CardContent></Card>
    </div>
  </div>
}
