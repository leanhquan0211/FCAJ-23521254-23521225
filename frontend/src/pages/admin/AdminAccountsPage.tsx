// Hallmark · pre-emit critique: P4 H5 E4 S4 R5 V4 · locked Almanac design
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Pencil, Trash2 } from '@/components/DimensionalIcons'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAdminSession } from '@/hooks/useAdminSession'
import { normalizeSearch } from '@/lib/event-listing'
import { deleteAccount, getAdminAccounts, saveAccount } from '@/services/admin'
import type { ManagedAccount } from '@/types/admin'
import { RegistrationError } from '@/types/registration'

export function AdminAccountsPage() {
  const session = useAdminSession()
  const [accounts, setAccounts] = useState<ManagedAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [reload, setReload] = useState(0)
  const [selected, setSelected] = useState<ManagedAccount | null>(null)
  const [action, setAction] = useState<'edit' | 'delete'>('edit')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [dialogError, setDialogError] = useState('')
  const [busy, setBusy] = useState(false)
  const sending = useRef(false)
  useEffect(() => {
    let active = true
    getAdminAccounts().then((items) => { if (active) setAccounts(items) })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Không thể tải tài khoản.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reload])
  function refresh() { setError(''); setLoading(true); setReload((value) => value + 1) }
  function open(account: ManagedAccount, mode: 'edit' | 'delete') {
    setSelected(account); setAction(mode); setFullName(account.fullName); setEmail(account.email); setDialogError(''); setNotice('')
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!selected || sending.current) return
    sending.current = true; setBusy(true); setDialogError('')
    try {
      if (action === 'edit') {
        const saved = await saveAccount(selected, fullName.trim(), email.trim(), session)
        setAccounts((items) => items.map((item) => item.userId === saved.userId ? saved : item))
        setNotice('Đã cập nhật tài khoản.')
      } else {
        const result = await deleteAccount(selected, session)
        if (result.deleted) {
          setAccounts((items) => items.filter((item) => item.userId !== selected.userId))
          setNotice('Đã xóa tài khoản, hủy vé và trả lại chỗ.')
        } else { refresh(); setNotice('Đang xóa tài khoản. Chọn Tiếp tục xóa để hoàn tất.') }
      }
      setSelected(null)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Không thể xử lý tài khoản.'
      // Reload stale data before retrying, and keep the reason visible after loading.
      if (action === 'delete' || (cause instanceof RegistrationError && ['conflict', 'not-found'].includes(cause.code))) {
        setSelected(null); refresh(); setError(message)
      } else setDialogError(message)
    } finally { sending.current = false; setBusy(false) }
  }
  const search = normalizeSearch(query)
  const visible = accounts.filter((account) => !search || normalizeSearch(account.fullName).includes(search) || normalizeSearch(account.email).includes(search))
  return <div className="py-10 sm:py-12">
    <h1 className="font-display text-3xl font-bold">Quản lý tài khoản</h1>
    <p className="mt-3 max-w-2xl text-muted-foreground">Tìm và cập nhật thông tin tài khoản người tham gia.</p>
    <div className="mt-8 max-w-lg space-y-2"><Label htmlFor="account-search">Tìm theo tên hoặc email</Label><Input id="account-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nhập tên hoặc email" className="h-11 bg-card text-base" /></div>
    {notice && <p role="status" className="mt-5 text-primary">{notice}</p>}
    {error && <div role="alert" className="mt-5 space-y-3"><p className="text-destructive">{error}</p><Button variant="outline" className="min-h-11" onClick={refresh}>Tải lại danh sách</Button></div>}
    {loading ? <p role="status" className="mt-8">Đang tải tài khoản…</p> : <>
      <p role="status" className="mt-8 text-sm text-muted-foreground">{visible.length} tài khoản phù hợp</p>
      <div className="mt-4 divide-y divide-border border-y border-border">{visible.map((account) => <article key={account.userId} data-user-id={account.userId} className="flex min-w-0 flex-wrap justify-between gap-5 py-6">
        <div className="min-w-0 flex-1 basis-64"><h2 className="break-words font-display text-lg font-semibold">{account.fullName}</h2><p className="mt-2 break-all text-base">{account.email}</p><p className="mt-2 text-sm text-muted-foreground">Ngày tạo: {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(account.createdAt))}</p>{account.deleting && <p className="mt-2 text-sm text-destructive">Đang hủy vé và dọn tài khoản; tài khoản đã bị khóa.</p>}</div>
        <div className="flex flex-wrap gap-3">{!account.deleting && <Button variant="outline" className="min-h-11" onClick={() => open(account, 'edit')}><Pencil aria-hidden="true" />Chỉnh sửa</Button>}<Button variant="destructive" className="min-h-11" onClick={() => open(account, 'delete')}><Trash2 aria-hidden="true" />{account.deleting ? 'Tiếp tục xóa' : 'Xóa'}</Button></div>
      </article>)}</div>
      {visible.length === 0 && <p className="py-10 text-muted-foreground">{query.trim() ? 'Không tìm thấy tài khoản phù hợp.' : 'Chưa có tài khoản người tham gia.'}</p>}
    </>}
    <Dialog open={!!selected} onOpenChange={(open) => { if (!open && !busy) setSelected(null) }}><DialogContent showCloseButton={!busy} onEscapeKeyDown={(event) => { if (busy) event.preventDefault() }} onPointerDownOutside={(event) => { if (busy) event.preventDefault() }}>
      <form onSubmit={submit} className="space-y-6"><DialogHeader><DialogTitle>{action === 'edit' ? 'Chỉnh sửa tài khoản' : 'Xóa tài khoản?'}</DialogTitle><DialogDescription>{action === 'edit' ? 'Cập nhật họ tên và email. Vé đã phát hành giữ thông tin khi đăng ký.' : `Tài khoản “${selected?.fullName ?? ''}” sẽ mất quyền đăng nhập. Các vé sẽ bị hủy và chỗ được trả lại. Không thể hoàn tác.`}</DialogDescription></DialogHeader>
        {action === 'edit' && <><div className="space-y-2"><Label htmlFor="account-name">Họ và tên</Label><Input id="account-name" value={fullName} onChange={(event) => setFullName(event.target.value)} required maxLength={120} disabled={busy} className="h-11 text-base" /></div><div className="space-y-2"><Label htmlFor="account-email">Email</Label><Input id="account-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} disabled={busy} className="h-11 text-base" /></div></>}
        {dialogError && <p role="alert" className="text-sm text-destructive">{dialogError}</p>}
        <DialogFooter><Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => setSelected(null)}>{action === 'delete' && !selected?.deleting ? 'Giữ lại' : 'Đóng'}</Button><Button type="submit" variant={action === 'delete' ? 'destructive' : 'default'} className="min-h-11" disabled={busy}>{busy ? 'Đang xử lý…' : action === 'edit' ? 'Lưu thay đổi' : 'Xác nhận xóa'}</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
  </div>
}
