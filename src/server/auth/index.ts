import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";

import { env } from "@/lib/env";
import { createAuthBaseURL } from "@/server/auth/base-url";
import { getAuthRateLimitKey } from "@/server/auth/rate-limit-key";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { rateLimitStore } from "@/server/rate-limit";

export const auth = betterAuth({
  baseURL: createAuthBaseURL({ configuredURL: env.BETTER_AUTH_URL }),
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    transaction: true,
  }),
  logger: {
    level: "error",
    // 仅记录认证组件和日志级别，避免输出库传入的请求信息或原始异常。
    log(level) {
      console.error(
        JSON.stringify({
          component: "better-auth",
          level,
          message: "Authentication request failed.",
        }),
      );
    },
  },
  emailAndPassword: {
    enabled: true,
    maxPasswordLength: 128,
    minPasswordLength: 8,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 5 },
    },
    customStorage: {
      // 1.6.25 始终优先调用 consume；禁止回退到无法保证并发安全的 get/set 协议。
      async get() { throw new Error("Atomic rate limit consume is required."); },
      async set() { throw new Error("Atomic rate limit consume is required."); },
      consume: (key, rule) => rateLimitStore.consume(getAuthRateLimitKey(key, rule), rule),
    },
  },
  advanced: {
    trustedProxyHeaders: false,
    // 仅在 Vercel 环境读取平台覆盖的可信客户端 IP；本地不信任请求自带的转发头。
    ipAddress: {
      ipAddressHeaders: process.env.VERCEL === "1" ? ["x-vercel-forwarded-for"] : [],
    },
  },
});
