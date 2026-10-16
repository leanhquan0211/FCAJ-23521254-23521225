// Node + Chrome DevTools Protocol; only writes when API uses a dedicated local test table.
import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const frontend = process.env.FRONTEND_TEST_URL ?? 'http://127.0.0.1:5173'
const api = process.env.API_TEST_URL ?? 'http://127.0.0.1:3002'
for (const address of [frontend, api]) {
  const parsed = new URL(address)
  if (!['127.0.0.1', 'localhost'].includes(parsed.hostname) || parsed.protocol !== 'http:') throw new Error('Only localhost tests allowed')
}
const health = await (await fetch(`${api}/health`)).json()
if (!health.database?.table?.startsWith('fcaj-event-workshop-local-test-')) throw new Error('Use a dedicated test table')
const pages = await (await fetch(`http://127.0.0.1:${process.env.CHROME_DEBUG_PORT ?? 9240}/json`)).json()
const ws = new WebSocket(pages.find((page) => page.type === 'page').webSocketDebuggerUrl)
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
let sequence = 0
const pending = new Map()
const exceptions = []
let failNextPost = false
let failReads = false
let delayPost = false
let delayRead = false
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence
  pending.set(id, { resolve, reject })
  ws.send(JSON.stringify({ id, method, params }))
})
ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  if (pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id)
    pending.delete(message.id)
    message.error ? reject(new Error(message.error.message)) : resolve(message.result)
  } else if (message.method === 'Runtime.exceptionThrown') {
    exceptions.push(message.params.exceptionDetails.text)
  } else if (message.method === 'Fetch.requestPaused') {
    const { request, requestId } = message.params
    const fail = (request.method === 'POST' && failNextPost) || (request.method === 'GET' && failReads)
    if (request.method === 'POST' && failNextPost) failNextPost = false
    const wait = (request.method === 'POST' && delayPost) || (request.method === 'GET' && delayRead)
    if (request.method === 'GET' && delayRead) delayRead = false
    void (async () => {
      if (wait) await sleep(900)
      await send(fail ? 'Fetch.failRequest' : 'Fetch.continueRequest', fail ? { requestId, errorReason: 'ConnectionRefused' } : { requestId })
    })().catch((error) => exceptions.push(error.message))
  }
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result.value
}
async function until(expression, timeout = 30_000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await evaluate(expression)) return
    await sleep(150)
  }
  throw new Error(`Timed out: ${expression}; body=${await evaluate('document.body.innerText')}`)
}
function assert(name, condition) {
  if (!condition) throw new Error(`FAIL ${name}`)
  console.log(`PASS ${name}`)
}
async function navigate(path) { await send('Page.navigate', { url: frontend + path }) }
async function fill(selector, value) {
  await evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, ${JSON.stringify(value)}); element.dispatchEvent(new Event('input', { bubbles: true })); })()`)
}
async function click(selector) { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`) }
const contains = (text) => `document.body.innerText.includes(${JSON.stringify(text)})`

