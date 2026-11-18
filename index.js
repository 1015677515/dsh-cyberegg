/**
 * Host half: the WPS 灵犀 (lingxi) reader.
 *
 * Why this lives on the Host: 灵犀 authenticates with a `wps_sid` cookie that
 * lives in the desktop app's own SQLite cookie jar
 * (`%APPDATA%\WPS 灵犀\Cookies`), which no browser script can read. Everything
 * the browser half needs is served from one loopback route, and the cookie is
 * never returned to the page — only the numbers derived from it.
 *
 * Interface and field mapping are ported from dsh-checkin-all's lingxi
 * provider: GET /api/public/v1/tasks lists the daily task, POST
 * /api/public/v1/tasks/daily_check_in/claim claims it.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const LINGXI_HOST = 'https://lingxi.wps.cn'
const TASK_KEY = 'daily_check_in'
const ROUTE = '/plugins/dsh-cyberegg/lingxi'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

function dataDir() {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'dsh-cyberegg')
}
function sidFile() {
  return join(dataDir(), 'lingxi-sid.json')
}

/** A manually pasted wps_sid wins over the app's cookie jar. */
function readManualSid() {
  try {
    const raw = readFileSync(sidFile(), 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.sid === 'string' && parsed.sid.trim().length > 0) return parsed.sid.trim()
  } catch {
    /* no manual sid */
  }
  return ''
}
function writeManualSid(sid) {
  mkdirSync(dataDir(), { recursive: true })
  writeFileSync(sidFile(), JSON.stringify({ sid, at: Date.now() }, null, 2), 'utf8')
}

/** The desktop app's cookie jar, macOS first then Windows. */
function cookieDbPath() {
  const home = process.env.USERPROFILE || process.env.HOME || homedir()
  const candidates = [
    join(home, 'Library', 'Application Support', 'WPS 灵犀', 'Cookies'),
    join(home, 'AppData', 'Roaming', 'WPS 灵犀', 'Cookies'),
  ]
  for (const candidate of candidates) if (existsSync(candidate)) return candidate
  return ''
}

async function readCookieSid() {
  const path = cookieDbPath()
  if (path.length === 0) {
    return { error: 'NO_COOKIE_DB', message: '没找到 WPS 灵犀的 Cookies；灵犀装好并登录过，或手动填 wps_sid' }
  }
  let DatabaseSync
  try {
    ({ DatabaseSync } = await import('node:sqlite'))
  } catch (error) {
    return { error: 'NO_SQLITE', message: '本机 Node 没有 node:sqlite：' + String((error && error.message) || error) }
  }
  let db
  try {
    db = new DatabaseSync(path, { readOnly: true })
    const rows = db
      .prepare("SELECT host_key, name, value, length(encrypted_value) AS enc FROM cookies WHERE name = 'wps_sid'")
      .all()
    const plain = rows.filter((row) => row.value && String(row.value).length > 0)
    const pick =
      plain.find((row) => row.host_key === 'lingxi.wps.cn') ||
      plain.find((row) => String(row.host_key || '').endsWith('wps.cn')) ||
      plain[0]
    if (!pick) {
      return {
        error: rows.length > 0 ? 'ENCRYPTED_COOKIE' : 'NOT_LOGGED_IN',
        message:
          rows.length > 0
            ? 'wps_sid 是加密存的，读不出来；在灵犀里重新登录一次，或手动填 wps_sid'
            : '灵犀的 Cookies 里没有 wps_sid；先在灵犀里登录一次',
      }
    }
    return { sid: String(pick.value), source: 'cookie', host: pick.host_key }
  } catch (error) {
    return { error: 'COOKIE_READ_FAILED', message: String((error && error.message) || error) }
  } finally {
    try { db?.close() } catch { /* ignore */ }
  }
}

async function resolveSid() {
  const manual = readManualSid()
  if (manual.length > 0) return { sid: manual, source: 'manual' }
  return readCookieSid()
}

async function callLingxi(path, { method = 'GET', sid, body } = {}) {
  let response
  try {
    response = await fetch(LINGXI_HOST + path, {
      method,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'user-agent': USER_AGENT,
        cookie: 'wps_sid=' + sid,
      },
      ...(method === 'POST' ? { body: body === undefined ? '{}' : JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20000),
    })
  } catch (error) {
    return { ok: false, error: 'NETWORK', message: String((error && error.message) || error) }
  }
  const text = await response.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { /* non-JSON body */ }
  if (!response.ok || !json) {
    return { ok: false, error: 'HTTP ' + response.status, message: text.slice(0, 200) }
  }
  if (json.result && json.result !== 'ok') {
    return { ok: false, error: String(json.result), message: json.hint || json.msg || '' }
  }
  return { ok: true, json }
}

