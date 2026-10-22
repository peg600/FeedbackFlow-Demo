# 0027 — Production Demo 复用 Sandbox 配置

- 状态：Accepted
- 记录日期：2026-10-22
- 决策日期：2026-10-22
- 记录性质：当次记录
- 替代：无；扩展 [0014](0014-shared-sandbox-api-key.md) 的适用范围
- 被替代：无

## 背景与约束

Production Demo 仍使用 Paddle Sandbox。用户明确要求将 Preview 中可复用的支付配置复制到本地生产环境变量文件，并准备 CRON_SECRET。本次不涉及云端变量更新或部署。

## 考虑过的方案

| 方案 | 优点 | 成本与限制 | 取舍理由 |
| --- | --- | --- | --- |
| 各环境单独签发 Sandbox API Key 与客户端 Token | 可以独立轮换 | 增加当前 Demo 配置维护 | 本次不采用 |
| 同一 Sandbox 账号复用 API Key、价格与客户端 Token | 沿用已配置的测试套餐 | 共享凭据的轮换影响多个环境 | 用户明确选择 |

## 决策与理由

将 `.env.preview.local` 中的 `PADDLE_API_KEY`、`PADDLE_PRICE_ID_PRO`、`NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` 复制到 `.env.production.local`。仅允许 Sandbox 凭据，不启用真实收款。

Webhook Secret 仍属于各自 Notification Destination，不复制 Preview 的值。数据库和认证 Secret 保持环境隔离。Production CRON_SECRET 使用此前由加密安全随机数生成器生成的 32 字节、64 位十六进制值；已有有效且不同于 Preview 的值时保留，避免无必要的轮换。

## 影响与代价

- Production Demo 可沿用同一 Sandbox 套餐和凭据；共用 API Key 的权限和撤销影响延续 ADR 0014 的取舍。
- 生产 Webhook Secret 仍需单独配置；本地文件准备不代表云端支付已启用。
- 无应用代码、数据库 Schema 或迁移变更；环境文件继续由 Git 忽略，不将真实值写入文档。

## 实施与验证

- 已复制三项配置，并重新解析文件验证与 Preview 一致；API Key、客户端 Token 的 Sandbox 前缀及价格 ID 格式通过检查。
- 已验证生产 CRON_SECRET 为 64 位十六进制且不等于 Preview，保留此前生成的值。
- 已验证 Webhook Secret 与其他变量未改变，两份环境文件均被 Git 忽略。
- 未上传 Vercel、重新部署或运行支付端到端验证。

## 重新评估条件

需要独立轮换、限制各环境 API 权限或接入真实收款时重新评估。

## 相关证据

- [0014 — 共用 Sandbox API Key](0014-shared-sandbox-api-key.md)
- [0026 — 演示身份与生产 Cron 准备](0026-shared-preview-production-demo-identity.md)
- [支付配置校验](../../src/features/billing/server/config.ts)
- 2026-10-22 用户明确要求复制可复用变量到生产环境文件并准备 CRON_SECRET。
