// Credentials arrive over stdin, stay in memory, and only belong to a dedicated test table.
import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let input = ''
for await (const chunk of process.stdin) input += chunk
const { username, password, userId, email, duplicateEmail, eventId, expectedSeats } = JSON.parse(input)
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
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
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
async function click(selector) { await until(`Boolean(document.querySelector(${JSON.stringify(selector)})) && !document.querySelector(${JSON.stringify(selector)}).disabled`); await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`) }
const contains = (text) => `document.body.innerText.includes(${JSON.stringify(text)})`

async function signIn(identifier) {
  await navigate('/login')
  await until('Boolean(document.querySelector("#email")) && !document.querySelector("button[type=submit]").disabled')
  await fill('#email', identifier); await fill('#password', password)
  await click('button[type=submit]')
}
async function shot(name) {
  await evaluate('Promise.allSettled([document.fonts.ready, ...document.getAnimations().map(animation => animation.finished)])')
  await writeFile(join(tmpdir(), name), Buffer.from((await send('Page.captureScreenshot', {format:'png',captureBeyondViewport:false})).data,'base64'))
}
const row = `article[data-user-id="${userId}"]`
try {
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Page.bringToFront')
  for (const page of pages.filter(page => page.type === 'page').slice(1)) await send('Target.closeTarget',{targetId:page.id})
  await send('Network.clearBrowserCookies')
  await navigate('/login'); await until('Boolean(document.querySelector("#email"))')
  await evaluate("localStorage.removeItem('event-workshop:sidebar-collapsed')")
  await signIn(username); await until("location.pathname === '/admin' && Boolean(document.querySelector('#admin-search'))")
  await click('a[href="/admin/users"]')
  await until('Boolean(document.querySelector("#account-search")) && !document.body.innerText.includes("Đang tải tài khoản")')
  await fill('#account-search',email)
  await until(`document.querySelectorAll('article').length===1 && Boolean(document.querySelector(${JSON.stringify(row)}))`)
  assert('account row shows both name and email',await evaluate(`document.querySelector(${JSON.stringify(row)}).innerText.includes(${JSON.stringify(email)}) && document.querySelector(${JSON.stringify(row)}).querySelector('h2').textContent.length>0`))
  await fill('#account-search','nguoi tham gia kiem tra giao dien')
  await until(`Boolean(document.querySelector(${JSON.stringify(row)}))`)
  assert('name search ignores case and Vietnamese accents',await evaluate("Array.from(document.querySelectorAll('article h2')).every(name => name.textContent.includes('Người tham gia kiểm tra giao diện'))"))
  await fill('#account-search','no-such-'+randomUUID()); await until('document.querySelectorAll("article").length===0')
  assert('empty search has a clear message',await evaluate(contains('Không tìm thấy tài khoản phù hợp.')))
  await fill('#account-search',email)
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false})
  await click('button[aria-label="Thu gọn sidebar"]')
  assert('desktop sidebar collapses to icons',await evaluate('document.querySelector("aside").getBoundingClientRect().width===80'))
  assert('collapsed menu retains full button targets',await evaluate("Array.from(document.querySelectorAll('aside nav a')).every(link => { const rect=link.getBoundingClientRect(); return rect.width>=44 && rect.height>=44 && getComputedStyle(link).display==='flex' })"))
  await evaluate("Array.from(document.querySelectorAll('aside a')).find(link => link.getAttribute('href') === '/admin/users').focus()")
  await until('Boolean(document.querySelector("[role=tooltip]"))')
  assert('collapsed menu label is available on keyboard focus',await evaluate("document.querySelector('[role=tooltip]').textContent.includes('Quản lý tài khoản')"))
  await shot('event-accounts-collapsed-desktop.png')
  await navigate('/admin/users'); await until('Boolean(document.querySelector("#account-search")) && !document.body.innerText.includes("Đang tải tài khoản")')
  assert('sidebar preference survives reload',await evaluate('document.querySelector("aside").getBoundingClientRect().width===80'))
  await click('button[aria-label="Mở rộng sidebar"]')
  for(const width of [320,375,414,768,1280]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false})
    await fill('#account-search',email)
    assert(`accounts fit ${width}`,await evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
  }
  await shot('event-accounts-desktop.png')
  await evaluate(`Array.from(document.querySelectorAll(${JSON.stringify(row+' button')})).find(button=>button.textContent.includes('Chỉnh sửa')).click()`)
  await until('Boolean(document.querySelector("#account-name"))')
  await fill('#account-email',duplicateEmail)
  await click('[role=dialog] button[type=submit]')
  await until(contains('Email đã thuộc tài khoản khác.'))
  await evaluate(`(async () => {
    const account=(await (await fetch('/api/admin/users')).json()).users.find(user=>user.userId===${JSON.stringify(userId)});
    const session=await (await fetch('/api/auth/session')).json();
    const response=await fetch('/api/admin/users/'+account.userId,{method:'PUT',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrfToken},body:JSON.stringify({fullName:account.fullName,email:account.email,version:account.version})});
    if(!response.ok) throw new Error('Could not simulate concurrent profile edit');
  })()`)
  await click('[role=dialog] button[type=submit]')
  await until('!document.querySelector("[role=dialog]") && !document.body.innerText.includes("Đang tải tài khoản")')
  assert('stale editor reloads account and keeps conflict visible',await evaluate("document.querySelector('[role=alert]').textContent.includes('Tài khoản đã thay đổi')"))
  await evaluate(`Array.from(document.querySelectorAll(${JSON.stringify(row+' button')})).find(button=>button.textContent.includes('Chỉnh sửa')).click()`)
  await until('Boolean(document.querySelector("#account-name"))')
  const newEmail='browser-updated-'+randomUUID()+'@example.com'
  await fill('#account-name','Tên tài khoản đã được cập nhật')
  await fill('#account-email',newEmail)
  for(const width of [320,375,414,768,1280]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false})
    assert(`account editor fits ${width}`,await evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
  }
  await click('[role=dialog] button[type=submit]'); await until('!document.querySelector("[role=dialog]")')
  await fill('#account-search',newEmail); await until(`Boolean(document.querySelector(${JSON.stringify(row)}))`)
  assert('edited name and email appear in list',await evaluate(`document.querySelector(${JSON.stringify(row)}).innerText.includes('Tên tài khoản đã được cập nhật')`))
  await evaluate(`Array.from(document.querySelectorAll(${JSON.stringify(row+' button')})).find(button=>button.textContent==='Xóa').click()`)
  await until('Boolean(document.querySelector("[role=dialog]"))')
  assert('delete confirmation describes cancellation and seat refund',await evaluate(contains('Các vé sẽ bị hủy và chỗ được trả lại.')))
  await evaluate("Array.from(document.querySelectorAll('[role=dialog] button')).find(button=>button.textContent==='Giữ lại').click()")
  await until('!document.querySelector("[role=dialog]")')
  assert('cancel deletion retains account',await evaluate(`Boolean(document.querySelector(${JSON.stringify(row)}))`))
  await evaluate(`(() => { const original=window.fetch.bind(window);window.fetch=(url,options)=>{
    if(String(url).endsWith('/admin/users/${userId}') && options?.method==='DELETE'){
      window.fetch=original;
      return Promise.resolve(new Response(JSON.stringify({error:{code:'ACCOUNT_BUSY',message:'Lỗi thử nghiệm: hãy tiếp tục xóa.'}}),{status:503,headers:{'Content-Type':'application/json'}}));
    }return original(url,options);
  }})()`)
  await evaluate(`Array.from(document.querySelectorAll(${JSON.stringify(row+' button')})).find(button=>button.textContent==='Xóa').click()`)
  await click('[role=dialog] button[type=submit]')
  await until('!document.querySelector("[role=dialog]") && !document.body.innerText.includes("Đang tải tài khoản")')
  assert('failed deletion keeps its explanation visible after refresh',await evaluate("document.querySelector('[role=alert]').textContent.includes('Lỗi thử nghiệm')"))
  for(let attempt=0;attempt<40;attempt++){
    await evaluate(`Array.from(document.querySelectorAll(${JSON.stringify(row+' button')})).find(button=>button.textContent.includes('xóa')||button.textContent==='Xóa').click()`)
    await until('Boolean(document.querySelector("[role=dialog]"))')
    await click('[role=dialog] button[type=submit]'); await until('!document.querySelector("[role=dialog]")')
    await until('!document.body.innerText.includes("Đang tải tài khoản")')
    if(!await evaluate(`Boolean(document.querySelector(${JSON.stringify(row)}))`))break
  }
  assert('account disappears after cleanup completes',!await evaluate(`Boolean(document.querySelector(${JSON.stringify(row)}))`))
  const seats=await evaluate(`fetch('/api/events/${eventId}').then(r=>r.json()).then(event=>event.remainingSeats)`)
  assert('UI deletion returned exactly the owned seat',seats===expectedSeats)
  await click('button[aria-label="Đăng xuất"]');await until("location.pathname === '/login'")
  await signIn(duplicateEmail);await until("location.pathname === '/events' && Boolean(document.querySelector('nav'))")
  assert('User never sees account management navigation',!await evaluate("Array.from(document.querySelectorAll('a')).some(link => link.getAttribute('href') === '/admin/users')"))
  await click('button[aria-label="Thu gọn sidebar"]')
  assert('User sidebar can collapse too',await evaluate('document.querySelector("aside").getBoundingClientRect().width===80'))
  await send('Emulation.setDeviceMetricsOverride',{width:375,height:800,deviceScaleFactor:1,mobile:false})
  await click('button[aria-label="Mở menu"]');await until('Boolean(document.querySelector("[role=dialog]"))')
  assert('mobile drawer keeps full menu despite desktop collapse',await evaluate("document.querySelector('[role=dialog]').innerText.includes('Khám phá sự kiện')"))
  await shot('event-accounts-user-mobile-menu.png')
  assert('no uncaught browser exceptions',exceptions.length===0)
  console.log(JSON.stringify({accountBrowser:'passed',collapse:true,editing:true,deletionRefund:true,viewports:[320,375,414,768,1280]}))
} finally { ws.close() }
