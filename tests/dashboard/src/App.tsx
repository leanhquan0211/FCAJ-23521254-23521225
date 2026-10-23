import { useEffect, useState, type FormEvent } from 'react'
import { Activity, ArrowDownToLine, ArrowUpRight, Check, Database, FlaskConical, History, Play, RefreshCw, Square, X } from 'lucide-react'
import type { Audit, Config, Run } from './types'

const FINISHED = new Set(['completed', 'failed', 'blocked', 'stopped', 'interrupted'])
const LABELS: Record<string, string> = { preparing: 'Đang chuẩn bị', running: 'Đang chạy', verifying: 'Đối chiếu', stopping: 'Đang dừng', stopped: 'Đã dừng', completed: 'Hoàn tất', failed: 'Thất bại', blocked: 'Chờ tích hợp', interrupted: 'Gián đoạn', passed: 'Đạt', pending: 'Đang chờ', incomplete: 'Chưa kết luận', not_run: 'Chưa kiểm tra', not_applicable: 'Không áp dụng', inconclusive: 'Chưa kết luận' }
const SCENARIOS = { hot: 'Sự kiện hot, đủ vé', ramp: 'Tải tăng, giữ, giảm', scarce: 'Tranh vé giới hạn' }
const INITIAL: Config = { scenario: 'ramp', mode: 'public', users: 2, capacity: 200, rampUp: 3, hold: 4, rampDown: 3, maxRequests: 30, timeout: 30, maxRetries: 0, intervalMs: 500, salesLead: 5 }
const CHECKS: Record<string, string> = { eventExists: 'Sự kiện tồn tại', capacityPreserved: 'Giữ nguyên sức chứa', seatsInRange: 'Số chỗ trong giới hạn', seatCountMatchesTickets: 'Chỗ đã dùng khớp vé', oneTicketPerUser: 'Một vé / tài khoản', uniqueTicketIds: 'Mã vé không trùng', referencesMatch: 'Tham chiếu khớp vé', idempotencyMatches: 'Idempotency khớp vé', responsesPersisted: 'Kết quả HTTP đã lưu' }

async function request<T>(path: string, body?: object): Promise<T> {
  let response: Response
  try { response = await fetch('/runner' + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) }
  catch { throw new Error('Không kết nối được runner. Kiểm tra terminal cổng 3100.') }
  const data = await response.json().catch(() => null)
  if (!response.ok || !data) throw new Error(data?.message || 'Không kết nối được runner. Kiểm tra terminal cổng 3100.')
  return data as T
}

function Status({ value }: { value: string }) {
  return <span className={`status ${value === 'passed' || value === 'completed' ? 'positive' : value === 'failed' ? 'negative' : ''}`}><span aria-hidden="true" />{LABELS[value] || value}</span>
}

function Chart({ run }: { run?: Run }) {
  const series = run?.metrics.series || []
  if (!series.length) return <div className="chart-empty"><Activity size={28} aria-hidden="true" /><p>Chưa có điểm đo</p><span>Biểu đồ xuất hiện khi k6 gửi dữ liệu thật.</span></div>
  const first = series[0].time, last = Math.max(series.at(-1)!.time, first + 1)
  const max = Math.max(...series.map(row => row.requests), 1)
  const points = series.map(row => `${40 + (row.time - first) / (last - first) * 620},${180 - row.requests / max * 140}`).join(' ')
  return <figure className="chart"><svg viewBox="0 0 700 220" role="img" aria-label="Số request mỗi giây theo thời gian">
    {[0, .5, 1].map(ratio => <g key={ratio}><line x1="40" x2="660" y1={180 - ratio * 140} y2={180 - ratio * 140} className="chart-grid" /><text x="8" y={185 - ratio * 140}>{Number((max * ratio).toFixed(1))}</text></g>)}
    <polyline points={points} className="chart-line" />
    {series.length === 1 && <circle cx="40" cy={180 - series[0].requests / max * 140} r="4" className="chart-dot" />}
    <text x="40" y="210">0 giây</text><text x="600" y="210">{last - first} giây</text>
  </svg><figcaption>Request/giây · tổng HTTP trong khoảng đo, không gồm chuẩn bị và kiểm tra bổ trợ.</figcaption></figure>
}

