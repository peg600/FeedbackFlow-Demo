# 0006 — 统一 Server Action 错误协议

- 状态：Accepted
- 记录日期：2026-09-19
- 决策日期：2026-09-17；2026-09-18 提交
- 记录性质：历史补录
- 替代：无
- 被替代：无

## 背景与约束

用户指出 PostgreSQL 的 `23503` 等编号不可读，若每个接口分别识别 Drizzle 错误和约束，会形成分散的条件分支与不一致的前端响应。项目已有 Zod 和以 Server Actions 为主的业务写入，需要统一通用机制并保留业务语义。

## 考虑过的方案

- 手写统一 Action 执行器与响应类型：最初讨论过，但用户明确希望采用成熟库，不自行维护通用框架。
- `pg-error-enum` + `next-safe-action` + 项目业务映射：用户于 2026-09-17 明确要求实现，采用。
- tRPC、独立 NestJS 后端、HTTP Problem Details：讨论认为各自适用于完整 RPC 或对外多客户端接口，不应仅为错误格式迁移当前应用架构。
- 再包一层统一 `error` 字段：讨论后保留库原生结果分支，避免重复归一化。

## 决策与理由

五个业务 Action 统一由 `actionClient` 声明操作 metadata 和 Zod 输入 schema。成功为 `data`，校验失败为扁平化 `validationErrors`，业务/系统失败为 `{ code, message, requestId, field? }` 形式的 `serverError`。

`ERROR_CATALOG` 保存稳定业务码及安全文案。`pg-error-enum` 只提供 SQLSTATE 语义枚举；数据库适配沿 Drizzle `cause` 提取诊断，并按“业务操作 + SQLSTATE + 精确约束名”映射。不认识的约束不能仅凭 SQLSTATE 猜测业务含义。

异常转换保留事务回滚和 Next.js 导航信号；未知异常安全降级，日志不输出原始 SQL、参数或用户提交内容。前端共享错误提取函数，但具体展示仍由表单负责。

## 影响与代价

- 同一 Slug 冲突无论来自预检查还是数据库唯一约束，都能呈现同一业务语义。
- 新操作、业务错误或命名约束需要同步维护目录、映射和回归测试；库不能替项目推导权限或业务含义。
- Better Auth 保留原生 HTTP 协议并单独映射客户端文案；Webhook 不因使用该库而自动完成。当前没有全局自动 Toast 或自动接入所有表单的公共 Hook。

## 实施与验证

对应提交已统一项目创建、设置、反馈创建、投票和状态更新。现有测试覆盖精确约束映射、异常脱敏、输入校验与导航信号保留。2026-09-17 历史完成报告记录单元测试、lint/typecheck 和构建通过，同时说明认证浏览器测试使用模拟响应、没有连接真实数据库；本次未重新执行这些检查。

## 重新评估条件

需要面向移动端或第三方提供公共 HTTP API 时，再设计该边界的错误协议；不能直接假设 Server Action 返回结构适用所有客户端。

## 相关证据

- 会话 `01a09f21-849f-7653-812b-9ec60de24621`：2026-09-17 用户提出集中错误目录问题，明确要求引入两个库，并确认以库协议加业务规则实现。
- 提交 `34b57c8`、`a903b3b`。
- [Action 边界](../../src/server/safe-action.ts)、[业务目录](../../src/lib/errors.ts)、[数据库适配](../../src/server/errors/database.ts)、[前端提取](../../src/lib/action-errors.ts)、[认证错误文案](../../src/features/auth/auth-error.ts)。
- [Action 测试](../../tests/unit/safe-action.test.ts)、[数据库错误测试](../../tests/unit/database-errors.test.ts)。
