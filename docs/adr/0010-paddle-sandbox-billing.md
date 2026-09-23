# 0010 — Paddle Sandbox 替代 Stripe 与 Billing 占位

- 状态：Accepted
- 记录日期：2026-09-21
- 决策日期：2026-09-21（本会话明确实施授权日期）
- 记录性质：当次记录
- 替代：[0009](0009-billing-preview-without-payment-entitlements.md)
- 被替代：无

## 背景与约束

用户明确要求按此前 Billing 流程实现代码，并弃用 Stripe、改用 Paddle，同时更新文档。旧版本只有 Free 用量、静态套餐和 501 Webhook，没有已上线的 Stripe 客户、订阅数据或迁移需要转换。

用户指出选择原因见另一对话“面试训练模式推荐”。当前会话没有该对话正文或可用的会话检索工具，因此不编造切换的商业、账户或税务原因；可确认的是本次明确的提供方选择。若后续获得原对话，可补充可核实来源与日期。

项目仍为作品展示，禁止真实收款。`plan.pdf` 是原计划且被 Git 忽略；其中 Stripe 提供方与“Billing 占位”内容由本次明确授权及本 ADR 替代，其他产品范围保持原约束。

## 考虑过的方案

| 方案 | 优点 | 成本与限制 | 取舍 |
| --- | --- | --- | --- |
| 保留占位 | 不依赖支付配置 | 无法展示付款与订阅闭环 | 已被新需求替代 |
| 按原计划接 Stripe | 延续原计划术语 | 用户已明确弃用 | 不采用 |
| Paddle Sandbox | 满足用户选择，能展示结账与订阅生命周期 | 必须配置 Sandbox catalog、凭据和 Notification Destination | 采用 |

## 决策与理由

- 使用官方 `@paddle/paddle-node-sdk` 调用 API 与验签，`@paddle/paddle-js` 提供 overlay checkout。SDK 显式锁定 sandbox，配置校验拒绝 Live API key / client token。
- 一个 Pro 月付套餐，沿用既有页面 USD 19/月；无试用，最终税费由 Checkout 显示。服务端校验 Price 的月周期、USD 1900 和无 trial，防止配置错误静默改变商品。
- 使用 Paddle 托管 Customer Portal 提供取消续订、付款方式和发票管理，不再编写第二套账单管理界面。
- 成功回跳复用 `/dashboard/billing?checkout=return`。查询参数只触发“正在确认”，不证明付款；短时轮询与恢复策略见 [0011](0011-local-entitlements-and-reconciliation.md)。
- 公开浏览在支付配置缺失时仍可用；Billing 显示未配置并禁用操作，不能用占位或假数据模拟真实成功。

## 影响与代价

- 删除 Stripe Route、空 SDK 文件、占位 service/test 和环境变量；没有旧 Stripe 数据迁移。
- 新增 `0002_paddle_billing.sql`，在目标环境启用支付配置前必须应用。迁移不在请求、启动或构建时运行。
- 部署环境与支付环境是两个概念：Vercel Production Demo 仍使用 Paddle Sandbox，数据库与凭据按应用环境隔离。
- 当前 Figma 工具仅返回 `_tokens`，设计上下文读取报告“未选中节点”；离线 `docs/design-system.md` 缺失。因此沿用既有页面、`globals.css` 语义 Token 与 UI 原语，不能声称已完成画板逐项核对。

## 实施与验证

已实现页面、Actions、数据库 schema/migration、Webhook、Cron 和测试。具体执行结果见 README 的 Billing 验证记录。2026-09-21 实施验证时未取得可用的 Paddle MCP 工具与 Sandbox 凭据，因此当时未创建远端资源或执行测试卡付款。

2026-09-22 补充验证：已注册 Sandbox MCP，并通过其远端协议验证连接、创建及回读 Pro 商品和 USD 19/月价格（无试用、数量固定为一、`saas` 税类）；已创建 Sandbox 客户端 Token，并在未被 Git 跟踪的本地环境文件中配置价格、Token、Sandbox API Key 与随机 Cron Secret。Webhook 回调环境与签名 Secret、开发数据库迁移及端到端付款仍未完成验证。此次补充仅更新实施证据，不改变技术选择；Accepted 不表示云端联调已验收。

## 重新评估条件

需要真实收款、年付、试用、多个套餐、退款自动撤权或自建账单管理时，重新评估价格模型、身份验证、权限政策及外部配置；不得仅切换一个环境变量上线 Live。

## 相关证据

- 2026-09-21 本会话用户明确“支付系统改用 paddle……弃用 stripe……实现 billing 的支付流程”。
- [Billing 页面](../../src/app/dashboard/billing/page.tsx)、[Paddle 配置](../../src/features/billing/server/config.ts)、[服务端 SDK](../../src/features/billing/server/paddle.ts)、[迁移](../../drizzle/0002_paddle_billing.sql)。
- [Paddle transaction checkout](https://developer.paddle.com/build/transactions/pass-transaction-checkout/)、[Customer Portal](https://developer.paddle.com/build/customers/integrate-customer-portal/)。
