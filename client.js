/**
 * Credit dashboard — browser half.
 *
 * Reads every freebie platform through the plugin that already owns it, so the
 * number shown here is the same number that plugin's own card shows:
 *
 *   channel-pack (dsh-our-free-model)  POST /api/channel-pack   (JSON-RPC)
 *   workbuddy                          GET  /plugins/dsh-connect-workbuddy/account-credits
 *   trae                               GET  /plugins/dsh-connect-trae/account-credits
 *   codearts                           GET  /api/codearts/status
 *
 * No credential is read here, no login surface is introduced, and nothing is
 * persisted except display preferences (order / collapse / interval).
 */
window.__ModuleLoader__.load({
  id: 'dsh-cyberegg',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useRef, useCallback, useMemo } = React

    const PANEL_ID = 'dsh-cyberegg'
    const STORE_KEY = 'dsh-cyberegg/v1'
    const LEGACY_STORE_KEY = 'dsh-credit-dashboard/v1'
    const HOUR = 3600000

    // Copy ships inline because the loader factory can only require the browser
    // module table; locale/*.json stays as the declared resource for the bundle
    // page. Both are the same strings.
    const ZH = {
      tabLabel: '积分',
      title: '积分与签到',
      subtitle: '本机所有可白嫖平台的剩余积分与每日签到',
      refreshAll: '全部刷新',
      refreshOne: '刷新',
      refreshing: '刷新中…',
      claim: '签到',
      claiming: '领取中…',
      collapse: '折叠',
      expand: '展开',
      interval: '刷新间隔',
      manual: '手动',
      lastUpdated: '上次更新',
      expiry: '最近过期',
      neverUpdated: '尚未读取',
      noAccount: '没有账号',
      creditUnit: '积分',
      accountsUnit: '个账号',
      totalCredit: '剩余合计',
      checkedIn: '已签到',
      notCheckedIn: '未签到',
      pendingRefresh: '待刷新',
      actionRequired: '需客户端开通',
      alreadyClaimed: '今天已领',
      noIncrease: '签到未生效',
      history: '近两天',
      currentOnly: '只有插件里「当前使用」的账号能签到',
      autoTag: '自动',
      openWeb: '去网页签到',
      autoDaily: '每日自动发放 · 当日 24:00 过期',
      autoGranted: '今日已发放',
      autoPending: '今日未发放',
      autoAppLaunch: '每日自动发放 · 需每天启动 App',
      expiresToday: '（当日过期）',
      streak: '连续',
      dayUnit: '天',
      needLogin: '需登录',
      newsLabel: '赛博鸡蛋资讯',
      newsNote: '不为真实性负责，请谨慎辨别',
      expiryTitle: '到期预警',
      expiryNone: '无',
      expiry3: '3 天内',
      expiryNearest: '最近到期（不在 3 天内，仅供参考）',
      nearestExpiryOnly: '价格明细需切账号',
      expiryShow: '展开明细',
      expiryHide: '收起',
      expiringCycle: '周期末总共作废',
      detail: '积分详情',
      detailHint: '打开官网积分明细页',
      linkFreeegg: 'freeegg.top',
      linkPencil: 'pencilai',
      linkYangmao: 'yangmao.ai',
      hide: '隐藏这个平台',
      hideShort: '隐藏',
      hiddenLabel: '已隐藏：',
      showAgain: '点一下恢复显示',
      freeegg: 'freeegg.top',
      claimed: '领取成功',
      claimFailed: '领取失败',
      noCheckinApi: '无签到接口',
      onceOnly: '一次性奖励',
      readFailed: '读取失败',
      unknown: '—',
      back: '返回对话',
      orderHint: '拖动可排序',
    }
    const EN = {
      tabLabel: 'Credits',
      title: 'Credits & check-in',
      subtitle: 'Remaining credits and daily check-in for every freebie platform on this machine',
      refreshAll: 'Refresh all',
      refreshOne: 'Refresh',
      refreshing: 'Refreshing…',
      claim: 'Check in',
      claiming: 'Claiming…',
      collapse: 'Collapse',
      expand: 'Expand',
      interval: 'Refresh interval',
      manual: 'Manual',
      lastUpdated: 'Updated',
      expiry: 'Expires',
      neverUpdated: 'Not read yet',
      noAccount: 'No account',
      creditUnit: 'credits',
      accountsUnit: 'accounts',
      totalCredit: 'Total remaining',
      checkedIn: 'Checked in',
      notCheckedIn: 'Not yet',
      pendingRefresh: 'Pending refresh',
      actionRequired: 'Needs app activation',
      alreadyClaimed: 'Already claimed',
      noIncrease: 'No credit increase',
      history: 'Recent',
      currentOnly: 'Only the account marked "in use" can check in here',
      autoTag: 'auto',
      openWeb: 'Open web page',
      autoDaily: 'Granted daily · expires 24:00 today',
      autoGranted: 'Granted today',
      autoPending: 'Not granted yet',
      autoAppLaunch: 'Granted daily · needs the app launched each day',
      expiresToday: ' (expires today)',
      streak: 'streak',
      dayUnit: 'd',
      needLogin: 'Needs login',
      newsLabel: 'Cyber Egg info',
      newsNote: 'Not verified — check before you trust it',
      expiryTitle: 'Expiring soon',
      expiryNone: 'none',
      expiry3: 'in 3d',
      expiryNearest: 'Nearest expiry (outside 3 days, reference only)',
      nearestExpiryOnly: 'per-pack detail needs account switch',
      expiryShow: 'Show detail',
      expiryHide: 'Hide',
      expiringCycle: 'written off at cycle end',
      detail: 'Detail',
      detailHint: 'Open the official credit detail page',
      linkFreeegg: 'freeegg.top',
      linkPencil: 'pencilai',
      linkYangmao: 'yangmao.ai',
      hide: 'Hide this platform',
      hideShort: 'hide',
      hiddenLabel: 'Hidden:',
      showAgain: 'Click to show again',
      freeegg: 'freeegg.top',
      claimed: 'Claimed',
      claimFailed: 'Claim failed',
      noCheckinApi: 'No check-in API',
      onceOnly: 'One-time reward',
      readFailed: 'Read failed',
      unknown: '—',
      back: 'Back to chat',
      orderHint: 'Drag to reorder',
    }

    /** Platforms in default display order (most productive freebies first). */
    const PLATFORM_SEED = [
      { id: 'loomy', label: 'Loomy', provider: 'loomy', kind: 'pack', dailyQuota: 5000 },
      { id: 'minimax', label: 'MiniMax Code', provider: 'minimax', kind: 'pack' },
      { id: 'lingxi', label: 'WPS 灵犀', kind: 'lingxi' },
      { id: 'workbuddy', label: 'WorkBuddy', kind: 'http' },
      { id: 'trae', label: 'Trae (CN)', provider: 'trae', kind: 'pack' },
      { id: 'qoder', label: 'Qoder 国际', provider: 'qoder', kind: 'pack', refreshHourUtc8: 10 },
      { id: 'codearts', label: 'CodeArts (华为云)', kind: 'http', detailUrl: 'https://codearts.huaweicloud.com/portal/settings/personal-usage?locale=zh-cn' },
      { id: 'mobileclaw', label: 'MobileClaw', kind: 'mobileclaw', claim: 'auto', autoNote: 'autoAppLaunch' },
      { id: 'qodercn', label: 'Qoder 中国', provider: 'qodercn', kind: 'pack', refreshHourUtc8: 10 },
      { id: 'raccoon', label: 'Raccoon (商汤)', provider: 'raccoon', kind: 'pack', claim: 'link', link: 'https://xiaohuanxiong.com/work/home' },
    ]

    const INTERVALS = [
      { ms: 15 * 60000, label: '15m' },
      { ms: 30 * 60000, label: '30m' },
      { ms: HOUR, label: '1h' },
      { ms: 2 * HOUR, label: '2h' },
      { ms: 4 * HOUR, label: '4h' },
      { ms: 6 * HOUR, label: '6h' },
      { ms: 0, label: 'manual' },
    ]
    const DEFAULT_INTERVAL = 2 * HOUR

    // ── preferences ───────────────────────────────────────────────────────
    function loadPrefs() {
      const empty = { order: PLATFORM_SEED.map((p) => p.id), collapsed: {}, intervals: {}, hidden: {} }
      try {
        const raw = window.localStorage.getItem(STORE_KEY) || window.localStorage.getItem(LEGACY_STORE_KEY)
        if (!raw) return empty
        const parsed = JSON.parse(raw)
        return {
          order: Array.isArray(parsed.order) ? parsed.order : PLATFORM_SEED.map((p) => p.id),
          collapsed: parsed.collapsed && typeof parsed.collapsed === 'object' ? parsed.collapsed : {},
          intervals: parsed.intervals && typeof parsed.intervals === 'object' ? parsed.intervals : {},
          // Hidden platforms still keep their slot in `order`, so unhiding puts
          // them back where they were instead of at the end of the list.
          hidden: parsed.hidden && typeof parsed.hidden === 'object' ? parsed.hidden : {},
        }
      } catch {
        return empty
      }
    }
    function savePrefs(prefs) {
      try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify(prefs))
      } catch {
        /* storage is optional; the dashboard still works without it */
      }
    }

    /**
     * Today's check-in ledger.
     *
     * `credits.claimAll` answers with per-account outcomes, but nothing writes
     * today's success into `auto-checkin.json` (that file belongs to the
     * automatic run), and `credits.status` only exists for MiniMax. So a claim
     * made from this panel would leave the row saying "not checked in" while
     * the upstream account was already credited. The ledger is that missing
     * evidence: date-scoped, per account, cleared when the day rolls over.
     */
    const LEDGER_KEY = 'dsh-credit-dashboard/ledger/v2'
    function loadLedger() {
      try {
        const raw = window.localStorage.getItem(LEDGER_KEY)
        if (!raw) return { date: '', rows: {} }
        const parsed = JSON.parse(raw)
        if (!parsed || parsed.date !== todayKey()) return { date: '', rows: {} }
        return { date: parsed.date, rows: parsed.rows && typeof parsed.rows === 'object' ? parsed.rows : {} }
      } catch {
        return { date: '', rows: {} }
      }
    }
    function saveLedger(ledger) {
      try {
        window.localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger))
      } catch {
        /* storage is optional */
      }
    }
    function describeClaim(payload) {
      if (!payload || typeof payload !== 'object') return 'claimed'
      if (payload.alreadyCheckedIn === true) return 'already-claimed'
      if (payload.claimed === true) return 'claimed'
      if (payload.claimedToday === true || payload.already === true) return 'already-claimed'
      if (typeof payload.error === 'string' && payload.error.length > 0) return payload.error
      if (typeof payload.message === 'string' && payload.message.length > 0) return payload.message
      return 'claimed'
    }

    /**
     * Two-day credit history per platform.
     *
     * Every successful read records today's total; the panel shows the last two
     * days side by side with the day-over-day delta, which is the only way to
     * check afterwards whether a check-in really landed.
     */
    const HISTORY_KEY = 'dsh-credit-dashboard/history/v1'
    function loadHistory() {
      try {
        const raw = window.localStorage.getItem(HISTORY_KEY)
        if (!raw) return {}
        const parsed = JSON.parse(raw)
        return parsed && typeof parsed === 'object' ? parsed : {}
      } catch {
        return {}
      }
    }
    function saveHistory(history) {
      try {
        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
      } catch {
        /* storage is optional */
      }
    }

    /** The ledger row for one account, only when it belongs to today. */
    function ledgerEntryOf(ledger, platformId, accountId) {
      if (!ledger || ledger.date !== todayKey()) return undefined
      const rows = ledger.rows || {}
      return rows[platformId + '|' + accountId]
    }

    /** Provider-level check-in verdict taken from today's auto-check-in sentence. */
    function providerCheckOf(seed, auto) {
      if (!seed || !seed.provider) return null
      const today = todayKey()
      const channelState = auto && auto.lastDate === today
        ? ((auto.channels || []).find((entry) => entry.provider === seed.provider) || null)
        : null
      if (channelState) {
        const parsed = parseChannelText(channelState.text)
        return parsed ? (parsed.applicable ? parsed.checked : null) : null
      }
      return auto ? false : null
    }

    /**
     * One account's "done today" verdict — the single source both the row badge
     * and the header counters read, so they can never disagree.
     *
     * Any source that positively confirms today wins; none of them may veto
     * another. A measured increase OR an upstream "changed today" is enough —
     * the ledger only adds evidence that the weaker providers cannot show.
     */
    function isRowDone(row, seed, auto, ledger) {
      const local = ledgerEntryOf(ledger, seed.id, row.accountId)
      if (local && typeof local.delta === 'number' && local.delta > 0) return true
      if (local && local.outcome === 'already-claimed') return true
      if (seed.claim === 'auto' || seed.claim === 'link') {
        if (typeof row.dailyRemaining === 'number') return row.dailyRemaining > 0
      }
      if (row.statusKnown) return row.checkedIn === true
      if (local) return false
      return providerCheckOf(seed, auto) === true
    }

    // ── transport ─────────────────────────────────────────────────────────
    function rpcId() {
      return 'cd-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
    }
    async function packRpc(method, payload, timeoutMs) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs || 90000)
      try {
        const response = await fetch('/api/channel-pack', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            type: 'client-request',
            rpcId: rpcId(),
            method: 'channel-pack',
            payload: { method, payload },
          }),
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('HTTP ' + response.status)
        const envelope = await response.json()
        const result = envelope && envelope.result
        if (result && result.ok === true) return result.value
        const error = (result && result.error) || {}
        throw new Error(error.message || error.code || 'package-rpc-failed')
      } finally {
        clearTimeout(timer)
      }
    }
    async function httpGet(url) {
      const response = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!response.ok) throw new Error('HTTP ' + response.status)
      return response.json()
    }
    async function httpPost(url, body) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body || {}),
      })
      let payload = null
      try { payload = await response.json() } catch { /* empty body is fine */ }
      if (!response.ok) throw new Error('HTTP ' + response.status)
      return payload
    }

    // ── shaping ───────────────────────────────────────────────────────────
    function num(value) {
      return typeof value === 'number' && isFinite(value) ? value : undefined
    }
    function firstNum() {
      for (let i = 0; i < arguments.length; i++) {
        const value = num(arguments[i])
        if (value !== undefined) return value
      }
      return undefined
    }
    /**
     * A package's expiry as epoch ms. channel-pack ships three shapes:
     * `deductionEndTime` (Trae, ms), `expiredTime` (Qoder/Loomy, ISO string),
     * `cycleEndTime` (string). Empty strings mean "no expiry".
     */
    /**
     * A package's expiry as epoch ms. channel-pack ships three shapes:
     * `deductionEndTime` (Trae, ms), `expiredTime` (Qoder/Loomy, ISO string),
     * `cycleEndTime` (string). Empty strings mean "no expiry".
     *
     * Sentinels are dropped: Qoder's usage document answers `expiresAt:
     * 253402214400000` (= 9999-12-31) to mean "never", and printing that as an
     * expiry date would be worse than printing nothing.
     */
    const MAX_PLAUSIBLE_EXPIRY_MS = Date.UTC(2100, 0, 1)
    function packageExpiryMs(entry) {
      const direct = firstNum(entry.deductionEndTime, entry.expireAt, entry.expiresAtMs)
      if (direct !== undefined) {
        return direct > 0 && direct < MAX_PLAUSIBLE_EXPIRY_MS ? direct : undefined
      }
      for (const field of [entry.expiredTime, entry.cycleEndTime, entry.expiresAt, entry.expireAtTime]) {
        if (typeof field !== 'string' || field.trim().length === 0) continue
        const parsed = Date.parse(field)
        if (Number.isFinite(parsed) && parsed > 0 && parsed < MAX_PLAUSIBLE_EXPIRY_MS) return parsed
      }
      return undefined
    }
    /** Balance snapshot → { total, packages[] } no matter which platform made it. */
    function shapeBalance(balance, extra) {
      if (balance === null || balance === undefined) {
        const fallback = extra && typeof extra === 'object' ? extra : {}
        const loose = firstNum(fallback.total, fallback.available, fallback.available_points, fallback.credit, fallback.credits)
        return loose === undefined ? null : { total: loose, packages: [] }
      }
      if (typeof balance === 'number') return { total: balance, packages: [] }
      const packages = Array.isArray(balance.packages)
        ? balance.packages
            .map((entry) => ({
              name: typeof entry.name === 'string' ? entry.name : '',
              remaining: firstNum(entry.remaining, entry.amount, entry.total),
              expireMs: packageExpiryMs(entry),
            }))
            .filter((entry) => entry.remaining !== undefined)
        : []
      const total = firstNum(balance.total, balance.available, balance.remaining)
      if (total === undefined && packages.length === 0) return null
      return { total: total === undefined ? packages.reduce((sum, e) => sum + e.remaining, 0) : total, packages }
    }
    /** Walk an unknown payload for per-account credit rows. */
    function digAccounts(payload, hints) {
      if (!payload || typeof payload !== 'object') return []
      const list = []
      const seen = new Set()
      const push = (row) => {
        if (!row || typeof row !== 'object') return
        const name = row.accountName || row.nickname || row.label || row.name || row.email || row.accountId || row.id
        if (typeof name !== 'string' || name.length === 0) return
        const credit = firstNum(
          row.credit, row.credits, row.creditNum, row.remaining, row.available_points,
          row.available, row.points, row.total, row.balance,
        )
        if (credit === undefined && !row.checkin && !row.checkedIn) return
        const key = name + '|' + (credit === undefined ? '' : credit)
        if (seen.has(key)) return
        seen.add(key)
        list.push({
          accountId: typeof row.accountId === 'string' ? row.accountId : typeof row.id === 'string' ? row.id : name,
          nickname: name,
          credit,
          used: firstNum(row.used, row.creditUsed),
          checkedIn: row.checkedIn === true || row.checkin === true || row.todayCheckedIn === true,
        })
      }
      const queues = [payload]
      let guard = 0
      while (queues.length > 0 && guard < 400) {
        guard++
        const node = queues.shift()
        if (Array.isArray(node)) { for (const item of node) queues.push(item); continue }
        if (!node || typeof node !== 'object') continue
        const looksLikeRow =
          'accountId' in node || 'accountName' in node || 'nickname' in node ||
          'credit' in node || 'credits' in node || 'remaining' in node || 'available_points' in node
        if (looksLikeRow) push(node)
        for (const key of Object.keys(node)) {
          const child = node[key]
          if (child && typeof child === 'object') queues.push(child)
        }
      }
      return list
    }

    // ── platform readers ──────────────────────────────────────────────────
    function qoderBeforeRefresh(platform) {
      if (!platform.refreshHourUtc8) return false
      const shifted = new Date(Date.now() + 8 * HOUR)
      return shifted.getUTCHours() < platform.refreshHourUtc8
    }

    /** Today's date key in UTC+8, the clock every channel bills on. */
    function todayKey() {
      const shifted = new Date(Date.now() + 8 * HOUR)
      return shifted.toISOString().slice(0, 10)
    }

    /**
     * `auto-checkin.json` gives one Chinese sentence per channel, not an enum
     * (see the channel-pack text table). This maps that sentence back to
     * "did this channel complete today's check-in", which is the only
     * provider-level evidence available for every channel except MiniMax.
     */
    function parseChannelText(text) {
      if (typeof text !== 'string' || text.length === 0) return null
      const match = /^(\d+)\s*个/.exec(text)
      const count = match ? Number(match[1]) : undefined
      if (/无签到接口|需手动签到|不支持/.test(text)) {
        return { applicable: false, checked: false, count, text }
      }
      if (/今天已领|已签到|领取成功/.test(text) || /\+\s*\d+\s*积分/.test(text)) {
        return { applicable: true, checked: true, count, text }
      }
      if (/失败|未开启|待领取|未签到/.test(text)) {
        return { applicable: true, checked: false, count, text }
      }
      return { applicable: true, checked: false, count, text }
    }

    async function readPackPlatform(platform) {
      // `credits.status` is implemented for MiniMax only; asking every provider
      // wastes one round trip each and the others just answer "unsupported".
      const wantsStatus = platform.provider === 'minimax'
      const [balanceValue, statusValue] = await Promise.all([
        packRpc('credits.balances', { provider: platform.provider }).catch((error) => ({ __error: String(error.message || error) })),
        wantsStatus
          ? packRpc('credits.status', { provider: platform.provider }).catch(() => null)
          : Promise.resolve(null),
      ])
      const balanceRows = (balanceValue && Array.isArray(balanceValue.accounts)) ? balanceValue.accounts : []
      const statusRows = (statusValue && Array.isArray(statusValue.accounts)) ? statusValue.accounts : []
      const statusById = new Map()
      for (const row of statusRows) statusById.set(row.accountId, row.status)
      const balanceError = balanceValue && balanceValue.__error ? balanceValue.__error : ''
      const accounts = balanceRows.map((row) => {
        const status = statusById.get(row.accountId) || null
        const balance = shapeBalance(row.balance, row.extra)
        // The daily pool is granted upstream (网页端 +300/天, valid until
        // 24:00); channel-pack exposes it only as a named package, never as a
        // claim call, so the panel reports it instead of pretending to claim it.
        const daily = (balance && balance.packages ? balance.packages : [])
          .find((entry) => typeof entry.name === 'string' && (entry.name.includes('每日') || /daily/i.test(entry.name)))
        // Nearest still-valid package expiry: Trae/Qoder carry it per package
        // (`deductionEndTime` / `expiredTime`), MiniMax only in its status.
        const nearestFuture = (balance && balance.packages ? balance.packages : [])
          .map((entry) => entry.expireMs)
          .filter((ms) => typeof ms === 'number' && ms > Date.now())
          .sort((left, right) => left - right)[0]
        const statusEnd = status && typeof status.endTime === 'string' && status.endTime.length > 0
          ? String(status.endTime).slice(0, 10)
          : ''
        return {
          accountId: row.accountId,
          nickname: row.nickname || row.accountId,
          credit: balance ? balance.total : undefined,
          packages: balance ? balance.packages : [],
          dailyRemaining: daily ? daily.remaining : undefined,
          expiry: statusEnd || formatDate(nearestFuture),
          checkedIn: status ? status.todayCheckedIn === true : undefined,
          streakDays: status ? firstNum(status.streakDays) : undefined,
          actionRequired: status ? status.actionRequired === true : false,
          active: status ? status.active !== false : true,
          statusKnown: Boolean(status),
          error: row.error || '',
        }
      })
      return { accounts, error: balanceError }
    }

    /**
     * WorkBuddy: read the plugin's own status document, exactly as its card does.
     *
     * `GET /plugins/dsh-connect-workbuddy/usage?region=cn` puts the per-account
     * table under `pool.accounts` — NOT under the top-level `accounts`, which
     * carries only id/name/domain. Reading the wrong one is why this row showed
     * nothing. Each pool row has `credits` (number), `nearestExpiryMs`, `current`
     * and `checkedInToday`; the top-level `checkin`/`credits` describe only the
     * account currently in use.
     */
    async function readWorkbuddy(platform) {
      const response = await fetch('/plugins/dsh-connect-workbuddy/usage?region=cn', {
        headers: { Accept: 'application/json' },
      })
      let payload = null
      try { payload = await response.json() } catch { /* non-JSON body */ }
      if (!response.ok) {
        return { accounts: [], error: 'HTTP ' + response.status, raw: payload }
      }
      const pool = payload && payload.pool ? payload.pool : null
      const list = Array.isArray(pool && pool.accounts) ? pool.accounts : []
      // `credits.packages` describes the account currently in use only, so its
      // per-pack expiry dates can only be attached to that row.
      const currentCredits = payload && payload.credits ? payload.credits : null
      const currentPackages = currentCredits && Array.isArray(currentCredits.packages)
        ? currentCredits.packages
            .map((entry) => ({
              name: typeof entry.packageName === 'string' ? entry.packageName : '',
              remaining: firstNum(entry.remain),
              expireMs: firstNum(entry.expiresAtMs),
            }))
            .filter((entry) => entry.remaining !== undefined)
        : []
      const accounts = list.map((row) => ({
        accountId: String(row.accountId || row.id || row.accountName || 'workbuddy'),
        nickname: String(row.accountName || row.accountId || 'WorkBuddy'),
        credit: typeof row.credits === 'number' ? row.credits : undefined,
        packages: row.current === true ? currentPackages : [],
        expiry: formatDate(row.nearestExpiryMs),
        checkedIn: typeof row.checkedInToday === 'boolean' ? row.checkedInToday : undefined,
        actionRequired: false,
        active: true,
        statusKnown: typeof row.checkedInToday === 'boolean',
        current: row.current === true,
        error: '',
      }))
      return { accounts, error: accounts.length === 0 ? 'empty payload' : '', raw: payload }
    }

    /**
     * CodeArts: same reading order the plugin's own card uses (`rowsOf`).
     *
     * `/api/codearts/status` answers `{ status, accounts, credits, creditsByAccount }`
     * where each `creditsByAccount` entry is `{ id, credits: <snapshot> }` and the
     * snapshot is `{ credits, tokens?, welfare? }` — the credit document is one
     * level deeper than the name suggests. Remaining is `credits.total.remain`,
     * the reset date is `credits.periodEnd`, and "already checked in today" is
     * `welfare.claimedToday` (NOT `claimable`).
     */
    function codeartsRow(accountId, name, entry) {
      const snapshot = entry && entry.credits ? entry.credits : null
      const credits = snapshot && snapshot.credits ? snapshot.credits : null
      const welfare = snapshot && snapshot.welfare ? snapshot.welfare : null
      const remain = credits && credits.total ? firstNum(credits.total.remain) : undefined
      const expiring = credits && credits.total ? firstNum(credits.total.expiring) : undefined
      return {
        accountId: String(accountId),
        nickname: String(name || accountId),
        credit: remain,
        expiring,
        packages: [],
        expiry: credits && credits.periodEnd ? String(credits.periodEnd).slice(0, 10) : '',
        checkedIn: welfare ? welfare.claimedToday === true : undefined,
        actionRequired: false,
        active: true,
        statusKnown: Boolean(welfare),
        error: String((entry && entry.creditsError) || ''),
      }
    }

    async function readCodearts(platform, force) {
      // `force` is reserved for an explicit refresh: the plugin keeps its own
      // TTL cache, and bypassing it on every scheduled read would pay upstream
      // for a number that is already two minutes old at worst.
      const url = '/api/codearts/status' + (force === true ? '?force=1' : '')
      const response = await fetch(url, { headers: { Accept: 'application/json' } })
      let payload = null
      try { payload = await response.json() } catch { /* non-JSON body */ }
      if (!response.ok) {
        const why = payload && (payload.error || payload.message) ? String(payload.error || payload.message) : ''
        return { accounts: [], error: 'HTTP ' + response.status + (why ? ' ' + why : ''), raw: payload }
      }
      if (payload && payload.status === 'signed-out') return { accounts: [], error: '', raw: payload }
      const list = Array.isArray(payload && payload.accounts) ? payload.accounts : []
      const byId = new Map(
        (Array.isArray(payload && payload.creditsByAccount) ? payload.creditsByAccount : [])
          .map((entry) => [entry && entry.id, entry]),
      )
      const accounts = []
      for (const account of list) {
        const id = account && account.id
        const name = (account && (account.label || account.userName)) || id
        const entry = byId.get(id)
          || (byId.size === 0 && list.length === 1
            ? { id, credits: payload.credits, creditsError: payload.creditsError }
            : null)
        if (!entry) continue
        accounts.push(codeartsRow(id, name, entry))
      }
      if (accounts.length === 0 && payload && payload.credits) {
        const label = payload.label || 'CodeArts'
        accounts.push(codeartsRow(label, label, { id: label, credits: payload.credits, creditsError: payload.creditsError }))
      }
      const error = accounts.length === 0
        ? (payload && payload.creditsError ? String(payload.creditsError) : 'empty payload')
        : ''
      return { accounts, error, raw: payload }
    }

    /**
     * WPS 灵犀: the Host half reads the desktop app's cookie jar and calls
     * lingxi.wps.cn (interface ported from dsh-checkin-all). The page only sees
     * the derived numbers, never the `wps_sid`.
     */
    async function readLingxi(platform) {
      const response = await fetch('/plugins/dsh-cyberegg/lingxi?action=status', {
        headers: { Accept: 'application/json' },
      })
      let payload = null
      try { payload = await response.json() } catch { /* non-JSON body */ }
      if (!response.ok) return { accounts: [], error: 'HTTP ' + response.status, raw: payload }
      if (payload && payload.needSid) {
        // Not an error state: the platform is installed but nothing is logged
        // in yet, so show the row with an honest "needs login" badge.
        return {
          accounts: [{
            accountId: 'lingxi',
            nickname: 'WPS 灵犀',
            credit: undefined,
            packages: [],
            expiry: '',
            checkedIn: undefined,
            needLogin: true,
            actionRequired: false,
            active: true,
            statusKnown: false,
            error: payload.message || '缺少 wps_sid',
          }],
          error: '',
          raw: payload,
        }
      }
      if (payload && payload.error) {
        return {
          accounts: [],
          error: String(payload.error) + (payload.message ? ' ' + payload.message : ''),
          raw: payload,
        }
      }
      return {
        accounts: [{
          accountId: 'lingxi',
          nickname: 'WPS 灵犀',
          credit: typeof payload.credits === 'number' ? payload.credits : undefined,
          packages: [],
          expiry: '',
          checkedIn: payload.claimed === true,
          streakDays: typeof payload.consecutiveDays === 'number' ? payload.consecutiveDays : undefined,
          actionRequired: false,
          active: true,
          statusKnown: payload.claimed === true || payload.claimable === true,
          error: '',
        }],
        error: '',
        raw: payload,
      }
    }

    /**
     * MobileClaw: its tokens are AES-sealed with a key derived from a
     * `master.key` the app fetches lazily, so no outside script can call its
     * API. What IS readable is the app's own log: every welfare claim and the
     * remaining balance. The Host half parses that log.
     */
    async function readMobileclaw(platform) {
      const response = await fetch('/plugins/dsh-cyberegg/mobileclaw', {
        headers: { Accept: 'application/json' },
      })
      let payload = null
      try { payload = await response.json() } catch { /* non-JSON body */ }
      if (!response.ok) return { accounts: [], error: 'HTTP ' + response.status, raw: payload }
      if (payload && payload.error) {
        return {
          accounts: [],
          error: String(payload.error) + (payload.message ? ' ' + payload.message : ''),
          raw: payload,
        }
      }
      const balance = payload && payload.balance ? payload.balance : null
      const claimed = payload && payload.dailyClaimedToday === true
      const expireTime = balance && typeof balance.expireTime === 'string' ? balance.expireTime : ''
      return {
        accounts: [{
          accountId: 'mobileclaw',
          nickname: 'MobileClaw',
          credit: balance && typeof balance.remain === 'number' ? balance.remain : undefined,
          packages: [],
          expiry: /^\d{4}-\d{2}-\d{2}/.test(expireTime) ? expireTime.slice(0, 10) : '',
          dailyRemaining: claimed && typeof payload.dailyAmount === 'number' ? payload.dailyAmount : 0,
          checkedIn: claimed,
          actionRequired: false,
          active: true,
          statusKnown: true,
          error: '',
        }],
        error: '',
        raw: payload,
      }
    }

    async function readPlatform(platform, force) {
      if (platform.kind === 'pack') return readPackPlatform(platform)
      if (platform.id === 'workbuddy') return readWorkbuddy(platform)
      if (platform.id === 'codearts') return readCodearts(platform, force)
      if (platform.id === 'lingxi') return readLingxi(platform)
      if (platform.id === 'mobileclaw') return readMobileclaw(platform)
      return { accounts: [], error: 'unsupported' }
    }

    /** Sum every account's remaining credit in one read (undefined when none read). */
    function totalCreditOf(accounts) {
      const values = (accounts || [])
        .map((row) => row.credit)
        .filter((value) => typeof value === 'number' && isFinite(value))
      if (values.length === 0) return undefined
      return values.reduce((sum, value) => sum + value, 0)
    }

    /** Sum the remaining credit of one account (or the whole platform) from a read. */
    function creditOf(readResult, account) {
      if (!readResult || !Array.isArray(readResult.accounts)) return undefined
      const rows = account
        ? readResult.accounts.filter((row) => row.accountId === account.accountId)
        : readResult.accounts
      const values = rows
        .map((row) => row.credit)
        .filter((value) => typeof value === 'number' && isFinite(value))
      if (values.length === 0) return undefined
      return values.reduce((sum, value) => sum + value, 0)
    }

    async function claimPlatform(platform, account) {
      if (platform.kind === 'pack') {
        const value = await packRpc('credits.claimAll', { provider: platform.provider }, 120000)
        const results = (value && value.results) || []
        if (account) {
          const hit = results.find((row) => row.accountId === account.accountId)
          const outcome = hit && hit.outcome ? hit.outcome : null
          if (!outcome) return { message: 'claimed', rows: [{ accountId: account.accountId, kind: 'claimed' }] }
          return { message: outcome.message || outcome.kind, rows: [{ accountId: hit.accountId, kind: outcome.kind }] }
        }
        return {
          message: results.length === 0
            ? 'claimed'
            : results.map((row) => (row.outcome && (row.outcome.message || row.outcome.kind)) || 'done').join(' · '),
          rows: results.map((row) => ({
            accountId: row.accountId,
            kind: (row.outcome && row.outcome.kind) || 'claimed',
          })),
        }
      }
      if (platform.id === 'workbuddy') {
        // This route checks in the region's CURRENT account: it takes no
        // accountId, so only the row the plugin marks `current` may fire it.
        const payload = await httpPost('/plugins/dsh-connect-workbuddy/checkin?region=cn', {})
        const kind = payload && payload.alreadyCheckedIn === true ? 'already-claimed' : 'claimed'
        return {
          message: describeClaim(payload),
          rows: account ? [{ accountId: account.accountId, kind }] : [],
        }
      }
      if (platform.id === 'codearts') {
        const payload = await httpPost('/api/codearts/claim', { accountId: account ? account.accountId : undefined })
        return {
          message: describeClaim(payload),
          rows: account ? [{ accountId: account.accountId, kind: 'claimed' }] : [],
        }
      }
      if (platform.id === 'lingxi') {
        const payload = await httpPost('/plugins/dsh-cyberegg/lingxi?action=claim', {})
        const kind = payload && payload.alreadyClaimed === true ? 'already-claimed' : 'claimed'
        return {
          message: (payload && (payload.message || payload.error)) || 'claimed',
          rows: account ? [{ accountId: account.accountId, kind }] : [],
        }
      }
      throw new Error('no claim route')
    }

    // ── view helpers ──────────────────────────────────────────────────────
    const S = {
      page: {
        padding: '24px 28px 40px',
        maxWidth: 980,
        margin: '0 auto',
        height: '100%',
        minHeight: 0,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        boxSizing: 'border-box',
        color: 'var(--dsw-alias-label-primary)',
        fontSize: 13,
        lineHeight: 1.5,
      },
      headRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
      title: { fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' },
      subtitle: { margin: '4px 0 0', color: 'var(--dsw-alias-label-secondary)', fontSize: 12.5 },
      summary: {
        display: 'flex', flexWrap: 'wrap', gap: 10, margin: '18px 0 22px',
      },
      statCard: {
        flex: '1 1 180px', minWidth: 168, background: 'var(--dsw-alias-bg-layer-1)',
        border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 10, padding: '12px 14px',
      },
      statLabel: { fontSize: 11.5, color: 'var(--dsw-alias-label-secondary)', letterSpacing: '0.02em' },
      statValue: { fontSize: 22, fontWeight: 600, marginTop: 4, fontVariantNumeric: 'tabular-nums' },
      group: {
        border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 12, marginBottom: 10,
        background: 'var(--dsw-alias-bg-layer-1)', overflow: 'hidden',
      },
      groupHead: {
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
        cursor: 'grab', userSelect: 'none',
        // The row carries caret, dot, name, credit pill, check-in count, time,
        // hide button, interval select and refresh. On a narrow panel they used
        // to overflow and the right-hand controls (including ×) were clipped by
        // the group's `overflow: hidden`; wrapping keeps every control visible.
        flexWrap: 'wrap', rowGap: 6,
      },
      groupName: { fontWeight: 600, fontSize: 13.5, minWidth: 120 },
      spacer: { flex: 1 },
      pill: {
        fontSize: 11.5, padding: '1px 7px', borderRadius: 999,
        border: '1px solid var(--dsw-alias-border-l1)', color: 'var(--dsw-alias-label-secondary)',
        fontVariantNumeric: 'tabular-nums',
      },
      iconBtn: {
        border: '1px solid var(--dsw-alias-border-l1)', background: 'transparent',
        color: 'var(--dsw-alias-label-primary)', borderRadius: 7, padding: '3px 9px',
        fontSize: 12, cursor: 'pointer',
      },
      select: {
        border: '1px solid var(--dsw-alias-border-l1)', background: 'var(--dsw-alias-bg-layer-2)',
        color: 'var(--dsw-alias-label-secondary)', borderRadius: 7, padding: '3px 4px', fontSize: 11.5,
      },
      rows: { borderTop: '1px solid var(--dsw-alias-border-l1)' },
      row: {
        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px 9px 34px',
        borderTop: '1px solid var(--dsw-alias-border-l1)',
      },
      rowFirst: { borderTop: 'none' },
      acct: { minWidth: 150, fontWeight: 500 },
      acctSub: { fontSize: 11, color: 'var(--dsw-alias-label-secondary)' },
      credit: { fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 14 },
      muted: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12 },
      err: { color: 'var(--dsw-alias-state-error-primary)', fontSize: 11.5 },
      ok: { color: 'var(--dsw-alias-state-success-primary)', fontSize: 11.5 },
      warn: { color: 'var(--dsw-alias-state-warn-primary)', fontSize: 11.5 },
      idle: { color: 'var(--dsw-alias-state-idle-primary)', fontSize: 11.5 },
      caret: { width: 14, display: 'inline-block', textAlign: 'center', color: 'var(--dsw-alias-label-secondary)' },
      diag: {
        margin: '0 12px 10px 34px', padding: 8, borderRadius: 8, fontSize: 11,
        background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-secondary)',
        whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 180, overflow: 'auto',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      },
      historyRow: {
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px 9px 34px',
        borderTop: '1px solid var(--dsw-alias-border-l1)', flexWrap: 'wrap',
      },
      historyLabel: { fontSize: 11, color: 'var(--dsw-alias-label-secondary)' },
      historyChip: {
        fontSize: 11.5, padding: '1px 8px', borderRadius: 999,
        border: '1px solid var(--dsw-alias-border-l1)', color: 'var(--dsw-alias-label-secondary)',
        fontVariantNumeric: 'tabular-nums',
      },
      hiddenRow: {
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
        marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--dsw-alias-border-l1)',
      },
      newsBar: {
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8,
        margin: '14px 0 0', padding: '8px 12px', borderRadius: 10,
        background: 'var(--dsw-alias-bg-layer-2)',
        border: '1px solid var(--dsw-alias-border-l1)',
      },
      newsLabel: { fontSize: 11.5, fontWeight: 600, color: 'var(--dsw-alias-label-secondary)' },
      newsNote: { fontSize: 11, color: 'var(--dsw-alias-label-secondary)', opacity: 0.75 },
      newsLink: {
        fontSize: 11.5, padding: '1px 8px', borderRadius: 999, textDecoration: 'none',
        border: '1px solid var(--dsw-alias-border-l2)',
        color: 'var(--dsw-alias-brand-primary)', display: 'inline-block',
      },
      expiryBar: {
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8,
        margin: '0 0 18px', padding: '8px 12px', borderRadius: 10,
        background: 'var(--dsw-alias-bg-layer-1)',
        border: '1px solid var(--dsw-alias-border-l1)',
      },
      expiryCounts: {
        fontSize: 11.5, color: 'var(--dsw-alias-label-secondary)',
        fontVariantNumeric: 'tabular-nums',
      },
      expiryList: {
        flexBasis: '100%', marginTop: 6, paddingTop: 6,
        borderTop: '1px solid var(--dsw-alias-border-l1)',
      },
      expiryRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '4px 2px', fontSize: 12 },
      expiryDate: {
        minWidth: 84, color: 'var(--dsw-alias-label-secondary)',
        fontVariantNumeric: 'tabular-nums',
      },
      expiryWho: { minWidth: 140 },
      expiryNearestLabel: {
        marginTop: 6, paddingTop: 6, fontSize: 11,
        color: 'var(--dsw-alias-label-secondary)',
        borderTop: '1px dashed var(--dsw-alias-border-l1)',
      },
    }

    function formatCredit(value) {
      if (value === undefined || value === null) return '—'
      if (Math.abs(value) >= 1000000) return (value / 1000000).toFixed(2) + 'M'
      if (Math.abs(value) >= 10000) return (value / 1000).toFixed(1) + 'k'
      return String(Math.round(value * 100) / 100)
    }
    /** Epoch ms → local (UTC+8) calendar day, the clock these quotas expire on. */
    function formatDate(ms) {
      if (typeof ms !== 'number' || !isFinite(ms) || ms <= 0) return ''
      const shifted = new Date(ms + 8 * HOUR)
      if (Number.isNaN(shifted.getTime())) return ''
      return shifted.toISOString().slice(0, 10)
    }
    function formatAgo(ts) {
      if (!ts) return ''
      const diff = Date.now() - ts
      if (diff < 60000) return 'now'
      if (diff < HOUR) return Math.floor(diff / 60000) + 'm'
      if (diff < 24 * HOUR) return Math.floor(diff / HOUR) + 'h'
      return Math.floor(diff / (24 * HOUR)) + 'd'
    }

    // ── state hook ────────────────────────────────────────────────────────
    function useDashboard() {
      const [prefs, setPrefs] = useState(loadPrefs)
      const [platforms, setPlatforms] = useState(() => {
        const map = {}
        for (const seed of PLATFORM_SEED) {
          map[seed.id] = { status: 'idle', accounts: [], error: '', at: 0, claiming: false, notice: '', diag: null }
        }
        return map
      })
      const inflight = useRef(new Set())
      // Every read hits an upstream once per account, so they run one at a time:
      // a burst of nine platforms is exactly how these accounts get rate-limited.
      const queueRef = useRef(Promise.resolve())
      const enqueue = useCallback((task) => {
        const run = queueRef.current.then(task, task)
        queueRef.current = run.then(() => undefined, () => undefined)
        return run
      }, [])
      // `auto-checkin.json` today: the provider-level fallback for channels
      // whose own status RPC is not implemented (everything except MiniMax).
      const [auto, setAuto] = useState(null)
      // Today's locally recorded claim successes (see LEDGER_KEY notes).
      const [ledger, setLedger] = useState(loadLedger)
      // Per-platform daily credit totals, kept for the last few days.
      const [history, setHistory] = useState(loadHistory)

      const patchPrefs = useCallback((next) => {
        setPrefs((current) => {
          const merged = typeof next === 'function' ? next(current) : { ...current, ...next }
          savePrefs(merged)
          return merged
        })
      }, [])

      const intervalOf = useCallback(
        (id) => {
          const stored = prefs.intervals[id]
          return typeof stored === 'number' ? stored : DEFAULT_INTERVAL
        },
        [prefs.intervals],
      )

      const refresh = useCallback(async (id, showRaw, force) => {
        if (inflight.current.has(id)) return null
        const seed = PLATFORM_SEED.find((entry) => entry.id === id)
        if (!seed) return
        inflight.current.add(id)
        setPlatforms((current) => ({ ...current, [id]: { ...current[id], status: 'loading', error: '' } }))
        try {
          const result = await enqueue(() => readPlatform(seed, force === true))
          setPlatforms((current) => ({
            ...current,
            [id]: {
              ...current[id],
              status: 'ok',
              accounts: result.accounts || [],
              error: result.error || '',
              at: Date.now(),
              diag: showRaw === true ? result.raw || null : current[id].diag,
            },
          }))
          const total = totalCreditOf(result.accounts)
          if (total !== undefined) {
            setHistory((current) => {
              const today = todayKey()
              const kept = (current[id] || []).filter((entry) => entry.date !== today)
              kept.push({ date: today, total })
              kept.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
              const next = { ...current, [id]: kept.slice(-3) }
              saveHistory(next)
              return next
            })
          }
          return result
        } catch (error) {
          setPlatforms((current) => ({
            ...current,
            [id]: { ...current[id], status: 'error', error: String((error && error.message) || error), at: Date.now() },
          }))
          return null
        } finally {
          inflight.current.delete(id)
        }
      }, [])

      const claim = useCallback(async (id, account) => {
        const seed = PLATFORM_SEED.find((entry) => entry.id === id)
        if (!seed) return
        setPlatforms((current) => ({ ...current, [id]: { ...current[id], claiming: true, notice: '' } }))
        try {
          // Evidence, not trust: read the balance, claim, let the upstream
          // settle, read again. Only a real increase proves the check-in —
          // an "ok" reply from the claim route alone does not.
          const beforeRead = await refresh(id, false, true)
          const before = creditOf(beforeRead, account)
          const result = await claimPlatform(seed, account)
          await new Promise((resolve) => setTimeout(resolve, 1800))
          const afterRead = await refresh(id, false, true)
          const after = creditOf(afterRead, account)
          const delta = before !== undefined && after !== undefined ? after - before : undefined
          const fallbackOutcome = (result.rows && result.rows[0] && result.rows[0].kind) || 'unknown'
          const rows = (result.rows && result.rows.length > 0)
            ? result.rows
            : (account ? [{ accountId: account.accountId, kind: fallbackOutcome }] : [])
          if (rows.length > 0) {
            setLedger((current) => {
              const base = current.date === todayKey()
                ? { date: current.date, rows: { ...current.rows } }
                : { date: todayKey(), rows: {} }
              for (const row of rows) {
                base.rows[id + '|' + row.accountId] = {
                  at: Date.now(), before, after, delta, outcome: row.kind || fallbackOutcome,
                }
              }
              saveLedger(base)
              return base
            })
          }
          const verified = typeof delta === 'number' && delta > 0
          const notice = verified
            ? '+' + delta
            : (fallbackOutcome === 'already-claimed' ? 'already-claimed' : (result.message || fallbackOutcome))
          setPlatforms((current) => ({ ...current, [id]: { ...current[id], claiming: false, notice } }))
        } catch (error) {
          const message = String((error && error.message) || error)
          setPlatforms((current) => ({ ...current, [id]: { ...current[id], claiming: false, notice: message } }))
        }
      }, [refresh])

      const refreshAuto = useCallback(async () => {
        try {
          const value = await packRpc('usage.autoCheckin', {})
          setAuto(value && value.autoCheckin ? value.autoCheckin : null)
        } catch {
          /* the auto check-in state is optional; the panel still works without it */
        }
      }, [])

      const order = useMemo(() => {
        const known = new Set(PLATFORM_SEED.map((entry) => entry.id))
        const kept = prefs.order.filter((id) => known.has(id))
        for (const entry of PLATFORM_SEED) if (!kept.includes(entry.id)) kept.push(entry.id)
        return kept
      }, [prefs.order])

      const move = useCallback((fromId, toId) => {
        if (fromId === toId) return
        patchPrefs((current) => {
          const list = current.order.slice()
          const from = list.indexOf(fromId)
          const to = list.indexOf(toId)
          if (from < 0 || to < 0) return current
          list.splice(from, 1)
          list.splice(to, 0, fromId)
          return { ...current, order: list }
        })
      }, [patchPrefs])

      const toggleCollapsed = useCallback((id) => {
        patchPrefs((current) => ({
          ...current,
          collapsed: { ...current.collapsed, [id]: !current.collapsed[id] },
        }))
      }, [patchPrefs])

      const setIntervalFor = useCallback((id, ms) => {
        patchPrefs((current) => ({ ...current, intervals: { ...current.intervals, [id]: ms } }))
      }, [patchPrefs])

      /** Hide/show one platform: hidden platforms drop out of the list AND the totals. */
      const toggleHidden = useCallback((id) => {
        patchPrefs((current) => ({
          ...current,
          hidden: { ...current.hidden, [id]: current.hidden[id] !== true },
        }))
      }, [patchPrefs])

      return {
        prefs, platforms, order, intervalOf, refresh, claim, move, toggleCollapsed, setIntervalFor, toggleHidden, auto, refreshAuto, ledger, history,
      }
    }

    // ── components ────────────────────────────────────────────────────────
    function PanelIcon({ size }) {
      const px = typeof size === 'number' && size > 0 ? size : 16
      return h('svg', {
        width: px, height: px, viewBox: '0 0 64 64', fill: 'none',
        stroke: 'currentColor', strokeWidth: 5, strokeLinecap: 'round',
        'aria-hidden': true, focusable: 'false',
      },
        h('circle', { cx: 32, cy: 32, r: 22, opacity: 0.5 }),
        h('path', { d: 'M22 43V32' }),
        h('path', { d: 'M32 43V25' }),
        h('path', { d: 'M42 43V36' }),
      )
    }

    function PlatformRow(props) {
      const { seed, state, auto, ledger, history, t, interval, onRefresh, onClaim, onInterval, onCollapse, onHide, collapsed, onDragStart, onDrop } = props
      const accounts = state.accounts || []
      const known = accounts.filter((row) => row.credit !== undefined)
      const total = known.reduce((sum, row) => sum + row.credit, 0)
      // Provider-level fallback: the channel's own status RPC exists only for
      // MiniMax, so every other channel's "did I check in today" comes from
      // today's auto-check-in sentence.
      const channelState =
        auto && auto.lastDate === todayKey()
          ? ((auto.channels || []).find((entry) => entry.provider === seed.provider) || null)
          : null
      const check = channelState ? parseChannelText(channelState.text) : null
      // When the channel has a sentence, trust it. When the state exists but the
      // day is not today, today's run has not happened yet → not checked in.
      const providerChecked = check
        ? (check.applicable ? check.checked : null)
        : (auto ? false : null)
      const today = todayKey()
      const ledgerOf = (accountId) => ledgerEntryOf(ledger, seed.id, accountId)
      const isDone = (row) => isRowDone(row, seed, auto, ledger)
      // The denominator is what can actually check in: a disabled or excluded
      // account never counts as a missed check-in.
      const activeAccounts = accounts.filter((row) => row.active !== false)
      const checked = activeAccounts.filter(isDone).length
      const statusKnown = activeAccounts.some((row) =>
        row.statusKnown
        || Boolean(ledgerOf(row.accountId))
        || ((seed.claim === 'auto' || seed.claim === 'link') && typeof row.dailyRemaining === 'number')
      ) || providerChecked !== null
      const pending = seed.refreshHourUtc8 ? qoderBeforeRefresh(seed) : false
      const dotColor =
        state.status === 'error' ? 'var(--dsw-alias-state-error-primary)'
        : state.status === 'loading' ? 'var(--dsw-alias-state-idle-primary)'
        : statusKnown && checked === activeAccounts.length && activeAccounts.length > 0 ? 'var(--dsw-alias-state-success-primary)'
        : 'var(--dsw-alias-state-warn-primary)'

      return h('div', {
        style: S.group,
        draggable: true,
        onDragStart: (event) => { onDragStart(seed.id); try { event.dataTransfer.setData('text/plain', seed.id) } catch {} },
        onDragOver: (event) => event.preventDefault(),
        onDrop: (event) => { event.preventDefault(); onDrop(seed.id) },
      },
        h('div', { style: S.groupHead, onClick: () => onCollapse(seed.id) },
          h('span', { style: S.caret }, collapsed ? '▸' : '▾'),
          h('span', { style: { width: 8, height: 8, borderRadius: 999, background: dotColor } }),
          h('span', { style: S.groupName }, seed.label),
          h('button', {
            style: { ...S.iconBtn, padding: '1px 6px', fontSize: 11, lineHeight: '16px' },
            title: t('hide'),
            onClick: (event) => { event.stopPropagation(); onHide(seed.id) },
          }, t('hideShort')),
          seed.detailUrl
            ? h('a', {
                href: seed.detailUrl,
                target: '_blank',
                rel: 'noopener noreferrer',
                style: { ...S.iconBtn, padding: '1px 6px', fontSize: 11, lineHeight: '16px', textDecoration: 'none', display: 'inline-block' },
                title: t('detailHint'),
                onClick: (event) => event.stopPropagation(),
              }, t('detail'))
            : null,
          h('span', { style: S.pill },
            activeAccounts.length > 1
              ? activeAccounts.length + ' ' + t('accountsUnit')
              : (known.length > 0 ? formatCredit(total) + ' ' + t('creditUnit') : t('unknown'))),
          statusKnown
            ? h('span', { style: checked >= activeAccounts.length && activeAccounts.length > 0 ? S.ok : S.warn }, t('checkedIn') + ' ' + checked + '/' + activeAccounts.length)
            : (pending ? h('span', { style: S.warn }, t('pendingRefresh')) : null),
          h('span', { style: S.spacer }),
          state.at ? h('span', { style: S.muted }, formatAgo(state.at)) : h('span', { style: S.muted }, t('neverUpdated')),
          h('select', {
            style: S.select,
            value: String(interval),
            onClick: (event) => event.stopPropagation(),
            onChange: (event) => onInterval(seed.id, Number(event.target.value)),
            title: t('interval'),
          }, INTERVALS.map((entry) =>
            h('option', { key: entry.ms, value: String(entry.ms) }, entry.ms === 0 ? t('manual') : entry.label))),
          h('button', {
            style: S.iconBtn,
            onClick: (event) => { event.stopPropagation(); onRefresh(seed.id, event.altKey, true) },
            disabled: state.status === 'loading',
            title: 'Alt+click 显示原始返回',
          }, state.status === 'loading' ? t('refreshing') : t('refreshOne')),
        ),
        state.error ? h('div', { style: { padding: '0 12px 8px 34px' } }, h('span', { style: S.err }, t('readFailed') + ': ' + state.error)) : null,
        state.notice ? h('div', { style: { padding: '0 12px 8px 34px' } }, h('span', { style: S.muted }, state.notice)) : null,
        collapsed ? null : h('div', { style: S.rows },
          accounts.length === 0
            ? h('div', { style: { ...S.row, ...S.rowFirst } }, h('span', { style: S.muted }, t('noAccount')))
            : accounts.map((row, index) => h(AccountLine, {
                key: row.accountId + ':' + index,
                seed, row, t, state, index, onClaim, providerChecked, pending,
                done: isDone(row),
                ledgerEntry: ledgerOf(row.accountId) || null,
              })),
          (history && history.length > 0) ? h('div', { style: S.historyRow },
            h('span', { style: S.historyLabel }, t('history')),
            history.map((entry, index) => {
              const prev = index > 0 ? history[index - 1] : null
              const delta = prev && typeof entry.total === 'number' && typeof prev.total === 'number'
                ? entry.total - prev.total
                : undefined
              return h('span', { key: entry.date, style: S.historyChip },
                entry.date.slice(5) + '  ' + formatCredit(entry.total)
                  + (typeof delta === 'number' ? ' (' + (delta >= 0 ? '+' : '') + formatCredit(delta) + ')' : ''),
              )
            }),
          ) : null,
          state.diag ? h('pre', { style: S.diag }, JSON.stringify(state.diag, null, 1).slice(0, 2000)) : null,
        ),
      )
    }

    function AccountLine(props) {
      const { seed, row, t, state, index, onClaim, done, pending, ledgerEntry } = props
      // Only a measured increase counts as a completed check-in. A claim call
      // that answered "ok" while the balance stayed flat is reported as such.
      const verifiedDelta =
        ledgerEntry && typeof ledgerEntry.delta === 'number' && ledgerEntry.delta > 0
          ? ledgerEntry.delta
          : undefined
      const effectiveChecked = done === true
      let badge = null
      if (seed.claim === 'once') badge = h('span', { style: S.muted }, t('onceOnly'))
      else if (seed.claim === 'auto' || seed.claim === 'link') badge = h('span', {
        style: typeof row.dailyRemaining === 'number' && row.dailyRemaining > 0 ? S.ok : S.muted,
      }, typeof row.dailyRemaining === 'number' && row.dailyRemaining > 0 ? t('autoGranted') : t('autoPending'))
      else if (row.needLogin) badge = h('span', { style: S.warn }, t('needLogin'))
      else if (pending && effectiveChecked !== true) badge = h('span', { style: S.warn }, t('pendingRefresh'))
      else if (row.actionRequired) badge = h('span', { style: S.warn }, t('actionRequired'))
      else if (effectiveChecked === true) badge = h('span', { style: S.ok }, t('checkedIn'))
      else if (ledgerEntry && typeof ledgerEntry.delta !== 'number') badge = h('span', { style: S.idle }, t('unknown'))
      else if (ledgerEntry && !verifiedDelta && ledgerEntry.outcome === 'already-claimed')
        badge = h('span', { style: S.muted }, t('alreadyClaimed'))
      else if (ledgerEntry && !verifiedDelta) badge = h('span', { style: S.err }, t('noIncrease'))
      else if (effectiveChecked === false) badge = h('span', { style: S.warn }, t('notCheckedIn'))
      else badge = h('span', { style: S.idle }, t('unknown'))

      // Split the pools: Loomy 永久 / 每日赠送, Raccoon 奖励 / 每日, and show that a
      // daily pool dies at 24:00 today instead of implying it can be saved.
      const pools = (row.packages || []).filter((entry) =>
        typeof entry.remaining === 'number' && typeof entry.name === 'string' && entry.name.length > 0)
      const formatPool = (entry) => {
        const isDaily = /每日|daily/i.test(entry.name)
        const quota = isDaily && typeof seed.dailyQuota === 'number' ? '/' + seed.dailyQuota : ''
        return entry.name + ' ' + formatCredit(entry.remaining) + quota
      }
      const dailyPack = pools.find((entry) => /每日|daily/i.test(entry.name))
      const others = pools.filter((entry) => entry !== dailyPack)
      const parts = []
      // One non-daily pool only when it is unambiguous (Loomy 永久 / Raccoon
      // 奖励). A vendor with many packs (Trae) gets no list at all — just the
      // expiry date, which is what the row is asked to show.
      if (others.length === 1) parts.push(formatPool(others[0]))
      else if (others.length > 1 && dailyPack !== undefined) parts.push(formatPool(others[0]))
      if (dailyPack) parts.push(formatPool(dailyPack) + t('expiresToday'))
      if (typeof row.streakDays === 'number' && row.streakDays > 0) parts.push(t('streak') + ' ' + row.streakDays + ' ' + t('dayUnit'))
      if (row.expiry) parts.push(t('expiry') + ' ' + row.expiry)
      const expiryText = parts.length > 0
        ? parts.join(' · ')
        : (seed.claim === 'auto'
          ? t(seed.autoNote || 'autoDaily')
          : '')

      return h('div', { style: { ...S.row, ...(index === 0 ? S.rowFirst : {}) } },
        h('div', { style: S.acct },
          h('div', null, row.nickname),
          expiryText ? h('div', { style: S.acctSub }, expiryText) : null,
          row.error ? h('div', { style: S.err }, row.error) : null,
        ),
        h('span', { style: S.spacer }),
        h('span', { style: S.credit }, formatCredit(row.credit)),
        h('span', { style: S.muted }, t('creditUnit')),
        verifiedDelta ? h('span', { style: S.ok }, '+' + formatCredit(verifiedDelta)) : null,
        h('span', { style: { width: 74, textAlign: 'right' } }, badge),
        seed.claim === 'once'
          ? h('span', { style: { ...S.iconBtn, opacity: 0.4, cursor: 'default', width: 62, textAlign: 'center' } }, t('claim'))
          : seed.claim === 'link'
          ? h('a', {
              href: seed.link,
              target: '_blank',
              rel: 'noopener noreferrer',
              style: {
                ...S.iconBtn, width: 74, textAlign: 'center', textDecoration: 'none',
                display: 'inline-block', boxSizing: 'border-box',
              },
            }, t('openWeb'))
          : seed.claim === 'auto'
          ? h('span', { style: { ...S.iconBtn, opacity: 0.4, cursor: 'default', width: 62, textAlign: 'center' } }, t('autoTag'))
          : (() => {
              const locked = (seed.id === 'workbuddy' && row.current !== true) || row.needLogin === true
              const disabled = state.claiming || locked
              return h('button', {
                style: { ...S.iconBtn, width: 62, ...(disabled && !state.claiming ? { opacity: 0.45, cursor: 'not-allowed' } : null) },
                disabled,
                title: locked ? t('currentOnly') : undefined,
                onClick: () => onClaim(seed.id, row),
              }, state.claiming ? t('claiming') : t('claim'))
            })(),
      )
    }

    function ExpiryBar(props) {
      const { t, expiry } = props
      const [open, setOpen] = useState(false)
      const sumOf = (list) => list.reduce((acc, entry) => acc + (entry.remaining || 0), 0)
      const hasAny = expiry.items.length > 0 || expiry.cycle.length > 0 || expiry.nearest.length > 0
      const head = []
      head.push(t('expiry3') + ' ' + (expiry.items.length > 0 ? formatCredit(sumOf(expiry.items)) : t('expiryNone')))
      for (const entry of expiry.cycle) {
        head.push(entry.platform + ' ' + t('expiringCycle') + ' ' + formatCredit(entry.remaining)
          + '（' + formatDate(entry.at) + '）')
      }
      return h('div', { style: S.expiryBar },
        h('span', { style: S.newsLabel }, t('expiryTitle')),
        h('span', { style: S.expiryCounts }, head.join('  ·  ')),
        h('span', { style: S.spacer }),
        hasAny
          ? h('button', { style: S.iconBtn, onClick: () => setOpen(!open) },
              open ? t('expiryHide') : t('expiryShow'))
          : null,
        hasAny && open
          ? h('div', { style: S.expiryList },
              expiry.items.length > 0
                ? expiry.items.map((entry, index) => h('div', {
                    key: 'in' + index,
                    style: S.expiryRow,
                  },
                    h('span', { style: S.expiryDate }, formatDate(entry.at)),
                    h('span', { style: S.expiryWho }, entry.platform + (entry.account ? ' · ' + entry.account : '')),
                    h('span', { style: S.spacer }),
                    h('span', { style: S.muted }, entry.name),
                    h('span', { style: S.credit }, formatCredit(entry.remaining)),
                  ))
                : h('div', { style: S.expiryRow }, h('span', { style: S.muted }, t('expiry3') + ' ' + t('expiryNone'))),
              expiry.nearest.length > 0
                ? h('div', { style: S.expiryNearestLabel }, t('expiryNearest'))
                : null,
              expiry.nearest.slice(0, 10).map((entry, index) => h('div', {
                key: 'nr' + index,
                style: { ...S.expiryRow, opacity: 0.72 },
              },
                h('span', { style: S.expiryDate }, formatDate(entry.at)),
                h('span', { style: S.expiryWho }, entry.platform + (entry.account ? ' · ' + entry.account : '')),
                h('span', { style: S.spacer }),
                h('span', { style: S.muted }, entry.hasDetail ? '' : t('nearestExpiryOnly')),
                h('span', { style: S.credit }, entry.remaining === undefined ? '—' : formatCredit(entry.remaining)),
              )),
            )
          : null,
      )
    }

    function DashboardPage(props) {
      const { t, backToConversation } = props
      const dash = useDashboard()
      const { platforms, order, prefs, intervalOf, refresh, claim, move, toggleCollapsed, setIntervalFor, toggleHidden, auto, refreshAuto, ledger, history } = dash
      const didInit = useRef(false)
      const dragFrom = useRef(null)

      useEffect(() => {
        if (didInit.current) return
        didInit.current = true
        refreshAuto()
        for (const id of order) {
          const state = platforms[id]
          if (!state || state.at) continue
          if (prefs.hidden[id] === true) continue
          // A collapsed platform is not on screen; paying an upstream read for
          // it on every open is waste. It loads when the user expands it.
          if (prefs.collapsed[id] === true) continue
          refresh(id)
        }
      }, [order, platforms, refresh, refreshAuto, prefs.collapsed, prefs.hidden])

      useEffect(() => {
        const timer = setInterval(() => {
          for (const id of order) {
            const gap = intervalOf(id)
            if (gap === 0) continue
            if (prefs.hidden[id] === true) continue
            if (prefs.collapsed[id] === true) continue
            const state = platforms[id]
            if (!state.at) continue
            if (Date.now() - state.at >= gap) refresh(id)
          }
        }, 60000)
        return () => clearInterval(timer)
      }, [order, platforms, intervalOf, refresh, prefs.collapsed, prefs.hidden])

      const totals = useMemo(() => {
        let credit = 0
        let already = 0
        let claimable = 0
        for (const id of order) {
          if (prefs.hidden[id] === true) continue
          const state = platforms[id]
          if (!state || state.status === 'idle') continue
          const seed = PLATFORM_SEED.find((entry) => entry.id === id)
          if (!seed) continue
          // A one-time-reward platform has nothing to check in, so it must not
          // inflate the denominator; a disabled account is not a missed day.
          const counts = seed.claim !== 'once' && seed.claim !== 'auto' && seed.claim !== 'link'
          for (const row of state.accounts || []) {
            if (typeof row.credit === 'number') credit += row.credit
            if (!counts || row.active === false) continue
            claimable++
            if (isRowDone(row, seed, auto, ledger)) already++
          }
        }
        return { credit, already, claimable }
      }, [order, platforms, auto, ledger, prefs.hidden])

      /**
       * Expiry radar: every dated credit pack across visible platforms, plus a
       * plan-cycle write-off (CodeArts reports one lump sum, not packs).
       */
      const expiry = useMemo(() => {
        const DAY = 86400000
        const now = Date.now()
        const horizon = now + 3 * DAY
        const items = []
        const cycle = []
        const nearest = []
        for (const id of order) {
          if (prefs.hidden[id] === true) continue
          const state = platforms[id]
          if (!state) continue
          const seed = PLATFORM_SEED.find((entry) => entry.id === id)
          const label = seed ? seed.label : id
          for (const row of state.accounts || []) {
            const packs = (row.packages || [])
              .filter((pkg) => typeof pkg.expireMs === 'number' && pkg.expireMs > now)
              .sort((left, right) => left.expireMs - right.expireMs)
            for (const pkg of packs) {
              if (pkg.expireMs > horizon) continue
              items.push({
                platform: label,
                account: row.nickname,
                name: pkg.name,
                remaining: pkg.remaining,
                at: pkg.expireMs,
              })
            }
            const writesOff = typeof row.expiring === 'number' && row.expiring > 0 && row.expiry
            // Plan-cycle write-off: one lump sum with the owner-reported date, so
            // it is shown on the bar itself rather than inside the 3-day list.
            if (writesOff) {
              const at = Date.parse(row.expiry + 'T23:59:59+08:00')
              if (Number.isFinite(at) && at > now) {
                cycle.push({ platform: label, account: row.nickname, remaining: row.expiring, at })
              }
            }
            // Nearest expiry for this account, however far away — the only thing
            // available when the upstream hands out no per-pack detail.
            let earliest = packs.length > 0 ? packs[0].expireMs : undefined
            if (earliest === undefined && row.expiry) {
              const at = Date.parse(row.expiry + 'T00:00:00+08:00')
              if (Number.isFinite(at) && at > now) earliest = at
            }
            if (earliest !== undefined) {
              nearest.push({
                platform: label,
                account: row.nickname,
                at: earliest,
                hasDetail: packs.length > 0,
                remaining: packs.length > 0
                  ? packs.reduce((sum, pkg) => sum + (pkg.remaining || 0), 0)
                  : undefined,
              })
            }
          }
        }
        items.sort((left, right) => left.at - right.at)
        nearest.sort((left, right) => left.at - right.at)
        cycle.sort((left, right) => left.at - right.at)
        return { items, cycle, nearest }
      }, [order, platforms, prefs.hidden, t])

      const refreshAll = useCallback(() => {
        refreshAuto()
        for (const id of order) refresh(id, false, true)
      }, [order, refresh, refreshAuto])

      return h('div', { style: S.page },
        h('div', { style: S.headRow },
          h('div', null,
            h('h1', { style: S.title }, t('title')),
            h('p', { style: S.subtitle }, t('subtitle') + '  ·  v3'),
          ),
          h('div', { style: { display: 'flex', gap: 8 } },
            h('button', { style: S.iconBtn, onClick: refreshAll }, t('refreshAll')),
            h('button', { style: S.iconBtn, onClick: backToConversation }, t('back')),
          ),
        ),
        h('div', { style: S.newsBar },
          h('span', { style: S.newsLabel }, t('newsLabel')),
          h('a', {
            href: 'https://freeegg.top',
            target: '_blank',
            rel: 'noopener noreferrer',
            style: S.newsLink,
          }, t('linkFreeegg')),
          h('a', {
            href: 'https://token.pencilai.top/',
            target: '_blank',
            rel: 'noopener noreferrer',
            style: S.newsLink,
          }, t('linkPencil')),
          h('a', {
            href: 'https://yangmao.ai/zh/',
            target: '_blank',
            rel: 'noopener noreferrer',
            style: S.newsLink,
          }, t('linkYangmao')),
          h('span', { style: S.newsNote }, t('newsNote')),
        ),
        h('div', { style: S.summary },
          h('div', { style: S.statCard },
            h('div', { style: S.statLabel }, t('totalCredit')),
            h('div', { style: S.statValue }, formatCredit(totals.credit)),
          ),
          h('div', { style: S.statCard },
            h('div', { style: S.statLabel }, t('checkedIn')),
            h('div', { style: S.statValue }, totals.already + ' / ' + totals.claimable),
          ),
          h('div', { style: S.statCard },
            h('div', { style: S.statLabel }, t('interval')),
            h('div', { style: S.statValue }, DEFAULT_INTERVAL / HOUR + 'h'),
          ),
        ),
        h(ExpiryBar, { t, expiry }),
        order.filter((id) => prefs.hidden[id] !== true).map((id) => {
          const seed = PLATFORM_SEED.find((entry) => entry.id === id)
          if (!seed) return null
          return h(PlatformRow, {
            key: id,
            seed,
            state: platforms[id],
            auto,
            ledger,
            history: history[id] || [],
            t,
            interval: intervalOf(id),
            collapsed: prefs.collapsed[id] === true,
            onRefresh: refresh,
            onClaim: claim,
            onInterval: setIntervalFor,
            onCollapse: (id) => {
              const wasCollapsed = prefs.collapsed[id] === true
              toggleCollapsed(id)
              if (wasCollapsed) {
                const state = platforms[id]
                if (!state || !state.at) refresh(id)
              }
            },
            onHide: toggleHidden,
            onDragStart: (from) => { dragFrom.current = from },
            onDrop: (to) => { if (dragFrom.current) move(dragFrom.current, to); dragFrom.current = null },
          })
        }),
        (() => {
          const hiddenIds = order.filter((id) => prefs.hidden[id] === true)
          if (hiddenIds.length === 0) return null
          return h('div', { style: S.hiddenRow },
            h('span', { style: S.muted }, t('hiddenLabel')),
            hiddenIds.map((id) => {
              const seed = PLATFORM_SEED.find((entry) => entry.id === id)
              return h('button', {
                key: id,
                style: S.iconBtn,
                title: t('showAgain'),
                onClick: () => toggleHidden(id),
              }, (seed ? seed.label : id) + ' ↺')
            }),
          )
        })(),
      )
    }

    const inject = ['slots', 'locale']

    function apply(ctx) {
      const namespace = 'credit-dashboard'
      ctx.effect(
        () => ctx.locale.register(namespace, { zh: ZH, en: EN }),
        'credit-dashboard: copy',
      )
      const t = ctx.locale.bind(namespace)
      const backToConversation = () => {
        try { ctx.get('layout')?.selectPanel?.(null) } catch { /* older shell */ }
      }
      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 60,
          label: () => t('tabLabel'),
          locale: namespace,
        }, PanelIcon),
      )
      ctx.slots.inject('main', () =>
        ctx.slots.register({
          name: 'main',
          key: PANEL_ID,
          locale: namespace,
          inject: () => ({ t, backToConversation }),
        }, DashboardPage),
      )
    }

    return { inject, apply }
  },
})