function AuditPanel({ audit }: { audit?: Audit }) {
  return <section className="audit-section" aria-labelledby="audit-heading"><div className="section-title"><h2 id="audit-heading"><Database size={19} aria-hidden="true" />Đối chiếu database</h2><Status value={audit?.status || 'not_run'} /></div>
    {audit?.checks ? <><div className="audit-totals"><span>Vé <strong>{audit.tickets}</strong></span><span>Chỗ còn <strong>{audit.remainingSeats ?? '—'}</strong></span><span>Tham chiếu <strong>{audit.references}</strong></span><span>Idempotency <strong>{audit.idempotencyRecords}</strong></span></div><ul className="checks">{Object.entries(audit.checks).map(([key, passed]) => <li key={key}>{passed ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}<span>{CHECKS[key] || key}</span><span className="check-word">{passed ? 'Khớp' : 'Lệch'}</span></li>)}</ul></> : <p className="muted">{audit?.note || 'Chưa có kết quả đối chiếu. Bài đặt vé cần API v3 và database test riêng.'}</p>}
    {audit?.reason && <p className="error">{audit.reason}</p>}
  </section>
}

export function App() {
  const [config, setConfig] = useState(INITIAL)
  const [runs, setRuns] = useState<Run[]>([])
  const [selected, setSelected] = useState<string>()
  const [error, setError] = useState('')
  const [connectionError, setConnectionError] = useState('')
  const [connected, setConnected] = useState(false)
  const [sending, setSending] = useState(false)
  const [apiUrl, setApiUrl] = useState('—')
  const run = runs.find(item => item.runId === selected) || runs[0]
  const active = runs.find(item => !FINISHED.has(item.state))
  async function refresh() {
    try {
      const [data, meta] = await Promise.all([request<{ runs: Run[] }>('/runs'), request<{ apiUrl: string }>('/meta')])
      setRuns(data.runs); setApiUrl(meta.apiUrl); setConnected(true); setConnectionError('')
    } catch (cause) { setConnected(false); setConnectionError(cause instanceof Error ? cause.message : 'Không đọc được kết quả.') }
  }
  useEffect(() => { void refresh(); const timer = window.setInterval(() => { void refresh() }, 1500); return () => window.clearInterval(timer) }, [])
  function field<K extends keyof Config>(key: K, value: Config[K]) { setConfig(old => ({ ...old, [key]: value })) }
  function preset(scenario: Config['scenario'], capacity: number) { setConfig({ ...INITIAL, scenario, mode: 'purchase', users: 100, capacity, maxRequests: 400 }) }
  async function start(event: FormEvent) {
    event.preventDefault(); setSending(true); setError('')
    try { const created = await request<Run>('/runs', config); setSelected(created.runId); await refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tạo được lượt chạy.') }
    finally { setSending(false) }
  }
  async function stop() {
    if (!active) return
    setSending(true); setError('')
    try { await request(`/runs/${active.runId}/stop`, {}); await refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không dừng được lượt chạy.') }
    finally { setSending(false) }
  }
  function download() {
    if (!run) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = `${run.runId}.json`; link.click(); URL.revokeObjectURL(url)
  }
  const count = (key: string) => run ? run.metrics.counts[key] : '—'
  const numberField = (key: keyof Config, label: string, min: number, max: number) => <label className="field" key={key}><span>{label}</span><input type="number" name={key} min={min} max={max} step="1" required value={config[key]} disabled={!!active || sending} onChange={event => field(key, Number(event.target.value) as never)} /></label>
  return <div className="shell">
    <nav className="rail" aria-label="Điều hướng kiểm thử"><a className="brand" href="#workspace" aria-label="Event Lab"><FlaskConical size={24} aria-hidden="true" /><span>Event Lab</span></a><a href="#workspace"><Activity size={19} aria-hidden="true" /><span>Kiểm thử</span></a><a href="#history"><History size={19} aria-hidden="true" /><span>Lịch sử</span></a><span className="rail-bottom">LOCAL / 04</span></nav>
    <main id="workspace"><header className="page-header"><div><p className="context">WORKSHOP · TRẠM KIỂM THỬ LOCAL</p><h1>Đo tải. Đối chiếu. Kết luận.</h1><p className="lede">Chạy kịch bản trên API thật, theo dõi kết quả và kiểm tra tính nhất quán của vé.</p></div><div className="connection"><span className={connected ? 'online' : ''} aria-hidden="true" />{connected ? 'Runner sẵn sàng' : 'Runner chưa kết nối'}<button type="button" className="icon-button" onClick={() => { setError(''); void refresh() }} aria-label="Kết nối lại"><RefreshCw size={16} /></button></div></header>
      <div className="notice"><span>Phạm vi local</span><p>Adapter người mua v3 đang chờ bàn giao. Không có số đo giả, không suy ra khả năng autoscaling AWS từ kết quả local.</p></div>
      {(error || connectionError) && <p role="alert" className="error alert">{error || connectionError}</p>}
      <div className="workspace-grid"><section className="configuration" aria-labelledby="config-heading"><div className="section-title"><h2 id="config-heading">Thiết lập lượt chạy</h2></div>
        <form onSubmit={start}><label className="field"><span>Kịch bản</span><select value={config.scenario} disabled={!!active || sending} onChange={event => { const scenario = event.target.value as Config['scenario']; setConfig(old => ({ ...old, scenario, mode: scenario === 'ramp' ? old.mode : 'purchase' })) }}>{Object.entries(SCENARIOS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="field"><span>Loại tải</span><select value={config.mode} disabled={config.scenario !== 'ramp' || !!active || sending} onChange={event => field('mode', event.target.value as Config['mode'])}><option value="public">Xem công khai</option><option value="purchase">Đặt vé · cần v3</option></select></label>
          <div className="field-pair">{numberField('users', 'Số người dùng', 1, 100)}{numberField('capacity', 'Sức chứa', 1, 100000)}</div>
          {config.scenario === 'ramp' && <div className="field-triple">{numberField('rampUp', 'Tăng (giây)', 1, 60)}{numberField('hold', 'Giữ (giây)', 1, 60)}{numberField('rampDown', 'Giảm (giây)', 1, 60)}</div>}
          <details><summary>Giới hạn và nhịp gửi</summary><div className="field-pair">{numberField('maxRequests', 'Trần request', 1, 5000)}{numberField('timeout', 'Timeout (giây)', 1, 75)}{numberField('maxRetries', 'Retry tối đa', 0, 2)}{numberField('intervalMs', 'Nhịp đọc (ms)', 100, 5000)}{numberField('salesLead', 'Chờ mở (giây)', 2, 60)}</div></details>
          <p className="field-help">Bắt đầu nhỏ trước khi tăng lên 100 User. Chuẩn bị tài khoản và đăng nhập không nằm trong khoảng đo.</p>
          <div className="actions"><button className="primary" type="submit" disabled={!connected || !!active || sending}><Play size={16} aria-hidden="true" />{sending ? 'Đang xử lý…' : 'Bắt đầu'}</button><button type="button" onClick={() => void stop()} disabled={!active || sending || active.state === 'stopping'}><Square size={14} aria-hidden="true" />Dừng</button></div>
        </form><div className="presets"><p>Mốc kiểm tra sau khi v3 sẵn sàng</p><div><button disabled={!!active || sending} onClick={() => preset('hot', 200)}>100 / 200 vé</button><button disabled={!!active || sending} onClick={() => preset('scarce', 10)}>100 / 10 vé</button><button disabled={!!active || sending} onClick={() => preset('scarce', 1)}>100 / 1 vé</button></div></div>
      </section>
      <section className="observation" aria-labelledby="run-heading"><div className="section-title"><h2 id="run-heading">Quan sát lượt chạy</h2><Status value={run?.state || 'pending'} /></div>
        <div className="run-context"><span>{run ? SCENARIOS[run.scenario] : 'Chưa có lượt chạy'}</span><code>{run ? run.runId : 'Chọn kịch bản để bắt đầu'}</code></div>
        {run?.state === 'preparing' && <p role="status" className="progress">Đã chuẩn bị {run.preparedUsers}/{run.config.users} tài khoản. Chưa bắt đầu đo tải.</p>}
        {run?.issues.map(issue => <div className="run-issue" key={issue.code}><strong>{issue.code}</strong><p>{issue.message}</p></div>)}
        <div className="headline-metrics"><div><span>Tổng request</span><strong>{run?.metrics.requests ?? '—'}</strong><small>trong khoảng đo</small></div><div><span>P95 phản hồi</span><strong>{run?.metrics.latency.p95 ?? '—'}<small>ms</small></strong><small>tất cả request đo</small></div><div><span>Thông lượng</span><strong>{run?.metrics.throughput ?? '—'}<small>req/s</small></strong><small>từ điểm đầu đến cuối</small></div></div>
        <Chart run={run} />
        <dl className="outcomes">{[['readOk', 'Đọc thành công'], ['new', 'Vé mới'], ['replay', 'Replay'], ['full', 'Hết vé'], ['duplicate', 'Đã mua'], ['notOpen', 'Chưa mở bán'], ['closed', 'Đã đóng'], ['timeout', 'Timeout'], ['busy', 'Xung đột'], ['server', 'Lỗi server'], ['auth', 'Lỗi quyền'], ['rateLimited', 'Giới hạn tải'], ['other', 'Lỗi khác']].map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{count(key)}</dd></div>)}</dl>
        <div className="measurement-note"><span>Retry: {run?.metrics.retries ?? '—'} · POST đặt vé: {run?.metrics.purchaseAttempts ?? '—'}</span><span>Lỗi ban đầu vẫn được tính sau retry.</span></div>
      </section></div>
      <div className="details-grid"><AuditPanel audit={run?.verification} /><section className="evidence"><div className="section-title"><h2>Bằng chứng lượt chạy</h2><button type="button" className="text-button" onClick={download} disabled={!run}><ArrowDownToLine size={16} aria-hidden="true" />JSON</button></div><dl><div><dt>API đích</dt><dd>{apiUrl}</dd></div><div><dt>Commit ứng dụng</dt><dd><code>{run?.source.appCommit?.slice(0, 12) || '—'}</code>{run?.source.appDirty ? ' · có thay đổi local' : ''}</dd></div><div><dt>Database test</dt><dd className="break">{run?.table || '—'}</dd></div><div><dt>Adapter</dt><dd>{run?.source.adapter || '?'}</dd></div><div><dt>Chuẩn bị</dt><dd>{run?.preparationSeconds !== undefined ? `${run.preparationSeconds} giây` : '—'}</dd></div><div><dt>Quyền / idempotency</dt><dd><Status value={run?.supplemental.status || 'not_run'} /></dd></div><div><dt>Kết luận</dt><dd><Status value={run?.verdict || 'pending'} /></dd></div></dl></section></div>
      <section id="history" className="history-section"><div className="section-title"><h2><History size={19} aria-hidden="true" />Lịch sử kiểm thử</h2><span className="muted">{runs.length} lượt</span></div>{!runs.length ? <p className="muted empty-history">Chưa có kết quả. Lượt chạy mới sẽ được lưu tại runner để xem lại.</p> : <div className="history-list">{runs.map(item => <button type="button" key={item.runId} aria-pressed={item.runId === run?.runId} onClick={() => setSelected(item.runId)}><div><strong>{SCENARIOS[item.scenario]}</strong><span>{new Date(item.createdAt).toLocaleString('vi-VN')}</span></div><code>{item.runId.slice(0, 10)}</code><Status value={item.state} /><ArrowUpRight size={17} aria-hidden="true" /></button>)}</div>}</section>
      <footer><strong>Event Lab<span> / local</span></strong><p>Đo được gì, báo cáo điều đó.</p><a href="#workspace">Về thiết lập <ArrowUpRight size={14} aria-hidden="true" /></a></footer>
    </main>
  </div>
}
