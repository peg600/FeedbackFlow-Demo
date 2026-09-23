# FeedbackFlow Agent 开发指南

## 1. 项目目标

FeedbackFlow 是一个用于作品展示的产品反馈与公开路线图 SaaS。项目必须证明开发者能够独立完成 React/Next.js 全栈应用的数据建模、鉴权授权、第三方支付回调、测试和公开部署。

核心用户闭环：

`注册/登录 -> 创建唯一项目 -> 获得公开反馈板 -> 提交反馈和投票 -> Owner 管理状态 -> 公开路线图更新 -> Paddle Sandbox Checkout -> Webhook 同步本地订阅状态`

`plan.pdf` 是原始产品范围和六周实施顺序依据。2026-09-21 用户明确将支付提供方从 Stripe 改为 Paddle，并授权实现完整 Sandbox Billing；原计划中 Stripe 和 Billing 占位内容由本文件及 ADR 0010—0012 替代。其他范围冲突先指出并请求确认，不擅自扩大范围。

## 2. 当前状态与执行原则

- 身份、项目、反馈、投票与路线图已实现；当前阶段实现 Paddle Sandbox Billing，云端配置和端到端验收须单独记录。
- 按“可部署骨架 -> 数据库 -> 身份与项目 -> 反馈 -> 投票 -> Paddle -> 生产与测试”的依赖顺序推进。
- 每次只完成当前需求所需的最小纵向切片，不提前实现后续阶段的大功能。
- 默认使用 Server Component；仅把需要浏览器状态、事件或 Web API 的最小交互岛标记为 Client Component。
- 不为追求形式上的通用性增加无需求支撑的抽象、依赖或基础设施。
- 修改前先检查现有代码、脚本和未提交变更，保留用户已有工作。

## 2.1 技术决策记录（ADR）

- 项目通过 [`docs/adr/README.md`](docs/adr/README.md) 维护 Architecture Decision Records（ADR）。开始相关工作前，先阅读 ADR 索引及涉及的决策，理解当前约束和取舍。
- **后续每次作出或调整与项目代码直接相关、具有持续影响的技术决策，都必须在同一变更中新增或更新对应 ADR，并同步索引；不能只写在对话、README 或提交信息中。** 适用范围包括应用架构与模块边界、数据模型与并发一致性、API/错误协议、鉴权与安全策略、应用依赖、影响代码行为的部署配置，以及仓库中的测试架构。
- ADR 不记录个人编辑器或 Agent 工具的安装卸载、模型选择、工具性能比较、提交操作或文档管理流程；ADR 自身的维护规则放在本节和索引中，不另写成项目技术决策。
- 不改变既有决策的普通修复、文案、样式微调和机械重构无需单独创建 ADR；如果工作中出现新的方案取舍，则仍须记录。一个独立决策一篇，避免把无关决策混成一篇流水账。
- 使用 [`docs/adr/template.md`](docs/adr/template.md)，按 `NNNN-short-kebab-case-title.md` 连续编号。记录日期、状态、背景与约束、考虑过的方案、最终选择及理由、正负影响、验证结果、重新评估条件和相关证据；正文使用中文，文件名使用英文。
- 尚未确定的方案标记 `Proposed`；已确定的决策标记 `Accepted`。是否需要用户确认仍按任务授权和本文件现有规则判断，ADR 本身不增加新的审批环节，也不代表功能已实现或已验证。
- 改变已接受的决策时新增 ADR，在新旧记录间建立替代链接，将旧记录标记为 `Superseded`；保留原有背景和理由，不删除或改写成“从未作出过该选择”。未采用的正式提案可保留为 `Rejected`，不再适用且无替代方案的决策标记为 `Deprecated`。
- 补录历史决策必须注明补录日期与可核实来源，并将相关历史对话与当前代码、测试或提交相互核对；无法确认的原始日期、动机和备选方案明确标为未知，不根据当前代码编造历史。学习问答、建议和未落地的计划不得写成已接受或已实现的决策；历史测试结果与本次重新执行的验证必须区分。
- `docs/adr/` 下的 Markdown 必须随代码进入版本管理；其余本地 `docs/` 材料仍默认忽略。ADR 不包含真实 Secret、连接串、用户数据或未经脱敏的日志；核心理由应能在仓库内独立理解，不能只链接到本地忽略文件或聊天记录。

