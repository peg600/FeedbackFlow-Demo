# 0001 — Better Auth 邮箱密码与数据库会话

- 状态：Accepted
- 记录日期：2026-09-19
- 决策日期：2026-08-17 确认方案；2026-08-18 提交实现
- 记录性质：历史补录
- 替代：无
- 被替代：无

## 背景与约束

项目需要注册、登录、退出和服务端会话读取，并与已有 Drizzle/Neon 业务表连接。2026-08-17 的需求明确限定邮箱密码和数据库 Session，不实现 OAuth、JWT 登录态、邮件验证、密码恢复或复杂权限系统。当时只有业务 schema 草稿，尚无完整 db 实例，投票表还引用了缺失的用户表。

## 考虑过的方案

- 使用 Better Auth 原生邮箱密码、数据库会话、Drizzle Adapter 和官方客户端：符合用户指定范围，复用认证协议及类型。
- 自建登录/注册/退出接口、使用 JWT 作为 Web 登录态、增加用户角色或多租户：当时明确排除，避免扩展本阶段的状态管理和权限模型。
- 手写重复的认证 schema 或直接用认证工具管理迁移：方案选择由 Better Auth CLI 生成 schema，再统一走 Drizzle migration。

Redis 与 Cookie 会话缓存是在 2026-09-15 的学习问答中讨论的性能选项，没有采纳指令，也未在当前配置中启用。

## 决策与理由

Better Auth 管理 `user`、`session`、`account`、`verification`；保留默认模型命名。核心包、Adapter 和生成 CLI 使用相同版本，减少生成结构与运行时不一致。认证 HTTP 请求通过 `/api/auth/[...all]` 的官方 Handler 接入，浏览器使用 `authClient`；服务端从请求头读取真实 Session。

认证和资源授权分开：Session 只回答“是谁”，项目归属和公开性由业务代码验证，不接受客户端提供的 owner 身份。

当前 db 使用 `drizzle-orm/neon-serverless`，Adapter 开启 `transaction: true`。运行连接使用 pooled URL，迁移使用 direct URL。事务能力是当前实现事实；可读取的根会话中未找到单独比较 Neon 驱动方案的完整原始讨论，不补写不存在的选型过程。

## 影响与代价

- 服务端拥有可查询的会话记录，业务身份读取不依赖自建 JWT 协议；对应代价是认证读取依赖数据库可用性。
- 认证表和生成器存在版本耦合，升级需要审查生成差异与迁移。
- 核心演示不依赖邮件收取；`emailVerified` 不能作为邮箱所有权已经验证的保证。
- 不启用缓存有利于保持当前会话读取路径简单，但没有据此证明远程数据库开销可以忽略。

## 实施与验证

代码已落地。认证表及索引存在于初始 migration；登录、注册、退出组件测试与登录目标测试覆盖前端接入。当前没有专门证明 Better Auth 内部多步注册事务原子性的独立集成测试。本次仅核对代码和历史，不重跑认证或数据库测试。

## 重新评估条件

新增邮箱所有权要求、多端认证、第三方登录，或实测会话数据库读取成为瓶颈时重新评估。不能因学习讨论过某种缓存就默认启用。

## 相关证据

- 历史会话 `01a00fdd-8859-7800-944a-47044b37910a`：2026-08-17 用户明确列出认证设计并回复“按这个方案实现”；2026-09-15 的缓存学习讨论位于 `01a09f21-849f-7653-812b-9ec60de24621`。
- 提交 `05437f6`：`feat(auth): add Better Auth email authentication`。
- [认证配置](../../src/server/auth/index.ts)、[db 实例](../../src/server/db/index.ts)、[认证 schema](../../src/server/db/schema/auth.ts)、[迁移](../../drizzle/0000_bitter_mariko_yashida.sql)。
- [登录测试](../../tests/unit/login-page.test.tsx)、[注册测试](../../tests/unit/register-page.test.tsx)、[退出测试](../../tests/unit/sign-out-button.test.tsx)。
