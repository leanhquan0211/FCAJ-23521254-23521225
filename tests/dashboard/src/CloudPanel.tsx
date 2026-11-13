import { useEffect, useState } from 'react'
import type { Run } from './types'

interface CloudData {
  status: string; note: string; sampledAt?: string;
  series: { time: number; concurrent?: number; invocations?: number; throttles?: number; errors?: number; duration?: number }[];
}

export function CloudPanel({ run }: { run?: Run }) {
  const [data, setData] = useState<CloudData>()
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    setData(undefined); setError('')
    if (!run) return
    async function refresh() {
      try {
        const response = await fetch(`/runner/runs/${run!.runId}/cloud`)
        if (!response.ok) throw new Error()
        const result = await response.json() as CloudData
        if (alive) { setData(result); setError('') }
      } catch { if (alive) setError('Chưa đọc được số đo AWS. Kiểm tra kết nối với bộ điều khiển.') }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 60000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [run?.runId, run?.state])
  const rows = data?.series || []
  const concurrent = rows.filter(row => row.concurrent !== undefined)
  const peak = concurrent.length ? Math.max(...concurrent.map(row => row.concurrent!)) : null
  const start = run?.measurementStartedAt ? Math.floor(Date.parse(run.measurementStartedAt) / 60000) * 60 : 0
  const end = Math.max(start + 60, run?.measurementFinishedAt ? Date.parse(run.measurementFinishedAt) / 1000 : Date.now() / 1000)
  const points = concurrent.map(row => `${40 + (row.time - start) / (end - start) * 620},${180 - row.concurrent! / Math.max(peak || 0, 1) * 140}`).join(' ')
  const sum = (key: 'errors' | 'throttles') => rows.some(row => row[key] !== undefined) ? rows.reduce((n, row) => n + (row[key] || 0), 0) : '—'
  return <section className="cloud-panel" aria-labelledby="cloud-title">
    <div className="section-title"><h2 id="cloud-title">Hệ thống đáp ứng khi đông người ra sao?</h2><span className="status">{data?.status === 'available' ? 'Có số đo AWS' : 'Đang chờ số đo'}</span></div>
    <p>So sánh lượng truy cập phía trên với số lượt Lambda xử lý cùng lúc bên dưới. AWS có thể tăng hoặc giảm mức xử lý khi nhu cầu thay đổi.</p>
    {run?.capacity?.status === 'available' && <p className="notice">Giới hạn tài khoản tại lượt đo: {run.capacity.accountConcurrency} Lambda đồng thời. Trần gọi đồng bộ theo quota: tối đa {run.capacity.syncRpsCeiling} request/giây (có thể thấp hơn do tải khác). Nhiều người hơn không tự vượt được giới hạn AWS này.</p>}
    <div className="headline-metrics"><div><span>Xử lý cùng lúc, cao nhất</span><strong>{peak ?? '—'}</strong><small>Lambda · từng phút</small></div><div><span>Bị giới hạn xử lý</span><strong>{sum('throttles')}</strong><small>cần xem cùng lỗi HTTP</small></div><div><span>Lỗi thực thi Lambda</span><strong>{sum('errors')}</strong><small>không bao gồm mọi lỗi HTTP</small></div></div>
    {concurrent.length ? <figure className="chart"><svg viewBox="0 0 700 220" role="img" aria-label="Số lượt Lambda xử lý đồng thời theo phút">
      <line x1="40" x2="660" y1="180" y2="180" className="chart-grid" />
      <polyline points={points} className="chart-line" />
      {concurrent.map(row => <circle key={row.time} cx={40 + (row.time - start) / (end - start) * 620} cy={180 - row.concurrent! / Math.max(peak || 0, 1) * 140} r="4" className="chart-dot"><title>{new Date(row.time * 1000).toLocaleTimeString('vi-VN')}: {row.concurrent}</title></circle>)}
      <text x="8" y="40">{peak}</text><text x="40" y="210">{new Date(start * 1000).toLocaleTimeString('vi-VN')}</text><text x="560" y="210">{new Date(end * 1000).toLocaleTimeString('vi-VN')}</text>
    </svg><figcaption>Concurrency Maximum · mỗi điểm là một phút, có thể gồm truy cập ngoài lượt test.</figcaption></figure> : <div className="chart-empty"><p>{data?.note || 'Chạy một bài kiểm tra để bắt đầu quan sát.'}</p><span>Không có dữ liệu chưa có nghĩa là giá trị bằng 0.</span></div>}
    {error && <p role="alert" className="error">{error}</p>}
    {!!rows.length && <details><summary>Xem số đo theo từng phút</summary><div className="cloud-readings">{rows.map(row => <div key={row.time}><strong>{new Date(row.time * 1000).toLocaleTimeString('vi-VN')}</strong><span>Xử lý cùng lúc: {row.concurrent ?? '—'}</span><span>Lượt gọi: {row.invocations ?? '—'}</span><span>95% lượt xử lý trong: {row.duration ?? '—'} ms</span></div>)}</div></details>}
    <p className="field-help">{data?.note} Đây là số lượt xử lý đồng thời, không phải số máy giữ ấm. Đường tăng không tự chứng minh toàn bộ tiêu chí scaling đã đạt.</p>
    {data?.sampledAt && <small>Cập nhật số đo: {new Date(data.sampledAt).toLocaleTimeString('vi-VN')}</small>}
  </section>
}
