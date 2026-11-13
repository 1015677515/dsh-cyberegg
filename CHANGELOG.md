# Changelog

## 0.1.0 — 2026-11-13

首个公开版本。

- 侧栏面板：一页看完全部平台的剩余积分与今日签到状态
- 每个平台独立刷新间隔（15m / 30m / 1h / 2h / 4h / 6h / 手动），默认 2h
- 平台可拖动排序、可折叠（折叠后不自动刷新）、可隐藏（隐藏后不计入统计）
- 手动签到：**以签到前后余额实际增加为准**；上游说成功但余额没动会标记「签到未生效」
- 近两天积分变化记录，用于事后核对
- 数据来源全部借用已装插件的只读路由：`dsh-our-free-model`（channel-pack RPC）、`dsh-connect-workbuddy`、`dsh-codearts`
- 自带两个 Host 侧读取器：WPS 灵犀（Cookies SQLite / 手填 sid）与 MobileClaw（App 日志）
- 不引入登录界面；页面只拿到数字，拿不到任何 token