## 3. 固定技术栈

- Next.js App Router + React + TypeScript（严格模式）
- pnpm，并在 `package.json` 中固定 Node.js 与 pnpm 版本
- Tailwind CSS + shadcn/ui
- React Hook Form + Zod
- next-safe-action（业务 Action 的校验与结果格式）+ pg-error-enum（PostgreSQL SQLSTATE 枚举）
- Neon PostgreSQL + Drizzle ORM/Drizzle Kit
- Better Auth，邮箱密码登录；核心版本不做 OAuth
- Paddle Sandbox：Paddle.js Checkout、Customer Portal、Webhook；包括部署在 Vercel Production 的 Demo，均不得使用 Live
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

## 3.2 Figma 落地与响应式布局准则

- Figma 是特定画板尺寸下的视觉与布局示意，用于识别信息层级、模块关系、设计语言和交互意图；不得把画板坐标机械转换为页面中的固定像素位置，也不以逐像素复刻作为实现目标。
- Figma 数据可能包含越界、非对称边距、不合理固定宽高、设备状态栏或仅在单一画板成立的间距。实现前必须检查这些问题，设备状态栏和浏览器外壳不得作为网页内容渲染；发现明显错误时应按 Web 布局约束修正，而不是照搬。
- 页面结构优先使用正常文档流、Flex 和 Grid。仅在元素确实需要叠放、脱离文档流或固定于视口时使用 `absolute`、`fixed` 或坐标定位，并确保该定位不会承担普通模块排版职责。
- 响应式断点表示布局模式切换，不是四份独立的固定画板。模块之间的纵向和横向空间应优先通过 `flex`、`grid`、`gap`、`padding`、对齐方式和弹性比例分配，并随可用宽度和高度自然压缩或展开。
- 避免用来源于单张画板测量的任意 `top`、`left`、负 margin 或特殊像素间距定位页面模块。固定像素优先用于图标、控件高度、圆角、边框等本身具有固定尺寸语义的元素；页面级间距优先使用设计 Token 和常规间距尺度。
- 子元素必须保持在父容器的内容边界内。设置宽度时同时检查父元素实际可用宽度、左右内边距和 `box-sizing`；Flex/Grid 子项按需使用 `min-w-0`、`w-full`、`max-w-full` 和安全换行，禁止依靠 `overflow: hidden` 掩盖文字或组件越界。
- 容器左右边距在没有明确视觉理由时应保持对称。设计稿中的子元素宽度若大于父容器扣除内边距后的可用宽度，应缩小子元素或调整合理的容器约束，不得让文字被裁切或伸出父元素。
- 文案长度、校验错误、动态数据和字体渲染均可能改变模块高度。布局必须允许自然换行并由后续元素顺流移动，不能依赖文案固定行数维持位置。
- UI 审查不能只检查 Figma 的 390、768、1024、1280 四个画板。至少同时检查断点临界值、中间宽度以及同一宽度下的高矮视口，确认无横向滚动、无父子越界、无模块重叠，并且弹性间距符合视觉层级。
- 当 Figma 精确坐标与可维护性、内容安全或响应式行为冲突时，优先级为：语义与可访问性 -> 父子约束和内容完整性 -> 响应式布局意图 -> 单一画板的精确坐标。对有意义的视觉偏差应在变更说明中指出原因。

## 4. 核心范围

必须实现的路由：

| 路由 | 责任 |
| --- | --- |
| `/` | Landing、功能摘要、价格、CTA、SEO |
| `/profile` | 静态作者介绍与作品展示；不提供编辑功能 |
| `/login`、`/register` | 邮箱密码身份流程及错误状态 |
| `/onboarding` | 首次登录创建每用户唯一项目 |
| `/dashboard` | Owner 统计、筛选、分页和反馈管理 |
| `/dashboard/settings` | 项目名称、描述、Slug 设置 |
| `/dashboard/billing` | 套餐状态、测试 Checkout、Portal |
| `/p/[slug]` | 公开反馈板、提交、搜索、排序、分页 |
| `/p/[slug]/feedback/[id]` | 反馈详情、动态 Metadata、投票 |
| `/p/[slug]/roadmap` | Planned/In Progress/Completed 路线图 |
| `/api/auth/[...all]` | Better Auth Handler |
| `/api/paddle/webhook` | Paddle 原始 Body 验签、事务幂等与订阅同步 |
| `/api/cron/billing-reconcile` | Bearer Secret 保护的每日账务核对 |

