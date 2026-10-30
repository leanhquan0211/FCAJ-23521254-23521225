// Hallmark · Sakura Night · separate introduction / glass form · critique: P4 H5 E4 S5 R4 V4
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageState } from '@/components/PageState'
import { useSession } from '@/hooks/useSession'
import { login } from '@/services/session'
import { registerBuyer, safeReturnPath } from '@/services/buyer'
import { DATA_MODE } from '@/services/events'
import { RegistrationError } from '@/types/registration'
import { BlossomArtwork } from '@/components/BlossomArtwork'
import { BrandMark } from '@/components/BrandMark'
import { ArrowUpRight } from '@/components/DimensionalIcons'

export function BuyerAuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const signingUp = mode === 'signup'
  const [params] = useSearchParams()
  const returnTo = safeReturnPath(params.get('returnTo'))
  const navigate = useNavigate()
  const buyer = useSession()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const sending = useRef(false)
  useEffect(() => { if (buyer.session) navigate(buyer.session.role === 'admin' ? '/admin' : returnTo, { replace: true }) }, [buyer.session, navigate, returnTo])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending.current) return
    setError(''); setErrors({})
    if (signingUp && password !== confirmation) { setErrors({ confirmation: 'Hai mật khẩu chưa giống nhau.' }); return }
    sending.current = true; setSubmitting(true)
    try {
      if (signingUp) {
        await registerBuyer(name.trim(), email.trim(), password)
        navigate(`/login?created=1&returnTo=${encodeURIComponent(returnTo)}`, { replace: true })
      } else {
        const session = await login(email.trim(), password)
        buyer.setSession(session)
        navigate(session.role === 'admin' ? '/admin' : returnTo, { replace: true })
      }
      setPassword(''); setConfirmation('')
    } catch (cause) {
      setPassword(''); setConfirmation('')
      setError(cause instanceof Error ? cause.message : 'Không thể xử lý. Vui lòng thử lại.')
      if (cause instanceof RegistrationError && cause.details) setErrors(cause.details)
    } finally { sending.current = false; setSubmitting(false) }
  }
  if (DATA_MODE !== 'api') return <PageState title="Tài khoản cần kết nối máy chủ" message="Chế độ xem mẫu chỉ dùng để xem sự kiện. Hãy chạy ở chế độ API để đăng nhập và đặt vé." />
  const fieldError = (field: string) => errors[field] ? <p id={`${field}-error`} className="text-sm text-destructive">{errors[field]}</p> : null
  const invalid = (field: string) => ({ 'aria-invalid': !!errors[field], 'aria-describedby': errors[field] ? `${field}-error` : undefined })
  return <div className="auth-layout" data-mode={mode}>
    <section className="auth-introduction" aria-label="Website đăng ký sự kiện">
      <p className="intro-label"><BrandMark className="intro-brand-mark" /> Những kết nối bắt đầu từ đây</p>
      <h2 className="auth-display">Một cuộc gặp.<br /><span>Nhiều trải nghiệm.</span></h2>
      <p className="auth-intro-copy">Khám phá sự kiện bạn yêu thích, dành một chỗ cho mình và cùng tạo nên những kỷ niệm mới.</p>
      <BlossomArtwork className="auth-artwork" />
      <p className="auth-art-caption">Một chỗ dành cho bạn, một trải nghiệm để nhớ.</p>
    </section>
    <section className="auth-panel">
    <div className="auth-panel-heading"><div className="auth-panel-brand"><BrandMark className="size-14" /><div><p className="auth-brand-name">SỰ KIỆN</p><p className="auth-brand-caption">Gặp gỡ. Kết nối.</p></div></div><Link className="auth-switch-link" to={`${signingUp ? '/login' : '/signup'}?returnTo=${encodeURIComponent(returnTo)}`}>{signingUp ? 'Đăng nhập' : 'Đăng ký'}<ArrowUpRight size={16} aria-hidden="true" /></Link></div>
    <p className="auth-eyebrow">{signingUp ? 'BẮT ĐẦU HÀNH TRÌNH' : 'CHÀO MỪNG TRỞ LẠI'}</p>
    <h1 className="font-display text-3xl font-bold leading-tight">{signingUp ? 'Tạo tài khoản' : 'Đăng nhập'}</h1>
    <p className="mt-4 text-base text-muted-foreground">{signingUp ? 'Tạo tài khoản người tham gia để đặt vé và xem lại các vé của bạn.' : 'Đăng nhập bằng tài khoản của bạn để tiếp tục.'}</p>
    {!signingUp && params.get('created') === '1' && <p role="status" className="mt-5 text-primary">Đã tạo tài khoản. Bạn có thể đăng nhập ngay.</p>}
    <Card className="auth-form-card mt-8"><CardContent><form onSubmit={submit} className="space-y-6">
      {signingUp && <div className="space-y-2"><Label htmlFor="fullName">Họ và tên</Label><Input id="fullName" name="fullName" autoComplete="name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} {...invalid('fullName')} className="h-11 text-base" />{fieldError('fullName')}</div>}
      <div className="space-y-2"><Label htmlFor="email">{signingUp ? 'Email' : 'Tên đăng nhập hoặc email'}</Label><Input id="email" name="email" type={signingUp ? 'email' : 'text'} autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} {...invalid('email')} className="h-11 text-base" />{fieldError('email')}</div>
      <div className="space-y-2"><Label htmlFor="password">Mật khẩu</Label><Input id="password" name="password" type="password" autoComplete={signingUp ? 'new-password' : 'current-password'} required minLength={signingUp ? 15 : 1} maxLength={signingUp ? 128 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} {...invalid('password')} className="h-11 text-base" />{signingUp && <p className="text-sm text-muted-foreground">Dùng từ 15 đến 128 ký tự.</p>}{fieldError('password')}</div>
      {signingUp && <div className="space-y-2"><Label htmlFor="confirmation">Nhập lại mật khẩu</Label><Input id="confirmation" name="confirmation" type="password" autoComplete="new-password" required minLength={15} maxLength={128} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} {...invalid('confirmation')} className="h-11 text-base" />{fieldError('confirmation')}</div>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {buyer.error && !error && <p role="alert" className="text-sm text-destructive">{buyer.error}</p>}
      <Button type="submit" disabled={submitting || buyer.loading} className="min-h-11 w-full">{buyer.loading ? 'Đang kiểm tra phiên…' : submitting ? 'Đang xử lý…' : signingUp ? 'Tạo tài khoản' : 'Đăng nhập'}<ArrowUpRight size={16} aria-hidden="true" /></Button>
      <p className="text-sm text-muted-foreground">{signingUp ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}<Link className="font-medium text-primary underline underline-offset-4" to={`${signingUp ? '/login' : '/signup'}?returnTo=${encodeURIComponent(returnTo)}`}>{signingUp ? 'Đăng nhập' : 'Tạo tài khoản'}</Link></p>
    </form></CardContent></Card>
    </section>
  </div>
}
