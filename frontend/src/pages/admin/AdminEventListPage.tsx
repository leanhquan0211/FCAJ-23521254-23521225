import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAdminSession } from '@/hooks/useAdminSession'
import { filterEvents, formatEventDateTime } from '@/lib/event-listing'
import { deleteEvent, getAdminEvents } from '@/services/admin'
import type { AdminEvent } from '@/types/admin'
import { STATUS_LABELS } from '@/types/event'

export function AdminEventListPage() {
  const session = useAdminSession()
  const location = useLocation()
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [deleting, setDeleting] = useState<AdminEvent | null>(null)
  const [busy, setBusy] = useState(false)
  const sending = useRef(false)
  const [reload, setReload] = useState(0)
  useEffect(() => {
    let active = true
    getAdminEvents().then((items) => { if (active) { setEvents(items); setLoading(false) } })
      .catch((cause) => { if (active) { setError(cause instanceof Error ? cause.message : 'Không thể tải sự kiện.'); setLoading(false) } })
    return () => { active = false }
  }, [reload])
  async function confirmDelete() {
    if (!deleting || sending.current) return
    sending.current = true
    setBusy(true)
    setError('')
    try {
      await deleteEvent(deleting, session)
      setEvents((items) => items.filter((item) => item.id !== deleting.id))
      setDeleting(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể xóa sự kiện.')
      setDeleting(null)
    } finally { sending.current = false; setBusy(false) }
  }
  const visible = filterEvents(events, { query, category: 'all', status: 'all' }) as AdminEvent[]
  return <div className="py-10 sm:py-12">
    <div className="flex flex-wrap items-start justify-between gap-5"><div><h1 className="font-display text-3xl font-bold">Quản lý sự kiện</h1><p className="mt-3 max-w-2xl text-base text-muted-foreground">Chỉnh sửa thông tin, điều chỉnh sức chứa và mở hoặc đóng đăng ký.</p></div><Button asChild className="min-h-11"><Link to="/admin/events/new"><Plus aria-hidden="true" />Thêm sự kiện</Link></Button></div>
    <div className="mt-8 max-w-lg space-y-2"><Label htmlFor="admin-search">Tìm theo tên sự kiện</Label><Input id="admin-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nhập tên sự kiện" className="h-11 bg-card text-base" /></div>
    {location.state?.saved && <p role="status" className="mt-5 text-sm text-primary">Đã lưu thông tin sự kiện.</p>}
    {error && <div role="alert" className="mt-6 flex flex-wrap items-center gap-4"><p className="text-sm text-destructive">{error}</p><Button variant="outline" className="min-h-11" onClick={() => { setError(''); setLoading(true); setReload((n) => n + 1) }}>Tải lại danh sách</Button></div>}
    {loading ? <p role="status" className="mt-8">Đang tải sự kiện…</p> : <>
      <p role="status" className="mt-8 text-sm text-muted-foreground">{visible.length} sự kiện phù hợp</p>
      <div className="mt-4 divide-y divide-border border-y border-border">{visible.map((event) => <article key={event.id} className="flex min-w-0 flex-wrap items-start justify-between gap-5 py-6">
        <div className="min-w-0 flex-1 basis-64"><div className="flex flex-wrap items-center gap-3"><h2 className="font-display text-lg font-semibold">{event.title}</h2><Badge data-status={event.status} className="status-badge">{STATUS_LABELS[event.status]}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{formatEventDateTime(event.dateTime)} · {event.location}</p><p className="mt-2 text-sm tabular-nums">Sức chứa: {event.capacity} · Đã dùng: {event.occupiedSeats} · Còn: {event.remainingSeats}</p>{event.occupiedSeats > 0 && <p className="mt-2 text-sm text-muted-foreground">Đã có chỗ được sử dụng; có thể đóng đăng ký, không thể xóa.</p>}</div>
        <div className="flex flex-wrap gap-3"><Button asChild variant="outline" className="min-h-11"><Link to={`/admin/events/${event.id}/edit`}><Pencil aria-hidden="true" />Chỉnh sửa</Link></Button><Button variant="destructive" className="min-h-11" disabled={event.occupiedSeats > 0} onClick={() => { setError(''); setDeleting(event) }}>Xóa</Button></div>
      </article>)}</div>
      {visible.length === 0 && <p className="py-10 text-muted-foreground">{query.trim() ? 'Không tìm thấy sự kiện phù hợp.' : 'Chưa có sự kiện. Hãy thêm sự kiện đầu tiên.'}</p>}
    </>}
    <Dialog open={!!deleting} onOpenChange={(open) => { if (!open && !busy) setDeleting(null) }}><DialogContent showCloseButton={!busy} onEscapeKeyDown={(e) => { if (busy) e.preventDefault() }} onPointerDownOutside={(e) => { if (busy) e.preventDefault() }}>
      <DialogHeader><DialogTitle>Xóa sự kiện?</DialogTitle><DialogDescription>Sự kiện “{deleting?.title}” sẽ bị xóa. Chỉ sự kiện chưa có chỗ được sử dụng mới được phép xóa.</DialogDescription></DialogHeader>
      <DialogFooter><DialogClose asChild><Button variant="outline" className="min-h-11" disabled={busy}>Giữ lại</Button></DialogClose><Button variant="destructive" className="min-h-11" disabled={busy} onClick={confirmDelete}>{busy ? 'Đang xóa…' : 'Xác nhận xóa'}</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>
}
