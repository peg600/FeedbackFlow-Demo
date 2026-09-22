import { env } from "@/lib/env";
import { businessError } from "@/lib/errors";
import { db } from "@/server/db";
import { createRateLimitStore } from "@/server/services/rate-limit-store";

export const rateLimitStore = createRateLimitStore(db, env.BETTER_AUTH_SECRET);

const actionRules = {
  "feedback.create": { window: 60, max: 5 },
  "feedback.vote": { window: 60, max: 30 },
  "billing.checkout": { window: 60, max: 5 },
  "billing.portal": { window: 60, max: 5 },
  "billing.status": { window: 60, max: 30 },
  "billing.reconcile": { window: 60, max: 3 },
} as const;

/** 按已验证的 Session 用户限制写入频率；独立于业务事务，失败请求不会回滚已消费的额度。 */
export async function enforceWriteRateLimit(userId: string, operation: keyof typeof actionRules) {
  const decision = await rateLimitStore.consume(`action:${operation}:${userId}`, actionRules[operation]);
  if (!decision.allowed) throw businessError("RATE_LIMITED");
}
