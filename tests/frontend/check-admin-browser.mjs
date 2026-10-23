// Credentials arrive over stdin, stay in memory, and only belong to a dedicated test table.
import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let input = ''
for await (const chunk of process.stdin) input += chunk
const { username, password } = JSON.parse(input)
input = ''
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
  await layoutCheck('/', contains('Bạn muốn tham gia như thế nào?'))
  await click('a[href="/events"]')
  await until('document.querySelectorAll(".event-card").length >= 8')
  await fill('#event-search', 'du lieu')
  await until('document.querySelectorAll(".event-card").length === 1')
  assert('guest browsing and accent-insensitive search', true)
  await navigate('/admin/events/new')
  await until("location.pathname === '/admin/login' && Boolean(document.querySelector('#username'))")
  await layoutCheck('/admin/login', 'Boolean(document.querySelector("#username"))')
  await until('Boolean(document.querySelector("button[type=submit]")) && !document.querySelector("button[type=submit]").disabled')
  await fill('#username', username)
  await fill('#password', 'incorrect-password')
  await click('button[type="submit"]')
  await until(contains('Tên đăng nhập hoặc mật khẩu không đúng.'))
  await fill('#password', password)
  await click('button[type="submit"]')
  await until("location.pathname === '/admin' && Boolean(document.querySelector('#admin-search'))")
  assert('login, protected route and opaque session', await evaluate("!document.cookie.includes('event_admin_session') && localStorage.length === 0 && sessionStorage.length === 0"))
  await navigate('/admin')
  await until('Boolean(document.querySelector("#admin-search"))')
  assert('session survives reload', true)
  await click('a[href="/admin/events/new"]')
  await until('Boolean(document.querySelector("#title"))')
  const title = `Sự kiện do admin tạo ${randomUUID().slice(0, 6)}`
  for (const [selector, value] of [['#title', title], ['#dateTime', '2099-06-01T09:00'], ['#location', 'Trực tuyến'], ['#organizer', 'Nhóm kiểm thử'], ['#capacity', '5'], ['#summary', 'Buổi thực hành'], ['#description', '<script>window.__adminXss = true</script>']]) await fill(selector, value)
  await click('button[type="submit"]')
  await until("location.pathname === '/admin' && document.body.innerText.includes(" + JSON.stringify(title) + ')')
  const created = await evaluate(`fetch('/api/admin/events').then(r => r.json()).then(body => body.events.find(item => item.title === ${JSON.stringify(title)}))`)
  assert('admin create goes through real API', !!created?.id)
  await fill('#admin-search', title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd'))
  await until('document.querySelectorAll("article").length === 1')
  await click(`a[href="/admin/events/${created.id}/edit"]`)
  await until('Boolean(document.querySelector("#capacity"))')
  await fill('#capacity', '7')
  await click('button[type="submit"]')
  await until("location.pathname === '/admin' && Boolean(document.querySelector('#admin-search'))")
  await layoutCheck('/admin', 'Boolean(document.querySelector("#admin-search"))')
  await layoutCheck(`/admin/events/${created.id}/edit`, 'Boolean(document.querySelector("#title"))')
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 900, deviceScaleFactor: 1, mobile: false })
  await writeFile(join(tmpdir(), 'event-admin-editor-mobile.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'))
  await navigate(`/events/${created.id}`)
  await until(contains(title))
  assert('event content renders as text, no script execution', await evaluate("!window.__adminXss && document.body.innerText.includes('<script>')"))
  await click(`a[href="/events/${created.id}/register"]`)
  await until("location.pathname === '/login' && Boolean(document.querySelector('#email'))")
  // Buyer signup UI is covered separately; here obtain a real buyer session to test admin seat guards.
  const buyerEmail = `browser-admin-${randomUUID()}@example.com`
  const buyerPassword = randomUUID() + '-test'
  await evaluate(`(async () => {
    const credentials = { email: ${JSON.stringify(buyerEmail)}, password: ${JSON.stringify(buyerPassword)} };
    const signup = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: 'Browser Buyer', ...credentials }) });
    if (signup.status !== 201) throw new Error('Buyer signup failed');
    const login = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) });
    if (!login.ok) throw new Error('Buyer login failed');
  })()`)
  await navigate(`/events/${created.id}/register`)
  await until('Boolean(document.querySelector("#phone"))')
  await click('button[type="submit"]')
  await until("location.pathname.startsWith('/registrations/') && document.body.innerText.includes('Đăng ký thành công')")
  await navigate(`/admin/events/${created.id}/edit`)
  await until('Boolean(document.querySelector("#capacity"))')
  await fill('#capacity', '0')
  await click('button[type="submit"]')
  await until(contains('Cần ít nhất 1 chỗ đã dùng.'))
  await fill('#capacity', '7')
  await click('#registrationOpen')
  await click('button[type="submit"]')
  await until("location.pathname === '/admin' && Boolean(document.querySelector('#admin-search'))")
  await fill('#admin-search', title)
  await until('document.querySelectorAll("article").length === 1')
  assert('delete disabled for registered event', await evaluate("Array.from(document.querySelectorAll('article button')).find(button => button.textContent === 'Xóa').disabled"))
  await navigate(`/events/${created.id}/register`)
  await until(contains('Sự kiện đã đóng đăng ký.'))
  await navigate('/admin')
  await until('Boolean(document.querySelector("#admin-search"))')
  await evaluate("Array.from(document.querySelectorAll('main button')).find(button => button.textContent === 'Đăng xuất').click()")
  await until("location.pathname === '/' && document.body.innerText.includes('Bạn muốn tham gia như thế nào?')")
  await navigate('/admin')
  await until("location.pathname === '/admin/login' && Boolean(document.querySelector('#username'))")
  assert('logout revokes protected route access', true)
  assert('no uncaught browser exceptions', exceptions.length === 0)
  console.log(JSON.stringify({ browserChecks: 'passed', screenshot: join(tmpdir(), 'event-admin-editor-mobile.png') }))
} finally { ws.close() }
