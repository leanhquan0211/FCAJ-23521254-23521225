import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { PageState } from '@/components/PageState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAdminSession } from '@/hooks/useAdminSession'
import { getAdminEvents, saveEvent } from '@/services/admin'
import type { AdminEvent, EventInput } from '@/types/admin'
import { EVENT_CATEGORIES, type EventCategory } from '@/types/event'
import { RegistrationError } from '@/types/registration'

type Draft = Omit<EventInput, 'capacity'> & { capacity: string }

function vietnamInput(dateTime: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(dateTime))
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`
}

function EventEditor({ existing }: { existing?: AdminEvent }) {
  const session = useAdminSession()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<Draft>(() => existing ? {
    title: existing.title, category: existing.category, dateTime: vietnamInput(existing.dateTime),
    location: existing.location, organizer: existing.organizer, capacity: String(existing.capacity),
    registrationOpen: existing.registrationOpen, summary: existing.summary, description: existing.description,
  } : { title: '', category: 'Công nghệ', dateTime: '', location: '', organizer: '', capacity: '40', registrationOpen: true, summary: '', description: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const sending = useRef(false)
  function change(field: keyof Draft, value: string | boolean) { setDraft((current) => ({ ...current, [field]: value })) }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending.current) return
    const next: Record<string, string> = {}
    for (const field of ['title', 'location', 'organizer', 'summary', 'description'] as const) {
      if (!draft[field].trim()) next[field] = 'Vui lòng điền thông tin này.'
    }
    const capacity = Number(draft.capacity)
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000) next.capacity = 'Nhập số nguyên từ 1 đến 100.000.'
    if (existing && capacity < existing.occupiedSeats) next.capacity = `Cần ít nhất ${existing.occupiedSeats} chỗ đã dùng.`
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(draft.dateTime)) next.dateTime = 'Vui lòng chọn ngày và giờ.'
    setErrors(next)
    setError('')
    if (Object.keys(next).length) return
    sending.current = true
    setSaving(true)
    try {
      await saveEvent({ ...draft, capacity, dateTime: `${draft.dateTime}:00+07:00` }, session, existing)
      navigate('/admin', { replace: true, state: { saved: true } })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu sự kiện.')
      if (cause instanceof RegistrationError && cause.details) setErrors(cause.details)
    } finally { sending.current = false; setSaving(false) }
  }
  const fieldError = (name: string) => errors[name] ? <p id={`${name}-error`} className="text-sm text-destructive">{errors[name]}</p> : null
  const attributes = (name: string) => ({ 'aria-invalid': !!errors[name], 'aria-describedby': errors[name] ? `${name}-error` : undefined })
  return <div className="max-w-4xl py-10 sm:py-12">
    <h1 className="font-display text-3xl font-bold">{existing ? 'Chỉnh sửa sự kiện' : 'Thêm sự kiện'}</h1>
    <p className="mt-3 text-base text-muted-foreground">Thông tin dưới đây sẽ hiển thị cho người tham gia. Tất cả các trường đều bắt buộc.</p>
    {existing && <p className="mt-4 text-sm tabular-nums">Đã dùng {existing.occupiedSeats} chỗ. Thay đổi sức chứa sẽ giữ nguyên số chỗ này.</p>}
    <Card className="mt-8"><CardContent><form noValidate onSubmit={submit} className="space-y-6">
      <div className="space-y-2"><Label htmlFor="title">Tên sự kiện</Label><Input id="title" name="title" required maxLength={160} value={draft.title} onChange={(e) => change('title', e.target.value)} {...attributes('title')} className="h-11 text-base" />{fieldError('title')}</div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="category">Danh mục</Label><select id="category" value={draft.category} onChange={(e) => change('category', e.target.value as EventCategory)} {...attributes('category')} className="filter-select">{EVENT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select>{fieldError('category')}</div>
        <div className="space-y-2"><Label htmlFor="dateTime">Ngày giờ diễn ra (giờ Việt Nam)</Label><Input id="dateTime" type="datetime-local" min="2000-01-01T00:00" max="2100-12-31T23:59" required value={draft.dateTime} onChange={(e) => change('dateTime', e.target.value)} {...attributes('dateTime')} className="h-11 text-base" />{fieldError('dateTime')}</div>
        <div className="space-y-2"><Label htmlFor="location">Địa điểm hoặc hình thức trực tuyến</Label><Input id="location" required maxLength={240} value={draft.location} onChange={(e) => change('location', e.target.value)} {...attributes('location')} className="h-11 text-base" />{fieldError('location')}</div>
        <div className="space-y-2"><Label htmlFor="organizer">Đơn vị tổ chức</Label><Input id="organizer" required maxLength={160} value={draft.organizer} onChange={(e) => change('organizer', e.target.value)} {...attributes('organizer')} className="h-11 text-base" />{fieldError('organizer')}</div>
      </div>
      <div className="max-w-sm space-y-2"><Label htmlFor="capacity">Số người tối đa</Label><Input id="capacity" type="number" inputMode="numeric" min={Math.max(1, existing?.occupiedSeats ?? 1)} max={100000} step={1} required value={draft.capacity} onChange={(e) => change('capacity', e.target.value)} {...attributes('capacity')} className="h-11 text-base" />{fieldError('capacity')}</div>
      <div className="space-y-2"><Label htmlFor="summary">Giới thiệu ngắn</Label><textarea id="summary" required maxLength={300} rows={3} value={draft.summary} onChange={(e) => change('summary', e.target.value)} {...attributes('summary')} className="form-textarea" />{fieldError('summary')}</div>
      <div className="space-y-2"><Label htmlFor="description">Nội dung chi tiết</Label><textarea id="description" required maxLength={5000} rows={6} value={draft.description} onChange={(e) => change('description', e.target.value)} {...attributes('description')} className="form-textarea" />{fieldError('description')}</div>
      <div className="space-y-2"><label htmlFor="registrationOpen" className="flex min-h-11 cursor-pointer items-center gap-3"><input id="registrationOpen" type="checkbox" checked={draft.registrationOpen} onChange={(e) => change('registrationOpen', e.target.checked)} className="registration-checkbox" /><span>Mở đăng ký tham gia</span></label><p className="text-sm text-muted-foreground">Bỏ chọn để đóng đăng ký. Sự kiện đã đến giờ diễn ra sẽ tự ngừng nhận đăng ký.</p>{fieldError('registrationOpen')}</div>
      {error && <div role="alert" className="space-y-3"><p className="text-sm text-destructive">{error}</p><Button type="button" variant="outline" className="min-h-11" onClick={() => navigate('/admin')}>Tải lại từ danh sách</Button></div>}
      <div className="flex flex-wrap gap-3 border-t border-border pt-6"><Button type="submit" disabled={saving} className="min-h-11">{saving ? 'Đang lưu…' : existing ? 'Lưu thay đổi' : 'Tạo sự kiện'}</Button><Button type="button" variant="outline" disabled={saving} className="min-h-11" onClick={() => navigate('/admin')}>Hủy</Button></div>
    </form></CardContent></Card>
  </div>
}

export function EventEditorPage() {
  const { eventId } = useParams()
  const [state, setState] = useState<{ id?: string; event?: AdminEvent; error: string }>({ error: '' })
  useEffect(() => {
    if (!eventId) return
    let active = true
    getAdminEvents().then((events) => { if (active) setState({ id: eventId, event: events.find((item) => item.id === eventId), error: '' }) })
      .catch((cause) => { if (active) setState({ id: eventId, error: cause instanceof Error ? cause.message : 'Không thể tải sự kiện.' }) })
    return () => { active = false }
  }, [eventId])
  if (eventId && state.id !== eventId) return <p role="status" className="pt-12">Đang tải sự kiện…</p>
  if (eventId && state.error) return <PageState title="Không thể tải sự kiện" message={state.error} />
  if (eventId && !state.event) return <PageState title="Không tìm thấy sự kiện" message="Sự kiện không tồn tại hoặc đã bị xóa." />
  return <EventEditor key={eventId ?? 'new'} existing={eventId ? state.event : undefined} />
}
