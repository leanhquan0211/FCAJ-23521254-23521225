// Actual browser + real runner. Network failure injection is labelled separately in the output.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../..')
const output = path.join(root, 'tests/results/browser')
await fs.mkdir(output, { recursive: true })
const port = process.env.LAB_CHROME_PORT || '9242'
const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('http://127.0.0.1:5174/')}`, { method: 'PUT' }).then(r => r.json())
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
let next = 0
const pending = new Map()
const errors = []
socket.addEventListener('message', event => {
  const message = JSON.parse(String(event.data))
  if (message.id) {
    const callbacks = pending.get(message.id); pending.delete(message.id)
    if (callbacks) message.error ? callbacks.reject(new Error(message.error.message)) : callbacks.resolve(message.result)
  }
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text)
})
function send(method, params = {}) { const id = ++next; return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })) }) }
async function evaluate(expression) {
  const data = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (data.exceptionDetails) throw new Error(data.exceptionDetails.text)
  return data.result.value
}
async function wait(expression, limit = 120000) {
  const until = Date.now() + limit
  while (Date.now() < until) { if (await evaluate(expression)) return; await new Promise(resolve => setTimeout(resolve, 250)) }
  throw new Error(`Browser wait timed out: ${expression}`)
}
async function click(label) { assert(await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === ${JSON.stringify(label)}); if (!button || button.disabled) return false; button.click(); return true })()`), `Enabled button ${label}`) }
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
await wait(`document.body.innerText.includes('Runner sẵn sàng')`)
const before = await fetch('http://127.0.0.1:3100/runs').then(r => r.json())
const existingIds = new Set(before.runs.map(r => r.runId))
await click('Bắt đầu')
await wait(`fetch('/runner/runs').then(r => r.json()).then(data => data.runs.some(r => !${JSON.stringify([...existingIds])}.includes(r.runId) && r.state === 'completed' && r.config.mode === 'public'))`)
let reports = await fetch('http://127.0.0.1:3100/runs').then(r => r.json())
const publicRun = reports.runs.find(r => !existingIds.has(r.runId) && r.state === 'completed' && r.config.mode === 'public')
assert(publicRun && publicRun.metrics.requests > 0 && publicRun.verdict === 'passed')
await wait(`document.querySelector('.run-context').textContent.includes(${JSON.stringify(publicRun.runId)})`)
await wait(`!document.querySelector('button[type="submit"]').disabled`)
assert(await evaluate(`!!document.querySelector('svg[aria-label="Số request mỗi giây theo thời gian"]')`))
await click('100 / 10 vé')
// Only inspect presets. Starting this preset would create 100 real buyers on v3.
assert(await evaluate(`document.querySelector('input[name="users"]').value === '100' && document.querySelector('input[name="capacity"]').value === '10'`))
await click('100 / 1 vé')
assert(await evaluate(`document.querySelector('input[name="capacity"]').value === '1'`))
// A real longer read-only run, stopped through the actual UI.
const stopRun = await evaluate(`fetch('/runner/runs', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenario:'ramp',mode:'public',users:1,rampUp:2,hold:20,rampDown:2,maxRequests:40,timeout:10})}).then(r=>r.json())`)
await wait(`document.body.innerText.includes('Đang chạy')`)
await wait(`fetch('/runner/runs/${stopRun.runId}').then(r=>r.json()).then(r=>r.metrics.requests>0)`)
await wait(`(() => { const button = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Dừng'); return button && !button.disabled })()`)
await click('Dừng')
await wait(`fetch('/runner/runs/${stopRun.runId}').then(r=>r.json()).then(r=>r.state==='stopped')`)
const stopped = await fetch(`http://127.0.0.1:3100/runs/${stopRun.runId}`).then(r => r.json())
assert.equal(stopped.state, 'stopped'); assert.equal(stopped.verdict, 'incomplete')
// History navigation displays the persisted public result again.
await evaluate(`document.querySelector('#history').scrollIntoView(); [...document.querySelectorAll('.history-list button')].find(x=>x.textContent.includes(${JSON.stringify(publicRun.runId.slice(0, 10))})).click()`)
await wait(`document.querySelector('.run-context').textContent.includes(${JSON.stringify(publicRun.runId)})`)
for (const width of [320, 375, 414, 768, 1280]) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 600 })
  await new Promise(resolve => setTimeout(resolve, 200))
  const geometry = await evaluate(`({width:innerWidth,scroll:document.documentElement.scrollWidth, bad:[...document.querySelectorAll('button:not(.history-list button),nav a,footer a')].filter(e=>e.getBoundingClientRect().width>0 && e.scrollWidth>e.clientWidth+2).map(e=>e.textContent)})`)
  assert(geometry.scroll <= width + 1, `Horizontal overflow at ${width}: ${JSON.stringify(geometry)}`)
  assert.equal(geometry.bad.length, 0, `Control text overflow at ${width}`)
  await evaluate('scrollTo(0,0)')
  if (width === 375 || width === 1280) {
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    await fs.writeFile(path.join(output, `dashboard-${width}.png`), Buffer.from(screenshot.data, 'base64'))
  }
}
// Deliberate browser-only network failure, followed by actual recovery.
await send('Network.setBlockedURLs', { urls: ['*runner/runs*'] })
await wait(`document.body.innerText.includes('Không kết nối được runner')`, 10000)
await send('Network.setBlockedURLs', { urls: [] })
await wait(`!document.querySelector('[role="alert"]') && document.body.innerText.includes('Runner sẵn sàng')`, 10000)
await send('Page.reload')
await wait(`document.querySelectorAll('.history-list button').length >= 3`)
assert.equal(errors.length, 0, `Uncaught browser errors: ${errors}`)
console.log(JSON.stringify({ status: 'passed', publicRunId: publicRun.runId, purchasePresets: 'selection only; no purchase requests',
  stoppedRunId: stopRun.runId, widths: [320, 375, 414, 768, 1280], networkFailure: 'injected only in browser', uncaughtErrors: errors.length }))
socket.close()
