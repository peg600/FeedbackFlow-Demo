# 0017 — Paddle API 异常的安全诊断

- 状态：Accepted
- 记录日期：2026-09-29
- 决策日期：2026-09-29
- 记录性质：当次记录
- 替代：无；扩展 [0006](0006-standardized-server-action-errors.md) 与 [0015](0015-safe-billing-config-diagnostics.md)

## 背景与约束

配置格式通过后 Checkout 仍可能返回 INTERNAL_ERROR。原日志只保留应用操作和 requestId，无法区分 SDK 返回的凭据、权限或付款链接错误。原始异常可能包含用户、请求或账务详情，禁止直接打印。

## 考虑过的方案

- 打开 SDK 日志或打印完整异常：有泄露风险，不采用。
- 保持无分类日志：无法支持当前联调排错，不采用。
- 验证实际 ApiError 并仅输出固定白名单分类：不改变公开响应和支付行为，采用。

## 决策与理由

Billing 功能域提供 SDK 异常到安全分类的适配；统一 Action 边界仅在 billing.* 操作遇到实际 `ApiError` 时将分类加入同一 `Safe action failed` 日志。code 限定为已核对的常见官方错误码，未知值归类 `unknown_provider_error`；type 仅允许 request_error/api_error，其余归类 unknown。任意符合正则的字符串也不直接放行。

日志与公开响应关联同一应用 requestId；保持公开 INTERNAL_ERROR 和安全提示。不记录 detail、errors、documentationUrl、原始 message、请求参数或响应体。SDK 3.10.0 构造 ApiError 时未保留响应 meta.request_id 或 HTTP status，因此本次不宣称取得 Paddle request ID。

## 影响与代价

- 可区分常见提供方失败，无新依赖或迁移，不改变 Customer 归属、POST 恢复和订阅权益。
- 未来错误码需核对后加入白名单；未知异常或网络问题仍无法仅凭分类确定根因。
- 不记录精确 SDK 调用阶段，实际排错仍需结合 billing 操作路径和提供方配置。

## 实施与验证

实现见 Billing errors 与 safe-action；回归测试验证同一关联 ID、固定白名单、未知分类回退、伪造普通错误不被识别以及公开响应不变。独立安全审查通过。本次全量 51 个文件、242 项测试、lint、typecheck 和生产构建通过；无法通过 Vercel MCP 读取项目日志，线上根因未确定，未部署或执行真实支付。

## 重新评估条件

SDK 支持安全读取提供方 request ID、需要细分调用阶段或发现新的常见错误码时重新评估。

## 相关证据

- [适配](../../src/features/billing/server/errors.ts)、[Action 边界](../../src/server/safe-action.ts)、[测试](../../tests/unit/safe-action.test.ts)。
- [Paddle 错误响应](https://developer.paddle.com/api-reference/about/errors/)、[错误码](https://developer.paddle.com/errors/)；已核对本地安装 SDK 3.10.0 的 ApiError 与 BaseResource/Collection 实现。
