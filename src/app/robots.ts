import type { MetadataRoute } from "next";
import { isIndexableEnvironment, siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

/** 生产公开内容允许搜索与 AI 爬虫访问，非公开页面通过 noindex 而非 robots 隐藏。 */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexableEnvironment()) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: "/api/" }, sitemap: siteUrl("/sitemap.xml") };
}
