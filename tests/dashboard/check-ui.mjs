// Real Chromium UI; runner responses are intercepted fixtures. Never sends AWS load.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
const out = path.resolve(import.meta.dirname, '../results/browser-aws-ui')
await fs.mkdir(out, { recursive: true })
const port = process.env.LAB_CHROME_PORT || '9246'
const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json())
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }))
let next = 0, writesEnabled = false, runs = [], posted = 0, offline = false
const pending = new Map(), errors = []
function send(method, params = {}) { const id = ++next; return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) }) }
ws.addEventListener('message', async event => {
  const message = JSON.parse(String(event.data))
  if (message.id) { const p = pending.get(message.id); pending.delete(message.id); if (p) message.error ? p.reject(message.error) : p.resolve(message.result) }
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text)
  if (message.method !== 'Fetch.requestPaused') return
  const { requestId, request } = message.params
  const pathname = new URL(request.url).pathname.replace('/runner', '')
  let body
  if (pathname === '/meta') body = { apiUrl: 'https://test.example/api', writesEnabled, environment: 'aws' }
  else if (pathname.endsWith('/cloud')) body = { status: 'available', note: 'Dữ liệu fixture dành riêng cho kiểm tra giao diện.', series: [{ time: Date.now() / 1000 - 60, concurrent: 2, errors: 0 }, { time: Date.now() / 1000, concurrent: 8, throttles: 0 }] }
  else if (request.method === 'POST') {
    posted++
    const config = JSON.parse(request.postData)
    const now = Date.now()
    body = { runId: 'a'.repeat(24), scenario: config.scenario, config, state: 'completed', verdict: 'passed', createdAt: new Date(now).toISOString(), preparedUsers: 0,
      source: { appCommit: 'fixture', adapter: 'fixture-4.1' }, measurementStartedAt: new Date(now - 120000).toISOString(), measurementFinishedAt: new Date(now).toISOString(),
      metrics: { requests: 4, counts: { readOk: 4 }, latency: { p95: 80 }, throughput: 2, series: [{ time: now / 1000 - 60, requests: 2 }, { time: now / 1000, requests: 2 }] }, verification: { status: 'not_applicable' }, supplemental: { status: 'not_run' }, issues: [] }
    runs = [body]
  } else body = { runs }
  await send('Fetch.fulfillRequest', { requestId, responseCode: offline ? 503 : 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(body)).toString('base64') })
})
async function evaluate(expression) { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value }
async function wait(expression) { for (let i = 0; i < 80; i++) { if (await evaluate(expression)) return; await new Promise(r => setTimeout(r, 100)) } throw new Error(`Timed out: ${expression}`) }
async function click(label) { assert(await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)});if(!b||b.disabled)return false;b.click();return true})()`)) }
try {
  await send('Runtime.enable'); await send('Page.enable')
  await send('Fetch.enable', { patterns: [{ urlPattern: '*://*/runner/*', requestStage: 'Request' }] })
  await send('Page.navigate', { url: 'http://127.0.0.1:5174/' })
  await wait(`document.body?.innerText.includes('Bộ điều khiển đã kết nối')`)
  assert.equal(await evaluate(`document.querySelector('.flow-panel').dataset.state`), 'preview')
  assert(await evaluate(`document.querySelector('option[value="purchase"]').disabled`))
  await click('500 người')
  assert.equal(await evaluate(`document.querySelector('input[name="users"]').value`), '500')
  assert.equal(posted, 0, 'Selecting a level must not start a run')
  await click('2 người')
  await click('Bắt đầu kiểm tra')
  await wait(`document.querySelector('.run-context').textContent.includes('${'a'.repeat(24)}')`)
  await wait(`document.querySelector('.cloud-panel').textContent.includes('Có số đo AWS')`)
  assert.equal(await evaluate(`document.querySelector('.flow-panel').dataset.state`), 'completed')
  assert.equal(await evaluate(`document.querySelectorAll('.flow-pulse').length`), 0)
  runs[0].state = 'preparing'
  runs[0].config.mode = 'purchase'
  runs[0].preparedUsers = 1
  await wait(`document.querySelector('.flow-panel').dataset.state === 'preparing' && document.querySelectorAll('.flow-pulse').length > 0`)
  runs[0].config.mode = 'public'
  runs[0].state = 'running'
  runs[0].metrics.requests += 2
  await wait(`document.querySelector('.flow-panel').dataset.state === 'running' && document.querySelectorAll('.flow-pulse').length > 0`)
  runs[0].state = 'failed'
  await wait(`document.querySelector('.flow-panel').dataset.state === 'failed' && document.querySelectorAll('.flow-pulse').length === 0`)
  assert.equal(posted, 1)
  const widths = [320, 375, 414, 768, 1280]
  for (const width of widths) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 640 })
    await new Promise(r => setTimeout(r, 100))
    assert(await evaluate(`document.documentElement.scrollWidth<=innerWidth`), `Overflow at ${width}`)
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
    await fs.writeFile(path.join(out, `${width}.png`), Buffer.from(shot.data, 'base64'))
  }
  writesEnabled = true
  await send('Page.reload')
  await wait(`document.querySelector('option[value="purchase"]')?.disabled === false`)
  await click('100 người / 1 vé')
  await wait(`document.querySelector('input[name="capacity"]')?.value === '1'`)
  assert.equal(await evaluate(`document.querySelector('input[name="capacity"]').value`), '1')
  assert.equal(posted, 1, 'Preset must not run purchase')
  assert.equal(await evaluate(`document.querySelector('.flow-panel').dataset.state`), 'preview')
  assert.equal(await evaluate(`document.querySelector('.flow-panel').dataset.mode`), 'purchase')
  assert.equal(await evaluate(`document.querySelectorAll('.flow-pulse').length`), 0)
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  assert(await evaluate(`matchMedia('(prefers-reduced-motion: reduce)').matches`))
  runs[0].state = 'running'
  runs[0].metrics.requests += 2
  await send('Page.reload')
  await wait(`document.querySelector('.flow-panel')?.dataset.state === 'running' && !!document.querySelector('.flow-pulse')`)
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.flow-pulse')).animationName`), 'none')
  offline = true
  await wait(`document.querySelector('.flow-panel').dataset.state === 'disconnected' && document.querySelectorAll('.flow-pulse').length === 0`)
  offline = false
  runs[0].state = 'stopped'
  await wait(`document.querySelector('.flow-panel').dataset.state === 'stopped' && document.querySelectorAll('.flow-pulse').length === 0`)
  assert.deepEqual(errors, [])
  const report = { browser: 'Chromium', responseFixtures: true, awsRequests: 0, widths, presetDoesNotRun: true, purchaseGuard: true, flow: { preview: true, preparing: true, activeOnProgress: true, stoppedOnFailureAndStop: true, disconnected: true, reducedMotion: true }, uncaughtExceptions: errors }
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
} finally { await send('Page.close').catch(() => {}); ws.close() }
