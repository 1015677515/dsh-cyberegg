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
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

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

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

async function handler(req, res) {
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
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'method-not-allowed' })
  try {
    return sendJson(res, 200, readMobileclawStatus())
  } catch (error) {
    return sendJson(res, 500, { error: String((error && error.message) || error) })
  }
}

export function apply(ctx) {
  ctx.inject(['webServer'], (host) => {
    const server = host.webServer || (host.get && host.get('webServer'))
    if (!server) return
    host.effect(() => {
      const offLingxi = server.register({ kind: 'exact', path: ROUTE, handler })
      const offMobileclaw = server.register({ kind: 'exact', path: MC_ROUTE, handler: mobileclawHandler })
      return () => {
        offLingxi()
        offMobileclaw()
      }
    }, 'credit-dashboard: routes')
  })
}