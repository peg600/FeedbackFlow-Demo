# 0026 — Preview 与 Production 共用公开演示身份

- 状态：Accepted
- 记录日期：2026-10-22
- 决策日期：2026-10-22
- 记录性质：当次记录
- 替代：无，细化 ADR 0024 的部署边界
- 被替代：无

## 背景与约束

用户明确要求 Preview 与 Production 建立完全相同的演示账号并开启演示。排查发现 Preview 已有普通用户与项目，但缺少 `/p/demo`；Production 已有演示项目及三条反馈。两环境 Vercel 均未配置演示凭据展示变量。演示凭据属于有意公开的共享 Owner 身份，普通账号及应用 Secret 仍保密。

## 考虑过的方案

| 方案 | 优点 | 成本与限制 | 取舍理由 |
| --- | --- | --- | --- |
| 每环境独立演示邮箱和密码 | 凭据隔离 | 访客需要区分账号，不符合本次要求 | 不采用 |
| 两环境共用公开演示邮箱和密码，数据库独立 | 体验一致，数据保持隔离 | 公开凭据可管理两边的演示项目 | 用户明确选择 |
| 清空或复制整库统一数据 | 表面一致 | 破坏现有数据且超出授权 | 不采用 |

## 决策与理由

- 沿用已通过密码验证的 Production 指定演示凭据，在 Neon `preview` 与 `production` 各自执行现有幂等 Seed。仅补齐缺失账号、固定项目及反馈，保留已有用户内容。账号内部 ID 不要求相同，身份的一致性指登录邮箱、密码及展示名称相同。
- Seed 前通过 Neon 元数据确认分支、数据库及 pooled/direct endpoint 一致，检查同邮箱账号、固定项目/反馈 ID、Slug、所有权与迁移状态；不凭文件名或 Git 分支名推定数据库环境。
- Seed 显式传入对应环境，`DEMO_SEED_CONFIRM=true` 仅用于本次执行，不上传 Vercel。Production 本地文件未持有线上认证 Secret；验证已有账号不创建会话，Seed 使用仅存在于执行进程的临时 Secret，不替换线上 Secret。
- Vercel Preview 与 Production 配置 `DEMO_LOGIN_ENABLED=true` 及相同的 `DEMO_USER_EMAIL`、`DEMO_USER_PASSWORD`，密码以 Secret 类型保存。展示仍走 ADR 0024 的白名单投影，不硬编码或通过 `NEXT_PUBLIC_` 暴露。
- 两环境数据库继续独立；认证 Secret 按环境隔离的既有要求不变，不因公开演示凭据相同而共用或重置认证 Secret。
- 只重新部署各环境原有代码以使变量生效，不借此合并 `develop` 至 `main`。支付继续限定 Paddle Sandbox；开启演示不等于支付联调或完整生产验收完成。

## 影响与代价

- 访客可以使用相同公开凭据体验两环境；对演示内容的修改仍分别保存在各环境。
- 初始三条反馈已占满 Free 配额；添加新反馈需要按现有规则删除反馈或完成 Sandbox Pro 升级。
- 本地忽略的 Preview/Production 环境文件同步演示配置；新增生成的 Production Cron Secret 仅保存在本地，尚未上传云端。已有线上数据库连接、认证地址与认证 Secret 保持不变。
- 无业务代码、Schema、依赖或迁移变更；共享凭据仅适用于指定公开演示账号，不推广至普通用户或内部账户。

## 实施与验证

- 两环境现有三条迁移记录与仓库匹配；校验时需兼容历史 SQL 文件 LF/CRLF 的哈希差异，未运行新迁移。
- Seed 后两环境演示密码验证通过，固定项目归属正确，公开 `/p/demo` 均包含 planned、in_progress、completed 各一条反馈。
- Vercel 三项演示变量的目标包含 Preview 与 Production；两次重新部署均达到 Ready。Preview 保持 `develop` 提交 `3825f7a`，Production 保持 `main` 提交 `1465783`。
- 线上 HTTP 验证受执行环境网络限制：Vercel CLI curl 连接部署域名超时，直接请求及外部读取工具也未能访问；系统 DNS 对 Vercel 域名返回异常地址。未能验证部署页面实际展示与网页登录，未创建线上验证会话。数据库密码验证及 Vercel 变量、构建状态已确认；不把 Ready 等同于完整上线验收。尚未执行完整业务 E2E 或 Paddle 端到端验收。

## 重新评估条件

演示账号开始承载真实业务数据、权限范围扩大、接入真实支付，或需要独立环境凭据时重新评估。

## 相关证据

- [演示 Seed](../../scripts/seed-demo.ts)
- [演示凭据展示](../../src/features/auth/server/demo-login.ts)
- [公开演示账号边界](0024-public-demo-login-credentials.md)
- [独立数据库与幂等 Seed](0008-isolated-database-tests-and-seeding.md)
- [Preview 登录页](https://feedback-flow-demo-develop.vercel.app/login)
- [Production 登录页](https://feedback-flow-demo.vercel.app/login)
