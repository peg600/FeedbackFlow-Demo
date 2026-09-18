import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("rate_limit_buckets_expiry_idx").on(table.expiresAt)],
);
