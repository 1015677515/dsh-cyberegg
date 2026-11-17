# Changelog

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