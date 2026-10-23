import type { MetadataRoute } from "next";
import { isIndexableEnvironment, siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

/** 请求时检查公开状态，不缓存已经隐藏的资源，也不在构建阶段连接数据库。 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isIndexableEnvironment()) return [];
  const { getPublicDiscoveryPaths } = await import("@/features/feedback/server/discovery");
  const paths = ["/", "/profile", ...await getPublicDiscoveryPaths()];
  return [...new Set(paths)].map((path) => ({ url: siteUrl(path) }));
}
