# 0022 — 提交反馈入口使用原生锚点导航

- 状态：Accepted
- 记录日期：2026-10-11
- 决策日期：2026-10-11
- 记录性质：当次记录
- 替代：无
- 被替代：无

## 背景与约束

用户报告进入提交反馈表单时地址变为 `/p/[slug]#submit-feedback#submit-feedback`。代码及本地 HTTP 响应中的入口均只有一个 `#submit-feedback`，表单 ID 也只有一个。

本地 Next.js 16.2.10 的客户端导航实现中，动态响应的 canonical URL 默认保留 fragment，并可能写入路由缓存；命中缓存的导航再执行 `route.canonicalUrl + url.hash`。当缓存地址已含 fragment 时，这条路径可重复拼接 fragment。这是根据依赖源码作出的原因判断；本次浏览器连接失败，尚未现场复现用户的具体点击序列。

反馈详情页二级导航和“还有其他建议？”卡片还同时提供提交入口，用户要求只保留后者。

## 考虑过的方案

| 方案 | 优点 | 成本与限制 | 取舍理由 |
| --- | --- | --- | --- |
| 两处表单入口使用原生 `<a>` | 浏览器直接解析完整目标及 fragment，不经过客户端路由缓存 | 跨页会完整加载页面 | 选择；范围小，保留链接及键盘行为 |
| 修改依赖或统一拦截并清洗 URL | 可保留客户端软导航 | 影响范围大，需维护依赖补丁或全局状态逻辑 | 不采用 |

## 决策与理由

仅将公开项目二级导航及反馈详情页卡片中的提交反馈链接改为原生 `<a href="/p/[slug]#submit-feedback">`，由浏览器完成导航和表单定位。其他页面链接继续使用 Next.js Link。详情页传入 `showSubmitFeedback={false}`，保留下方卡片入口。

## 影响与代价

- 提交入口不经过 Next.js 客户端缓存，目标地址保持单个表单锚点。
- 从路线图或详情页点击会完整加载反馈板，失去这两处链接的软导航与预取收益。
- 已存在地址栏中的重复 fragment 不自动改写；后续通过修复后的链接进入会使用正确地址。
- 无数据库、迁移、环境变量或依赖变更。

## 实施与验证

- 已修改两处入口并移除详情页二级导航提交按钮。
- 本次完整单元/组件测试通过：57 个文件、308 个用例；包括详情页只有一个提交入口及路线图入口目标的断言。
- 本次 lint、typecheck 通过；本地 HTTP 检查反馈板、路线图和详情页均为 200，详情页仅一个提交链接，路线图一个提交链接，均为单个 fragment。
- 浏览器连接失败，未完成真实浏览器点击和滚动定位验证。

## 重新评估条件

Next.js 升级并验证缓存导航不再重复 fragment 后，可评估恢复 Link。若浏览器复现表明另有原因，按实际证据调整修复。

## 相关证据

- [公开项目二级导航](../../src/features/feedback/components/public-project-header.tsx)
- [反馈详情页](../../src/app/p/[slug]/feedback/[id]/page.tsx)
- [详情页回归断言](../../tests/unit/feedback-detail-page.test.tsx)
- 本地依赖 `next/dist/client/components/segment-cache/navigation.js`、`segment-cache/optimistic-routes.js`、`router-reducer/create-href-from-url.js` 与 `router-reducer/fetch-server-response.js`（版本由 package.json 固定）。
