// Buyer credentials are generated in memory and only used against a dedicated local test table.
import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const frontend = process.env.FRONTEND_TEST_URL ?? 'http://127.0.0.1:5173'
const api = process.env.API_TEST_URL ?? 'http://127.0.0.1:3001'
for (const value of [frontend, api]) {
  const url = new URL(value)
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Local tests only')
}
const health = await (await fetch(`${api}/health`)).json()
if (!health.database?.table?.startsWith('fcaj-event-workshop-local-test-')) throw new Error('Use a dedicated test table')
const pages = await (await fetch(`http://127.0.0.1:${process.env.CHROME_DEBUG_PORT ?? 9241}/json`)).json()
const ws = new WebSocket(pages.find((page) => page.type === 'page').webSocketDebuggerUrl)
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
let sequence = 0
const pending = new Map()
const exceptions = []
let responseFault = 'network'
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence
  pending.set(id, { resolve, reject })
  ws.send(JSON.stringify({ id, method, params }))
})
ws.onmessage = ({ data }) => {
  const message = JSON.parse(data)
  if (pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id)
    pending.delete(message.id)
    message.error ? reject(new Error(message.error.message)) : resolve(message.result)
  } else if (message.method === 'Fetch.requestPaused') {
    const fault = responseFault === 'gateway'
      ? send('Fetch.fulfillRequest', { requestId: message.params.requestId, responseCode: 502,
          responseHeaders: [{ name: 'Content-Type', value: 'text/plain' }], body: Buffer.from('Upstream response lost').toString('base64') })
      : send('Fetch.failRequest', { requestId: message.params.requestId, errorReason: 'ConnectionReset' })
    fault.catch(error => exceptions.push(error.message))
  } else if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text)
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result.value
}
async function until(expression) {
  const start = Date.now()
  while (Date.now() - start < 30000) {
    if (await evaluate(expression)) return
    await new Promise((resolve) => setTimeout(resolve, 120))
  }
  throw new Error(`Timeout: ${expression}; page: ${await evaluate('document.body.innerText')}`)
}
function assert(name, value) { if (!value) throw new Error(`FAIL ${name}`); console.log(`PASS ${name}`) }
async function navigate(path) { await send('Page.navigate', { url: frontend + path }) }
async function fill(selector, value) {
  await evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); const prototype = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`)
}
async function click(selector) { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`) }
const contains = (text) => `document.body.innerText.includes(${JSON.stringify(text)})`
async function layoutCheck(path, ready) {
  await navigate(path)
  await until(ready)
  for (const width of [320, 375, 414, 768, 1280]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false })
    assert(`${path} width ${width}`, await evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'))
    const wrapped = await evaluate(`Array.from(document.querySelectorAll('button,a')).filter(el => el.offsetHeight && el.textContent.trim()).some(el => { const tops=[]; const walker=document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let node; while ((node=walker.nextNode())) { if (!node.textContent.trim()) continue; const range=document.createRange(); range.selectNodeContents(node); tops.push(...Array.from(range.getClientRects()).filter(r => r.width > 2).map(r => Math.round(r.top))); } return new Set(tops).size > 1 })`)
    assert(`${path} actions fit ${width}`, !wrapped)
  }
}

