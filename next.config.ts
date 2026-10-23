import type { NextConfig } from "next";
import { isIndexableEnvironment } from "./src/lib/seo";

const nextConfig: NextConfig = {
  async headers() {
    const sources = isIndexableEnvironment()
      ? ["/login", "/register", "/onboarding", "/dashboard/:path*", "/api/:path*"]
      : ["/:path*"];
    return sources.map((source) => ({ source, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, nosnippet" }] }));
  },
};

export default nextConfig;
