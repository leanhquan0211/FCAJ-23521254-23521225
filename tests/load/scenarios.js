import http from 'k6/http';
import { sleep } from 'k6';
import execution from 'k6/execution';
import { Counter, Trend } from 'k6/metrics';

// Runner supplies this constant on stdin; secrets never enter command-line arguments or files.
const C = typeof LAB_INPUT === 'undefined' ? { config: { scenario: 'ramp', mode: 'public', users: 1, rampUp: 1, hold: 1, rampDown: 1, timeout: 3, maxRequests: 3, intervalMs: 500, maxRetries: 0 }, eventIds: [], baseUrl: 'http://127.0.0.1:3002', sessions: [] } : LAB_INPUT;
const P = C.profile || { paths: { events: '/events', event: '/events/{eventId}', purchase: '/events/{eventId}/registrations' }, csrfHeader: 'X-CSRF-Token', idempotencyHeader: 'Idempotency-Key', replayHeader: 'Idempotent-Replayed' };
const cfg = C.config;
const latency = new Trend('lab_latency', true);
const retries = new Counter('lab_retries');
const receipts = new Counter('lab_receipts');
const isRamp = cfg.scenario === 'ramp';
export const options = {
  systemTags: ['status', 'method', 'name', 'scenario', 'expected_response'],
  noCookiesReset: true,
  maxRedirects: 0,
  scenarios: { load: isRamp ? {
    executor: 'ramping-vus', startVUs: 0,
    stages: [{ duration: `${cfg.rampUp}s`, target: cfg.users }, { duration: `${cfg.hold}s`, target: cfg.users }, { duration: `${cfg.rampDown}s`, target: 0 }],
    gracefulRampDown: `${cfg.timeout * (1 + cfg.maxRetries) + 2}s`, gracefulStop: `${cfg.timeout + 2}s`,
  } : { executor: 'per-vu-iterations', vus: cfg.users, iterations: 1, maxDuration: `${cfg.timeout * (2 + cfg.maxRetries) + 90}s`, gracefulStop: '1s' } },
};
let attempted = false;

function classify(response, purchase) {
  if (!response.status) return response.error_code === 1050 || /timeout|timed out|deadline/i.test(response.error || '') ? 'timeout' : 'other';
  if (!purchase) return response.status === 200 ? 'readOk' : response.status >= 500 ? 'server' : 'other';
  let body;
  try { body = response.json(); } catch (_) { return 'other'; }
  const replay = response.headers[P.replayHeader] || response.headers['Idempotent-Replayed'];
  if (response.status === 201 && body?.id && String(replay).toLowerCase() === 'false') {
    receipts.add(1, { registrationId: body.id }); return 'new';
  }
  if (response.status === 200 && body?.id && String(replay).toLowerCase() === 'true') {
    receipts.add(1, { registrationId: body.id }); return 'replay';
  }
  const code = body?.error?.code;
  const expected = { EVENT_FULL: 'full', DUPLICATE_REGISTRATION: 'duplicate', SALES_NOT_OPEN: 'notOpen', REGISTRATION_CLOSED: 'closed' };
  if (response.status === 409 && expected[code]) return expected[code];
  if (response.status === 503 && code === 'REGISTRATION_BUSY') return 'busy';
  if (response.status === 429) return 'rateLimited';
  if (response.status === 401 || response.status === 403) return 'auth';
  return response.status >= 500 ? 'server' : 'other';
}

function request(method, path, body, headers, kind, name) {
  const response = http.request(method, C.baseUrl + path, body, {
    headers: { Origin: C.origin, ...headers }, timeout: `${cfg.timeout}s`,
    tags: { name }, responseType: 'text', redirects: 0,
  });
  const outcome = classify(response, kind === 'purchase');
  latency.add(response.timings.duration, { kind, outcome });
  return outcome;
}

export default function () {
  if (cfg.mode === 'public') {
    const iteration = execution.scenario.iterationInTest;
    if (iteration >= cfg.maxRequests) { sleep(.2); return; }
    const id = C.eventIds.length ? C.eventIds[iteration % C.eventIds.length] : null;
    const detail = id && iteration % 2;
    request('GET', detail ? P.paths.event.replace('{eventId}', id) : P.paths.events, null, {}, 'read', detail ? 'event_detail' : 'event_list');
    sleep(cfg.intervalMs / 1000);
    return;
  }
  if (attempted) { sleep(.2); return; }
  attempted = true;
  const account = C.sessions[__VU - 1];
  if (!account) throw new Error('Missing isolated VU session');
  http.cookieJar().set(C.baseUrl, account.cookie.name, account.cookie.value, { path: '/' });
  request('GET', P.paths.event.replace('{eventId}', C.eventId), null, {}, 'read', 'event_view');
  const wait = C.startAt - Date.now() / 1000;
  if (wait > 0) sleep(wait);
  const headers = { 'Content-Type': 'application/json', [P.csrfHeader]: account.csrfToken, [P.idempotencyHeader]: account.idempotencyKey };
  let outcome = request('POST', P.paths.purchase.replace('{eventId}', C.eventId), '{}', headers, 'purchase', 'purchase');
  for (let retry = 0; retry < cfg.maxRetries && ['timeout', 'busy', 'server'].includes(outcome); retry++) {
    retries.add(1); sleep(.1 * (retry + 1));
    outcome = request('POST', P.paths.purchase.replace('{eventId}', C.eventId), '{}', headers, 'purchase', 'purchase_retry');
  }
}
