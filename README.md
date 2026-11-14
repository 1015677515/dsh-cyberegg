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
| **Trae（CN）** | [`dsh-connect-trae`](https://github.com/dingminhua/dsh-connect-trae) 的 `/usage` 文档 | ✅ 推荐（比 channel-pack 多签到状态与厂商包名） |
| WorkBuddy（腾讯 CodeBuddy） | [`dsh-connect-workbuddy`](https://github.com/dingminhua/dsh-connect-workbuddy) | ✅ 推荐 |
| CodeArts（华为云） | [`dsh-codearts`](https://github.com/elegant01/dsh-codearts) | 可选 |
| WPS 灵犀 | 本插件自带（读灵犀桌面端 Cookies，或手填 `wps_sid`） | 可选 |
| MobileClaw（移动云震泽） | 本插件自带（读 App 自己的日志） | 可选 |

三个推荐插件的共同点：它们各自管账号、自动签到、模型接入；**本插件只借用它们已经提供的只读路由**，不重复实现登录。

> 如果你一个都没装，面板会正常打开，但每行都会写着「读取失败」——这是预期行为，不是 bug。

---

## 支持矩阵

「核对」一列说明该平台的数字是否被逐条比对过，而不是"看起来对"。

| 平台 | 剩余积分 | 今日是否签到 | 手动签到 | 核对 | 备注 |
|---|:---:|:---:|:---:|:---:|---|
| WorkBuddy | ✅ 每账号 | ✅ 账号级 | ✅ **仅当前账号** | ✅ 逐包 | 签到 100/天，30 天有效 |
| Trae（CN） | ✅ | ✅ **账号级** | ✅ | ✅ 逐包 | 签到 100/天，30 天有效；读 `dsh-connect-trae` 的 usage |
| Qoder 国际 / 中国 | ✅ 汇总 | ✅ | ✅ | ⚠️ 仅汇总 | 每日 10:00 刷新；逐包明细接口不提供，走官网 |
| Loomy | ✅ 永久池 + 每日池 | ✅ | ✅ 每日额度初始化 | ✅ 实测 | 每日池 5000，登录后重置 |
| Raccoon (商汤) | ✅ 奖励池 + 每日池 | ✅ 每日池已发放 | — 走网页 | ✅ 流水归纳 | 每日 300，发放后 7 天有效 |
| CodeArts | ✅ 套餐剩余 + 过期日 | ✅ 每日福利 | ✅ | ⚠️ 仅汇总 | 签到 100/天；批次明细走官网 |
| MiniMax Code | ✅ | ✅ 账号级 | ✅ | ✅ 签到 | **有效期未验证** |
| WPS 灵犀 | ✅ 累计智点 | ✅ 连续天数 | ✅ | ⚠️ 未实测 | **有效期未验证**；需灵犀已登录或手填 sid |
| MobileClaw | ✅ token 余额 | ✅ 今日打卡礼是否到账 | — 只读 | ✅ 日志 | 打卡礼 100 万 token/天，30 天有效 |

---

## 安装

```bash
dsh plugin --profile <你的 profile> add github:1015677515/dsh-cyberegg
```

装完刷新页面，侧栏出现「积分」图标。

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
- **签到**：点行尾按钮。**只有签到前后余额真的增加，才显示绿色「已签到」**；上游说领了但余额没动，会显示红色「签到未生效」
- **到期预警**：按「到期日」逐日归并，只统计 3 天内的金额；CodeArts 这种只给汇总额的，单独显示「周期末总共作废 + 到期日」。展开可看每天到期的具体金额
- **近两天历史**：每个平台展开后底部有近两天的总积分变化，用来事后核对
- **平台备注**：每行下面一行小字说明「签到给多少 + 有效期」，无法验证的会明确写「有效期未验证」

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
- 所有网络请求都发往各平台官方域名（`lingxi.wps.cn`、`wps.cn`），或本机 loopback。

---

## 已知限制

1. **不做自动签到**。各平台自己的插件都有自动签到，本插件不重复实现，避免一天内多打一次上游。
2. **MobileClaw 只读**：它的 token 由 App 用 AES-GCM 加密，密钥来自 App 懒加载的 `master.key`，外部拿不到；面板读它日志里的余额快照，所以只有 App 运行过才会更新。
3. **Raccoon 每日积分是网页端发放**，桌面端接口没有该动作，因此按钮直接跳转网页。
4. 平台接口都是各 App 的非公开接口，**上游改版会失效**——失效时该行会显示具体错误码，而不是空白。

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
screenshots.json   市场详情页截图清单
```

### 关于底图

面板右下角那张装饰图由 Host 的 `/plugins/dsh-cyberegg/mascot` 路由提供，前端以
`pointer-events: none` + `opacity: 0.5` 渲染在内容层下方，宽度上限是内容列右侧的空白
（`calc((100vw - 1000px) / 2)`），因此不会压住任何账号行，也不会拦截点击。
文件缺失时路由返回 404，页面自动不渲染——不影响其它任何功能。

---

## License

MIT © 2026 1015677515