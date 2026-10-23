# 0028 — 公开元数据与爬虫发现策略

- 状态：Accepted
- 记录日期：2026-10-23
- 决策日期：2026-10-23
- 记录性质：当次记录
- 替代：无
- 被替代：无

## 背景与约束

用户要求补齐 Open Graph、分享及面向搜索引擎和 AI 的可发现性。应用同时包含公开作品、用户提交的反馈、认证页面和后台；Preview 与 Production 不能使用相同的索引策略。现有中英界面使用 Cookie 偏好，同一路径没有独立语言版本 URL。所有支付仍为 Paddle Sandbox。

## 考虑过的方案

| 方案 | 优点 | 成本与限制 | 取舍理由 |
| --- | --- | --- | --- |
| 仅补根布局通用分享标签 | 改动少 | 反馈详情易继承错误标题、URL，缺少发现入口和环境边界 | 不采用 |
| 页面元数据、品牌分享图、动态 Sitemap 与语义 JSON-LD | 使用标准协议，兼容公开页面和现有权限 | 需要明确索引策略，Sitemap 增加数据库读取 | 采用 |
| 为 AI 单独建立 llms.txt 或内容镜像 | 可提供额外摘要 | 当前没有消费者要求；不能据此保证 AI 收录，需要维护重复内容 | 本次不采用 |

## 决策与理由

1. `src/lib/seo.ts` 统一规范域名、页面元数据与 JSON-LD 序列化。可选 `SITE_URL` 只接受 HTTPS origin，默认当前正式域名 `https://feedback-flow-demo.vercel.app`；不信任请求 Host，不从认证回调地址推导公开域名。首页、Profile、公开反馈板、路线图和反馈详情完整声明各自的 canonical、Open Graph 和 Twitter 数据，避免嵌套元数据浅合并带来的继承错误。
2. `/share-image` 使用 Next.js 原生 ImageResponse 生成 1200 × 630 英文品牌图，各页面分享标题、描述仍随语言变化；`/apple-icon` 提供触屏图标。图片不读取数据库、用户文本或远程字体。沿用现有品牌标志和颜色，无新增依赖。
3. 首页提供 WebSite、WebApplication，Profile 提供 ProfilePage、Person，公开项目内容提供 BreadcrumbList。只描述页面中可核实的信息，不加入虚构评价、价格优惠或个人联系方式。统一转义 `<`，避免用户标题通过 `</script>` 注入 HTML。
4. Vercel 仅 `VERCEL_ENV=production` 可索引；Preview/Development 使用页面 noindex、HTTP `X-Robots-Tag`、robots 全站禁止抓取和空 Sitemap。非 Vercel 的正式构建须同时具有 `NODE_ENV=production` 与显式 `SITE_URL` 才启用索引。构建与运行环境必须保持一致；修改配置须重新构建部署。
5. Production 的登录、注册、Onboarding、Dashboard 和 API 响应带有 `noindex, nofollow, nosnippet`。robots 只禁止 API；认证页面允许抓取以便看到 noindex。robots/noindex 是爬虫提示，不能替代鉴权，也不能保证已经收录的 Preview 立即消失；既有服务端授权保持独立。
6. `/sitemap.xml` 为动态路由，每次仅查询公开项目，以及同时满足项目公开、反馈公开的详情。只选路由字段，不读取用户身份或正文，不缓存公开状态，不添加虚构 lastmod。非正式环境在导入数据库模块前返回空列表；数据库错误返回失败，不伪装成完整成功的 Sitemap。
7. 筛选、搜索、分页等带查询参数的反馈板 noindex，canonical 指向干净的项目 URL，独立详情由 Sitemap 提供发现入口。Cookie 语言不生成虚假的 hreflang URL；无语言偏好的爬虫通常读取默认英文。保留 Next.js 默认社交爬虫的阻塞式 metadata 输出，无需自定义 `htmlLimitedBots`。
8. AI 搜索沿用标准可抓取 HTML、真实内容、链接和结构化数据。robots 的通用规则适用于搜索和 AI 爬虫，不额外设置专用训练权限声明。本次不添加 llms.txt、隐藏的关键词文本或无法验证的收录承诺。

## 影响与代价

- 收益：分享预览明确，公开内容具有稳定规范地址，搜索与 AI 读取获得一致的页面语义；后台、Preview 和隐藏资源具有明确边界。
- 成本、限制与风险：Sitemap 每次读取两组路由字段，当前适合小规模演示；分享图共用一张，不能区分项目视觉；Cookie 语言不足以让搜索引擎分别收录中英版本。外部平台可能缓存分享内容，最终收录与展示由其决定。
- 实施、兼容性或迁移影响：新增可选、非敏感 `SITE_URL`，更新 `.env.example` 和 README；无数据库迁移，无云端变量或部署写入。

## 实施与验证

2026-10-23 本地实际执行：

- `pnpm lint`、`pnpm typecheck` 通过；Vitest 61 个文件、337 个测试通过。
- 新增测试覆盖环境索引边界、可信规范地址、页面分享信息、JSON-LD 注入转义、Preview 跳过数据库、Sitemap 错误传播，以及实际生成 SQL 的项目/反馈双重公开条件。页面测试验证查询参数 noindex 和隐藏项目无可索引元数据。
- 正式构建通过。构建使用虚拟数据库地址及临时认证密钥；首次因沙盒不能下载既有 Google Inter 字体失败，允许字体下载后重试通过。
- 用本地正式构建服务和 Twitterbot User-Agent 检查：首页与 Profile 在初始 HTML 的 head 中包含 OG 数据、canonical 和 JSON-LD；中文版 Profile 的 lang 与 OG locale 正确；登录/注册 HTML 与 HTTP 均 noindex，Dashboard/Onboarding 的登录重定向也保留 noindex 响应头；Production robots 指向规范 Sitemap。
- 实际请求 `/share-image` 和 `/apple-icon` 得到有效 PNG，尺寸分别为 1200 × 630 和 180 × 180；已查看分享图，内容完整。
- 独立只读安全审查未发现隐藏资源泄露、JSON-LD 注入或跨请求缓存新增风险。按 React 检查项核对：新增内容留在服务端，独立查询并行，无新增客户端状态或依赖。
- 未连接真实数据库执行 Sitemap/公开项目 HTTP 集成验收，未运行数据库集成或完整 E2E；这些查询的公开条件由单元测试和代码审查验证。本次未部署、未向搜索引擎提交站点，也未验证第三方平台实际收录与分享抓取。

## 重新评估条件

公开 URL 接近单个 Sitemap 的 50,000 条限制时，改用分片和索引；采用自有域名时更新 SITE_URL；需要独立中英搜索结果时重新设计语言 URL；需要项目专属分享图、特定 AI 消费者协议或不同抓取权限时另行记录方案。

## 相关证据

- [ADR 0019：Cookie 语言偏好](0019-bilingual-ui-and-locale-preference.md)
- [共享 SEO 工具](../../src/lib/seo.ts)、[公开发现查询](../../src/features/feedback/server/discovery.ts)
- [Next.js Metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)、[JSON-LD](https://nextjs.org/docs/app/guides/json-ld)
- [Google noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing)、[Sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google AI 搜索功能](https://developers.google.com/search/docs/appearance/ai-features)、[OpenAI 爬虫说明](https://developers.openai.com/api/docs/bots)
