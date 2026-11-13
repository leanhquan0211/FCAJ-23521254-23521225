/* Hallmark · pre-emit critique: P4 H4 E4 S5 R4 V4 · existing Cobalt system */
import { useEffect, useId, useState } from 'react'
import type { Config, Run } from './types'

const titles = { hot: 'Đủ chỗ cho mọi người', scarce: 'Nhiều người tranh ít chỗ', ramp: 'Lượng truy cập tăng và giảm' }
const ended = new Set(['completed', 'failed', 'stopped', 'blocked', 'interrupted'])

export function FlowDiagram({ run, config, connected }: { run?: Run; config: Config; connected: boolean }) {
  const selected = run?.config || config
  const [pulse, setPulse] = useState(false)
  const id = useId().replaceAll(':', '')
  const progress = run?.state === 'preparing' ? run.preparedUsers : run?.metrics.requests
  useEffect(() => {
    if (!connected || !run || ended.has(run.state) || !progress) { setPulse(false); return }
    setPulse(true)
    const timer = window.setTimeout(() => setPulse(false), 2100)
    return () => window.clearTimeout(timer)
  }, [run?.runId, run?.state, progress, connected])
  const state = !run ? 'preview' : !connected ? 'disconnected' : run.state
  const sending = state === 'running' && pulse
  const preparing = state === 'preparing' && pulse
  const auditing = state === 'verifying' && selected.mode === 'purchase'
  const purchase = selected.mode === 'purchase'
  const phase = state === 'preview' ? 'Xem trước bài đang chọn' : state === 'disconnected' ? 'Mất kết nối · số liệu cuối đã nhận'
    : state === 'preparing' ? 'Runner đang chuẩn bị tài khoản, phiên đăng nhập và sự kiện'
    : state === 'running' ? (pulse ? 'Đang nhận kết quả request từ k6' : 'Bài đang chạy · chờ cập nhật kết quả')
    : state === 'verifying' ? 'Runner kiểm tra kết quả và đối chiếu dữ liệu'
    : state === 'completed' ? 'Lượt đã hoàn tất · sơ đồ dừng' : state === 'failed' ? 'Lượt không đạt · xem lỗi và report bên dưới'
    : 'Lượt đã dừng hoặc đang dừng · không mô phỏng gửi thêm'
  const counts = run?.metrics.counts
  const errors = counts ? ['server', 'timeout', 'rateLimited', 'auth', 'other', 'busy'].reduce((n, key) => n + (counts[key] || 0), 0) : null
  function diagram(vertical: boolean) {
    const marker = `${id}-${vertical ? 'v' : 'h'}`
    const nodes = vertical
      ? [{ x: 160, y: 145 }, { x: 160, y: 260 }, { x: 160, y: 375 }, { x: 160, y: 490 }, { x: 160, y: 605 }]
      : [{ x: 85, y: 170 }, { x: 265, y: 170 }, { x: 445, y: 170 }, { x: 625, y: 170 }, { x: 805, y: 170 }]
    const labels = ['k6', 'CloudFront', 'API Gateway', 'Lambda', 'DynamoDB']
    const descriptions = ['Người mô phỏng', 'Cổng HTTPS', 'Chuyển request', 'Xử lý yêu cầu', purchase ? 'Ghi vé, giữ chỗ' : 'Đọc sự kiện']
    const runner = vertical ? { x: 160, y: 40 } : { x: 85, y: 52 }
    const half = vertical ? 110 : 70
    const prep = vertical ? 'M 50 40 H 24 V 260 H 50' : 'M 155 52 H 265 V 134'
    const audit = vertical ? 'M 270 40 H 298 V 605 H 270' : 'M 155 52 H 175 V 90 H 805 V 134'
    function line(path: string, active: boolean, kind: string) {
      return <g key={kind}><path d={path} className="flow-wire" markerEnd={`url(#${marker})`} />{active && <path d={path} className="flow-pulse" />}</g>
    }
    return <svg className={vertical ? 'flow-mobile' : 'flow-desktop'} viewBox={vertical ? '0 0 320 660' : '0 0 900 270'} role="img" aria-label={`${titles[selected.scenario]}. ${phase}. Luồng minh họa, không phải trace từng request.`}>
      <defs><marker id={marker} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M1 1 L7 4 L1 7" className="flow-arrow" /></marker></defs>
      {purchase && line(prep, preparing, 'prepare')}
      {purchase && line(audit, false, 'audit')}
      {line(vertical ? 'M160 67 V109' : 'M85 79 V134', false, 'control')}
      {nodes.slice(0, -1).map((node, index) => {
        const next = nodes[index + 1]
        const forward = vertical ? `M145 ${node.y + 36} V${next.y - 36}` : `M${node.x + 70} 158 H${next.x - 70}`
        const reverse = vertical ? `M175 ${next.y - 36} V${node.y + 36}` : `M${next.x - 70} 184 H${node.x + 70}`
        return <g key={index}>{line(forward, sending || (preparing && index > 0), `send-${index}`)}{line(reverse, sending || (preparing && index > 0), `reply-${index}`)}</g>
      })}
      <g className={state === 'preparing' || auditing ? 'flow-node is-active' : 'flow-node'}><rect x={runner.x - half} y={runner.y - 27} width={half * 2} height="54" rx="6" /><text x={runner.x} y={runner.y - 4}>Python runner</text><text className="flow-description" x={runner.x} y={runner.y + 15}>{auditing ? 'Đọc DB để đối chiếu' : purchase ? 'Chuẩn bị qua API' : 'Điều phối bài đọc'}</text></g>
      {nodes.map((node, index) => <g key={labels[index]} className={`flow-node ${sending || (preparing && index > 0) || (auditing && index === 4) ? 'is-active' : ''}`}><rect x={node.x - half} y={node.y - 36} width={half * 2} height="72" rx="6" /><text x={node.x} y={node.y - 7}>{labels[index]}</text><text className="flow-description" x={node.x} y={node.y + 14}>{descriptions[index]}</text></g>)}
      {!vertical && <><text className="flow-description" x="460" y="39">{purchase ? 'Chuẩn bị qua API · Đối chiếu qua SDK (đường trên)' : 'Bài đọc không tạo tài khoản hoặc vé'}</text><text className="flow-description" x="450" y="240">Hàng trên: yêu cầu → · Hàng dưới: phản hồi ←</text></>}
    </svg>
  }
  return <section className="flow-panel" data-state={state} data-mode={selected.mode} aria-labelledby={`${id}-title`}>
    <div className="section-title"><h2 id={`${id}-title`}>Theo dõi đường đi của bài test</h2><span className="status">{titles[selected.scenario]}</span></div>
    <p className="flow-phase" role="status">{phase}</p>
    <div className="flow-visual">{diagram(false)}{diagram(true)}</div>
    <div className="flow-summary"><span>Người mô phỏng <strong>{selected.users}</strong></span><span>Request đã đo <strong>{run?.metrics.requests ?? '—'}</strong></span>{purchase && <><span>Vé mới <strong>{counts?.new ?? '—'}</strong></span><span>Hết vé <strong>{counts?.full ?? '—'}</strong></span></>}<span>Lỗi kỹ thuật <strong>{errors ?? '—'}</strong></span></div>
    <p className="field-help">Đường sáng minh họa hoạt động tổng hợp từ tiến độ runner và kết quả k6, không phải gói tin hay trace từng chặng AWS. Số liệu có độ trễ cập nhật. {purchase ? 'Runner chuẩn bị qua API và đọc database để audit; k6 chỉ phát tải đã cấu hình.' : 'k6 xem sự kiện công khai, không tạo tài khoản hay đặt vé.'}</p>
  </section>
}
