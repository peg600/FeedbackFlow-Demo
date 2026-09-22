import { and, eq, sql } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import { z } from "zod";

import { businessError } from "@/lib/errors";
import * as schema from "@/server/db/schema";

const paddleId = (prefix: string) => z.string().regex(new RegExp(`^${prefix}_[a-z0-9]{26}$`));
const subscriptionSchema = z.object({
  id: paddleId("sub"), customerId: paddleId("ctm"),
  status: z.enum(["active", "trialing", "past_due", "paused", "canceled"]),
  updatedAt: z.iso.datetime({ offset: true }),
  currentBillingPeriod: z.object({ endsAt: z.iso.datetime({ offset: true }) }).nullable(),
  scheduledChange: z.object({ action: z.string(), effectiveAt: z.iso.datetime({ offset: true }) }).nullable(),
  items: z.array(z.object({
    price: z.object({ id: z.string() }).nullable(), quantity: z.number(), status: z.string(),
  })),
  transactionId: paddleId("txn").optional(),
});

export type BillingDatabase = NeonDatabase<typeof schema>;
type BillingTransaction = Parameters<Parameters<BillingDatabase["transaction"]>[0]>[0];

/** 对 Paddle API 和 Webhook 使用同一解析器；只有配置的单一 Pro 商品可解锁。 */
export function parseSubscriptionSnapshot(value: unknown, proPriceId: string) {
  const sub = subscriptionSchema.parse(value);
  return {
    paddleSubscriptionId: sub.id, paddleCustomerId: sub.customerId,
    status: sub.status,
    priceId: sub.items.length === 1 && sub.items[0].price?.id === proPriceId &&
      sub.items[0].quantity === 1 && sub.items[0].status === "active" ? proPriceId : null,
    currentPeriodEnd: sub.currentBillingPeriod ? new Date(sub.currentBillingPeriod.endsAt) : null,
    scheduledAction: sub.scheduledChange?.action ?? null,
    scheduledChangeAt: sub.scheduledChange ? new Date(sub.scheduledChange.effectiveAt) : null,
    providerUpdatedAt: sub.updatedAt,
    sourceTransactionId: sub.transactionId,
  };
}

/** 在同一事务内验证客户及初始交易归属；较旧的快照不能覆盖 API 对账或较新的事件。 */
export async function syncSubscriptionInTransaction(tx: BillingTransaction, value: unknown, proPriceId: string, initialTransactionId?: string, occurredAt?: string) {
  const snapshot = parseSubscriptionSnapshot(value, proPriceId);
  const [customer] = await tx.select().from(schema.billingCustomers)
    .where(eq(schema.billingCustomers.paddleCustomerId, snapshot.paddleCustomerId)).limit(1);
  if (!customer) return "unrelated" as const;
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`billing:${customer.userId}`}))`);
  const [existing] = await tx.select().from(schema.subscriptions)
    .where(eq(schema.subscriptions.paddleSubscriptionId, snapshot.paddleSubscriptionId)).limit(1);
  if (existing && existing.paddleCustomerId !== snapshot.paddleCustomerId) throw businessError("BILLING_INVALID_TRANSACTION");
  const sourceTransactionId = existing?.sourceTransactionId ?? initialTransactionId ?? snapshot.sourceTransactionId;
  if (!existing) {
    if (!sourceTransactionId) throw businessError("BILLING_PENDING");
    const [checkout] = await tx.select().from(schema.billingCheckouts).where(and(
      eq(schema.billingCheckouts.userId, customer.userId),
      eq(schema.billingCheckouts.transactionId, sourceTransactionId),
    )).limit(1);
    if (!checkout) throw businessError("BILLING_PENDING");
  }
  const data = { ...snapshot, sourceTransactionId: sourceTransactionId!, syncedAt: new Date(),
    lastEventOccurredAt: occurredAt ?? existing?.lastEventOccurredAt ?? null };
  await tx.insert(schema.subscriptions).values(data).onConflictDoUpdate({
    target: schema.subscriptions.paddleSubscriptionId,
    set: data,
    setWhere: occurredAt
      ? sql`${schema.subscriptions.providerUpdatedAt} < ${snapshot.providerUpdatedAt}::timestamptz
        or (${schema.subscriptions.providerUpdatedAt} = ${snapshot.providerUpdatedAt}::timestamptz
        and (${schema.subscriptions.lastEventOccurredAt} is null or ${schema.subscriptions.lastEventOccurredAt} < ${occurredAt}::timestamptz))`
      : sql`${schema.subscriptions.providerUpdatedAt} < ${snapshot.providerUpdatedAt}::timestamptz`,
  });
  await tx.update(schema.billingCheckouts).set({ subscriptionId: snapshot.paddleSubscriptionId, status: "completed" })
    .where(and(eq(schema.billingCheckouts.userId, customer.userId), eq(schema.billingCheckouts.transactionId, sourceTransactionId!)));
  return "synced" as const;
}

const eventSchema = z.object({
  eventId: paddleId("evt"), eventType: z.string().max(100),
  occurredAt: z.iso.datetime({ offset: true }), data: z.unknown(),
});

const subscriptionEvents = new Set(["subscription.created", "subscription.updated", "subscription.activated", "subscription.canceled",
  "subscription.paused", "subscription.resumed", "subscription.past_due", "subscription.trialing"]);

/** 事件账本和订阅写入原子提交；失败回滚账本，让提供方重试仍可处理。 */
export async function processPaddleEvent(database: BillingDatabase, input: unknown, proPriceId: string) {
  const event = eventSchema.parse(input);
  return database.transaction(async (tx) => {
    const [record] = await tx.insert(schema.paddleEvents).values({
      eventId: event.eventId, eventType: event.eventType, occurredAt: event.occurredAt,
    }).onConflictDoNothing().returning({ eventId: schema.paddleEvents.eventId });
    if (!record) return "duplicate";
    if (subscriptionEvents.has(event.eventType)) {
      return syncSubscriptionInTransaction(tx, event.data, proPriceId, undefined, event.occurredAt);
    }
    // 交易完成只标记本地已知交易，不能仅凭交易事件授予订阅权益。
    if (event.eventType === "transaction.completed") {
      const data = z.object({ id: paddleId("txn"), customerId: paddleId("ctm"), subscriptionId: paddleId("sub").nullable() }).parse(event.data);
      const [customer] = await tx.select().from(schema.billingCustomers)
        .where(eq(schema.billingCustomers.paddleCustomerId, data.customerId)).limit(1);
      if (customer) await tx.update(schema.billingCheckouts).set({ status: "completed", subscriptionId: data.subscriptionId })
        .where(and(eq(schema.billingCheckouts.userId, customer.userId), eq(schema.billingCheckouts.transactionId, data.id)));
      return "recorded";
    }
    return "ignored";
  });
}