/** Ported field mapping: task extra carries the 7-day panel, `data` the total. */
function parseTasks(json) {
  const data = (json && json.data) || {}
  const tasks = Array.isArray(data.tasks) ? data.tasks : []
  const task = tasks.find((entry) => entry && entry.task_key === TASK_KEY) || null
  if (!task) return { error: 'NO_TASK', message: '灵犀的任务列表里没有每日签到' }
  const extra = task.extra || {}
  const days = (Array.isArray(extra.check_in_days) ? extra.check_in_days : []).map((day) => ({
    day: Number(day.day) || 0,
    date: day.date || '',
    reward: Number(day.reward) || 0,
    status: String(day.status || ''),
  }))
  const todayDay = Number(extra.today_day) || 0
  const today = days.find((entry) => entry.day === todayDay) || null
  const taskStatus = String(task.status || '').toLowerCase()
  const claimed = ['claimed', 'done', 'finished'].includes(taskStatus) || Boolean(today && today.status === 'claimed')
  const claimable = !claimed && (today
    ? today.status === 'available'
    : ['claimable', 'available', 'incomplete'].includes(taskStatus))
  return {
    credits: Number(data.total_claimed_credits) || 0,
    consecutiveDays: Number(extra.consecutive_days) || 0,
    todayDay,
    todayReward: Number(extra.today_reward) || (today ? today.reward : 0),
    claimed,
    claimable,
    days,
  }
}

async function readStatus() {
  const resolved = await resolveSid()
  if (!resolved.sid) {
    return {
      needSid: true,
      error: resolved.error || 'NO_SID',
      message: resolved.message || '缺少 wps_sid',
    }
  }
  const result = await callLingxi('/api/public/v1/tasks', { sid: resolved.sid })
  if (!result.ok) {
    return { needSid: false, error: result.error, message: result.message || '', source: resolved.source }
  }
  const panel = parseTasks(result.json)
  if (panel.error) return { needSid: false, error: panel.error, message: panel.message, source: resolved.source }
  return { needSid: false, source: resolved.source, ...panel }
}

async function claim() {
  const resolved = await resolveSid()
  if (!resolved.sid) {
    return { ok: false, needSid: true, error: resolved.error || 'NO_SID', message: resolved.message || '缺少 wps_sid' }
  }
  const before = await readStatus()
  if (before.needSid) return { ok: false, ...before }
  if (before.error) return { ok: false, error: before.error, message: before.message || '' }
  if (before.claimed || !before.claimable) {
    return { ok: true, claimed: before.claimed, alreadyClaimed: true, message: '今天已经签过了', ...before }
  }
  const result = await callLingxi('/api/public/v1/tasks/daily_check_in/claim', {
    method: 'POST',
    sid: resolved.sid,
  })
  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message || '签到失败' }
  }
  const after = await readStatus()
  return { ok: true, ...after, claimed: true, alreadyClaimed: false, message: '签到成功' }
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(payload)
}

const MAX_BODY_BYTES = 1024 * 1024

async function readBody(req) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > MAX_BODY_BYTES) throw new Error('body too large')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/**
 * Only the loopback page may talk to these routes.
 *
 * A browser tab on any site can reach 127.0.0.1 as well (DNS rebinding walks around
 * the same-origin policy), and one of these routes *writes* a file. Checking the
 * socket peer plus the Host header costs nothing for the real page — DSH serves it
 * on loopback — and keeps a random site from reading the balance snapshot or
 * overwriting the store.
 */
function localRequest(req) {
  const remote = String(req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : '')
  const peerOk = remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1'
  const host = String(req.headers.host || '').toLowerCase()
  const hostOk = host === '127.0.0.1' || host.startsWith('127.0.0.1:')
    || host === 'localhost' || host.startsWith('localhost:')
    || host === '[::1]' || host.startsWith('[::1]:')
  return peerOk && hostOk
}

async function handler(req, res) {
  if (!localRequest(req)) return sendJson(res, 403, { error: 'forbidden' })

  const url = new URL(req.url || '/', 'http://127.0.0.1')
  const action = url.searchParams.get('action') || 'status'
  try {
    if (action === 'status' && req.method === 'GET') return sendJson(res, 200, await readStatus())
    if (action === 'claim' && req.method === 'POST') return sendJson(res, 200, await claim())
    if (action === 'sid' && req.method === 'POST') {
      let body = {}
      try { body = JSON.parse((await readBody(req)) || '{}') } catch { body = {} }
      const sid = typeof body.sid === 'string' ? body.sid.trim() : ''
      if (sid.length === 0) {
        // Clearing it falls back to the app's cookie jar again.
        mkdirSync(dataDir(), { recursive: true })
        writeFileSync(sidFile(), JSON.stringify({ sid: '', at: Date.now() }, null, 2), 'utf8')
        return sendJson(res, 200, { ok: true, cleared: true })
      }
      writeManualSid(sid)
      return sendJson(res, 200, { ok: true, stored: true })
    }
    return sendJson(res, 405, { error: 'method-not-allowed' })
  } catch (error) {
    return sendJson(res, 500, { error: String((error && error.message) || error) })
  }
}

