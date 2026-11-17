# 赛博鸡蛋查询 · Cyber Egg

> 一个面板，看全你机器上所有能白嫖的积分余额和每日签到状态。
> **只做两件事：查询、手动签到。** 不替你登录，不自动签到，不保存任何凭据。

[![dsh](https://img.shields.io/badge/dsh-%E2%89%A50.2.0-4B32C3)](https://github.com/deepseek-ai/dsh)
[![license](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

---

## 它是什么

装进 DeepSeek Harness 之后，侧栏多一个图标，点开是一张表：每行一个平台，显示**剩余积分 / 今天签到没有 / 一个手动签到按钮**。

它**不自己发明数字**。每个平台的数值都读自该平台已有的插件或本机 App 自己写下的记录——所以面板上的数和你打开那个 App 看到的数应该一致。

### 明确边界（请先读这段）

| 它做 | 它不做 |
|---|---|
| 读各平台已经存好的余额与签到状态 | ❌ 不弹任何登录/授权界面 |
| 你点「签到」时，调该平台已经存在的签到接口 | ❌ 不自动签到（自动签到交给各插件自己的功能） |
| 展示签到前后余额变化，只有真的涨了才算成功 | ❌ 不保存、不转发任何 token / cookie |
| 记录你自己设的刷新间隔、排序、折叠、隐藏 | ❌ 不改上游账号的任何设置 |

---

## 依赖：装了才有数，没装就空着

**本插件是聚合层，不是数据源。** 下面这些插件是它的数据来源，**缺任何一个只是少几行，不会报错**。
缺哪个插件，面板顶部会给出**一条**汇总提示（不是每行一条），附带安装命令与仓库地址。

| 平台 | 数据来自 | 推荐 |
|---|---|---|
| Loomy · MiniMax Code · Qoder 国际 · Qoder 中国 · Raccoon (商汤) | [`dsh-our-free-model`](https://github.com/Ebony-Vinyl/dsh-our-free-model) 的 channel-pack RPC | ✅ 强烈推荐 |
| **Trae（国内版 / 国际版）** | [`dsh-connect-trae`](https://github.com/dingminhua/dsh-connect-trae) 的 `/usage` 文档（`?region=cn` / `?region=ai`） | ✅ 推荐（比 channel-pack 多签到状态与厂商包名） |
| WorkBuddy（腾讯 CodeBuddy，**国内版 + 国际服**） | [`dsh-connect-workbuddy`](https://github.com/dingminhua/dsh-connect-workbuddy) | ✅ 推荐（`?region=cn` 与 `?region=global` 是两条独立账号池，面板各占一行） |
| CodeArts（华为云） | [`dsh-codearts`](https://github.com/elegant01/dsh-codearts) | 可选 |
| TeleAgent（中国电信天翼 AI 星辰） | [`dsh-connect-teleagent`](https://github.com/alvinhuang0509-design/dsh-connect-teleagent) 的 `/api/teleagent-connect` RPC | ⚠️ **待验证**（新接入，作者仍在实测；读 `credits.balance` / `credits.status`，领取走 `credits.claim`） |
| WPS 灵犀 | 本插件自带（读灵犀桌面端 Cookies，或手填 `wps_sid`） | 可选 |
| MobileClaw（移动云震泽） | 本插件自带（读 App 自己的日志） | 可选 |

三个推荐插件的共同点：它们各自管账号、自动签到、模型接入；**本插件只借用它们已经提供的只读路由**，不重复实现登录。

> 如果你一个都没装，面板会正常打开：顶部给出一条「未安装 <插件名>」的提示（附安装命令与仓库地址），对应的行显示「无账号」。这是预期行为，不是 bug。

---

## 支持矩阵

「核对」一列说明该平台的数字是否被逐条比对过，而不是"看起来对"。

| 平台 | 剩余积分 | 今日是否签到 | 手动签到 | 核对 | 备注 |
|---|:---:|:---:|:---:|:---:|---|
| WorkBuddy（国内版） | ✅ 每账号 | ✅ 账号级 | ✅ **仅当前账号** | ✅ 逐包 | 签到 100/天，30 天有效 |
| WorkBuddy 国际服 | ✅ 每账号 | ✅ 账号级 | ✅ **仅当前账号** | ✅ 实测余额 | 月度免费包 **100 积分 · 每月刷新**；签到活动当前未开启（`active: false`） |
| Trae（CN） | ✅ | ✅ **账号级** | ✅ | ✅ 逐包 | 签到 100/天，30 天有效；读 `dsh-connect-trae` 的 usage |
| Trae 国际版 | — 无积分池 | — 不支持签到 | — | ⚠️ 无数字可核 | **免费档 + 按美元计费**（`payIdentityStr: Free`、`isDollarUsageBilling: true`）。上游这个接口只给套餐档位（Free/Pro），不下发额度数值，所以这一行只显示账号与「无积分池」，右侧「积分详情」按钮直达国际服官网 |
| Qoder 国际 / 中国 | ✅ 汇总 | ✅ | ✅ | ⚠️ 仅汇总 | 每日 10:00 刷新（`refreshHourUtc8`）。上游 `/me/usage` 里 `userQuota` / `addOnQuota` 是汇总，只有 `dedicatedResourcePackages` 才是逐条；而 `displayMode: enterprise` 时插件直接返回 null，**企业号读不到任何额度**——官网 usage 页仍可看 |
| Loomy | ✅ 永久池 + 每日池 | ✅ | ✅ 每日额度初始化 | ✅ 实测 | 每日池 5000，登录后重置 |
| Raccoon (商汤) | ✅ 奖励池 + 每日池 | ✅ 每日池已发放 | — 走网页 | ✅ 流水归纳 | 每日 300 有两个来源：服务端自动发放（约 1 天）、网页签到（7 天）；桌面端无可用签到接口 |
| CodeArts | ✅ 套餐剩余 + 过期日 | ✅ 每日福利 | ✅ | ⚠️ 仅汇总 | 签到 100/天；批次明细走官网 |
| MiniMax Code | ✅ | ✅ 账号级 | ✅ | ✅ 签到 | **签到 400/天，连签日 1000 · 1 个月有效**（7 次实测：400 400 400 **1000** 400 400 **1000**；`claim` 回 `points`，数值由上游给） |
| WPS 灵犀 | ✅ 累计智点 | ✅ 连续天数 | ✅ | ⚠️ **未实测** | **有效期未验证 · 未经详实测试**；需灵犀已登录或手填 sid |
| MobileClaw | ✅ token 余额 | ✅ 今日打卡礼是否到账 | — 只读 | ✅ 日志 | 打卡礼 100 万 token/天，30 天有效；**未经详实测试** |
| TeleAgent (天翼 AI) | ✅ | ✅ 今日是否已领 | ✅ | ⚠️ **未经详实测试** | 每日签到 **100/天**（额度由上游下发，`dailyClaimablePoints`）；刚接入、仍在实测，**未登录或 token 过期时这一行会占位提示**，而不是报「读取失败」 |

---

## 安装

```bash
# 从 npm 装（推荐：版本固定，不用每次拉整个仓库）
dsh plugin --profile <你的 profile> add dsh-cyberegg

# 从 GitHub 装（想跟着 main 的最新提交时用）
dsh plugin --profile <你的 profile> add github:1015677515/dsh-cyberegg
```

装完刷新页面，侧栏出现「积分」图标。npm 上的当前版本：https://www.npmjs.com/package/dsh-cyberegg

### 卸载

```bash
dsh plugin --profile <你的 profile> remove dsh-cyberegg
```

---

## 使用

- **刷新**：默认每平台 2 小时自动刷一次；每个平台可单独设 15m/30m/1h/2h/4h/6h/手动，也可以只点它自己的「刷新」
- **排序**：拖动平台行
- **折叠**：点平台名折叠该组（折叠的平台不自动刷新，展开时才拉）
- **隐藏**：平台名旁「隐藏」按钮；隐藏后从统计里剔除，底部「已隐藏：…」可恢复
- **签到**：点行尾按钮。判定只看**余额有没有真的变多**，不看上游怎么回话：读到增加 → 绿色 `+N`；上游说今天已领 → 灰色「今天已领」；**等满 6 秒仍没读到增加 → 黄色「延迟超时」**（附上游原话）。窗口内没读到不等于领取失败，过几分钟刷新再看
- **到期预警**：按「到期日」逐日归并，只统计 3 天内的金额；CodeArts 这种只给汇总额的，单独显示「周期末总共作废 + 到期日」。展开可看每天到期的具体金额
- **近两天历史**：每个平台展开后底部有近两天的总积分变化，用来事后核对
- **平台备注**：每行下面一行小字说明「签到给多少 + 有效期」，无法验证的会明确写「有效期未验证」
- **积分详情**：每行右侧的「积分详情」按钮直达该平台自己的用量/账单页——Loomy、WorkBuddy（国内 / 国际）、CodeArts、Qoder（中国 / 国际）、Raccoon、Trae（国内 / 国际）、MiniMax、WPS 灵犀、TeleAgent 全都有；**只有 MobileClaw 没有**（它没有公开的用量页，数据来自本机日志）
- **默认顺序**：Loomy → WorkBuddy → WorkBuddy 国际服 → CodeArts（华为云）→ Qoder 中国 → Qoder 国际服 → Raccoon（商汤）→ Trae → Trae 国际版 → MiniMax → WPS 灵犀 → MobileClaw → TeleAgent。拖动即可改成你自己的顺序
- **默认隐藏**：**WorkBuddy 国际服、Trae 国际版、WPS 灵犀、MobileClaw（中国移动）默认隐藏**——前两个只在你登录过对应国际区时才有内容（国际版还只有套餐档位、没有积分数字），后两个读的是本机 App 的数据；底部「已隐藏：…」一点即恢复，位置不会丢

---

## 本机路径（灵犀 / MobileClaw 专用）

| 用途 | 路径 |
|---|---|
| 灵犀 Cookies（只读 SQLite） | `%APPDATA%\WPS 灵犀\Cookies`（Windows）/ `~/Library/Application Support/WPS 灵犀/Cookies`（macOS） |
| 手填的 `wps_sid` | `%DSH_HOME%\dsh-cyberegg\lingxi-sid.json` |
| MobileClaw 日志（只读） | `%LOCALAPPDATA%\com.cmss.mobileclaw-desktop\logs\MobileClaw-YYYY-MM-DD.log` |

手填 sid（灵犀没装或 Cookies 加密时）：

```bash
curl -X POST "http://127.0.0.1:<DSH端口>/plugins/dsh-cyberegg/lingxi?action=sid" \
  -H "content-type: application/json" -d "{\"sid\":\"你的wps_sid\"}"
```

清空：`-d '{"sid":""}'`。

---

## 隐私

- 面板里出现的只有**数字**。`wps_sid` 只存在于 Host 半身内存与上面那个 `lingxi-sid.json`（你自己填的），**永远不回传给页面**。
- 不收集遥测，不发任何自建服务器请求。
- 所有网络请求只发往两处：**本机 loopback**（各依赖插件自己的 `/plugins/`、`/api/` 路由，以及灵犀/MobileClaw 的两个本地读取器），或**平台官方域名**（本插件自己只连 `lingxi.wps.cn` / `wps.cn` 这两个）。本插件不直连任何第三方站点，也没有自建服务器。

---

## 已知限制

1. **不做自动签到**。各平台自己的插件都有自动签到，本插件不重复实现，避免一天内多打一次上游。
2. **MobileClaw 只读**：它的 token 由 App 用 AES-GCM 加密，密钥来自 App 懒加载的 `master.key`，外部拿不到；面板读它日志里的余额快照，所以只有 App 运行过才会更新。
3. **Raccoon 桌面端没有可用的每日签到接口**——底层 `credits.claimAll` 对 Raccoon 直接返回「不支持每日签到」，每日积分由服务端自动发放，因此按钮跳转网页。上游是否另有签到端点未验证。
4. 平台接口都是各 App 的非公开接口，**上游改版会失效**——失效时该行会显示具体错误码，而不是空白。

---

## 注意事项：上游的限流与账号上限

下面几条**不是本插件的限制**，是上游平台自己的行为——它们决定了每个平台「能白嫖多少、什么时候会被掐」。装之前先读一遍，省得把上游的限流当成插件读错了数。

| 平台 | 会遇到什么 |
|---|---|
| **CodeArts（华为云）** | 免费 DeepSeek **有上下文长度限制**；**最多开 2 个账号**，多开不会多给额度；**高峰期会被付费用户挤占通道**，表现为变慢或排队——这不是本插件读错 |
| **Qoder 国际 / 中国** | DeepSeek **超出频率会被强制暂停**，过一段时间自动恢复，不是封号 |
| **Raccoon（商汤）** | 同样：DeepSeek 超出频率强制暂停，过段时间恢复 |
| **WorkBuddy** | DeepSeek **每天请求过多会临时封禁 1 天**，次日自动解开 |

两点说明：

- 本插件的读取**刻意串行**（一次只问一个平台）、单次读取 **12 秒超时**，就是为了不主动撞上这些限流；面板每 2 小时才刷一次，也是同一个理由。
- 以上是作者实测得出的经验，不是上游写在文档里的承诺，随时可能变。

---

## 附：CodeArts 上下文预检的已知 bug（`dsh-codearts`）

用 CodeArts（华为 SNAP）跑长会话、又贴了图时，DSH 可能报 400：

```
上下文放不下：deepseek-v4.1-flash-1017 的窗口是 1048576 tokens，
本次请求估算约 1054215 tokens，剩余不足 1024 tokens 的生成余量。
```

真实占用远没到窗口上限，请求是被**本地预检**拒掉的。这条文案不在 DSH 内置逻辑里，也不来自上游网关——它在 `dsh-codearts` 自己的 `lib/usage-*.mjs`。

**原因**：预检用 `estimateTokens()` 逐字符扫描 `JSON.stringify(body.messages)`（CJK 记 1 token、其余 ÷4），而内联图片是 base64 字符串。一张 105KB 的 JPG 编码后约 14 万字符，按 ÷4 算成 **3.5 万 token**，而多模态模型实际只收 1100～1600 token。十几张图就能凭空多出上百万假 token。**base64 是传输编码，不是 token 来源。**

**必做的修复**

1. 统计前先扫 `image_url` 块，把图片字符数从估算里扣掉，再按张补回真实值（约 1600 token/张）：

```js
let imageChars = 0
let imageCount = 0
for (const message of body.messages ?? []) {
  if (!Array.isArray(message?.content)) continue
  for (const block of message.content) {
    if (block?.type !== 'image_url') continue
    imageCount += 1
    if (typeof block.image_url?.url === 'string') imageChars += block.image_url.url.length
  }
}
const rawTokens = estimateTokens(`${JSON.stringify(body.messages ?? '')}${JSON.stringify(body.tools ?? '')}`)
const promptTokens = Math.max(0, rawTokens - Math.ceil(imageChars / 4) + imageCount * 1600)
```

位置在 `~/.dsh/profiles/<profile>/node_modules/dsh-codearts/lib/usage-*.mjs` 的预检处（`lib/` 是构建产物）。

2. **锁版本**：把 `package.json` 里的 `"dsh-codearts": "^1.2.10"` 改成 `"1.2.10"`，或走 `pnpm.patchedDependencies`。插件升级**不是覆盖原文件**——`lib/usage-CjPd0Gok.mjs` 那种文件名里的哈希会变，旧 patch 文件会留在目录里但不再被引用，表现就是「修复突然失效」。

> 顺带一句：把 `estimateTokens` 的中文系数从 1 调到 0.7 也能让请求通过（放行量 +43%），但那是**放宽**而不是纠错——本地不拦了，改由上游返 `context too long`。图片那处才是量级修正。另外这套预检整个包在 `if (typeof body.max_tokens === "number")` 里，不带 `max_tokens` 的请求根本不走预检。

---

## 开发

纯 JS，无构建步骤。改 `client.js` 刷新页面生效；改 `index.js`（Host 半身）需要重载插件或重启宿主。

```
index.js           Host 半身：灵犀读 Cookies + 调 lingxi；MobileClaw 读日志；面板底图路由
client.js          浏览器半身：平台表、读取、签到、偏好、到期预警
cordis.patch.yml   bundle 挂载行
locale/*.json      文案
assets/icon.svg    宿主插件列表用的图标
assets/icon-*.png  市场卡片图标（市场只收 GitHub 托管的位图）
assets/cyberegg-mascot.webp  面板右下角的装饰底图（可选，缺失时面板正常显示）
```

### 关于底图

面板右下角那张装饰图由 Host 的 `/plugins/dsh-cyberegg/mascot` 路由提供，前端以
`pointer-events: none` + `opacity: 0.5` 渲染在内容层下方，宽度上限是内容列右侧的空白
（`calc((100vw - 1000px) / 2)`），因此不会压住任何账号行，也不会拦截点击。
文件缺失时路由返回 404，页面自动不渲染——不影响其它任何功能。

---

## License

MIT © 2026 1015677515