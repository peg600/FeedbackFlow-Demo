import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";

import { env } from "@/lib/env";
import { createAuthBaseURL } from "@/server/auth/base-url";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";

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
  advanced: {
    trustedProxyHeaders: false,
  },
});
