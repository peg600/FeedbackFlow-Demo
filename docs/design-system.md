# FeedbackFlow Design System

本文档是 Figma 设计规范的本地实现快照，供开发、评审、测试和无法连接 Figma 的 Agent 使用。它不替代 Figma 原稿，也不改变 `plan.pdf` 与 `AGENTS.md` 规定的产品范围。

最后同步日期：2026-08-18。

## 1. 设计来源与优先级

- Figma 文件：[FeedbackFlow SaaS Complete UI Design](https://www.figma.com/design/TxUtfRQ9Eh71XWC939ksIz/FeedbackFlow-SaaS---Complete-UI-Design?node-id=35-2)
- `_tokens` 页面：`35:2`
- `design-tokens` Frame：`12:376`
- `_codex-metadata` Frame：`40:14`
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
| `control-compact` | 42px | Button 高度 |
| `control` | 48px | Input 和标准表单控件高度 |
| `icon` | 24px | 默认图标尺寸 |
| `sidebar` | 240px | Desktop Sidebar 宽度 |
| `content` | 1280px | 页面内容最大宽度 |
| `toast` | 400px | Toast 最大宽度 |
| `radius-placeholder` | 8px | Skeleton 与 Toast |
| `radius-control` | 10px | Button 与 Input |
| `radius-token` | 14px | Badge 与 Token Swatch |
| `radius-surface` | 16px | 大型 Card/Panel |
| `radius-pill` | 9999px | Status Badge |

常用组件间距：Button `px-6 py-2.5`，Input `px-4 py-3`，Card `p-6`，Table Row `px-6 py-4`，Toast 距视口右上角 24px。

## 6. 组件与状态

所有带 `href` 的链接和未禁用按钮在 Hover 时使用 `cursor: pointer`；禁用按钮不得显示可点击光标。

### Button

- Primary：`primary` 背景、白色文本。
- Hover：`primary-hover`。
- Active：`primary-active` 并缩放至 `0.98`。
- Disabled：`opacity: 0.5` 与 `cursor: not-allowed`。
- Focus-visible：2px `primary` outline，2px offset。

### Input

- 默认使用 `border`。
- Focus 仅使用单层 `primary` 边框，不叠加外侧 focus ring。
- Error 使用 `error` 边框与 12px 错误文本，并设置 `aria-invalid="true"`、`aria-describedby`。
- Success 使用 `status-completed` 边框和 Check 图标。
- Disabled 使用 `surface-subtle` 背景与 `disabled-foreground` 文本。

### Card、Table 与 Navigation

- Card 默认使用轻量阴影和 `border-subtle`；hover 使用 `border-hover`、`shadow-md` 与 `translateY(-2px)`。
- Table Row hover 使用 `surface-subtle`，可在左侧显示 3px `accent` 标记。
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

可选密码恢复页面仍受 `AGENTS.md` 的发信域名条件限制，不能因为 Figma 中存在页面就自动加入核心范围。

## 9. 同步流程

修改设计系统时：

1. 读取最新 `_tokens`、`design-tokens` 与 `_codex-metadata`。
2. 区分画布实际值、交互说明和仅用于 Token 展示板的尺寸。
3. 更新本文档中的语义映射。
4. 更新 `src/app/globals.css`，避免破坏现有 Token 名称。
5. 检查相关页面的 responsive、focus、error 和 reduced-motion 状态。
6. 运行 lint、typecheck、相关测试；影响全局样式或字体时运行 production build。