try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Fetch.enable', { patterns: [{ urlPattern: api + '/*' }] })
  await navigate('/events')
  await until('document.querySelectorAll(".event-card").length >= 8')
  const total = await evaluate('document.querySelectorAll(".event-card").length')
  await fill('#event-search', 'du lieu')
  await until('document.querySelectorAll(".event-card").length === 1')
  await evaluate(`(() => { const element=document.querySelector('#event-category'); element.value='Công nghệ'; element.dispatchEvent(new Event('change',{bubbles:true})); })()`)
  await evaluate(`(() => { const element=document.querySelector('#event-status'); element.value='full'; element.dispatchEvent(new Event('change',{bubbles:true})); })()`)
  await until(contains('Không tìm thấy sự kiện phù hợp'))
  await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.includes('Xóa bộ lọc')).click()`)
  await until(`document.querySelectorAll('.event-card').length === ${total}`)
  assert('search, combined filters and reset', true)

  const eventId = 'thiet-ke-de-dung'
  const before = await (await fetch(`${api}/events/${eventId}`)).json()
  delayRead = true
  await click(`a[href="/events/${eventId}"]`)
  await until(contains('Đang tải sự kiện'))
  await until(`Boolean(document.querySelector('a[href="/events/${eventId}/register"]'))`)
  assert('detail loading and navigation', true)
  await click(`a[href="/events/${eventId}/register"]`)
  await until('Boolean(document.querySelector("#fullName"))')
  await click('button[type="submit"]')
  await until(contains('Vui lòng nhập họ và tên.'))
  await fill('#fullName', '  Nguyễn API Test  ')
  await fill('#email', 'email-sai')
  await click('button[type="submit"]')
  await until(contains('Email chưa đúng định dạng.'))
  assert('required fields and invalid email', true)

  const email = `browser-${randomUUID()}@example.com`
  await fill('#email', email.toUpperCase())
  failNextPost = true
  await click('button[type="submit"]')
  await until(contains('Không thể kết nối máy chủ'))
  assert('API error retains input and does not fall back', (await evaluate('document.querySelector("#fullName").value')).includes('Nguyễn API Test') && await evaluate("localStorage.getItem('event-workshop:registrations:v1') === null"))
  delayPost = true
  await evaluate(`(() => { const button=document.querySelector('button[type="submit"]'); button.click(); button.click(); })()`)
  await until('Boolean(document.querySelector("button[type=submit]:disabled"))')
  assert('submit loading prevents repeated clicks', true)
  await until("location.pathname.startsWith('/registrations/') && document.body.innerText.includes('Đăng ký thành công')")
  delayPost = false
  const resultPath = await evaluate('location.pathname')
  await navigate(resultPath)
  await until(contains('Nguyễn API Test'))
  const after = await (await fetch(`${api}/events/${eventId}`)).json()
  assert('successful registration, result reload and exactly one seat', after.remainingSeats === before.remainingSeats - 1)
  assert('API result has no localStorage registration', await evaluate("localStorage.getItem('event-workshop:registrations:v1') === null"))
  const desktop = join(tmpdir(), 'fcaj-registration-result-desktop.png')
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
  await writeFile(desktop, Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))

  await navigate(`/events/${eventId}/register`)
  await until('Boolean(document.querySelector("#email"))')
  await fill('#fullName', 'Duplicate Test')
  await fill('#email', ` ${email} `)
  await click('button[type="submit"]')
  await until(contains('Email này đã đăng ký sự kiện.'))
  assert('duplicate email case normalization', true)
  for (const [id, label] of [['http-full', 'Sự kiện đã hết chỗ.'], ['http-ended', 'Sự kiện đã kết thúc.'], ['http-closed', 'Sự kiện đã đóng đăng ký.']]) {
    await navigate(`/events/${id}/register`)
    await until(contains(label))
    assert(`direct form blocked: ${id}`, true)
  }
  await navigate('/events/no-such-event')
  await until(contains('Không tìm thấy sự kiện'))
  await navigate(`/registrations/${randomUUID()}`)
  await until(contains('Không tìm thấy đăng ký'))
  assert('unknown event and registration IDs', true)
  failReads = true
  await navigate('/events')
  await until(contains('Không thể kết nối máy chủ'))
  assert('list API failure shows error without mock data', await evaluate('document.querySelectorAll(".event-card").length === 0'))
  failReads = false

  for (const width of [320, 375, 414, 768, 1280]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 850, deviceScaleFactor: 1, mobile: false })
    for (const path of ['/events', `/events/${eventId}/register`, resultPath]) {
      await navigate(path)
      await until(path === '/events' ? 'document.querySelectorAll(".event-card").length >= 8' : path.includes('/register') ? 'Boolean(document.querySelector("#fullName"))' : contains('Đăng ký thành công'))
      assert(`${path} width ${width}`, await evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'))
      if (width === 375 && path.includes('/register')) {
        await writeFile(join(tmpdir(), 'fcaj-registration-form-mobile.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
      }
    }
  }
  assert('no uncaught browser exceptions', exceptions.length === 0)
  console.log(JSON.stringify({ resultPath, desktopScreenshot: desktop, mobileScreenshot: join(tmpdir(), 'fcaj-registration-form-mobile.png') }))
} finally {
  await send('Fetch.disable').catch(() => {})
  ws.close()
}