/* ── MobileClaw ────────────────────────────────────────────────────────────
 * Its token is AES-256-GCM sealed with a key derived from a `master.key` the
 * app lazily downloads, so nothing outside the app can call its API. What the
 * app does write in clear text is its own log: every welfare claim and the
 * remaining token balance. Reading that log is enough to answer "did today's
 * 100万 token land", with no credential involved.
 */
const MC_ROUTE = '/plugins/dsh-cyberegg/mobileclaw'

function mobileclawLogDir() {
  const local = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
  return join(local, 'com.cmss.mobileclaw-desktop', 'logs')
}

function latestMobileclawLog() {
  const dir = mobileclawLogDir()
  if (!existsSync(dir)) return null
  let names = []
  try {
    names = readdirSync(dir)
      .filter((name) => /^MobileClaw-\d{4}-\d{2}-\d{2}\.log$/.test(name))
      .sort()
  } catch {
    return null
  }
  if (names.length === 0) return null
  const name = names[names.length - 1]
  return { name, path: join(dir, name) }
}

function beijingToday() {
  return new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10)
}

function readMobileclawStatus() {
  const latest = latestMobileclawLog()
  if (!latest) {
    return { error: 'NO_LOG', message: '没找到 MobileClaw 日志；App 还没运行过' }
  }
  let text = ''
  try {
    text = readFileSync(latest.path, 'utf8')
  } catch (error) {
    return { error: 'READ_FAILED', message: String((error && error.message) || error) }
  }
  const lines = text.split(/\r?\n/)
  const claims = []
  let balance = null
  for (const line of lines) {
    if (line.includes('token-welfare/claim') && line.includes('activityCode')) {
      const at = /^\[([^\]]+)\]/.exec(line)
      const code = /"activityCode":"(\d+)"/.exec(line)
      const name = /"activityName":"([^"]+)"/.exec(line)
      const amount = /"receivedTokenAmount":(\d+)/.exec(line)
      if (code) {
        claims.push({
          at: at ? at[1] : '',
          code: code[1],
          name: name ? name[1] : '',
          amount: amount ? Number(amount[1]) : 0,
        })
      }
      continue
    }
    if (line.includes('credits/v2/exp-credit') && line.includes('remainTokens')) {
      const remain = /"remainTokens":(\d+)/.exec(line)
      const total = /"totalTokens":(\d+)/.exec(line)
      const expire = /"expireTime":"?([^",}]+)"?/.exec(line)
      balance = {
        remain: remain ? Number(remain[1]) : 0,
        total: total ? Number(total[1]) : 0,
        expireTime: expire ? expire[1] : '',
      }
    }
  }
  const today = beijingToday()
  const dailyToday = claims.filter((claim) => claim.code === '1003' && claim.at.startsWith(today))
  const lastDaily = claims.filter((claim) => claim.code === '1003').pop()
  return {
    logDate: latest.name.slice(11, 21),
    today,
    claimsToday: claims.filter((claim) => claim.at.startsWith(today)),
    dailyClaimedToday: dailyToday.length > 0,
    dailyAmount: dailyToday.reduce((sum, claim) => sum + claim.amount, 0)
      || (lastDaily ? lastDaily.amount : 0),
    balance,
  }
}

async function mobileclawHandler(req, res) {
  if (!localRequest(req)) return sendJson(res, 403, { error: 'forbidden' })

  if (req.method !== 'GET') return sendJson(res, 405, { error: 'method-not-allowed' })
  try {
    return sendJson(res, 200, readMobileclawStatus())
  } catch (error) {
    return sendJson(res, 500, { error: String((error && error.message) || error) })
  }
}

/* ── 面板底图 ──────────────────────────────────────────────────────────────
 * The mascot is the author's own artwork. It ships with the package so the
 * panel looks the same everywhere; the route serves it from the plugin
 * directory, and a missing file answers 404 — the panel then renders without
 * it and no other feature is affected.
 */
const MASCOT_ROUTE = '/plugins/dsh-cyberegg/mascot'
const PLUGIN_DIR = dirname(fileURLToPath(import.meta.url))
const MASCOT_FILE = join(PLUGIN_DIR, 'assets', 'cyberegg-mascot.webp')

