import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";

import * as schema from "@/server/db/schema";

export type RateLimitRule = { window: number; max: number };
export type RateLimitDecision = { allowed: boolean; retryAfter: number | null };

/** 使用数据库时间和单条 UPSERT 原子消费固定窗口；键仅保存 HMAC，不保存原始 IP 或用户标识。 */
export function createRateLimitStore(database: NeonDatabase<typeof schema>, secret: string) {
  const digest = (key: string) => createHmac("sha256", secret).update(key).digest("hex");
  let nextCleanupAt = 0;

  /** 每个实例最多每分钟清理一小批过期桶；清理失败不影响限流判定，也不输出敏感诊断。 */
  async function cleanup() {
    if (Date.now() < nextCleanupAt) return;
    nextCleanupAt = Date.now() + 60_000;
    try {
      await database.execute(sql`
        delete from rate_limit_buckets where key in (
          select key from rate_limit_buckets where expires_at <= statement_timestamp()
          order by expires_at limit 100
        ) and expires_at <= statement_timestamp()
      `);
    } catch {
      console.warn("Rate limit cleanup deferred", { operation: "rate-limit.cleanup" });
    }
  }

  /** 超限不延长窗口；并发请求在同一行锁下计数，数据库不可用时不放行写操作。 */
  async function consume(key: string, rule: RateLimitRule): Promise<RateLimitDecision> {
    if (!Number.isSafeInteger(rule.max) || rule.max < 1 || rule.max > 1_000_000 ||
        !Number.isSafeInteger(rule.window) || rule.window < 1 || rule.window > 86_400) {
      throw new Error("Invalid rate limit rule.");
    }
    await cleanup();
    const result = await database.execute<{ allowed: boolean; retry_after: number }>(sql`
      insert into rate_limit_buckets (key, count, started_at, expires_at)
      values (${digest(key)}, 1, statement_timestamp(),
        statement_timestamp() + ${rule.window} * interval '1 second')
      on conflict (key) do update set
        count = case when rate_limit_buckets.expires_at <= statement_timestamp() then 1
          else least(rate_limit_buckets.count + 1, ${rule.max + 1}) end,
        started_at = case when rate_limit_buckets.expires_at <= statement_timestamp()
          then statement_timestamp() else rate_limit_buckets.started_at end,
        expires_at = case when rate_limit_buckets.expires_at <= statement_timestamp()
          then statement_timestamp() + ${rule.window} * interval '1 second'
          else rate_limit_buckets.expires_at end
      returning count <= ${rule.max} as allowed,
        greatest(1, ceil(extract(epoch from (expires_at - statement_timestamp()))))::integer as retry_after
    `);
    const row = result.rows[0];
    if (!row) throw new Error("Rate limit result missing.");
    return { allowed: row.allowed, retryAfter: row.allowed ? null : row.retry_after };
  }

  return { consume };
}
