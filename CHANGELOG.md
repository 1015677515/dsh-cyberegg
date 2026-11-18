# Changelog

## 0.1.4 — 2026-11-18

- **签到判定收敛成一条规则**：今日积分确实增加（领取账本实测，或跨日快照对比）**或**上游明确说今天已成功（平台 status 的 `checkedIn`、渠道的「1 个 +400积分／今天已领」、领取时上游回「今天已领」），任一成立即确认。**「余额里还有每日额度」不再是证据**——商汤那种 7 天有效期的每日包会连续 7 天谎报「今日已发放」，而渠道自己写着「无签到接口」
- **徽章与顶部统计同源**（都走 `isRowDone`）：以前两处各算一套，出现「行内未发放、顶部却计入已到账」的分叉
- **新增「每日包反推发放日」**：包本身带到期时间时，`到期 − 有效期天数` 就是发放时刻。Loomy（当日 24:00 作废，包在即今天发的）与商汤（7 天）因此**在首次安装、基线丢失、网页端签到面板没看见的情况下也能判**
- **不能手动领取的平台（`claim: 'link'`，目前是商汤）点「打开网页」时钉住当前余额**，领完回来刷新即与它比对——那是面板唯一能证明网页端签到的办法
- **跨日基线改为「昨天最后一次读数」**：原来拿「今天首次读数」当基线，如果先领完才打开面板，首次读数已经包含发放，比对结果恒为 0
- **CodeArts 的 `expired` 不再渲染成一条空行**：明确写出「凭据已过期」，并按 `keeper.alive` 区分「保活会把 token 续上」与「未开启保活，每 2 小时到期一次」；徽章变「需登录」、整行签到按钮置灰。读到未登录／过期时自动带 `?force=1` 重读一次，解决「刚登录却什么都不显示」
- **CodeArts 明细分三档**：永久额度（`basic`）/ 非永久额度（`bonus`）/ 本周期到期额度（`total.expiring`），明细走精确到分，不用 `10.1k` 缩写
- **顶部汇总重做**：「今日到账 N / M」，分母包含自动发放与网页领取（以前把它们排除在外，才会出现「屏幕 9 行、右边写着 8/8」）；卡片下方直接点名未到账的平台
- **「没证据」单独成档**：无任何观测时显示「待确认」，不再断言「未发放」；首装当天另有一行「基线正在建立」，说明明日起才能自动判定
- **历史快照搬到 Host 侧落盘**（`~/.dsh/dsh-cyberegg/store.json`）：`localStorage` 按 origin 隔离，而 DSH 每次启动的环回端口可能变（实测同一天 57424 → 59832 → 65311），换端口基线即丢，整面板退化成「未确认」
- **同一次刷新只落盘一次**：客户端 150 ms 防抖合并，`raw` 按键深合并；Host 侧写串行化 + `tmp` + `rename` 原子写，避免并发读改写互相覆盖
- **Host 路由加固**：请求体上限 1 MB；lingxi / mobileclaw / mascot / store 四条路由统一校验 socket 对端与 `Host` 头（拒绝 DNS rebinding 改写快照）
- **新增「★ Star」按钮**（标题栏右侧）：打开 [github.com/1015677515/dsh-cyberegg](https://github.com/1015677515/dsh-cyberegg)。刻意做成链接而不是真发 `PUT /user/starred`——那需要本包持有一个 PAT，与本包「从不持有 token」的前提冲突
- **WorkBuddy 积分详情改指** `workbuddy.cn/profile/plans-usage`（原来指向 `codebuddy.cn` 首页，看不到用量）
- **CodeArts 备注改成「默认签到 100/天，具体以实际为主」**：100 是默认值，参加活动期间会更高
- **Loomy 归入自动发放**（`claim: 'auto'`）：它的每日 5000 由 channel-pack 自己领，不需要按钮，徽章改为「自动发放／未自动发放」并单独判定

## 0.1.3 — 2026-11-17

- **WorkBuddy 国际服改为默认隐藏**：默认隐藏的现在是三行（国际服、WPS 灵犀、MobileClaw）。国际服只有登录过国际区才有数据，平时占一行不太值；底部「已隐藏：…」一点即恢复，位置不丢
- 默认隐藏仍然只有一个开关：`PLATFORM_SEED` 里的 `defaultHidden: true`，`DEFAULT_HIDDEN` 由它派生
- **每个平台都补了「积分详情」按钮**（已有 Qoder 中国/国际、CodeArts、Trae 国际版的 4 个保留不动）：新增 Loomy（loomy.xunfei.cn）、WorkBuddy 国内（codebuddy.cn）、WorkBuddy 国际服（workbuddy.ai）、Raccoon（xiaohuanxiong.com）、Trae 国内（trae.cn）、MiniMax（agent.minimax.cn）、WPS 灵犀（lingxi.wps.cn）、TeleAgent（agent.teleai.com.cn）。**MobileClaw 没有**——它没有公开的用量页，数据只来自本机 App 日志
- TeleAgent 备注写明「每天签到 100 积分」——与插件源码注释里 2026-11-04 的抓包样例 `daily_claimable_points: 100` 一致
- **新增 TeleAgent（中国电信天翼 AI 星辰）一行**，默认显示、排在最后：走 `dsh-connect-teleagent` 的 `/api/teleagent-connect` RPC（该插件只注册了这一条通道，没有 `/plugins/` 路由）。读 `status` → 未登录/凭据过期就占位给提示（不当成读取失败），已登录才去拉 `credits.balance` + `credits.status`；签到先查 `credits.status.claimed`，今天是已领就直接报「今天已领」，不打扰上游
- **新增 Trae 国际版一行**（`?region=ai`，默认隐藏）：`readTrae` 与签到原先不带 region，而该路由缺省即国内版——所以以前登录了国际版也读不到。国际版**没有积分池**（`payStatus.payIdentityStr: Free`、`isDollarUsageBilling: true`、`credits` 为空、`checkinSupported: false`），上游只下发套餐档位，因此这一行显示账号与「免费档 · 按美元计费 · 无积分池、不支持签到」，不显示数字
- `claim: 'none'` 这一档：不支持签到的平台（Trae 国际版）不再渲染签到按钮、也不计入「今日签到」分母
- **Qoder 备注改成「约 30 天有效（资源包声明，未逐笔核对）」**：原来那句把资源包的静态声明 `validity: RELATIVE_DAYS 30` 写成了确定的「领取后 30 天」，而我们拿不到逐笔的 `validityDays`（它在活动的 `campaign` 对象里，`our-free-model` 的 `claimAll` 不透出）

- **WPS 灵犀、MobileClaw 的备注加「未经详实测试」**：这两条的有效期结论来自少量样本（灵犀本机没登录、MobileClaw 只有几天日志），README 支持矩阵的核对列同步标了「未实测 / 未经详实测试」
- **TeleAgent 在 README 里标「待验证」，不进「推荐插件」**：推荐仍是三位（`dsh-our-free-model` / `dsh-connect-trae` / `dsh-connect-workbuddy`）。TeleAgent 依赖表写 `⚠️ 待验证`，等实测一段时间再升级说法

## 0.1.2 — 2026-11-16

- 新增 **WorkBuddy 国际服** 一行（`region=global`），排在 WorkBuddy 下方；国内版与国际服是两条独立账号池，各自读取余额与签到
- **默认顺序重排**：Loomy → WorkBuddy → WorkBuddy 国际服 → CodeArts → Qoder 中国 → Qoder 国际服 → Raccoon → Trae → MiniMax → WPS 灵犀 → MobileClaw
- **WPS 灵犀、MobileClaw（中国移动）默认隐藏**（底部可一键恢复）；`PLATFORM_SEED` 的 `defaultHidden` 是唯一开关
- `loadPrefs` 加版本号：种子形状变化时用新默认顺序，同时保留用户自己的折叠 / 间隔 / 隐藏选择；旧顺序里缺失的新平台不会再被塞到列表末尾
- **积分回退顶层**：`pool.enabled: false`（国际服默认如此）时池行不带 `credits` 字段，改为回退读顶层 `credits.total`——国际服那行从此显示真实余额，不再是 `—`。空池时还会用顶层文档合成那一行，不再显示「无账号」
- **签到状态回退顶层** `checkin`，但 `checkin.active: false`（该区没开签到活动）一律报「未知」而不是「未签到」——没有活动不等于漏签
- 空账号池不再算读取错误（原来会显示「读取失败: empty payload」）
- 国际服备注写明「月度包 100 积分 · 每月刷新」（实测 `monthly: true`、`size: 100`、`credits.total = 93.09`）

## 0.1.1 — 2026-11-15

- 路由读取统一加 12 秒截止（`HTTP_TIMEOUT_MS`）：任一插件路由挂住时不再拖死整条串行队列——浏览器默认超时以分钟计，表现和面板死掉没有区别
- 手动签到判定改为**轮询余额**（最多 6 秒、每 700ms 读一次）：只有读到余额实际增加才算成功；窗口内没读到增加显示**「延迟超时」**，不再断言「签到未生效」——窗口关闭只说明还没到账，不能证明领取失败
- `package.json` 增加 `engines.dsh: ">=0.2.0"`：市场索引里的兼容范围就取自这个字段，缺了它在 Discover 里没有适用范围声明
- 新增 `test/contract.test.mjs`（9 项契约测试）：内联文案与 `locale/*.json` 一致、`t()` 用到的键都存在、所有路由读取都走截止封装、签到判定不回退成固定 sleep、平台依赖表登记完整
- npm 上 `0.0.0-stage` 空占位包已标记 deprecated（`0.1.0` 不受影响）

## 0.1.0 — 2026-11-14

首个公开版本。

- 侧栏面板：一页看完全部平台的剩余积分与今日签到状态
- 每个平台独立刷新间隔（15m / 30m / 1h / 2h / 4h / 6h / 手动），默认 2h
- 平台可拖动排序、可折叠（折叠后不自动刷新）、可隐藏（隐藏后不计入统计）
- 手动签到：**以签到前后余额实际增加为准**；上游说成功但余额没动会标记「签到未生效」
- 近两天积分变化记录，用于事后核对
- 到期预警：按「到期日」逐日归并，只统计 3 天内；展开可看每天到期的具体金额
- 每个平台带一行备注：签到额度 + 有效期；无法验证的明确写「有效期未验证」
- 数据来源全部借用已装插件的只读路由：`dsh-our-free-model`（channel-pack RPC）、`dsh-connect-workbuddy`、`dsh-codearts`
- 自带两个 Host 侧读取器：WPS 灵犀（Cookies SQLite / 手填 sid）与 MobileClaw（App 日志）
- 不引入登录界面；页面只拿到数字，拿不到任何 token
- 面板右下角装饰底图（`assets/cyberegg-mascot.webp`），`pointer-events: none` 且只占内容列右侧空白，不挡文字、不拦截点击；文件缺失时自动不渲染
- 未安装依赖插件时给出「装什么」的明确提示：顶部按插件聚合为一条（列出受影响平台 + 安装命令 + 仓库链接），与「已装但凭据失效」严格区分
- Trae 改读 `dsh-connect-trae` 的 `/usage`：拿到厂商包名（新用户福利 / 签到奖励 / 每月登录赠送）、逐包到期日、以及账号级签到状态

### 数据核对记录（2026-11-14）

| 平台 | 核对方式 | 结果 |
|---|---|---|
| **WorkBuddy** | 25 个积分包与官方界面逐条比对（到期时间戳 + 金额 + 总额） | 24/24 精确匹配，合计 3171.02 = `total` 字段。接口 `packageName` 是内部代号，与界面友好名不同（一个代号对应多个活动名），故不显示包名 |
| **Trae (CN)** | 直连 `ide_user_ent_usage`，与界面明细比对 | 23 个包一致；签到奖励 100/天，30 天有效（反推领取日 11-14 → 到期 12-14，连续无跳号） |
| **Raccoon (商汤)** | 完整积分流水归纳 | 11-12 之前 16 笔「当日 24:00 清零」；11-12 起 3 笔「发放日 +6 天」。故每日池为**发放后 7 天有效** |
| **Qoder** | 直连 `/sash/api/v2/me/usage` 与 `/me/campaigns` | `expiresAt` 恒为 `9999-12-31`（表示永不过期，已过滤）；逐包明细接口不存在（25 个候选路径全 404），只给 `addOnQuota` 汇总 |
| **Loomy** | `/points/records` 实测 | 永久池 + 每日池分开；每日池 5000，登录后重置 |
| **CodeArts** | `statistics/plugin` | 只有四类聚合（total/bonus/basic/onDemand），无批次明细；周期末作废额可直接读 |
| **MiniMax / WPS 灵犀** | 未取得有效期字段 | 备注中明确标注「有效期未验证」 |