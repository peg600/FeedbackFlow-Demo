# 0013 — 按功能归属组织服务端业务模块

- 状态：Accepted
- 记录日期：2026-09-22
- 决策日期：2026-09-22
- 记录性质：当次记录
- 替代：无（首次记录目录归属决策；不替代既有业务、安全与一致性决策）
- 被替代：无

## 背景与约束

原代码同时按功能和技术层分类：组件及 Action 位于 `features/`，业务服务位于顶层 `server/services/`，校验位于 `validators/`。部分 Action 还负责提供具体数据库操作，阅读完整功能需要跨目录跳转，服务端目录也混合了业务与基础设施。

用户在 2026-09-22 指出这一边界模糊，要求将业务专属代码归入功能目录。此次重构保持公开路由、Action 客户端协议、权限、数据库事务、限流、Paddle Sandbox 及部署配置的既有行为，不引入依赖或迁移。

## 考虑过的方案

| 方案 | 优点 | 成本与限制 | 取舍理由 |
| --- | --- | --- | --- |
| 保留集中式 `server/services/` | 服务端业务集中查找 | 同一功能跨多个顶层目录，Action 与服务边界不一致 | 不采用 |
| 业务归入 `features/<功能>/server/`，共享基础设施保留顶层 `server/` | 同一业务就近维护，基础设施边界明确 | 需要更新导入、测试和文档，并管理功能间依赖 | 采用 |
| 将全部实现合并进 Action | 简单操作文件更少 | 数据库与请求导航混合，支付多个入口难以复用，现有领域测试价值受损 | 不作为统一规则 |

## 决策与理由

- Feedback 拥有反馈创建、查询、投票、状态更新与派生路线图；Projects 拥有项目创建、设置、访问检查与公开项目缓存失效；Dashboard 拥有统计查询与列表参数；Billing 拥有支付配置、Paddle SDK、结账、权益与订阅同步。
- 各功能的校验放在 `schemas.ts`。反馈状态及状态更新校验由 Feedback 提供，Dashboard 复用它，不再维护另一份状态列表。
- 多个调用入口不等于跨业务基础设施。Webhook、Cron、Action 都可以直接引用 Billing 的明确模块；跨功能调用同样使用具体模块路径，不建立混合服务端与客户端导出的 barrel。
- 顶层 `server/` 保留认证、数据库与 schema、环境校验、统一 Action 支持、数据库错误适配及限流。数据库 schema 暂继续集中，以保持关系定义、迁移和基础设施依赖方向；`lib/` 不再存放服务端环境或 Billing 专属配置。
- Action 读取真实 Session、执行既有限流，调用业务函数后处理缓存与跳转。四个原来在 Action 中提供数据库依赖的操作，改为在功能服务端模块中定义默认数据库实现；业务函数接收入口传入的可信用户 ID，仍拒绝空身份并校验资源归属。ID 不是客户端输入字段。
- 保留已有可注入数据库依赖以验证失败和并发分支，不再将 Session 获取作为这些业务函数的依赖。状态更新服务返回已授权项目的 Slug，Action 用它失效缓存后仍只返回原来的反馈 ID 和状态。
- 不为每个操作强制引入 Repository 等额外层。配额事务写入继续独立，供生产与数据库集成测试共用。
- `server/` 目录名不自动阻止客户端导入。此次维持显式依赖及 Client/Server Action 边界，纯类型导入不产生运行时代码；没有新增 `server-only` 包或新的通用框架。

## 影响与代价

- 收益：移除顶层业务服务和校验集合，Action 更易阅读，修改某一业务时可在其功能目录内找到主要实现。
- 成本、限制与风险：功能间仍有必要的显式引用，例如 Feedback 使用 Billing 权益；新入口必须继续从可信会话提供身份。目录归属不能代替资源授权或运行时隔离。
- 兼容性：仅内部模块路径和四个业务服务签名调整；公开 HTTP/Action 协议、表结构、环境变量名称及部署流程不变。历史 ADR 的仓库文件链接更新为新路径，历史事实与提交链接保留。

## 实施与验证

已完成业务文件迁移、Action 数据库实现归位、调用方导入及架构说明更新。Billing Action 的项目检查也移入 Projects，保留原来的 Session、限流、项目检查顺序与失败协议。

本次实际验证：

- `pnpm.cmd lint`、`pnpm.cmd typecheck` 通过。
- `pnpm.cmd test`：50 个测试文件、201 个测试通过。新增回归覆盖会话身份不被输入覆盖、限流拒绝阻断业务调用、状态更新刷新已授权项目路径且保留客户端结果结构，以及 Billing 缺少项目和限流失败时不调用支付服务。
- `pnpm.cmd build` 通过。构建仅在当前命令进程内设置占位认证 Secret、本机数据库地址和本机认证 URL，未修改真实环境文件；该结果验证模块解析、类型、编译和静态生成，不代表真实部署配置或数据库可用。
- 静态运行时导入图检查无循环，Client 入口未越过 Server Action 边界引用服务端模块；独立只读审查未发现行为回归。ADR 本地链接及差异空白检查通过。
- 本次未运行真实数据库集成测试、浏览器 E2E 或 Paddle Sandbox 联调；集成测试导入已同步并通过类型检查。没有执行数据库迁移、Seed 或部署。

## 重新评估条件

出现功能间运行时循环依赖、大量跨功能内部调用、需要独立部署某一业务，或实际测试与维护成本表明现有拆分不再合适时重新评估；不因文件数量增加而自动引入新层。

## 相关证据

- 2026-09-22 用户要求先提交现有修改，再按功能内聚重构；重构基线提交 `f7de4c7`。
- [目录约定](../../AGENTS.md#5-推荐代码结构)、[项目创建](../../src/features/projects/server/creation.ts)、[反馈创建入口](../../src/features/feedback/actions/create-public-feedback.ts)、[反馈配额事务](../../src/features/feedback/server/write.ts)、[支付服务](../../src/features/billing/server/billing.ts)。
- [数据库一致性](0003-database-enforced-business-invariants.md)、[URL 与缓存](0005-url-driven-server-read-models.md)、[统一错误](0006-standardized-server-action-errors.md)、[限流](0007-shared-postgresql-rate-limits.md)、[订阅同步](0011-local-entitlements-and-reconciliation.md)、[结账归属](0012-paddle-customer-and-checkout-ownership.md)。
