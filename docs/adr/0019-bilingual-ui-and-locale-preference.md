# 0019 — Cookie 语言偏好与显式中英界面词典

- 状态：Accepted
- 记录日期：2026-10-11
- 决策日期：2026-10-11
- 记录性质：当次记录
- 替代：无；用户此次授权调整 AGENTS.md 中原仅英文、不做国际化的产品范围
- 被替代：无

## 背景与约束

用户要求整个前端支持中英双语、提供恰当翻译，并在顶部添加语言切换。已有页面默认使用 Server Component，筛选、分页、认证回跳依赖现有 URL；错误协议使用稳定业务码和安全英文文案。用户创建的项目、反馈及作者信息不能因界面语言变化而被改写。

## 考虑过的方案

| 方案 | 优点 | 成本与限制 | 取舍理由 |
| --- | --- | --- | --- |
| 使用带语言前缀的路由和国际化依赖 | 独立语言 URL、便于扩展多语言 SEO | 改变公开链接与回跳路径，需增加依赖和路由维护 | 当前只有两种界面语言，不采用 |
| 仅在浏览器保存语言并翻译 | 实现简单 | 首屏、Metadata 与客户端语言不一致，存在英文闪烁 | 不采用 |
| Cookie + 服务端词典 + 客户端 Context | 保留路由，服务端首屏和交互岛共享语言，无新增依赖 | 页面使用请求级动态渲染，词典需手动维护 | 采用 |

## 决策与理由

- 仅支持 `en` 和 `zh`，缺失或非法偏好回退英文，保留原默认体验。
- 非敏感 Cookie `feedbackflow-locale` 使用根路径、SameSite=Lax、一年有效期，HTTPS 时带 Secure。服务端通过异步 `cookies()` 读取，经白名单解析后提供页面、Metadata 和 Provider 初值。
- 顶部 English / 中文按钮具有按下状态、语言属性和键盘可访问性。切换更新客户端交互岛并调用 `router.refresh()`，保留路径、查询、Hash、滚动与组件状态，服务端重新读取 Cookie。
- 页面保持服务端组件；客户端只通过 Context 使用纯词典，不导入请求读取模块。服务端共享展示组件显式接收 locale。
- 以现有英文安全文案作为显式词典键；仅翻译标记过的界面文案，中文缺项回退英文。完整动态句子使用命名插值，变量值只替换一次，不再送入翻译。既有服务器错误码和校验协议保持原样，显示边界翻译已知安全提示。
- 日期采用指定语言和 UTC；近期记录使用双语相对时间。用户名称、项目名称、项目描述和反馈正文保留原文；作者页面固定介绍与首页演示样例属于界面展示文案，可翻译。
- Paddle 应用内的 Sandbox 文案翻译；Paddle 托管 Checkout 和 Customer Portal 的可用语言由提供方负责，不能通过 DOM 翻译或修改其安全边界。

## 影响与代价

- 新界面文案必须同时维护英文和中文；修改英文键时同步调整中文词典。
- 语言不参与业务缓存键，因为缓存保存领域数据，翻译发生在读取后的展示层；不修改权限、枚举、数据库或迁移。
- 根布局读取 Cookie，使原可静态生成的营销页面改为请求级渲染；当前 Demo 接受此成本。没有语言前缀，不宣称拥有独立中英文 SEO 索引页。
- 不自动检测浏览器语言或翻译用户内容，不新增环境变量。

## 实施与验证

已实现共享词典、Provider、请求读取、顶部切换及主要路由和错误状态的双语展示。新增单测覆盖 Cookie 白名单、插值、UTC、语言切换、刷新请求、表单草稿保留、中文错误提示和公开页面失败状态的语言入口。独立只读审查发现的公开失败页缺少切换入口已修复并复核。

本次实际验证：

- `pnpm lint`、`pnpm typecheck` 通过；全量单测 55 个文件、289 项通过；`git diff --check` 通过。
- Production build 通过。原配置构建先受 Google Fonts 网络限制影响，取得网络执行权限后发现已有 Production 配置的 `BETTER_AUTH_SECRET` 不满足校验；最终构建使用一次性的进程内认证 Secret 与 localhost 数据库 URL 完成编译，不修改真实环境文件、不连接数据库，也不代表正式部署配置已就绪。
- 本地 HTTP 实际读取首页、登录、注册和作者页，英文与中文偏好均返回 200；中文 Cookie 下根元素为 `zh-CN`，首屏文案和按钮选中状态一致。请求仅读匿名页面，不注册账号或写入业务数据。
- 新增正式 E2E 用例，但运行在配置阶段因缺少 `.env.test.local` / `TEST_DATABASE_URL` 被隔离保护拦截，未连接任何数据库。浏览器连接两次返回 `nodeRepl.fetch request failed`，真实浏览器点击、刷新、跨页面持久化与响应式视觉仍未验收；相关状态逻辑由组件和请求读取单测覆盖。

本地 `docs/design-system.md` 缺失；Figma 两次请求指定 token 节点均返回未选中节点，无法获得设计上下文。新增控件沿用 `globals.css` 的现有语义 Token。未改 Figma 文件或 Token。

## 重新评估条件

需要独立语言 SEO URL、更多语言、复杂复数规则，或词典体积显著增长时，重新评估路由与国际化库。Paddle 托管页面有明确一致语言需求时，单独核实提供方参数与支持范围。

## 相关证据

- [共享翻译与插值](../../src/lib/i18n/shared.ts)、[请求语言](../../src/lib/i18n/server.ts)、[客户端语言](../../src/lib/i18n/client.tsx)
- [语言切换](../../src/components/language-switcher.tsx)
- [错误协议 ADR 0006](0006-standardized-server-action-errors.md)、[URL 状态 ADR 0005](0005-url-driven-server-read-models.md)
- [Next.js cookies](https://nextjs.org/docs/app/api-reference/functions/cookies)、[Next.js useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router)
