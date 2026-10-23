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
const requests = []
let currentLoaderId = ''
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
  else if (message.method === 'Network.requestWillBeSent') requests.push({ url: message.params.request.url, loaderId: message.params.loaderId })
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
async function navigate(path) { currentLoaderId = (await send('Page.navigate', { url: frontend + path })).loaderId }
function sessionRequests(prefix) { return requests.filter(request => request.loaderId === currentLoaderId && request.url.includes(prefix)) }
async function fill(selector, value) {
  await evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); const prototype = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`)
}
async function click(selector) { await until(`Boolean(document.querySelector(${JSON.stringify(selector)})) && !document.querySelector(${JSON.stringify(selector)}).disabled`); await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`) }
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

async function signIn(identifier, secret) {
  await navigate('/login')
  await until('Boolean(document.querySelector("#email"))')
  await fill('#email', identifier); await fill('#password', secret)
  await click('button[type="submit"]')
}
async function signOut() {
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
  await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Đăng xuất').click()`)
  await until("location.pathname === '/login' && Boolean(document.querySelector('#email'))")
}
async function apiCall(path, method, body, csrf) {
  return evaluate(`fetch('/api' + ${JSON.stringify(path)}, {method:${JSON.stringify(method)}, headers:{'Content-Type':'application/json', 'X-CSRF-Token':${JSON.stringify(csrf)}}, body:${JSON.stringify(JSON.stringify(body))}}).then(async r => ({status:r.status, body:await r.json()}))`)
}
async function shot(name) {
  await evaluate('Promise.allSettled([document.fonts.ready, ...document.getAnimations().map(animation => animation.finished)])')
  await writeFile(join(tmpdir(), name), Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'))
}

let second
let secondTarget
try {
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  await send('Page.bringToFront')
  for (const page of pages.filter(page => page.type === 'page').slice(1)) await send('Target.closeTarget', { targetId: page.id })
  await send('Network.clearBrowserCookies')
  await navigate('/')
  await until("location.pathname === '/login' && Boolean(document.querySelector('#email'))")
  assert('root opens unified login without area chooser', !await evaluate(contains('Chọn khu vực khác')))
  await layoutCheck('/login', 'Boolean(document.querySelector("#email"))')
  await signIn(username, password)
  await until("location.pathname === '/admin' && Boolean(document.querySelector('#admin-search'))")
  await layoutCheck('/admin', 'Boolean(document.querySelector("#admin-search")) && !document.body.innerText.includes("Đang tải sự kiện")')
  assert('admin sidebar contains management actions only', await evaluate("document.querySelector('aside').innerText.includes('Tạo sự kiện') && !document.querySelector('aside').innerText.includes('Vé của tôi')"))
  await shot('event-unified-admin-desktop.png')
  const adminSession = await evaluate("fetch('/api/auth/session').then(r => r.json())")
  const deletingTitle = 'Browser cascade test ' + randomUUID().slice(0,8)
  const fixture = {title:deletingTitle,category:'Công nghệ',dateTime:'2099-01-01T00:00:00Z',salesOpenAt:null,location:'Local',organizer:'Test',capacity:10,registrationOpen:true,summary:'Fixture',description:'Fixture'}
  const first = (await apiCall('/admin/events', 'POST', fixture, adminSession.csrfToken)).body
  const other = (await apiCall('/admin/events', 'POST', {...fixture,title:'Keep browser ticket'}, adminSession.csrfToken)).body
  await signOut()
  await navigate('/signup'); await until('Boolean(document.querySelector("#fullName"))')
  const email = `browser-role-${randomUUID()}@example.com`
  const buyerPassword = randomUUID() + '-local-only'
  for (const [selector,value] of [['#fullName','Người tham gia kiểm tra tên dài để đọc rõ trên điện thoại'],['#email',email],['#password',buyerPassword],['#confirmation',buyerPassword]]) await fill(selector,value)
  await click('button[type="submit"]'); await until(contains('Đã tạo tài khoản.'))
  await signIn(email,buyerPassword); await until("location.pathname === '/events' && Boolean(document.querySelector('nav'))")
  const buyerSession = await evaluate("fetch('/api/auth/session').then(r => r.json())")
  for (const event of [first,other]) {
    await navigate(`/events/${event.id}/register`); await until('Boolean(document.querySelector("#phone"))')
    await click('button[type="submit"]'); await until(contains('Đăng ký thành công'))
  }
  await layoutCheck('/my-tickets',contains('Mã vé:'))
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 700, deviceScaleFactor: 1, mobile: false })
  await click('button[aria-label="Mở menu"]'); await until('Boolean(document.querySelector("[role=dialog]"))')
  assert('mobile sidebar fits viewport', await evaluate("document.querySelector('[role=dialog]').getBoundingClientRect().right <= innerWidth"))
  await shot('event-unified-mobile-menu.png')
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})
  await until('!document.querySelector("[role=dialog]")')
  assert('Escape closes sidebar and restores focus', await evaluate("document.activeElement.getAttribute('aria-label') === 'Mở menu'"))
  await shot('event-unified-buyer-mobile.png')
  // Second real tab shares the same browser cookie and receives account changes.
  const target = await send('Target.createTarget',{url:frontend+'/my-tickets'})
  secondTarget = target.targetId
  const targets = await (await fetch(`http://127.0.0.1:${process.env.CHROME_DEBUG_PORT ?? 9241}/json`)).json()
  second = new WebSocket(targets.find(page => page.id === target.targetId).webSocketDebuggerUrl)
  await new Promise((resolve,reject) => {second.onopen=resolve;second.onerror=reject})
  let secondSequence=0
  const secondPending=new Map()
  second.onmessage=({data})=>{const message=JSON.parse(data);const pending=secondPending.get(message.id);if(pending){secondPending.delete(message.id);pending.resolve(message.result)}}
  const secondEval=(expression)=>new Promise((resolve,reject)=>{const id=++secondSequence;secondPending.set(id,{resolve,reject});second.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:true}}))})
  for(let count=0;count<300;count++){if((await secondEval("document.body.innerText.includes('Mã vé:')")).result.value)break;await new Promise(resolve=>setTimeout(resolve,100))}
  assert('second tab initially shows buyer tickets',(await secondEval("document.body.innerText.includes('Mã vé:')")).result.value)
  // Actual clicks happen in the foreground; background CSS exit animations can be suspended.
  await send('Page.bringToFront')
  await signOut()
  for(let count=0;count<300;count++){if((await secondEval("location.pathname === '/login'")).result.value)break;await new Promise(resolve=>setTimeout(resolve,100))}
  assert('logout clears the other tab',(await secondEval("location.pathname === '/login' && !document.body.innerText.includes('Mã vé:')")).result.value)
  await signIn(username,password);await until("location.pathname === '/admin' && Boolean(document.querySelector('#admin-search'))")
  for(let count=0;count<300;count++){if((await secondEval("location.pathname === '/admin'")).result.value)break;await new Promise(resolve=>setTimeout(resolve,100))}
  assert('other tab adopts admin identity instead of retaining buyer',(await secondEval("location.pathname === '/admin' && !document.querySelector('a[href=\"/my-tickets\"]')")).result.value)
  const forbidden = await apiCall(`/events/${other.id}/registrations`,'POST',{},buyerSession.csrfToken)
  assert('stale buyer context cannot book with admin cookie',forbidden.status===403)
  await fill('#admin-search',deletingTitle)
  await until("document.querySelectorAll('article').length === 1")
  await evaluate("Array.from(document.querySelectorAll('article button')).find(button=>button.textContent==='Xóa').click()")
  await until('Boolean(document.querySelector("[role=dialog]"))')
  assert('confirmation explains accounts remain',await evaluate(contains('Tài khoản và vé ở sự kiện khác vẫn giữ nguyên')))
  for(let count=0;count<30;count++){
    await evaluate("Array.from(document.querySelectorAll('[role=dialog] button')).find(button=>button.textContent==='Xác nhận xóa').click()")
    await until('!document.querySelector("[role=dialog]")')
    await until("!document.body.innerText.includes('Đang tải sự kiện')")
    const remaining=await evaluate(`Array.from(document.querySelectorAll('article')).some(article=>article.textContent.includes(${JSON.stringify(deletingTitle)}))`)
    if(!remaining)break
    await evaluate("Array.from(document.querySelectorAll('article button')).find(button=>button.textContent==='Tiếp tục xóa').click()")
    await until('Boolean(document.querySelector("[role=dialog]"))')
  }
  assert('occupied event is deleted',!await evaluate(`Array.from(document.querySelectorAll('article')).some(article=>article.textContent.includes(${JSON.stringify(deletingTitle)}))`))
  await signOut();await signIn(email,buyerPassword);await until("location.pathname === '/events'")
  await navigate('/my-tickets');await until(contains('Mã vé:'))
  const tickets=await evaluate("fetch('/api/me/registrations').then(r=>r.json())")
  assert('buyer account survives and only unrelated ticket remains',tickets.registrations.length===1&&tickets.registrations[0].eventId===other.id)
  assert('no uncaught browser exceptions',exceptions.length===0)
  console.log(JSON.stringify({unifiedBrowser:'passed',table:health.database.table,viewports:[320,375,414,768,1280],crossTab:true,cascade:true}))
} finally { second?.close(); if (secondTarget) await send('Target.closeTarget', {targetId:secondTarget}).catch(() => {}); ws.close() }
