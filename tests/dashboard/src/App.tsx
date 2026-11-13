import { useEffect, useState, type FormEvent } from 'react'
import { Activity, ArrowDownToLine, ArrowUpRight, Check, Database, FlaskConical, History, Play, RefreshCw, Square, X } from 'lucide-react'
import type { Audit, Config, Run } from './types'
import { CloudPanel } from './CloudPanel'
import { FlowDiagram } from './FlowDiagram'

const FINISHED = new Set(['completed', 'failed', 'blocked', 'stopped', 'interrupted'])
const LABELS: Record<string, string> = { preparing: 'Đang chuẩn bị', running: 'Đang chạy', verifying: 'Đối chiếu', stopping: 'Đang dừng', stopped: 'Đã dừng', completed: 'Hoàn tất', failed: 'Thất bại', blocked: 'Chờ tích hợp', interrupted: 'Gián đoạn', passed: 'Đạt', pending: 'Đang chờ', incomplete: 'Chưa kết luận', not_run: 'Chưa kiểm tra', not_applicable: 'Không áp dụng', inconclusive: 'Chưa kết luận' }
const SCENARIOS = { hot: 'Nhiều người đặt vé, còn đủ chỗ', ramp: 'Lượng truy cập tăng rồi giảm', scarce: 'Nhiều người tranh ít vé' }
const INITIAL: Config = { scenario: 'ramp', mode: 'public', users: 2, capacity: 200, rampUp: 30, hold: 90, rampDown: 30, maxRequests: 300, timeout: 30, maxRetries: 0, intervalMs: 2000, salesLead: 5 }
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
  const first = run?.measurementStartedAt ? Math.floor(Date.parse(run.measurementStartedAt) / 60000) * 60 : series[0].time
  const last = Math.max(run?.measurementFinishedAt ? Date.parse(run.measurementFinishedAt) / 1000 : Date.now() / 1000, first + 60)
  const max = Math.max(...series.map(row => row.requests), 1)
  const points = series.map(row => `${40 + (row.time - first) / (last - first) * 620},${180 - row.requests / max * 140}`).join(' ')
  return <figure className="chart"><svg viewBox="0 0 700 220" role="img" aria-label="Số request mỗi giây theo thời gian">
    {[0, .5, 1].map(ratio => <g key={ratio}><line x1="40" x2="660" y1={180 - ratio * 140} y2={180 - ratio * 140} className="chart-grid" /><text x="8" y={185 - ratio * 140}>{Number((max * ratio).toFixed(1))}</text></g>)}
    <polyline points={points} className="chart-line" />
    {series.length === 1 && <circle cx="40" cy={180 - series[0].requests / max * 140} r="4" className="chart-dot" />}
    <text x="40" y="210">{new Date(first * 1000).toLocaleTimeString('vi-VN')}</text><text x="560" y="210">{new Date(last * 1000).toLocaleTimeString('vi-VN')}</text>
  </svg><figcaption>Request/giây · tổng HTTP trong khoảng đo, không gồm chuẩn bị và kiểm tra bổ trợ.</figcaption></figure>
}

function AuditPanel({ audit }: { audit?: Audit }) {
  return <section className="audit-section" aria-labelledby="audit-heading"><div className="section-title"><h2 id="audit-heading"><Database size={19} aria-hidden="true" />Đối chiếu database</h2><Status value={audit?.status || 'not_run'} /></div>
    {audit?.checks ? <><div className="audit-totals"><span>Vé <strong>{audit.tickets}</strong></span><span>Chỗ còn <strong>{audit.remainingSeats ?? '—'}</strong></span><span>Tham chiếu <strong>{audit.references}</strong></span><span>Khóa gửi lặp <strong>{audit.idempotencyRecords}</strong></span></div><ul className="checks">{Object.entries(audit.checks).map(([key, passed]) => <li key={key}>{passed ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}<span>{key === 'activeUserProfiles' ? 'Tài khoản người thử còn hoạt động' : CHECKS[key] || key}</span><span className="check-word">{passed ? 'Khớp' : 'Lệch'}</span></li>)}</ul></> : <p className="muted">{audit?.note || 'Chưa có kết quả đối chiếu vé. Bài đặt vé cần API 4.1 và dữ liệu thử được ghi nhận theo lượt.'}</p>}
    {audit?.reason && <p className="error">{audit.reason}</p>}
  </section>
}