可选：仅在已有可验证发信域名时实现 `/forgot-password` 和 `/reset-password`。无自有域名时，不强制邮箱验证，也不让招聘方依赖邮件流程。

当前用户确认范围：Profile 使用静态内容；不新增反馈隐藏/恢复操作。Billing 使用 Paddle Sandbox 实现结账、客户门户、订阅同步及恢复，成功回跳复用 `/dashboard/billing`；路线图插件导致的 `startTime/reportAllChanges` 报错不属于应用修复范围。

明确不做：平台管理员、评论、Logo/文件上传、OAuth、独立价格页、复杂多租户/RBAC、Redis、队列、微服务、实时通信、国际化、拖拽路线图、任何真实收款。

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
      paddle/webhook/route.ts
      cron/billing-reconcile/route.ts
  features/
    auth/
    projects/
    feedback/
    dashboard/
    billing/
    # 各功能按需包含 components/、actions/（或 actions.ts）、schemas.ts、server/
  server/
    auth/
    db/
    errors/
    rate-limit/
    env.ts
    safe-action.ts
  lib/
    errors.ts
    action-errors.ts
    utils.ts
  components/ui/
drizzle/
tests/
```

功能域负责该领域的 UI、Action、校验、类型与服务端业务实现，不再使用顶层 `server/services/` 和 `validators/` 聚合业务文件。详见 [ADR 0013](docs/adr/0013-feature-owned-server-modules.md)。

- `features/<功能>/server/` 放业务查询、资源授权、数据库事务和第三方接入；Paddle SDK、支付配置与订阅同步归 Billing，投票与路线图归 Feedback。多个页面、Action、Webhook 或 Cron 调用同一业务模块，不改变其业务归属。
- Action 在服务端校验输入、读取 Session、接入限流，再调用功能模块，并处理缓存刷新与导航；不在 Action 中组装数据库 CRUD 实现。传给业务函数的用户 ID 必须来自服务端 Session，不能来自客户端输入。
- 顶层 `server/` 保留数据库、认证、错误适配、限流和服务端环境配置等共享基础设施；共享 UI 放 `components/`，共享支持代码放 `lib/`。
- 功能间通过具体模块显式引用；不要建立混合客户端与服务端导出的总入口。Client Component 不能运行时导入 `server/` 模块或 Secret，纯类型导入不产生运行时依赖。目录名本身不提供隔离保障。
- 按复杂度划分文件，不强制建立 Service/Repository 等多层透传。已有支持业务失败、并发回归测试的依赖替身入口可以保留；修改时优先保持完整业务流程容易阅读。

## 6. 数据与领域约束

- Better Auth 管理 `users`、`sessions`、`accounts`、`verification`，邮箱唯一。
- `projects`：`owner_id` 唯一，`slug` 唯一；一个用户核心版本只能拥有一个项目。
- `feedback`：关联 project 和 author；包含 title、description、status、`is_public`；为公开查询和排序建立必要索引。
- `votes`：`(user_id, feedback_id)` 复合唯一；并发重复投票由数据库约束兜底。
- `billing_customers`：用户 ID 主键、Paddle customer ID 唯一、随机 provisioning ID 唯一。不能根据未验证邮箱自动关联已有 Customer；有账务记录时禁止直接删除用户。
- `billing_checkouts`：每用户一个当前结账意图，attempt ID 和非空 transaction ID 唯一；先持久化意图再调用 Paddle，结果未知时禁止盲目重复 POST。
- `subscriptions`：Paddle subscription ID 主键、初始 transaction ID 唯一，customer ID 外键允许多条历史订阅。旧订阅取消只更新自身，不覆盖新订阅。
- `paddle_events`：`event_id` 主键；事件账本和订阅写入在同一事务中提交，不存储完整支付 Payload。
- 路线图完全由反馈状态派生，只展示 Planned、In Progress、Completed。
- Free 套餐最多 50 条反馈；在原项目 advisory lock 事务内读取 Owner 本地权益。Pro 需要 active、配置的 Pro 价格、未来的计费周期结束时间，且取消/暂停尚未生效。无试用和欠费宽限；降级不删除已有数据。
- Schema 变更必须通过 Drizzle migration，禁止在普通请求中自动执行迁移。
- Seed 必须可重复执行；生产 Seed 只能补齐演示账号、项目和示例数据，不清空已有数据。

## 7. 服务端、安全与授权规则

- 身份认证不等于资源授权。所有 Action 和 Route Handler 都要重新读取 Session，并在服务端验证资源所有权。
- 所有写入先用 Zod 验证输入；不能依靠表单校验、按钮隐藏或客户端传入的 owner/user ID。
- 公开查询不返回隐藏项目或隐藏反馈；按 Slug 和反馈 ID 查询时仍要验证二者归属关系。
- 项目创建/更新校验 Slug 唯一；冲突应返回可展示的领域错误。
- Paddle Checkout/Portal 每次自读 Session 并验证当前用户与 Customer 的本地归属。客户端不提供用户、Customer 或价格；Paddle.js 只打开服务端持久化的 transaction ID。
- Webhook 使用原始请求 Body 验签；订阅仅由已验签事件或服务端认证 Paddle API 对账更新。签名不是 customData 中用户归属的证明。
- Checkout Success 页面只显示结果，绝不直接把用户改为 Pro。
- Webhook 处理 `transaction.completed` 及 subscription.created/updated/activated/canceled/paused/resumed/past_due/trialing；未知事件安全记录忽略。Customer 在服务端创建时绑定，通过 API 恢复，不依赖邮箱匹配的 customer.created 事件。
- 首次订阅必须关联本地已知交易，并匹配 Customer；后续事件按订阅 ID 更新。资源 updatedAt 为主版本、事件 occurredAt 同版本定序；API 对账不能用本地时间覆盖提供方版本。
- Billing 回跳短时轮询本地状态，限流主动对账补偿丢失事件。Vercel 每日 Cron 使用 CRON_SECRET，最多核对 50 个客户，按上次尝试时间轮转；Preview 和本地无自动 Cron。
- Webhook 的去重记录和订阅更新应在事务中完成；重复事件不能产生重复副作用。
- 日志采用结构化、可定位的上下文信息，但不输出密码、Cookie、Token、Secret、完整数据库连接串或支付信息。

## 7.1 统一错误处理约定

- 业务 Server Action 统一使用 `src/server/safe-action.ts` 的 `actionClient`，通过 `.metadata({ operation })` 标记操作，使用 `.inputSchema(...)` 在服务端验证普通对象输入。
- 保留 next-safe-action 原生结果分支：成功为 `data`；输入校验失败为扁平化 `validationErrors: { formErrors, fieldErrors }`；业务或系统失败为 `serverError: { code, message, requestId, field? }`。创建成功后的导航继续使用 Next.js `redirect`。
- 业务错误码、默认安全文案和可选字段归属集中定义在 `src/lib/errors.ts` 的 `ERROR_CATALOG`。服务层抛出 `businessError(code)`，由 Action 边界统一序列化；不在各接口分散拼接错误协议或按文案判断错误。
- `pg-error-enum` 只提供 SQLSTATE 的语义化枚举，不自动理解业务。数据库错误统一由 `src/server/errors/database.ts` 沿 Drizzle `cause` 提取，并按“操作 + SQLSTATE + 精确约束名”映射；未知约束不得仅凭 `23503`、`23505` 等编号推断业务含义。
- 未知异常统一返回 `INTERNAL_ERROR` 和安全提示，日志仅保留操作、错误关联标识及受控数据库诊断字段。不得把原始异常、SQL、参数或提交内容传到前端或日志。Next.js 导航信号必须继续抛出，不能转换为失败提示。
- 数据库异常在事务边界之外统一转换，保留事务回滚语义；已有唯一约束、配额锁、所有权校验和 `onConflictDoNothing` 处理不得因统一错误而被移除。
- 前端通过 `src/lib/action-errors.ts` 的 `getActionFieldError`、`getActionErrorMessage` 提取提示；网络失败使用 `ACTION_NETWORK_ERROR`，业务分支判断稳定的 `code`。字段错误需关联输入控件，编辑其他字段不应清除仍然有效的字段错误。
- 当前只统一错误结构与提取方式，具体展示仍由表单或操作组件负责，未实现全局自动 Toast 或自动接入所有表单的公共 Hook。新增表单仍需显式接入校验结果、业务错误和网络失败展示。
- Better Auth 保留原生 HTTP 协议，通过 `src/features/auth/auth-error.ts` 映射前端文案；读取页面沿用 Next.js Error/Not Found 边界。Paddle Webhook 失败返回 `{ error: AppServerError }` 和非 2xx，不泄露原始异常；代码通过不代表外部 Sandbox 联调完成。
- 新增错误时同步维护目录、必要的数据库映射及相关回归测试。详细流程、示例和扩展步骤见本地 `docs/backend-handbook/14-error-handling.md`；除 `docs/adr/` 下的 Markdown 外，`docs/` 暂不纳入 Git，仓库约定以本节为准。

## 8. 环境变量与环境隔离

只提交 `.env.example`，不得提交任何真实值。需要维护以下变量：

```dotenv
DATABASE_URL=
DATABASE_URL_UNPOOLED=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
PADDLE_API_KEY=
PADDLE_NOTIFICATION_WEBHOOK_SECRET=
PADDLE_PRICE_ID_PRO=
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=
CRON_SECRET=
RESEND_API_KEY=
EMAIL_FROM=
```

- 在 `src/server/env.ts` 中用 Zod 校验服务端必需变量，缺失时快速失败。
- `DATABASE_URL` 使用 Neon pooled 连接供应用运行；`DATABASE_URL_UNPOOLED` 使用 direct 连接执行迁移和管理脚本。
- Development/Preview 可使用 dev 数据库；Production 必须使用独立 prod 数据库。
- Better Auth Secret 按本地、Preview、Production 分离，至少 32 字符；Production Secret 建立后保持稳定。
- `BETTER_AUTH_URL` 必须对应当前环境；修改 Vercel 变量后需重新部署。
- Paddle 始终使用 `pdl_sdbx_apikey_` API Key 和 `test_` Client Token，SDK 环境固定 sandbox。Webhook Secret 属于特定 Notification Destination，不同部署目标不可混用。
- `src/features/billing/server/config.ts` 用 Zod 延迟校验支付配置；缺失时公开浏览与 Free 保持可用，所有支付入口关闭。`NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` 是公开客户端标识，不是服务端 Secret。CRON_SECRET 至少 32 字符。
- 默认不创建 `NEXT_PUBLIC_` Secret，也不在 `next.config.ts` 的 `env` 中硬编码 Secret。
- Agent 不得要求用户在对话、Issue、README、日志或截图中粘贴真实 Secret。排错时只检查是否存在、前缀、长度和环境归属。

## 9. 页面与交互要求

- 服务端读取优先；筛选、搜索、排序和分页状态放在 URL Search Params 中，刷新和分享后保持一致。
- 对所有查询参数做服务端解析、范围限制和默认值处理。
- 投票使用 Optimistic UI，但必须支持 pending、防重复交互、失败回滚，并接受服务端最终计数。
- 每条用户路径都提供 Loading、Empty、Error 和 Not Found 状态；错误消息可行动且不泄露内部信息。
- Landing、公开反馈板和路线图应响应式、可直接访问，并具备合理 Metadata。
- 公开站点和 Billing 明确标识 Paddle Sandbox；主要浏览体验不要求招聘方注册或真实付费。
- 准备演示账号、演示项目和若干反馈；具体凭据通过安全的部署配置或文档化演示方案管理。

## 10. 测试策略

测试优先覆盖高风险领域，而不是追求机械覆盖率：

- 单元/领域测试：Zod schema、权限判断、状态转换、分页参数、套餐限制。
- 数据库集成测试：唯一 Slug、每用户一个项目、投票复合唯一、Paddle event 幂等、结账并发与订阅乱序。
- 组件测试：FeedbackForm、VoteButton、Billing 状态及错误/回滚。
- E2E：注册/登录 -> 创建项目 -> 提交反馈 -> 投票 -> Owner 改状态 -> 路线图更新 -> Checkout 入口。
- 安全回归：第二个账号不能读取或修改第一个账号的受保护资源。
- Paddle 测试：错误签名失败、重复事件无重复写入、未知事件安全忽略、事件顺序不会错误升级权限、未知创建结果不重复 POST。

测试必须使用独立配置和数据。禁止让自动化测试连接 Production 数据库或 Paddle Live 环境。

- 数据库集成测试与 E2E 使用 Neon 专用 test 分支，不复用 develop/preview/production；运行前校验测试连接与允许的 endpoint，pooled/direct 指向同一测试分支。
- 测试数据使用唯一运行标识并精确清理自身记录，不清库、不使用 TRUNCATE。幂等 Demo Seed 仅补齐约定演示数据，不覆盖用户修改。
- 认证和业务写操作使用 PostgreSQL 共享原子限流；业务限流在 Session 验证后、业务事务外消费额度，数据库不可用时不放行。

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
5. 查阅相关 ADR，判断本次是否产生新决策或替代既有决策，并确定需要维护的记录。

实现时：

1. 先读取相关代码和配置，沿用项目现有模式。
2. 先建立服务端约束和失败路径，再接 UI。
3. 添加能证明高风险逻辑的最小测试。
4. 审查 Server/Client 边界、类型、查询数量、授权、错误、日志和 Secret 使用。
5. 运行相关质量门禁，并汇报结果、剩余风险及新增环境/部署操作。
6. 将本次技术决策、取舍和验证证据同步到 ADR 与索引；最终交付说明相关 ADR，或说明本次未产生新的技术决策。

涉及账号注册、真实云资源创建、Vercel Production 部署、生产迁移/Seed、Paddle Notification Destination 或其他外部写操作时，先向用户说明目标和影响并取得确认。绝不使用 Paddle Live Key 或触发真实收款。

## 13. 完成定义

一个功能只有在以下条件满足时才算完成：

- 成功路径、失败路径、空状态和权限拒绝均有明确行为。
- 所有写操作完成服务端身份、授权和输入校验。
- 数据约束与 migration 一致，必要索引已说明。
- 相关测试通过，lint/typecheck 无新增错误。
- 新增环境变量同步更新 `.env.example` 和 README，不包含真实值。
- 影响部署或外部服务时，说明 Development/Preview/Production 的差异与操作步骤。
- 未加入计划外功能，且公开 Demo 的核心闭环仍可用。
- 本次产生或调整的技术决策已记录在 ADR 中，索引、状态和替代关系完整；未验证的内容明确标注，不能把提案写成已落地事实。

## 14. 最终发布门槛

- Vercel Production 可公开访问，无需 Vercel 账号。
- dev/Preview 与 Production 数据库隔离，运行时和迁移连接类型正确。
- Production migration、幂等 Demo Seed、Smoke Test 和核心 E2E 已执行。
- Paddle 全链路处于 Sandbox，真实测试结账、Webhook 验签、幂等和门户取消流程通过。
- 演示账号和公开项目可用，招聘方无需真实付费即可体验主要功能。
- README 包含启动、环境变量、迁移、Seed、测试、部署、测试卡、架构与故障定位说明。
- 发布前确认仓库、Git 历史、构建日志和页面中没有 Secret。

## 15. 语言相关

- 较大或较复杂的函数定义上方必须添加简短中文用途注释（通常 1–2 句），说明其业务目的，并按需指出权限、事务、并发、错误转换或副作用等关键边界。
- 该要求包括业务服务、Action、查询/校验工具、包含业务编排的组件，以及具有独立复杂逻辑的内部回调；由 `cache` 或 Action builder 包装的函数在对应声明上方说明。
- 简单透传、显而易见的一行工具、纯静态展示、测试用例回调和生成代码不机械添加注释。复杂测试辅助函数仍应说明用途。注释应解释用途或原因，不逐行复述实现，不作实现未提供的保证。
- 新增或维护函数说明时使用中文，并随实现同步更新；已有准确的英文内联注释无需为语言统一而批量重写。注释不得包含真实 Secret 或用户数据。
- 前端元素中文本为英文
- commit message使用英文
