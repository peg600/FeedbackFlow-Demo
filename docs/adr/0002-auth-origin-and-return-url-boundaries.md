# 0002 — 部署认证来源与登录回跳白名单

- 状态：Accepted
- 记录日期：2026-09-19
- 决策日期：2026-08-18—20 分步形成
- 记录性质：历史补录
- 替代：无（合并补录同一边界的演变）
- 被替代：无

## 背景与约束

用户需要 develop 的稳定地址和其他 Preview 的动态部署地址都能认证。单个静态认证 URL 无法同时覆盖 branch URL 与 commit URL；2026-08-19 又出现从 Production deployment URL 注册时的 `INVALID_ORIGIN`。同时，受保护页面及公开反馈操作需要登录后回到原来的业务页面。

## 考虑过的方案

- 仅使用固定 `BETTER_AUTH_URL`：本地环境适用，但不能覆盖同一 Vercel 部署的多个合法访问入口。
- 允许宽泛的 `*.vercel.app` 或不验证用户输入的回跳 URL：扩大了信任边界，不能作为多 URL 兼容方案。
- 动态认证基址配合当前部署的精确 Host 集合，回跳使用业务路径白名单：满足访问需求并限制信任范围，采用。

## 决策与理由

Vercel Preview 和 Production 都使用 Better Auth Dynamic Base URL，只允许配置的 `BETTER_AUTH_URL`、当前 `VERCEL_URL`、`VERCEL_BRANCH_URL` 的精确主机，强制 HTTPS。非 Vercel 环境保留固定 URL；不信任转发 Host。Preview 无分支专用配置时由当前部署 URL 回退，不给全部 Preview 绑定同一个固定认证来源。

`returnTo` 由 `getSafeReturnTo` 解析并规范化，只允许 `/dashboard` 及子路径、`/onboarding`、`/p/` 下的路径；外部地址、协议相对地址、反斜杠、控制字符和认证页回跳退回安全默认页。虚拟来源仅用于 `new URL()` 解析，不发网络请求。

## 影响与代价

- 可以支持正式域名与当前部署地址，同时保留来源和回跳边界。
- 域名配置及系统环境变量成为认证行为的一部分，新增入口需要显式核对；不能用通配符掩盖错误配置。
- 回跳限制会拒绝未来新增但尚未允许的业务路由，需要和路由需求同步维护。

## 实施与验证

当前代码包含动态 Host 构造、Preview URL 回退和回跳校验。现有测试覆盖 Production/Preview 的 Host 集合、未知 Host 拒绝，以及非法或循环回跳。历史会话确认 Production 兼容改动已落地；本次未重新访问远程部署或修改环境变量。

## 重新评估条件

引入自定义租户域名、可信自托管反向代理或新的受保护路由时，重新审视来源与回跳策略，而不是直接扩大通配范围。

## 相关证据

- 历史会话 `01a00fdd-8859-7800-944a-47044b37910a`：2026-08-18 用户要求其他 Preview 分支支持 Dynamic Base URL；2026-08-19 反馈 Production `INVALID_ORIGIN` 并要求修复。
- 回跳实现见提交 `c51f55f`；2026-09-15 会话 `01a09f21-849f-7653-812b-9ec60de24621` 进一步解释虚拟来源和回跳边界，属于对既有实现的讲解。
- 提交 `e801ee4`：Production 动态来源修复。
- [来源构造](../../src/server/auth/base-url.ts)、[环境解析](../../src/lib/env.ts)、[认证配置](../../src/server/auth/index.ts)、[安全回跳](../../src/features/auth/safe-return-to.ts)。
- [来源测试](../../tests/unit/auth-base-url.test.ts)、[回跳测试](../../tests/unit/safe-return-to.test.ts)。