export function App() {
  const [config, setConfig] = useState(INITIAL)
  const [flowPreview, setFlowPreview] = useState(false)
  const [runs, setRuns] = useState<Run[]>([])
  const [selected, setSelected] = useState<string>()
  const [error, setError] = useState('')
  const [connectionError, setConnectionError] = useState('')
  const [connected, setConnected] = useState(false)
  const [sending, setSending] = useState(false)
  const [apiUrl, setApiUrl] = useState('—')
  const [writesEnabled, setWritesEnabled] = useState(false)
  const [environment, setEnvironment] = useState('—')
  const run = runs.find(item => item.runId === selected) || runs[0]
  const active = runs.find(item => !FINISHED.has(item.state))
  async function refresh() {
    try {
      const [data, meta] = await Promise.all([request<{ runs: Run[] }>('/runs'), request<{ apiUrl: string; writesEnabled: boolean; environment: string }>('/meta')])
      setRuns(data.runs); setApiUrl(meta.apiUrl); setConnected(true); setConnectionError('')
      setWritesEnabled(meta.writesEnabled); setEnvironment(meta.environment)
    } catch (cause) { setConnected(false); setConnectionError(cause instanceof Error ? cause.message : 'Không đọc được kết quả.') }
  }
  useEffect(() => { void refresh(); const timer = window.setInterval(() => { void refresh() }, 1500); return () => window.clearInterval(timer) }, [])
  function field<K extends keyof Config>(key: K, value: Config[K]) { setFlowPreview(true); setConfig(old => ({ ...old, [key]: value })) }
  function preset(scenario: Config['scenario'], capacity: number) { setFlowPreview(true); setConfig({ ...INITIAL, scenario, mode: 'purchase', users: 100, capacity, maxRequests: 400 }) }
  async function start(event: FormEvent) {
    event.preventDefault(); setSending(true); setError('')
    try { const created = await request<Run>('/runs', config); setFlowPreview(false); setSelected(created.runId); await refresh() }
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
  const count = (key: string) => run?.metrics.counts[key] ?? '—'
  const numberField = (key: keyof Config, label: string, min: number, max: number) => <label className="field" key={key}><span>{label}</span><input type="number" name={key} min={min} max={max} step="1" required value={config[key]} disabled={!!active || sending} onChange={event => field(key, Number(event.target.value) as never)} /></label>
  return <div className="shell">
    <nav className="rail" aria-label="Điều hướng kiểm thử"><a className="brand" href="#workspace" aria-label="Event Lab"><FlaskConical size={24} aria-hidden="true" /><span>Event Lab</span></a><a href="#workspace"><Activity size={19} aria-hidden="true" /><span>Kiểm thử</span></a><a href="#history"><History size={19} aria-hidden="true" /><span>Lịch sử</span></a><span className="rail-bottom">AWS / 4.1</span></nav>
    <main id="workspace"><header className="page-header"><div><p className="context">FCAJ · TRẠM KIỂM THỬ</p><h1>Khi đông người, website có ổn?</h1><p className="lede">Chọn một tình huống, tăng lượng truy cập từng mức và theo dõi cách hệ thống đáp ứng.</p></div><div className="connection"><span className={connected ? 'online' : ''} aria-hidden="true" />{connected ? 'Bộ điều khiển đã kết nối' : 'Chưa kết nối bộ điều khiển'}<button type="button" className="icon-button" onClick={() => { setError(''); void refresh() }} aria-label="Kết nối lại"><RefreshCw size={16} /></button></div></header>
      <div className="notice"><span>{environment === 'aws' ? 'AWS thật' : 'Môi trường local'}</span><p>{writesEnabled ? 'Được phép tạo dữ liệu test trên hệ thống hiện tại. Số tài khoản và sự kiện được ghi nhận theo từng lượt.' : 'Chỉ đọc: chưa cho phép tạo tài khoản hoặc đặt vé vào môi trường này.'} Mỗi lượt có giới hạn số yêu cầu và có thể dừng.</p></div>
      {(error || connectionError) && <p role="alert" className="error alert">{error || connectionError}</p>}
      <FlowDiagram run={flowPreview && !active ? undefined : run} config={config} connected={connected} />
      <div className="workspace-grid"><section className="configuration" aria-labelledby="config-heading"><div className="section-title"><h2 id="config-heading">Thiết lập lượt chạy</h2></div>
        <form onSubmit={start}><label className="field"><span>Kịch bản</span><select value={config.scenario} disabled={!!active || sending} onChange={event => { setFlowPreview(true); const scenario = event.target.value as Config['scenario']; setConfig(old => ({ ...old, scenario, mode: scenario === 'ramp' ? old.mode : 'purchase' })) }}>{Object.entries(SCENARIOS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <p className="field-help">1. Chọn tình huống. Đủ vé và tranh vé cần môi trường test cho phép ghi.</p>
          <label className="field"><span>Hoạt động của người mô phỏng</span><select value={config.mode} disabled={config.scenario !== 'ramp' || !!active || sending} onChange={event => field('mode', event.target.value as Config['mode'])}><option value="public">Xem danh sách và chi tiết sự kiện</option><option value="purchase" disabled={!writesEnabled}>Đặt vé trên dữ liệu test</option></select></label>
          <div className="load-levels"><p>2. Chọn mức người truy cập</p>{[2, 10, 50, 100, 200, 500].map(users => <button type="button" key={users} aria-pressed={config.users === users} disabled={!!active || sending} onClick={() => { setFlowPreview(true); setConfig(old => ({ ...old, users, capacity: old.scenario === 'hot' ? users * 2 : old.capacity, maxRequests: Math.min(50000, Math.max(users * 100, 300)) })) }}>{users} người</button>)}</div>
          <div className="field-pair">{numberField('users', 'Người mô phỏng (tối đa 500)', 1, 500)}{config.mode === 'purchase' && numberField('capacity', 'Số vé của sự kiện test', 1, 100000)}</div>
          {config.scenario === 'ramp' && <div className="field-triple">{numberField('rampUp', 'Tăng dần (giây)', 1, 120)}{numberField('hold', 'Giữ tải (giây)', 1, 300)}{numberField('rampDown', 'Giảm dần (giây)', 1, 120)}</div>}
          <details><summary>Giới hạn và nhịp gửi</summary><div className="field-pair">{numberField('maxRequests', 'Trần request', 1, 50000)}{numberField('timeout', 'Timeout (giây)', 1, 75)}{numberField('maxRetries', 'Retry tối đa', 0, 2)}{numberField('intervalMs', 'Nhịp đọc (ms)', 100, 5000)}{numberField('salesLead', 'Chờ mở (giây)', 2, 60)}</div></details>
          <p className="field-help">3. Chạy nhỏ trước khi tăng mức. {config.mode === 'purchase' ? 'Công cụ đọc giới hạn đăng ký/đăng nhập từ Lambda trước khi tạo User. Chuẩn bị tài khoản không tính vào thời gian đo; bị giới hạn thật sẽ báo lỗi để xử lý.' : 'Bài xem sự kiện không cần tạo tài khoản. Đọc đồ thị cùng số lỗi trước khi tăng mức tiếp theo.'}</p>
          {!writesEnabled && config.mode === 'purchase' && <p role="status">Bài đặt vé đang khóa. Mở runner ở chế độ cho phép ghi và nhập Admin kín để sử dụng.</p>}
          <div className="actions"><button className="primary" type="submit" disabled={!connected || !!active || sending || (!writesEnabled && config.mode === 'purchase')}><Play size={16} aria-hidden="true" />{sending ? 'Đang xử lý…' : 'Bắt đầu kiểm tra'}</button><button type="button" onClick={() => void stop()} disabled={!active || sending || active.state === 'stopping'}><Square size={14} aria-hidden="true" />Dừng</button></div>
        </form><div className="presets"><p>Bài đặt vé mẫu · chỉ thiết lập, chưa chạy</p><div><button disabled={!!active || sending || !writesEnabled} onClick={() => preset('hot', 200)}>100 người / 200 vé</button><button disabled={!!active || sending || !writesEnabled} onClick={() => preset('scarce', 10)}>100 người / 10 vé</button><button disabled={!!active || sending || !writesEnabled} onClick={() => preset('scarce', 1)}>100 người / 1 vé</button></div></div>
      </section>
      <section className="observation" aria-labelledby="run-heading"><div className="section-title"><h2 id="run-heading">Quan sát lượt chạy</h2><Status value={run?.state || 'pending'} /></div>
        <div className="run-context"><span>{run ? SCENARIOS[run.scenario] : 'Chưa có lượt chạy'}</span><code>{run ? run.runId : 'Chọn kịch bản để bắt đầu'}</code></div>
        {run?.state === 'preparing' && <p role="status" className="progress">Đã chuẩn bị {run.preparedUsers}/{run.config.users} tài khoản. Chưa bắt đầu đo tải.</p>}
        {run?.state === 'preparing' && run.preparationNote && <p role="status">{run.preparationNote}</p>}
        {run?.config.mode === 'purchase' && <p className="field-help">Tài khoản đã chuẩn bị: {run.preparedUsers}/{run.config.users} · Dùng lại: {run.reusedUsers ?? '—'} · Tạo mới: {run.createdUsers ?? '—'}</p>}
        {run?.issues.map(issue => <div className="run-issue" key={issue.code}><strong>{issue.code}</strong><p>{issue.message}</p></div>)}
        <div className="headline-metrics"><div><span>Yêu cầu đã gửi</span><strong>{run?.metrics.requests ?? '—'}</strong><small>trong khoảng đo</small></div><div><span>95% yêu cầu chờ tối đa</span><strong>{run?.metrics.latency.p95 ?? '—'}<small>ms</small></strong><small>P95 · một giây = 1.000 ms</small></div><div><span>Yêu cầu mỗi giây</span><strong>{run?.metrics.throughput ?? '—'}<small>req/s</small></strong><small>trung bình khoảng đo</small></div></div>
        <Chart run={run} />
        <details><summary>Chi tiết kết quả và các loại lỗi</summary><dl className="outcomes">{[['readOk', 'Đọc thành công'], ['new', 'Vé mới'], ['replay', 'Gửi lại, giữ vé cũ'], ['full', 'Hết vé'], ['duplicate', 'Đã mua'], ['notOpen', 'Chưa mở bán'], ['closed', 'Đã đóng'], ['timeout', 'Chờ quá lâu'], ['busy', 'Đang tranh chỗ'], ['server', 'Lỗi máy chủ'], ['auth', 'Lỗi quyền'], ['rateLimited', 'Bị giới hạn'], ['other', 'Lỗi khác']].map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{count(key)}</dd></div>)}</dl></details>
        <div className="measurement-note"><span>Retry: {run?.metrics.retries ?? '—'} · POST đặt vé: {run?.metrics.purchaseAttempts ?? '—'}</span><span>Lỗi ban đầu vẫn được tính sau retry.</span></div>
      </section></div>
      <CloudPanel run={run} />
      <div className="details-grid"><AuditPanel audit={run?.verification} /><section className="evidence"><div className="section-title"><h2>Bằng chứng lượt chạy</h2><button type="button" className="text-button" onClick={download} disabled={!run}><ArrowDownToLine size={16} aria-hidden="true" />JSON</button></div><dl><div><dt>API đích</dt><dd>{apiUrl}</dd></div><div><dt>Commit công cụ/source local</dt><dd><code>{run?.source.appCommit?.slice(0, 12) || '—'}</code>{run?.source.appDirty ? ' · có thay đổi local' : ''}</dd></div><div><dt>Database test</dt><dd className="break">{run?.table || '—'}</dd></div><div><dt>Adapter</dt><dd>{run?.source.adapter || '?'}</dd></div><div><dt>Chuẩn bị</dt><dd>{run?.preparationSeconds !== undefined ? `${run.preparationSeconds} giây` : '—'}</dd></div><div><dt>Quyền / idempotency</dt><dd><Status value={run?.supplemental.status || 'not_run'} /></dd></div><div><dt>Kết luận</dt><dd><Status value={run?.verdict || 'pending'} /></dd></div></dl></section></div>
      <section id="history" className="history-section"><div className="section-title"><h2><History size={19} aria-hidden="true" />Lịch sử kiểm thử</h2><span className="muted">{runs.length} lượt</span></div>{!runs.length ? <p className="muted empty-history">Chưa có kết quả. Lượt chạy mới sẽ được lưu tại runner để xem lại.</p> : <div className="history-list">{runs.map(item => <button type="button" key={item.runId} aria-pressed={item.runId === run?.runId} onClick={() => { setFlowPreview(false); setSelected(item.runId) }}><div><strong>{SCENARIOS[item.scenario]}</strong><span>{new Date(item.createdAt).toLocaleString('vi-VN')}</span></div><code>{item.runId.slice(0, 10)}</code><Status value={item.state} /><ArrowUpRight size={17} aria-hidden="true" /></button>)}</div>}</section>
      <footer><strong>Event Lab<span> / API 4.1</span></strong><p>Số liệu thật, kết luận theo bằng chứng.</p><a href="#workspace">Về thiết lập <ArrowUpRight size={14} aria-hidden="true" /></a></footer>
    </main>
  </div>
}
