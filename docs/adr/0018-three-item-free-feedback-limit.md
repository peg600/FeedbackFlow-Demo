# 0018 — Free 套餐三条反馈演示配额

- 状态：Accepted
- 记录日期：2026-09-30
- 决策日期：2026-09-30
- 记录性质：当次记录
- 替代：无；调整 [0003](0003-database-enforced-business-invariants.md) 历史记录中的配额数值，延续 [0011](0011-local-entitlements-and-reconciliation.md) 的权益与锁协议
- 被替代：无

## 背景与约束

Free 原先允许 50 条反馈，现场演示需要大量提交才能观察 Pro 解锁。用户要求改为 3 条，并保留已实现的 Paddle Sandbox 支付、Webhook 及本地权益判断。配额不是数据库列或声明式约束，而是在项目级 advisory lock 事务中执行。公开 `/p/demo` 是原计划的免登录浏览入口，但其数据需要单独 Seed。

## 考虑过的方案

| 方案 | 优点 | 成本与限制 | 取舍理由 |
| --- | --- | --- | --- |
| 保留 50 条，仅演示时手工预置大量反馈 | 不改变产品规则 | 演示不便，文案和 Seed 仍需特殊处理 | 不采用 |
| Free 统一改为 3 条，Pro 继续不限量 | 第四条即可验证服务端限制与升级 | 免费使用容量降低，演示 Seed 需缩减 | 采用 |

## 决策与理由

- 使用 `FREE_FEEDBACK_LIMIT = 3` 作为服务端写入、Billing 使用量展示、Dashboard 与演示 Seed 的共享常量。客户端展示不提供授权依据；并发请求仍在原项目事务锁下计数和检查 Owner 的本地订阅权益。
- Pro 仍按 [0011](0011-local-entitlements-and-reconciliation.md) 的 active、价格、周期与生效时间判定，不限制反馈数。降级后已有超过三条的反馈保留，但 Free 不能再新增。
- 公开演示入口保留，供无需注册的访客查看反馈与路线图。固定 Seed 缩为三条，覆盖路线图三个状态；部署时必须实际 Seed 才能让 `/p/demo` 可访问。
- 本次只改业务数值和展示，不修改 Drizzle Schema 或产生数据库迁移。开发与 Preview 数据库需要核对迁移账本和结构，应用部署新代码后配额才生效。

## 影响与代价

- 既有 Free 项目若已有三条以上，数据不删除；升级 Pro 后可继续新增。
- Demo Seed 达到 Free 上限，访客仍可浏览和投票；若要演示新增反馈，可使用另一个未满额的项目或先授予演示 Owner 真实 Sandbox Pro 权益。
- 旧 Demo 已有四条或更多反馈时，重复 Seed 在无需补充固定记录的情况下仍可成功，并保留原数据；只有实际新增记录时才检查新上限。
- 调整配额不会自动修改现有云端部署，必须部署使用新代码的版本。

## 实施与验证

实现涉及 `src/features/billing/limits.ts`、反馈写入、Billing、Dashboard、Landing、演示 Seed 及回归测试。2026-10-01，`drizzle-kit generate` 确认没有 Schema 变化；对已核验的 Neon develop 和 Preview 直连地址分别运行 `drizzle-kit migrate`，均成功且无待执行迁移。读回结果均为 3 条迁移记录、12 张 public 表。Lint、TypeScript、242 项单元与组件测试及生产构建通过。新增的旧 Demo 四条反馈重跑 Seed 集成用例尚未执行，因为本机没有独立测试数据库配置；不能使用 develop/Preview 替代测试库。本次没有执行 Demo Seed，也没有部署新代码或完成线上配额验收。

## 重新评估条件

需要真实产品的免费套餐定位、更多 Demo 数据、按周期计数、团队多项目配额或差异化价格时重新评估。

## 相关证据

- [反馈写入](../../src/features/feedback/server/write.ts)、[权益](../../src/features/billing/entitlement.ts)、[演示 Seed](../../scripts/seed-demo.ts)。
- [0003](0003-database-enforced-business-invariants.md)、[0011](0011-local-entitlements-and-reconciliation.md)。
