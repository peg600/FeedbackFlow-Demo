import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const billingCustomers = pgTable("billing_customers", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "restrict" }),
  paddleCustomerId: text("paddle_customer_id").unique("billing_customers_paddle_id_unique"),
  provisioningId: uuid("provisioning_id").notNull().defaultRandom(),
  creationStartedAt: timestamp("creation_started_at", { withTimezone: true }),
  lastReconciledAt: timestamp("last_reconciled_at", { withTimezone: true }),
  lastReconcileAttemptAt: timestamp("last_reconcile_attempt_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("billing_customers_provisioning_unique").on(table.provisioningId),
  index("billing_customers_reconcile_idx").on(table.lastReconcileAttemptAt),
]);

export const billingCheckouts = pgTable("billing_checkouts", {
  userId: text("user_id").primaryKey().references(() => billingCustomers.userId, { onDelete: "cascade" }),
  attemptId: uuid("attempt_id").notNull().defaultRandom(),
  transactionId: text("transaction_id"),
  status: text("status").notNull().default("creating"),
  subscriptionId: text("subscription_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("billing_checkouts_transaction_unique").on(table.transactionId),
  uniqueIndex("billing_checkouts_attempt_unique").on(table.attemptId),
]);

export const subscriptions = pgTable("subscriptions", {
  paddleSubscriptionId: text("paddle_subscription_id").primaryKey(),
  sourceTransactionId: text("source_transaction_id").notNull(),
  paddleCustomerId: text("paddle_customer_id").notNull()
    .references(() => billingCustomers.paddleCustomerId, { onDelete: "cascade" }),
  status: text("status").notNull(),
  priceId: text("price_id"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  scheduledAction: text("scheduled_action"),
  scheduledChangeAt: timestamp("scheduled_change_at", { withTimezone: true }),
  // 保留提供方完整时间精度，避免 Date 毫秒截断使乱序事件被误判为同一版本。
  providerUpdatedAt: timestamp("provider_updated_at", { withTimezone: true, mode: "string" }).notNull(),
  lastEventOccurredAt: timestamp("last_event_occurred_at", { withTimezone: true, mode: "string" }),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("subscriptions_customer_idx").on(table.paddleCustomerId),
  uniqueIndex("subscriptions_source_transaction_unique").on(table.sourceTransactionId),
]);

export const paddleEvents = pgTable("paddle_events", {
  eventId: text("event_id").primaryKey(),
  eventType: text("event_type").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "string" }).notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});
