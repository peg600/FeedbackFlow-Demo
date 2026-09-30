# 技术决策记录（ADR）

这里记录与 FeedbackFlow 项目代码直接相关的重要技术决策：当时遇到了什么问题、考虑过什么方案、为什么选择当前实现，以及它带来的代价。README 介绍当前使用方式，ADR 保存实现背后的决策历史。

## 决策索引

0001—0009 于 2026-09-19 根据本机项目历史对话、Git 提交和代码补录；0010 起为新增决策的当次记录。

| 编号 | 决策 | 状态 | 决策时间或可确认范围 |
| --- | --- | --- | --- |
| 0001 | [Better Auth 邮箱密码与数据库会话](0001-database-backed-authentication.md) | Accepted | 2026-08-17—18 |
| 0002 | [部署认证来源与登录回跳白名单](0002-auth-origin-and-return-url-boundaries.md) | Accepted | 2026-08-18—20 |
| 0003 | [数据库约束与事务保护业务一致性](0003-database-enforced-business-invariants.md) | Accepted | 2026-08-18—22；2026-09-16 复核 |
| 0004 | [语义 Token、流式响应布局与共享 UI 原语](0004-semantic-tokens-and-shared-ui-primitives.md) | Accepted | 2026-08-04—20 |
| 0005 | [URL 驱动服务端列表与派生路线图](0005-url-driven-server-read-models.md) | Accepted | 2026-08-20—2026-09-18 |
| 0006 | [统一 Server Action 错误协议](0006-standardized-server-action-errors.md) | Accepted | 2026-09-17 |
| 0007 | [PostgreSQL 共享原子限流](0007-shared-postgresql-rate-limits.md) | Accepted | 2026-09-18 |
| 0008 | [独立测试数据库与受保护的数据写入](0008-isolated-database-tests-and-seeding.md) | Accepted | 2026-09-18 |
| 0009 | [Billing 保持预览，暂不接入支付权限](0009-billing-preview-without-payment-entitlements.md) | Superseded by 0010 | 2026-09-03；2026-09-18 重申 |
| 0010 | [Paddle Sandbox 替代 Stripe 与 Billing 占位](0010-paddle-sandbox-billing.md) | Accepted | 2026-09-21 |
| 0011 | [本地订阅权益、Webhook 与 API 对账](0011-local-entitlements-and-reconciliation.md) | Accepted | 2026-09-21 |
| 0012 | [客户归属与持久化结账恢复](0012-paddle-customer-and-checkout-ownership.md) | Accepted | 2026-09-21 |
| 0013 | [按功能归属组织服务端业务模块](0013-feature-owned-server-modules.md) | Accepted | 2026-09-22 |
| 0014 | [本地与 develop Preview 共用 Sandbox API Key](0014-shared-sandbox-api-key.md) | Accepted | 2026-09-29 |
| 0015 | [Billing 配置的安全诊断日志](0015-safe-billing-config-diagnostics.md) | Accepted | 2026-09-29 |
| 0016 | [客户端操作失败必须可见](0016-visible-client-operation-errors.md) | Accepted | 2026-09-29 |
| 0017 | [Paddle API 异常的安全诊断](0017-safe-paddle-api-error-diagnostics.md) | Accepted | 2026-09-29 |
| 0018 | [Free 套餐三条反馈演示配额](0018-three-item-free-feedback-limit.md) | Accepted | 2026-09-30 |

## 范围与维护

1. 开始相关工作前阅读索引与对应 ADR。应用架构、数据、接口、安全、应用依赖、影响代码的部署配置或测试架构产生持续性取舍时，在同一变更中记录并更新索引。
2. 使用 [模板](template.md)，按 `NNNN-short-kebab-case-title.md` 创建一项独立决策一篇的记录。正文用中文；使用下一个未使用的编号，不重排已进入历史的记录。
3. 未确定时用 `Proposed`，已确定用 `Accepted`。状态描述决策，实施与验证单独描述；不要用 Accepted 暗示计划已部署或测试已通过。
4. 替代已接受的方案时新建 ADR，旧记录标记 `Superseded`，双方链接并保留旧理由。未采用的正式提案为 `Rejected`；不再适用且无替代方案时为 `Deprecated`。
5. 不改变既有决策的普通修复、文案、样式微调无需新增 ADR。个人开发工具、Agent/模型配置、工具评测、提交操作和文档管理流程不属于项目技术 ADR。
6. 记录随相关代码进入 Git。检查编号、索引、状态、链接和忽略规则；ADR 本身不新增审批要求，既有权限规则继续适用。

## 历史证据与验证口径

- 补录依据是本机可读取、工作目录属于本项目的历史会话，不代表已读取所有平台或所有设备上的对话。
- 每篇保留对话日期、会话 ID、决策摘要和仓库代码/提交证据。会话 ID 仅供本机追溯，原始聊天不提交；正文不依赖私有聊天才能理解。
- 区分用户明确选择、历史实现报告和后续学习讨论。只有问答或建议的方案不视为已采用；缺少当时备选讨论时明确说明，不事后编造理由。
- 日期以已确认的讨论/落地范围为准，提交日期不自动等同于首次决策日期。区间内分步形成的选择注明演变。
- 本次仅补录和核对文档，不重新执行应用测试、数据库迁移或部署。文中的“覆盖”指现有测试的断言范围；历史执行结果注明其来源及当时未验证事项。
- 禁止复制真实 Secret、连接串、账号凭据、个人数据或完整敏感日志。

强制维护规则见 [AGENTS.md](../../AGENTS.md#21-技术决策记录adr)。
