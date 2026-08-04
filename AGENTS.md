# FeedbackFlow Agent 开发指南

## 1. 项目目标

FeedbackFlow 是一个用于作品展示的产品反馈与公开路线图 SaaS。项目必须证明开发者能够独立完成 React/Next.js 全栈应用的数据建模、鉴权授权、第三方支付回调、测试和公开部署。

核心用户闭环：

`注册/登录 -> 创建唯一项目 -> 获得公开反馈板 -> 提交反馈和投票 -> Owner 管理状态 -> 公开路线图更新 -> Stripe 测试 Checkout -> Webhook 同步本地订阅状态`

`plan.pdf` 是产品范围和六周实施顺序的主要依据。本文件将其转化为代码代理的执行约束；两者冲突时，先指出冲突并请求用户确认，不擅自扩大范围。

## 2. 当前状态与执行原则

- Day 1 的可部署 Next.js 工程骨架已完成；下一阶段按计划进入数据库与领域模型。
- 按“可部署骨架 -> 数据库 -> 身份与项目 -> 反馈 -> 投票 -> Stripe -> 生产与测试”的依赖顺序推进。
- 每次只完成当前需求所需的最小纵向切片，不提前实现后续阶段的大功能。
- 默认使用 Server Component；仅把需要浏览器状态、事件或 Web API 的最小交互岛标记为 Client Component。
- 不为追求形式上的通用性增加无需求支撑的抽象、依赖或基础设施。
- 修改前先检查现有代码、脚本和未提交变更，保留用户已有工作。

## 3. 固定技术栈

- Next.js App Router + React + TypeScript（严格模式）
- pnpm，并在 `package.json` 中固定 Node.js 与 pnpm 版本
- Tailwind CSS + shadcn/ui
- React Hook Form + Zod
- Neon PostgreSQL + Drizzle ORM/Drizzle Kit
- Better Auth，邮箱密码登录；核心版本不做 OAuth
- Stripe Sandbox/Test：Checkout、Customer Portal、Webhook
- Vitest + React Testing Library + Playwright
- Vercel Hobby：Preview 与 Production
- Resend 仅为可选扩展，不得阻塞公开 Demo

引入新依赖前必须说明它解决的问题；平台已有能力或现有依赖能清晰完成时，不新增包。

## 3.1 设计来源与实现规范

