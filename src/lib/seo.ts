import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/shared";

export const SITE_NAME = "FeedbackFlow";
export const NO_INDEX = { index: false, follow: false, nosnippet: true } as const;
const defaultSiteUrl = "https://feedback-flow-demo.vercel.app";

/** 使用部署配置确定规范域名，拒绝路径、凭据和查询串，不信任请求 Host。 */
export function getSiteUrl(environment: Record<string, string | undefined> = process.env) {
  const value = environment.SITE_URL?.trim() || defaultSiteUrl;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid SITE_URL");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("SITE_URL must be an HTTPS origin without credentials, path, query or fragment");
  }
  return url.origin;
}

/** Vercel 仅 Production 可索引；自托管须显式配置正式域名，本地构建默认不索引。 */
export function isIndexableEnvironment(environment: Record<string, string | undefined> = process.env) {
  return environment.VERCEL_ENV
    ? environment.VERCEL_ENV === "production"
    : environment.NODE_ENV === "production" && Boolean(environment.SITE_URL?.trim());
}

export function siteUrl(path = "/") {
  return new URL(path, `${getSiteUrl()}/`).toString();
}

export function metadataDescription(value: string) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > 180 ? `${text.slice(0, 177)}…` : text;
}

/** 每个公开页面完整声明分享对象，避免 Next.js 浅合并遗留首页标题或 URL。 */
export function publicPageMetadata({ title, description, path, locale, noIndex = false }: {
  title: string; description: string; path: string; locale: Locale; noIndex?: boolean;
}): Metadata {
  const summary = metadataDescription(description);
  const url = siteUrl(path);
  const images = [{ url: siteUrl("/share-image"), width: 1200, height: 630, alt: "FeedbackFlow — Product feedback and public roadmaps" }];
  return {
    title, description: summary,
    alternates: { canonical: url },
    robots: noIndex || !isIndexableEnvironment() ? NO_INDEX : { index: true, follow: true, "max-image-preview": "large" },
    openGraph: { type: "website", siteName: SITE_NAME, title, description: summary, url, locale: locale === "zh" ? "zh_CN" : "en_US", images },
    twitter: { card: "summary_large_image", title, description: summary, images: images.map(({ url, alt }) => ({ url, alt })) },
  };
}

/** 转义 HTML 起始符，防止用户标题或描述通过 JSON-LD 结束 script 标签。 */
export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function breadcrumbData(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: siteUrl(item.path) })),
  };
}
