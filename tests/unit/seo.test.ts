import { afterEach, describe, expect, it, vi } from "vitest";
import { breadcrumbData, getSiteUrl, isIndexableEnvironment, NO_INDEX, publicPageMetadata, serializeJsonLd } from "@/lib/seo";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import nextConfig from "../../next.config";

const mocks = vi.hoisted(() => ({ paths: vi.fn() }));
vi.mock("@/features/feedback/server/discovery", () => ({ getPublicDiscoveryPaths: mocks.paths }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("public discovery and metadata", () => {
  it("only indexes production and explicitly configured self-hosted production", () => {
    expect(isIndexableEnvironment({ VERCEL_ENV: "production" })).toBe(true);
    expect(isIndexableEnvironment({ VERCEL_ENV: "preview", NODE_ENV: "production", SITE_URL: "https://example.com" })).toBe(false);
    expect(isIndexableEnvironment({ VERCEL_ENV: "development" })).toBe(false);
    expect(isIndexableEnvironment({ NODE_ENV: "production" })).toBe(false);
    expect(isIndexableEnvironment({ NODE_ENV: "production", SITE_URL: "https://example.com" })).toBe(true);
  });

  it("uses an explicit canonical origin and rejects unsafe or malformed configuration", () => {
    expect(getSiteUrl({})).toBe("https://feedback-flow-demo.vercel.app");
    expect(getSiteUrl({ SITE_URL: "https://example.com/" })).toBe("https://example.com");
    for (const value of ["http://example.com", "https://user:pass@example.com", "https://example.com/path", "https://example.com/?q=x", "https://example.com/#x", "invalid"]) {
      expect(() => getSiteUrl({ SITE_URL: value })).toThrow();
    }
  });

  it("keeps canonical, Open Graph and Twitter specific to the public page", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("SITE_URL", "https://example.com");
    const result = publicPageMetadata({ title: "Feedback title", description: "A useful idea", path: "/p/demo/feedback/abc", locale: "zh" });
    expect(result).toMatchObject({
      alternates: { canonical: "https://example.com/p/demo/feedback/abc" },
      robots: { index: true, follow: true },
      openGraph: { title: "Feedback title", description: "A useful idea", url: "https://example.com/p/demo/feedback/abc", locale: "zh_CN", images: [{ url: "https://example.com/share-image", width: 1200, height: 630 }] },
      twitter: { card: "summary_large_image", title: "Feedback title" },
    });
    expect(result.alternates).not.toHaveProperty("languages");
    expect(publicPageMetadata({ title: "Filtered", description: "Search", path: "/p/demo", locale: "en", noIndex: true }).robots).toEqual(NO_INDEX);
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(publicPageMetadata({ title: "Preview", description: "Preview", path: "/", locale: "en" }).robots).toEqual(NO_INDEX);
  });

  it("cannot close the JSON-LD script with user-generated text", () => {
    const value = '</script><script>alert("x")</script>';
    const data = breadcrumbData([{ name: value, path: "/p/demo" }]);
    const serialized = serializeJsonLd(data);
    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized).itemListElement[0].name).toBe(value);
  });

  it("does not query the database or advertise a sitemap in Preview", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    expect(await sitemap()).toEqual([]);
    expect(mocks.paths).not.toHaveBeenCalled();
    expect(await nextConfig.headers!()).toEqual([{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, nosnippet" }] }]);
  });

  it("lists canonical public URLs without fabricated last-modified dates", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("SITE_URL", "https://example.com");
    mocks.paths.mockResolvedValue(["/p/demo", "/p/demo/roadmap", "/p/demo/feedback/abc"]);
    expect(robots()).toEqual({ rules: { userAgent: "*", allow: "/", disallow: "/api/" }, sitemap: "https://example.com/sitemap.xml" });
    expect(await sitemap()).toEqual(["/", "/profile", "/p/demo", "/p/demo/roadmap", "/p/demo/feedback/abc"].map(path => ({ url: `https://example.com${path}` })));
    const headers = await nextConfig.headers!();
    expect(headers.map(rule => rule.source)).toEqual(["/login", "/register", "/onboarding", "/dashboard/:path*", "/api/:path*"]);
    mocks.paths.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(sitemap()).rejects.toThrow("database unavailable");
  });
});
