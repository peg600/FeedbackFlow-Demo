# FeedbackFlow Design System

本文档是 Figma 设计规范的本地实现快照，供开发、评审、测试和无法连接 Figma 的 Agent 使用。它不替代 Figma 原稿，也不改变 `plan.pdf` 与 `AGENTS.md` 规定的产品范围。

最后同步日期：2026-08-20。

## 1. 设计来源与优先级

- Figma 文件：[FeedbackFlow SaaS Complete UI Design](https://www.figma.com/design/TxUtfRQ9Eh71XWC939ksIz/FeedbackFlow-SaaS---Complete-UI-Design?node-id=35-2)
- `_tokens` 页面：`35:2`
- `design-tokens` Frame：`12:376`
- `_codex-metadata` Frame：`40:14`
- `_prototype` 页面：`165:2`，用于记录页面间的原型跳转关系。
- `_components` 页面：`186:2`，定义生产组件的尺寸、状态与交互规范。
- 当前 Figma 文件没有原生 Variable Collections；本文中的值来自实际画布与 `_codex-metadata`。

发生冲突时按以下顺序处理：

1. `plan.pdf` 与 `AGENTS.md` 决定产品范围、领域约束和正式路由。
2. 对应 Figma 页面决定视觉层级、布局和交互意图。
3. 本文档提供可离线读取的实现映射。
4. `src/app/globals.css` 是当前代码已经落地的运行时 Token。

不得为了匹配设计稿而实现计划外功能。Figma 更新后，应同时更新本文档和运行时 Token。

## 2. 响应式策略

采用 mobile-first，不为每张 Figma Frame 复制独立组件：

| Figma Frame | 实现方式 |
| --- | --- |
| `mobile(390)` | 基础样式，无前缀 |
| `md(768)` | Tailwind `md:`，最小宽度 768px |
| `lg(1024)` | Tailwind `lg:`，最小宽度 1024px |
| `xl(1280)` | Tailwind `xl:`，最小宽度 1280px |
| `desktop` | 最大布局表现，内容宽度不超过 1280px |

Landing 使用全宽 Section 与居中的 `max-w-content` 容器。Dashboard 使用固定 Sidebar 和可滚动 Main；公开反馈板在宽屏为列表与提交表单两栏；Roadmap 在宽屏为三列。

## 3. 颜色 Token

画布色板与 metadata 有少量差异。实现中保留各自用途：实际色板负责基础视觉，metadata 的颜色负责交互、校验和通知状态。

| CSS / Tailwind Token | 值 | 用途 |
| --- | --- | --- |
| `background` | `#FFFFFF` | 页面和主要容器背景 |
| `surface` | `#F7F8FC` | 设计色板中的 Surface、侧栏和分组背景 |
| `surface-subtle` | `#F9FAFB` | Secondary hover、disabled 和轻量 hover |
| `surface-hover` | `#F3F4F6` | Sidebar、Card、Secondary active |
| `surface-brand` | `#F0EFFF` | 品牌 Badge 背景 |
| `surface-info` | `#EBF3FF` | In-progress Badge 背景 |
| `surface-success` | `#EAF9F5` | Completed Badge 背景 |
| `auth-proof` | `#4E46D5` | 注册页桌面 Product proof 背景 |
| `auth-proof-muted` | `#DDD9FF` | 注册页 Product proof 次级文字 |
| `primary` | `#675DFF` | 品牌色、主要操作、focus outline、Planned |
| `primary-hover` | `#5549E0` | Primary hover |
| `primary-active` | `#4A3FCC` | Primary active |
| `accent` | `#62DFC4` | Logo 辅助色和强调色 |
| `foreground` | `#101828` | 标题与高强调文本 |
| `text` | `#344054` | 正文和表单标签 |
| `muted-foreground` | `#667085` | 次级说明文本 |
| `subtle-foreground` | `#6B7280` | 导航默认文本 |
| `disabled-foreground` | `#9CA3AF` | Disabled 文本 |
| `border` | `#E4E7EC` | 画布中的控件边框 |
| `border-subtle` | `#E5E7EB` | Skeleton、Card 与 metadata 默认边框 |
| `border-hover` | `#D1D5DB` | Card hover 边框 |
| `success` | `#31B99A` | 品牌成功反馈和完成 Badge 文本 |
| `warning` | `#F4B740` | 设计色板中的 Warning |
| `warning-strong` | `#F59E0B` | Warning Toast 与状态强调 |
| `danger` | `#E85D75` | 设计色板中的 Danger |
| `error` | `#EF4444` | 表单错误、Error Toast |
| `info` | `#3B82F6` | Info Toast、In-progress |
| `status-completed` | `#10B981` | Roadmap Completed 状态 |

不要在组件内重复使用这些十六进制值；优先使用 `globals.css` 暴露的语义化 Tailwind Token。

## 4. 字体与图标

- 字体：Inter。
- Heading：Semi Bold 或 Bold。
- Body：Regular。
- Caption：Medium。
- 应用字号 Scale：13、14、16、20、24、32、40px。
- `_tokens` 展示板自身还使用 11、12、17、18、44px；这些是设计说明画布尺寸，不自动成为产品页面的正文 Scale。
- 图标：Lucide React 风格，默认 24px、1.5px stroke，使用 round caps/joins。
- Figma 中使用的 SVG 已本地化到 `public/icons/`；业务代码优先通过 `src/lib/icons.ts` 的 `iconPaths` 引用，来源与节点映射见 `public/icons/manifest.json`。
- Figma 导出的状态图标保留设计稿颜色；需要继承运行时文字颜色时，应内联使用带 `currentColor` 的 Lucide SVG，而不是依赖外链图片继承颜色。

## 5. 尺寸、圆角与布局

| Token | 值 | 用途 |
| --- | --- | --- |
| `component-control` | 40px | 标准 Button 与 Input 高度 |
| `select-control` | 38px | Dropdown 与 Dashboard 桌面筛选控件高度 |
| `control-compact` | 42px | 历史页面级紧凑控件高度；新组件优先使用命名尺寸 |
| `control` | 48px | 历史页面级大控件高度；新组件优先使用命名尺寸 |
| `icon` | 24px | 默认图标尺寸 |
| `sidebar` | 240px | Desktop Sidebar 宽度 |
| `content` | 1280px | 页面内容最大宽度 |
| `toast` | 400px | Toast 最大宽度 |
| `radius-placeholder` | 8px | Skeleton 与 Toast |
| `radius-control` | 10px | 历史页面级大控件圆角；新组件使用 `radius-placeholder` |
| `radius-token` | 14px | Badge 与 Token Swatch |
| `radius-surface` | 16px | 大型 Card/Panel |
| `radius-pill` | 9999px | Status Badge |

常用组件间距：Button `px-[18px] py-2.5`，Input/Dropdown `px-3`，Card 由页面决定内容 padding，Table Cell `px-4`，Toast 距视口右上角 24px。

## 6. 组件与状态

所有带 `href` 的链接和未禁用按钮在 Hover 时使用 `cursor: pointer`；禁用按钮不得显示可点击光标。

### Button

- Figma 节点：`54:16`。
- Primary：`primary` 背景、白色文本。
- Secondary：白色背景、`border-subtle` 边框。
- 高度 40px、圆角 8px、水平内边距 18px，14px semibold 文本。
- Hover：Primary 使用 `primary-hover`；Secondary 使用 `surface-subtle`。
- Active：Primary 使用 `primary-active`，Secondary 使用 `surface-hover`，均缩放至 `0.98`。
- Disabled：`opacity: 0.5` 与 `cursor: not-allowed`。
- Focus-visible：2px `rgb(103 93 255 / 30%)` outline，2px offset。

### Input

- Figma 节点：`54:122`。
- 高度 40px、圆角 8px、水平内边距 12px，14px 文本，默认使用 `border-subtle`。
- Focus 使用 `primary` 边框及 2px `rgb(103 93 255 / 15%)` halo。
- Error 使用 `error` 边框、右侧 16px Alert Circle 图标与 12px 错误文本，不叠加 focus halo，并设置 `aria-invalid="true"`、`aria-describedby`。
- Success 使用 `status-completed` 边框和 Check 图标。
- Disabled 使用 `surface-subtle` 背景与 `disabled-foreground` 文本。

### Dropdown

- Figma 节点：`185:4`。
- 使用共享的 shadcn/Radix Select 组件；收起状态高 38px、圆角 8px、水平内边距 12px，14px medium 文本。
- 箭头使用该节点导出的 10×10 SVG，并固定在右侧 12px；展开时切换为对应的向上箭头，文本预留右侧空间且不换行。
- Hover 使用 `surface-subtle` 背景和 `border-hover`；Focus/Open 使用 `primary` 边框与控件 halo；Disabled 使用 50% opacity 和不可用光标。
- 展开面板的目标宽度为 200px、最大高度 240px，8px 圆角、`0 12px 12px rgb(0 0 0 / 8%)` 阴影、6px 内边距与 2px 项目间距。Radix Popper 以 8px 安全边距进行碰撞检测、自动翻转和位移，并使用其可用宽高变量在窄视口收缩，避免横向滚动。选项高 36px、圆角 6px；已选项使用 Check，状态筛选其余选项使用 Figma 导出的 8px 状态点。
- Radix 负责点击外部关闭、Enter/Space 选择、Arrow/Home/End 导航、Escape 关闭和焦点回归；保留隐藏表单字段，Dashboard URL 与 Server Action 提交行为不变。

### Card、Table 与 Navigation

- Figma 节点：Card/Navigation `58:4`，Table `185:201`。
- Card 使用 12px 圆角、`#E2E8F0` 边框和 `0 1px 1.5px rgb(0 0 0 / 3%)` 阴影；仅交互式 Card 在 hover 使用 `border-hover`、`0 8px 8px rgb(0 0 0 / 8%)` 和 `translateY(-2px)`，active 回到原位，200ms 动效使用 `cubic-bezier(0.16, 1, 0.3, 1)`。
- Table 只抽离为 `.ui-table-*` CSS classes，不建立 React Table 组件。容器使用 12px 圆角、`border-subtle` 与 overflow hidden/auto；表头高 40px、`surface-subtle` 背景、12px uppercase semibold；数据行高 56px，hover 使用 `surface-subtle` 并在首个单元格内显示 3px `accent` 强调线。
- Table 文本左对齐，Status/Votes 居中，日期右对齐；Visibility/Updated 在 tablet 隐藏，mobile 继续使用 Card 布局。
- Sidebar active 使用 `#EEF2FF` 背景、3px `primary` 左边框和 `primary` 文本。
- Top Navigation hover 使用更深文本及品牌下划线。

### Toast、Empty State 与 Skeleton

- Toast 固定在右上角，距边缘 24px，左边框 4px，最大宽度 400px，默认 5 秒关闭。
- Empty State 区分首次使用、无搜索结果和空列；主要恢复操作使用 Primary CTA。
- Skeleton 使用镜像实际布局的占位结构，不能只显示孤立 Spinner。
- Shimmer：`#E5E7EB → #F3F4F6 → #E5E7EB`，background-size `200% 100%`。

## 7. Motion

| Token | 时长 | Easing | 用途 |
| --- | --- | --- | --- |
| `instant` | 100ms | ease-in | Button active |
| `fast` | 150ms | ease-in-out | Button hover、Table hover、Dropdown close |
| `base` | 200ms | ease-out / ease-in | Input、Card、Modal、Backdrop、Dropdown |
| `slow` | 300ms | ease-out | Page entrance、Toast entrance、Mobile Drawer |
| `skeleton` | 1500ms | ease-in-out infinite | Shimmer |
| `menu-stagger` | 50ms | — | Mobile menu item stagger |
| `toast-timeout` | 5000ms | — | Toast auto-dismiss |

Easing：

- Standard：`cubic-bezier(0.4, 0, 0.2, 1)`。
- Entrance：`cubic-bezier(0, 0, 0.2, 1)`。
- Exit：`cubic-bezier(0.4, 0, 1, 1)`。

全局提供 Shimmer、Toast enter/exit、Modal enter 和 Mobile Drawer enter 动画。页面和组件只在确有状态切换时使用，不要为了装饰给所有元素增加动画。所有动画必须受 `prefers-reduced-motion: reduce` 控制。

## 8. Figma 页面与正式路由

| Figma 页面 | Next.js 路由 |
| --- | --- |
| `/` | `/` |
| `/login` | `/login` |
| `/register` | `/register` |
| `/forgot-password` | 可选 `/forgot-password` |
| `/reset-password` | 可选 `/reset-password` |
| `/onboarding` | `/onboarding` |
| `/dashboard` | `/dashboard` |
| `/settings` | `/dashboard/settings` |
| `/billing` | `/dashboard/billing` |
| `/board` | `/p/[slug]` |
| `/board/[id]` | `/p/[slug]/feedback/[id]` |
| `/roadmap` | `/p/[slug]/roadmap` |

### 原型导航与路由守卫

- 登录成功默认进入 `/dashboard`；`returnTo` 仅允许归一化后的 `/dashboard/*`、`/onboarding` 与 `/p/*` 站内路径，并拒绝外部 URL、协议相对 URL、反斜杠路径及认证页循环。
- 未登录访问任意 `/dashboard/*` 路由统一跳转到 `/login?returnTo=/dashboard`。
- 已登录但尚未创建唯一项目时，访问 `/dashboard/*` 跳转到 `/onboarding`。
- 已拥有项目的用户访问 `/onboarding` 跳转回 `/dashboard`。
- Dashboard 导航使用正式路由 `/dashboard`、`/dashboard/settings`、`/dashboard/billing`；公开链接使用 `/p/[slug]` 与 `/p/[slug]/roadmap`。
- 注册成功后继续进入 `/onboarding`。Figma 中的密码恢复页面不纳入当前实现，除非满足 `AGENTS.md` 对可验证发信域名的条件。

可选密码恢复页面仍受 `AGENTS.md` 的发信域名条件限制，不能因为 Figma 中存在页面就自动加入核心范围。

## 9. 同步流程

修改设计系统时：

1. 读取最新 `_tokens`、`design-tokens` 与 `_codex-metadata`。
2. 区分画布实际值、交互说明和仅用于 Token 展示板的尺寸。
3. 更新本文档中的语义映射。
4. 更新 `src/app/globals.css`，避免破坏现有 Token 名称。
5. 检查相关页面的 responsive、focus、error 和 reduced-motion 状态。
6. 运行 lint、typecheck、相关测试；影响全局样式或字体时运行 production build。
