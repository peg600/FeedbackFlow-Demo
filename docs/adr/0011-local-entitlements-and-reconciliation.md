# 0011 — 本地订阅权益、Webhook 与 API 对账

- 状态：Accepted
- 记录日期：2026-09-21
- 决策日期：2026-09-21
- 记录性质：当次记录
- 替代：无（扩展 0003、0010；此前无支付授权实现）
- 被替代：无

## 背景与约束

Paddle 是外部账务事实来源，但每次 Pro 请求调用 Paddle 会增加延迟与可用性依赖。Webhook 可重复、乱序或在停机期间耗尽重试；浏览器付款回跳可能先于事件处理完成。项目部署 Vercel Hobby，不引入队列、Redis 或常驻定时进程。

## 考虑过的方案

| 方案 | 优点 | 代价 | 取舍 |
| --- | --- | --- | --- |
| 每次授权实时查 Paddle | 接近最新远端状态 | 延迟、故障耦合、API 调用量 | 不采用 |
| 仅保存 Webhook 状态 | 请求快 | 长时间漏事件无法自愈 | 不足 |
| 本地镜像 + Webhook + 显式 API 对账 | 请求快且可恢复 | 有一致性延迟及恢复代码 | 采用 |

## 决策与理由

- 一条 Paddle subscription 对应一行，允许同一客户保留多条历史订阅。旧订阅取消仅修改旧行，不能取消新订阅权益。
- Pro 由统一 `hasProEntitlement` 判定：配置的价格、active、当前周期未结束、取消或暂停尚未生效。Free 限制仍在项目 advisory lock 的反馈写入事务中按 Owner 查询。
- 当前不配置试用；past_due 不提供宽限。这是本 Demo 的保守产品策略，与 Paddle 官方通常建议试用/欠费保留访问不同，不能称为 Paddle 强制规则。取消排期在生效前仍保留权益；已有反馈不因降级被删除。
- Route 读取原始请求体，SDK 验签并额外限制未来时间戳。签名/处理失败返回非 2xx，日志不输出请求体或原始异常。Paddle 会重试任何非 2xx，不能假设 400 会停止重试。
- `paddle_events` 唯一 event ID 的插入与订阅更新在同一事务内；处理失败回滚去重记录。未知事件记录后安全返回。
- 资源 `updated_at` 主排序，同版本用事件 `occurred_at` 定序，保留微秒精度。API 对账只推进资源版本，绝不把本地请求时间当作远端版本；避免较早的 API 请求响应覆盖较新的取消事件。
- 首次订阅需通过本地初始交易关联；尚未收到可证明归属的信息则重试，不能凭 customData 的 userId 授予权益。
- 回跳最多串行轮询约一分钟，主要读取本地状态，首尾限量 API 核对；仍未确认则显示等待/主动刷新。页面返回或门户切回也可核对，不将 URL 或 Paddle.js completed 回调作为授权凭据。
- `vercel.json` 每日调用受 CRON_SECRET 保护的 Route；最多处理 50 个客户，240 秒启动预算与 300 秒函数上限，按最后尝试时间公平轮转，单个失败不饿死后续客户。超过批次容量无法承诺所有用户每日核对，需增大预算或采用更高频调度。

## 影响与代价

- 授权时不联网，周期结束立即 fail closed；续费 Webhook 延迟会短暂显示 Free，主动刷新可恢复。
- 已知取消前的镜像仍存在传播延迟；即时撤权 SLA、规模扩展及退款/争议撤权需要另行设计。
- Vercel Cron 只作用于 Production 部署，由平台调度，重启或重新部署不需要启动进程内任务。Preview/本地需要显式核对；定时任务不自动重试失败，应监控响应与残余数量。
- 每次最多处理少量账户是 Demo 容量约束，不能宣称为无限规模的实时一致系统。

## 实施与验证

参见 [同步服务](../../src/server/services/billing-sync.ts)、[对账服务](../../src/server/services/billing.ts)、[权限](../../src/features/billing/entitlement.ts)、[数据库用例](../../tests/integration/billing.test.ts)、[签名测试](../../tests/unit/paddle-webhook.test.ts)。本次单元测试真实执行 SDK HMAC 验签；数据库集成用例需要独立 test 配置，未配置时不得使用 develop/production 替代。外部 Sandbox 流程尚未验收，详见 README。

## 重新评估条件

要求欠费宽限、试用、实时撤权、自动退款处理，或客户数量超过 Cron 批次容量时重新评估。

## 相关证据

- [Paddle Webhook delivery](https://developer.paddle.com/webhooks/about/how-webhooks-work/)、[subscription access](https://developer.paddle.com/build/subscriptions/provision-access-webhooks/)。
- [Vercel Cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing)、[Cron management](https://vercel.com/docs/cron-jobs/manage-cron-jobs)。
- [0003](0003-database-enforced-business-invariants.md)、[0008](0008-isolated-database-tests-and-seeding.md)、[0010](0010-paddle-sandbox-billing.md)。