try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Network.clearBrowserCookies')
  await layoutCheck('/signup', 'Boolean(document.querySelector("#confirmation"))')
  await layoutCheck('/login', 'Boolean(document.querySelector("#email"))')
  await navigate('/events/http-open/register')
  await until("location.pathname === '/login' && Boolean(document.querySelector('#email'))")
  assert('guest booking asks for login', true)
  await click('a[href^="/signup?"]')
  await until('Boolean(document.querySelector("#confirmation"))')
  const email = `browser-${randomUUID()}@example.com`
  const password = randomUUID() + '-only-local'
  for (const [selector, value] of [['#fullName', 'Người mua thử'], ['#email', email], ['#password', password], ['#confirmation', 'different-password']]) await fill(selector, value)
  await click('button[type="submit"]')
  await until(contains('Hai mật khẩu chưa giống nhau.'))
  await fill('#confirmation', password)
  await click('button[type="submit"]')
  await until("location.pathname === '/login' && document.body.innerText.includes('Đã tạo tài khoản.')")
  assert('signup does not auto-login and retains return path', await evaluate("location.search.includes('returnTo=')"))
  await fill('#email', email)
  await fill('#password', password)
  await click('button[type="submit"]')
  await until("location.pathname === '/events/http-open/register' && Boolean(document.querySelector('#phone'))")
  assert('booking identity comes from session', await evaluate(`!document.querySelector('#fullName') && document.body.innerText.includes(${JSON.stringify(email)})`))
  await layoutCheck('/events/http-open/register', 'Boolean(document.querySelector("#phone"))')
  await fill('#phone', '0901234567')
  // Drop the response only after the server has handled it. Reload, then retry the saved intent.
  await send('Fetch.enable', { patterns: [{ urlPattern: '*/api/events/*/registrations', requestStage: 'Response' }] })
  await click('button[type="submit"]')
  await until(contains('Lần gửi trước chưa rõ kết quả.'))
  await send('Fetch.disable')
  await navigate('/events/http-open/register')
  await until(contains('Lần gửi trước chưa rõ kết quả.'))
  assert('pending intent survives reload and locks body', await evaluate('document.querySelector("#phone").disabled && sessionStorage.length === 1'))
  await click('button[type="submit"]')
  await until("location.pathname.startsWith('/registrations/') && document.body.innerText.includes('Đăng ký thành công')")
  const resultPath = await evaluate('location.pathname')
  assert('recovered ticket clears pending intent', await evaluate("sessionStorage.length === 0 && !document.cookie.includes('event_user_session') && localStorage.length === 0"))
  await layoutCheck(resultPath, contains('Đăng ký thành công'))
  await layoutCheck('/my-tickets', contains('Mã vé:'))
  const tickets = await evaluate("fetch('/api/me/registrations').then(r => r.json())")
  assert('lost response and retry create exactly one owned ticket', tickets.registrations.length === 1 && resultPath.endsWith(tickets.registrations[0].id))
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 900, deviceScaleFactor: 1, mobile: false })
  await writeFile(join(tmpdir(), 'event-buyer-tickets-mobile.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'))
  await navigate('/events/http-other/register')
  await until('Boolean(document.querySelector("#phone"))')
  responseFault = 'gateway'
  await send('Fetch.enable', { patterns: [{ urlPattern: '*/api/events/*/registrations', requestStage: 'Response' }] })
  await click('button[type="submit"]')
  await until(contains('Lần gửi trước chưa rõ kết quả.'))
  await send('Fetch.disable')
  await click('button[type="submit"]')
  await until("location.pathname.startsWith('/registrations/') && document.body.innerText.includes('Đăng ký thành công')")
  const afterGateway = await evaluate("fetch('/api/me/registrations').then(r => r.json())")
  assert('non-JSON gateway error also preserves intent and recovers one ticket', afterGateway.registrations.length === 2
    && afterGateway.registrations.filter(ticket => ticket.eventId === 'http-other').length === 1)
  await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Đăng xuất').click()")
  await until("location.pathname === '/events' && Boolean(document.querySelector('a[href=\"/login\"]'))")
  await navigate(resultPath)
  await until("location.pathname === '/login' && Boolean(document.querySelector('#email'))")
  assert('logout protects saved result URL', true)
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
  await writeFile(join(tmpdir(), 'event-buyer-login-desktop.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'))
  assert('no uncaught browser exceptions', exceptions.length === 0)
  console.log(JSON.stringify({ buyerBrowser: 'passed', table: health.database.table,
    viewports: [320, 375, 414, 768, 1280], lostResponseRecovery: true, gatewayErrorRecovery: true,
    screenshots: [join(tmpdir(), 'event-buyer-tickets-mobile.png'), join(tmpdir(), 'event-buyer-login-desktop.png')] }))
} finally { ws.close() }
