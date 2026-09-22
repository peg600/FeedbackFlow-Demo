# 0012 — 客户归属与持久化结账恢复

- 状态：Accepted
- 记录日期：2026-09-21
- 决策日期：2026-09-21
- 记录性质：当次记录
- 替代：无
- 被替代：无

## 背景与约束

Better Auth 核心 Demo 不验证邮箱。Paddle 客户邮箱可能已存在，且 Paddle.js 可以提交 customData；二者都不能证明应用账号与既有账务客户的关系。Paddle API 当前没有任意操作通用的客户端幂等键；请求超时不表示创建失败。

## 考虑过的方案

| 方案 | 优点 | 风险 | 取舍 |
| --- | --- | --- | --- |
| 邮箱自动找 Customer | 实现简单 | 未验证邮箱可能获取他人门户 | 拒绝 |
| 浏览器传用户/customer/price 建 Checkout | 接入快 | 可篡改归属或商品 | 拒绝 |
| Session 绑定 + 本地意图 + 远端恢复 | 授权明确，可应对超时 | 需要恢复状态机与冷却 | 采用 |

## 决策与理由

- `billing_customers` 以 user ID 为主键，customer ID 与随机 provisioning ID 唯一。创建远端客户前持久化随机标记；成功后保存 Customer ID。恢复时邮箱只缩小搜索范围，必须匹配服务端随机标记，同邮箱但标记不符则返回安全冲突，不能拿 409 中的 customer ID 直接绑定。
- Portal Action 不接受 Customer ID；每次从 Session 查本地绑定，再创建临时门户链接。链接不缓存、不记录到日志。
- `billing_checkouts` 保留每用户一个当前意图，唯一 attempt ID 与 transaction ID。事务锁串行预留，先落库再 POST；浏览器只获得已保存的交易 ID。
- 服务器固定 Pro 价格、数量和客户，校验返回交易。customData 的 attempt ID 仅用于“服务端创建结果未知且尚未暴露交易 ID”的恢复，不作用户授权依据；已知交易关系使用本地 ID 和 Customer 校验。
- 默认付款链接中的 `_ptxn` 在初始化 Paddle.js 前移除，页面只允许通过服务端绑定的当前交易恢复结账，不自动打开 URL 提供的交易。
- 网络未知时先列出该客户最近交易找回匹配意图。完整查询仍无结果且超过五分钟，显式对账才标 abandoned；该次不创建交易，下一次 Upgrade 才创建新意图。Customer 亦先查 active/archived 并匹配标记，冷却后可释放未完成的创建预留。
- 旧 POST 迟到结果只有仍处于原 creating 意图且 ID 为空时能写回；无法写回则不能把旧交易交给浏览器，避免新旧交易都被支付。
- 已存在 active/trialing/past_due/paused 订阅时走 Portal；已完成交易必须确认订阅 canceled 后才允许新购。

## 影响与代价

- 这是有恢复路径的本地并发控制，不是跨系统 exactly-once。未知结果可能需要等待、刷新或人工核对；查询超过分页预算时 fail closed，不盲目重复 POST。
- 只保留当前 Checkout 意图，不是完整交易审计历史。已关联订阅保留初始交易 ID；极晚到的未关联历史事件可能需要人工核对。Paddle 承担完整账单历史。
- 当前客户邮箱碰撞不自动合并；真收款前需重新评估邮箱所有权验证、账务邮箱与人工迁移流程。
- 不自动打开 Paddle 邮件中的交易/付款更新链接；当前通过已鉴权 Portal 管理支付方式。若要支持这些链接，需新增服务端验证交易与订阅归属的入口。
- 有账务绑定的用户禁止普通级联删除；任何人工删除 Customer 映射都需先处理远端订阅，不能留下仍扣费但失去本地归属的客户。

## 实施与验证

实现见 [billing.ts](../../src/server/services/billing.ts)、[schema](../../src/server/db/schema/billing.ts)、[Actions](../../src/features/billing/actions.ts)。单元测试覆盖 Session 归属、拒绝客户端客户 ID 和配置边界；独立数据库集成用例覆盖并发 POST 与未知结果恢复，未配置 test 数据库前不描述为已通过。最终本次命令与外部未验收项见 README。

## 重新评估条件

跨应用共用 Paddle Customer、多个购买主体、完整本地交易审计、更多套餐或允许真实收款时重新设计。

## 相关证据

- [Paddle API idempotency](https://developer.paddle.com/sdks/libraries/)、[Custom data](https://developer.paddle.com/build/transactions/custom-data/)、[Customer already exists](https://developer.paddle.com/errors/customers/customer_already_exists/)。
- [0010](0010-paddle-sandbox-billing.md)、[0011](0011-local-entitlements-and-reconciliation.md)。
