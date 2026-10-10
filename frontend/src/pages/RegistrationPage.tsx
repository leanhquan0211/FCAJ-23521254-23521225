import { useRef, useState, type FormEvent } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { EventFacts } from '@/components/EventFacts'
import { PageState } from '@/components/PageState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEvent } from '@/hooks/useEvent'
import { registerForEvent } from '@/services/mock-events'
import { RegistrationError } from '@/types/registration'

type Fields = { fullName: string; email: string; phone: string }
type FieldErrors = Partial<Record<keyof Fields, string>>

export function RegistrationPage() {
  const { eventId } = useParams()
  const { event, loading, error } = useEvent(eventId)
  const navigate = useNavigate()
  const [fields, setFields] = useState<Fields>({ fullName: '', email: '', phone: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const sending = useRef(false)

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault()
    if (sending.current || !event || event.status !== 'open') return
    const nextErrors: FieldErrors = {}
    const fullName = fields.fullName.trim()
    const email = fields.email.trim().toLowerCase()
    if (!fullName) nextErrors.fullName = 'Vui lòng nhập họ và tên.'
    if (!email) nextErrors.email = 'Vui lòng nhập email.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = 'Email chưa đúng định dạng.'
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length) return
    sending.current = true
    setSubmitting(true)
    try {
      const registration = await registerForEvent({ eventId: event.id, fullName, email, phone: fields.phone.trim() })
      navigate(`/registrations/${registration.id}`, { replace: true })
    } catch (cause) {
      setSubmitError(cause instanceof RegistrationError ? cause.message : 'Có lỗi khi xử lý đăng ký. Vui lòng thử lại.')
    } finally {
      sending.current = false
      setSubmitting(false)
    }
  }

  if (loading) return <p role="status" className="pt-16">Đang tải sự kiện…</p>
  if (error) return <PageState title="Không thể tải sự kiện" message={error} />
  if (!event) return <PageState title="Không tìm thấy sự kiện" message="Đường dẫn hoặc mã sự kiện không tồn tại." />
  if (event.status !== 'open') return <PageState title="Không thể đăng ký" message={event.status === 'full' ? 'Sự kiện đã hết chỗ.' : 'Sự kiện đã kết thúc.'} />

  return <div className="pt-12 sm:pt-16">
    <Link to={`/events/${event.id}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><ArrowLeft aria-hidden="true" className="size-4" />Chi tiết sự kiện</Link>
    <div className="mt-7 max-w-2xl"><h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">Đăng ký tham gia</h1><p className="mt-4 text-base text-muted-foreground">Điền thông tin để giữ một chỗ cho sự kiện.</p></div>
    <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
      <Card className="bg-card"><CardHeader><CardTitle className="font-display text-xl font-semibold">Thông tin người tham dự</CardTitle></CardHeader><CardContent>
        <form noValidate onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2"><Label htmlFor="fullName">Họ và tên <span aria-hidden="true">*</span></Label><Input id="fullName" name="fullName" autoComplete="name" required value={fields.fullName} aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? 'fullName-error' : undefined} onChange={(e) => setFields({ ...fields, fullName: e.target.value })} className="h-11 bg-background text-base" />{errors.fullName && <p id="fullName-error" className="text-sm text-destructive">{errors.fullName}</p>}</div>
          <div className="space-y-2"><Label htmlFor="email">Email <span aria-hidden="true">*</span></Label><Input id="email" name="email" type="email" autoComplete="email" required value={fields.email} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} onChange={(e) => setFields({ ...fields, email: e.target.value })} className="h-11 bg-background text-base" />{errors.email && <p id="email-error" className="text-sm text-destructive">{errors.email}</p>}</div>
          <div className="space-y-2"><Label htmlFor="phone">Số điện thoại <span className="font-normal text-muted-foreground">(không bắt buộc)</span></Label><Input id="phone" name="phone" type="tel" autoComplete="tel" value={fields.phone} onChange={(e) => setFields({ ...fields, phone: e.target.value })} className="h-11 bg-background text-base" /></div>
          {submitError && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{submitError}</p>}
          <Button type="submit" disabled={submitting} className="min-h-11 w-full sm:w-auto">{submitting ? 'Đang gửi đăng ký…' : 'Xác nhận đăng ký'}</Button>
        </form>
      </CardContent></Card>
      <Card className="bg-card"><CardHeader><CardTitle className="font-display text-xl font-semibold">Sự kiện bạn chọn</CardTitle></CardHeader><CardContent><h2 className="font-display mb-6 text-lg font-semibold">{event.title}</h2><EventFacts event={event} /></CardContent></Card>
    </div>
  </div>
}