function mascotHandler(req, res) {
  if (!localRequest(req)) return sendJson(res, 403, { error: 'forbidden' })
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' })
    return res.end('method not allowed')
  }
  if (!existsSync(MASCOT_FILE)) {
    res.writeHead(404, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    return res.end('{"error":"no-mascot"}')
  }
  let bytes
  try {
    bytes = readFileSync(MASCOT_FILE)
  } catch (error) {
    res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
    return res.end(JSON.stringify({ error: String((error && error.message) || error) }))
  }
  res.writeHead(200, {
    'content-type': 'image/webp',
    'content-length': bytes.length,
    'cache-control': 'public, max-age=86400',
  })
  return res.end(req.method === 'HEAD' ? undefined : bytes)
}

/**
 * Snapshot store — the one place a day-over-day baseline survives.
 *
 * The browser half used to keep credit history in `localStorage`, which is keyed
 * by origin. DSH picks a different loopback port on many starts (57424 → 59832 →
 * 65311 within one day, observed), so each restart looked like a fresh install
 * and the question "did today's grant actually land" lost its baseline — every
 * row fell back to 未确认. The Host half owns a file instead, and the page only
 * ever sees numbers.
 */
const STORE_ROUTE = '/plugins/dsh-cyberegg/store'
const STORE_FILE = 'store.json'

function storeFile() {
  return join(dataDir(), STORE_FILE)
}

function readStore() {
  try {
    const parsed = JSON.parse(readFileSync(storeFile(), 'utf8'))
    if (parsed && typeof parsed === 'object') return parsed
  } catch {
    /* missing or unreadable: an empty store is a valid starting point */
  }
  return { version: 1, history: {}, prefs: null, ledger: null }
}

function writeStore(doc) {
  try {
    mkdirSync(dataDir(), { recursive: true })
    // Write-then-rename: a crash mid-write leaves the previous file intact instead
    // of a truncated one that every later read would treat as "no store".
    const file = storeFile()
    const staging = `${file}.tmp`
    writeFileSync(staging, JSON.stringify(doc), 'utf8')
    renameSync(staging, file)
    return true
  } catch {
    return false
  }
}

/**
 * Writes are serialised on purpose.
 *
 * The page posts `history` and `raw` separately, and a "refresh all" fires that
 * for every visible platform. Each post is a read-modify-write cycle against one
 * file, so two overlapping cycles would both read the same document and the
 * later write would silently drop the earlier one.
 */
let storeWriteChain = Promise.resolve()

async function storeHandler(req, res) {
  if (!localRequest(req)) return sendJson(res, 403, { error: 'forbidden' })

  if (req.method === 'GET') {
    return sendJson(res, 200, readStore())
  }
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'method not allowed' })
  }
  let body
  try {
    body = JSON.parse(await readBody(req))
  } catch {
    return sendJson(res, 400, { error: 'bad json' })
  }
  const job = storeWriteChain.then(() => {
    const doc = readStore()
    // `history` / `prefs` / `ledger` are whole-value writes. `raw` is a per-platform
    // shallow merge instead: the page posts one platform's last upstream answer at
    // a time, and replacing the whole map would drop the other rows.
    for (const key of ['history', 'prefs', 'ledger']) {
      if (body && body[key] !== undefined) doc[key] = body[key]
    }
    if (body && body.raw && typeof body.raw === 'object' && !Array.isArray(body.raw)) {
      doc.raw = { ...(doc.raw && typeof doc.raw === 'object' ? doc.raw : {}), ...body.raw }
    }
    doc.version = 1
    doc.savedAt = Date.now()
    return writeStore(doc)
  })
  storeWriteChain = job.then(() => undefined, () => undefined)
  const written = await job
  if (written !== true) return sendJson(res, 500, { error: 'write failed' })
  return sendJson(res, 200, { ok: true })
}

export function apply(ctx) {
  ctx.inject(['webServer'], (host) => {
    const server = host.webServer || (host.get && host.get('webServer'))
    if (!server) return
    host.effect(() => {
      const offLingxi = server.register({ kind: 'exact', path: ROUTE, handler })
      const offMobileclaw = server.register({ kind: 'exact', path: MC_ROUTE, handler: mobileclawHandler })
      const offMascot = server.register({ kind: 'exact', path: MASCOT_ROUTE, handler: mascotHandler })
      const offStore = server.register({ kind: 'exact', path: STORE_ROUTE, handler: storeHandler })
      return () => {
        offLingxi()
        offMobileclaw()
        offMascot()
        offStore()
      }
    }, 'credit-dashboard: routes')
  })
}