- Figma 文件：[FeedbackFlow SaaS Complete UI Design](https://www.figma.com/design/TxUtfRQ9Eh71XWC939ksIz/FeedbackFlow-SaaS---Complete-UI-Design?node-id=35-2)。
- 设计 Token 页面为 `_tokens`（`35:2`），视觉 Token Frame 为 `design-tokens`（`12:376`），Agent 实现说明为 `_codex-metadata`（`40:14`）。
- 开始实现或审查 UI 前必须先读取 `docs/design-system.md`，并尽量读取对应 Figma 页面或节点；不要只凭截图推断交互状态。
- `plan.pdf` 与本文件定义产品范围、领域规则和正式路由；Figma 定义视觉、响应式与交互行为；`docs/design-system.md` 是可离线读取的实现快照。三者冲突时不得擅自扩大产品范围。
- 页面使用 mobile-first：390px 设计作为基础，按 `md` 768px、`lg` 1024px、`xl` 1280px 逐级覆盖，内容最大宽度为 1280px。
- 使用 Inter 字体与 Lucide React 图标风格；图标默认 24px、1.5px stroke、round caps/joins。
- 已有语义 Token 时禁止在组件中重复硬编码颜色、圆角、阴影、尺寸、时长或 easing；运行时代码以 `src/app/globals.css` 中的 Token 为准。
- 通用动画必须支持 `prefers-reduced-motion`；表单错误状态必须使用 `aria-invalid` 与 `aria-describedby` 建立可访问关联。
- Figma 当前未建立原生 Variable Collections。Figma Token 或 `_codex-metadata` 变更后，应在同一变更中同步 `docs/design-system.md` 与 `src/app/globals.css`，并记录无法一一映射的差异。

## 4. 核心范围

必须实现的路由：

| 路由 | 责任 |
| --- | --- |
| `/` | Landing、功能摘要、价格、CTA、SEO |
| `/login`、`/register` | 邮箱密码身份流程及错误状态 |
| `/onboarding` | 首次登录创建每用户唯一项目 |
| `/dashboard` | Owner 统计、筛选、分页和反馈管理 |
| `/dashboard/settings` | 项目名称、描述、Slug 设置 |
| `/dashboard/billing` | 套餐状态、测试 Checkout、Portal |
| `/p/[slug]` | 公开反馈板、提交、搜索、排序、分页 |
| `/p/[slug]/feedback/[id]` | 反馈详情、动态 Metadata、投票 |
| `/p/[slug]/roadmap` | Planned/In Progress/Completed 路线图 |
| `/api/auth/[...all]` | Better Auth Handler |
| `/api/stripe/webhook` | Stripe 签名验证与幂等处理 |

可选：仅在已有可验证发信域名时实现 `/forgot-password` 和 `/reset-password`。无自有域名时，不强制邮箱验证，也不让招聘方依赖邮件流程。

明确不做：平台管理员、评论、Logo/文件上传、OAuth、独立价格页、复杂多租户/RBAC、Redis、队列、微服务、实时通信、国际化、拖拽路线图、真实 Stripe 收款。

## 5. 推荐代码结构

```text
src/
  app/
    (marketing)/page.tsx
    (auth)/login/page.tsx
    (auth)/register/page.tsx
    onboarding/page.tsx
    dashboard/
      page.tsx
      settings/page.tsx
      billing/page.tsx
    p/[slug]/
      page.tsx
      roadmap/page.tsx
      feedback/[id]/page.tsx
    api/
      auth/[...all]/route.ts
      stripe/webhook/route.ts
  features/
    auth/
    projects/
    feedback/
    votes/
    billing/
  server/
    auth/
    db/
    permissions/
    services/
  lib/
    env.ts
    stripe.ts
  validators/
  components/ui/
drizzle/
tests/
```

功能域负责该领域的 UI、Action 和类型；跨领域的服务端基础能力放入 `server/`。不要从 Client Component 导入服务端模块或 Secret。

## 6. 数据与领域约束

- Better Auth 管理 `users`、`sessions`、`accounts`、`verification`，邮箱唯一。
- `projects`：`owner_id` 唯一，`slug` 唯一；一个用户核心版本只能拥有一个项目。
- `feedback`：关联 project 和 author；包含 title、description、status、`is_public`；为公开查询和排序建立必要索引。
- `votes`：`(user_id, feedback_id)` 复合唯一；并发重复投票由数据库约束兜底。
- `subscriptions`：`user_id`、Stripe customer ID、Stripe subscription ID 分别保持唯一。
- `stripe_events`：`event_id` 唯一，用于 Webhook 幂等。
- 路线图完全由反馈状态派生，只展示 Planned、In Progress、Completed。
- Free 套餐最多 50 条反馈，限制必须在服务端执行；Pro 由有效的本地订阅状态解锁。
- Schema 变更必须通过 Drizzle migration，禁止在普通请求中自动执行迁移。
- Seed 必须可重复执行；生产 Seed 只能补齐演示账号、项目和示例数据，不清空已有数据。

## 7. 服务端、安全与授权规则

- 身份认证不等于资源授权。所有 Action 和 Route Handler 都要重新读取 Session，并在服务端验证资源所有权。
- 所有写入先用 Zod 验证输入；不能依靠表单校验、按钮隐藏或客户端传入的 owner/user ID。
- 公开查询不返回隐藏项目或隐藏反馈；按 Slug 和反馈 ID 查询时仍要验证二者归属关系。
- 项目创建/更新校验 Slug 唯一；冲突应返回可展示的领域错误。
- Stripe Checkout/Portal 必须验证当前用户与 Customer 的归属。
- Webhook 使用原始请求 Body 验签；仅由签名通过的 Webhook 更新订阅状态。
- Checkout Success 页面只显示结果，绝不直接把用户改为 Pro。
- Webhook 至少处理 `checkout.session.completed`、`customer.subscription.updated`、`customer.subscription.deleted`；未知事件安全忽略并记录。
- Webhook 的去重记录和订阅更新应在事务中完成；重复事件不能产生重复副作用。
- 日志采用结构化、可定位的上下文信息，但不输出密码、Cookie、Token、Secret、完整数据库连接串或支付信息。

## 8. 环境变量与环境隔离

只提交 `.env.example`，不得提交任何真实值。需要维护以下变量：

```dotenv
DATABASE_URL=
DATABASE_URL_UNPOOLED=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_PRO=
RESEND_API_KEY=
EMAIL_FROM=
```

- 在 `src/lib/env.ts` 中用 Zod 校验服务端必需变量，缺失时快速失败。
- `DATABASE_URL` 使用 Neon pooled 连接供应用运行；`DATABASE_URL_UNPOOLED` 使用 direct 连接执行迁移和管理脚本。
- Development/Preview 可使用 dev 数据库；Production 必须使用独立 prod 数据库。
- Better Auth Secret 按本地、Preview、Production 分离，至少 32 字符；Production Secret 建立后保持稳定。
- `BETTER_AUTH_URL` 必须对应当前环境；修改 Vercel 变量后需重新部署。
- Stripe 始终使用测试 Key。CLI Webhook Secret 与线上 Endpoint Secret 不可混用。
- 默认不创建 `NEXT_PUBLIC_` Secret，也不在 `next.config.ts` 的 `env` 中硬编码 Secret。
- Agent 不得要求用户在对话、Issue、README、日志或截图中粘贴真实 Secret。排错时只检查是否存在、前缀、长度和环境归属。

## 9. 页面与交互要求

- 服务端读取优先；筛选、搜索、排序和分页状态放在 URL Search Params 中，刷新和分享后保持一致。
- 对所有查询参数做服务端解析、范围限制和默认值处理。
- 投票使用 Optimistic UI，但必须支持 pending、防重复交互、失败回滚，并接受服务端最终计数。
- 每条用户路径都提供 Loading、Empty、Error 和 Not Found 状态；错误消息可行动且不泄露内部信息。
- Landing、公开反馈板和路线图应响应式、可直接访问，并具备合理 Metadata。
- 公开站点和 Billing 明确标识 Stripe 为 Test mode；主要浏览体验不要求招聘方注册或真实付费。
- 准备演示账号、演示项目和若干反馈；具体凭据通过安全的部署配置或文档化演示方案管理。

## 10. 测试策略

测试优先覆盖高风险领域，而不是追求机械覆盖率：

- 单元/领域测试：Zod schema、权限判断、状态转换、分页参数、套餐限制。
- 数据库集成测试：唯一 Slug、每用户一个项目、投票复合唯一、Stripe event 幂等。
- 组件测试：FeedbackForm、VoteButton、Billing 状态及错误/回滚。
- E2E：注册/登录 -> 创建项目 -> 提交反馈 -> 投票 -> Owner 改状态 -> 路线图更新 -> Checkout 入口。
- 安全回归：第二个账号不能读取或修改第一个账号的受保护资源。
- Stripe 测试：错误签名失败、重复事件无重复写入、未知事件安全忽略、事件顺序不会错误升级权限。

测试必须使用独立配置和数据。禁止让自动化测试连接 Production 数据库或 Stripe Live 环境。

## 11. 常用质量门禁

以 `package.json` 中实际脚本为准；建立项目骨架时至少提供并保持以下命令可用：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

每次变更至少运行与修改直接相关的检查；提交前应运行 lint、typecheck 和相关测试。影响路由、环境变量、数据库或构建配置时再运行 production build。若某项无法运行，必须明确说明原因和未验证风险。

## 12. Agent 固定工作流

每个功能开始前先确定：

1. 输入、输出和运行位置（Server/Client/Action/Handler）。
2. 身份、资源权限、数据约束和失败状态。
3. 涉及的环境变量、迁移、Seed、外部回调和部署操作。
4. 将修改的文件、关键决策与最小验收条件。

实现时：

1. 先读取相关代码和配置，沿用项目现有模式。
2. 先建立服务端约束和失败路径，再接 UI。
3. 添加能证明高风险逻辑的最小测试。
4. 审查 Server/Client 边界、类型、查询数量、授权、错误、日志和 Secret 使用。
5. 运行相关质量门禁，并汇报结果、剩余风险及新增环境/部署操作。

涉及账号注册、真实云资源创建、Vercel Production 部署、生产迁移/Seed、Stripe Endpoint 或其他外部写操作时，先向用户说明目标和影响并取得确认。绝不使用 Stripe Live Key 或触发真实收款。

## 13. 完成定义

一个功能只有在以下条件满足时才算完成：

- 成功路径、失败路径、空状态和权限拒绝均有明确行为。
- 所有写操作完成服务端身份、授权和输入校验。
- 数据约束与 migration 一致，必要索引已说明。
- 相关测试通过，lint/typecheck 无新增错误。
- 新增环境变量同步更新 `.env.example` 和 README，不包含真实值。
- 影响部署或外部服务时，说明 Development/Preview/Production 的差异与操作步骤。
- 未加入计划外功能，且公开 Demo 的核心闭环仍可用。

## 14. 最终发布门槛

- Vercel Production 可公开访问，无需 Vercel 账号。
- dev/Preview 与 Production 数据库隔离，运行时和迁移连接类型正确。
- Production migration、幂等 Demo Seed、Smoke Test 和核心 E2E 已执行。
- Stripe 全链路处于测试环境，Webhook 验签和幂等通过。
- 演示账号和公开项目可用，招聘方无需真实付费即可体验主要功能。
- README 包含启动、环境变量、迁移、Seed、测试、部署、测试卡、架构与故障定位说明。
- 发布前确认仓库、Git 历史、构建日志和页面中没有 Secret。

## 15. 语言相关

- 项目中所有注释使用英文
- 前端元素中文本为英文
- commit message使用英文
