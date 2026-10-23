import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getSession, login } from '@/services/admin'

export function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const sending = useRef(false)
  const navigate = useNavigate()
  useEffect(() => {
    let active = true
    getSession().then((session) => { if (active && session) navigate('/admin', { replace: true }) })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Không thể kết nối máy chủ.') })
      .finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [navigate])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending.current) return
    setError('')
    if (!username.trim() || !password) { setError('Vui lòng nhập tên đăng nhập và mật khẩu.'); return }
    sending.current = true
    setSubmitting(true)
    try { await login(username.trim(), password); setPassword(''); navigate('/admin', { replace: true }) }
    catch (cause) { setPassword(''); setError(cause instanceof Error ? cause.message : 'Không thể đăng nhập.') }
    finally { sending.current = false; setSubmitting(false) }
  }
  return <div className="max-w-lg py-12 sm:py-16">
    <h1 className="font-display text-3xl font-bold leading-tight">Đăng nhập quản trị viên</h1>
    <p className="mt-4 text-base text-muted-foreground">Dùng tài khoản quản trị được cấp để quản lý sự kiện. Tài khoản người tham gia dùng ở khu vực website.</p>
    <Card className="mt-8"><CardHeader><CardTitle className="font-display text-xl font-semibold">Thông tin đăng nhập</CardTitle></CardHeader><CardContent>
      <form onSubmit={submit} className="space-y-6">
        <div className="space-y-2"><Label htmlFor="username">Tên đăng nhập</Label><Input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={64} required value={username} onChange={(e) => setUsername(e.target.value)} className="h-11 text-base" /></div>
        <div className="space-y-2"><Label htmlFor="password">Mật khẩu</Label><Input id="password" name="password" type="password" autoComplete="current-password" maxLength={128} required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 text-base" /></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={checking || submitting} className="min-h-11">{checking ? 'Đang kiểm tra phiên…' : submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}</Button>
      </form>
    </CardContent></Card>
  </div>
}
