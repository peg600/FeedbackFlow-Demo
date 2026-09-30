import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db", async () => {
  const { createTestDatabase } = await import("../helpers/test-database");
  return { db: createTestDatabase() };
});
const provider = vi.hoisted(() => ({ getTransaction: vi.fn(), listTransactions: vi.fn(), createTransaction: vi.fn(), listSubscriptions: vi.fn(), getSubscription: vi.fn(), getPrice: vi.fn() }));
vi.mock("@/features/billing/server/paddle", () => ({ getPaddle: () => ({
  transactions: { get: provider.getTransaction, list: provider.listTransactions, create: provider.createTransaction },
  subscriptions: { list: provider.listSubscriptions, get: provider.getSubscription },
  prices: { get: provider.getPrice },
}) }));

import { db } from "@/server/db";
import { billingCheckouts, billingCustomers, feedback, paddleEvents, projects, subscriptions, user } from "@/server/db/schema";
import { createBillingCheckout, reconcileBilling } from "@/features/billing/server/billing";
import { processPaddleEvent } from "@/features/billing/server/sync";
import { insertPublicFeedback } from "@/features/feedback/server/write";

const id = (prefix: string) => `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 26)}`;
let userId: string, customerId: string, priceId: string, transactionId: string, subId: string, projectId: string, slug: string;
let eventIds: string[] = [];
let visitorId: string | undefined;

/** 每次事件有唯一标识；完整快照由测试构造，SDK/外部网络不会连接真实 Paddle。 */
function event(status = "active", time = "2026-09-21T12:00:00.123456Z", type = "subscription.created", subscriptionId = subId) {
  const eventId = id("evt"); eventIds.push(eventId);
  return { eventId, eventType: type, occurredAt: time, data: {
    id: subscriptionId, customerId, transactionId, status, updatedAt: time,
    currentBillingPeriod: { endsAt: "2099-01-01T00:00:00Z" }, scheduledChange: null,
    items: [{ price: { id: priceId }, quantity: 1, status: "active" }],
  } };
}

describe.sequential("billing database consistency", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    userId = `billing-test-${randomUUID()}`; customerId = id("ctm"); priceId = id("pri"); transactionId = id("txn"); subId = id("sub");
    eventIds = []; slug = `billing-${randomUUID()}`;
    visitorId = undefined;
    vi.stubEnv("PADDLE_API_KEY", "pdl_sdbx_apikey_fixture");
    vi.stubEnv("PADDLE_NOTIFICATION_WEBHOOK_SECRET", "fixture-webhook-secret");
    vi.stubEnv("PADDLE_PRICE_ID_PRO", priceId);
    vi.stubEnv("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", "test_fixture");
    await db.insert(user).values({ id: userId, email: `${userId}@integration.invalid`, name: "Billing fixture" });
    const [project] = await db.insert(projects).values({ name: "Billing fixture", slug, userId }).returning(); projectId = project.id;
    await db.insert(billingCustomers).values({ userId, paddleCustomerId: customerId });
    await db.insert(billingCheckouts).values({ userId, transactionId, status: "ready" });
    provider.getPrice.mockResolvedValue({ status: "active", billingCycle: { interval: "month", frequency: 1 }, trialPeriod: null, unitPrice: { amount: "1900", currencyCode: "USD" } });
    provider.listSubscriptions.mockImplementation(() => ({ next: async () => [], hasMore: false }));
    provider.listTransactions.mockImplementation(() => ({ next: async () => [], hasMore: false }));
  });
  afterEach(async () => {
    if (eventIds.length) await db.delete(paddleEvents).where(inArray(paddleEvents.eventId, eventIds));
    await db.delete(billingCustomers).where(eq(billingCustomers.userId, userId));
    if (projectId) await db.delete(projects).where(eq(projects.id, projectId));
    await db.delete(user).where(eq(user.id, userId));
    if (visitorId) await db.delete(user).where(eq(user.id, visitorId));
    vi.unstubAllEnvs();
  });
  it("deduplicates concurrent deliveries and rejects an older active snapshot after cancellation", async () => {
    const initial = event();
    const result = await Promise.all([processPaddleEvent(db, initial, priceId), processPaddleEvent(db, initial, priceId)]);
    expect(result).toContain("duplicate");
    await processPaddleEvent(db, event("canceled", "2026-09-22T00:00:00Z", "subscription.canceled"), priceId);
    await processPaddleEvent(db, event("active", "2026-09-21T12:00:00.999999Z", "subscription.updated"), priceId);
    const [stored] = await db.select().from(subscriptions).where(eq(subscriptions.paddleSubscriptionId, subId));
    expect(stored.status).toBe("canceled");
  });
  it("rolls back event deduplication when ownership cannot yet be established", async () => {
    const unmatched = event(); unmatched.data.transactionId = id("txn");
    await expect(processPaddleEvent(db, unmatched, priceId)).rejects.toMatchObject({ code: "BILLING_PENDING" });
    expect(await db.select().from(paddleEvents).where(eq(paddleEvents.eventId, unmatched.eventId))).toHaveLength(0);
    expect(await db.select().from(subscriptions).where(eq(subscriptions.paddleSubscriptionId, subId))).toHaveLength(0);
    unmatched.data.transactionId = transactionId;
    await processPaddleEvent(db, unmatched, priceId);
    expect(await db.select().from(subscriptions).where(eq(subscriptions.paddleSubscriptionId, subId))).toHaveLength(1);
  });
  it("keeps an old subscription cancellation separate from a new subscription", async () => {
    await processPaddleEvent(db, event(), priceId);
    transactionId = id("txn");
    await db.update(billingCheckouts).set({ transactionId }).where(eq(billingCheckouts.userId, userId));
    const newId = id("sub");
    await processPaddleEvent(db, event("active", "2026-09-23T00:00:00Z", "subscription.created", newId), priceId);
    await processPaddleEvent(db, event("canceled", "2026-09-24T00:00:00Z", "subscription.canceled"), priceId);
    const [current] = await db.select().from(subscriptions).where(eq(subscriptions.paddleSubscriptionId, newId));
    expect(current.status).toBe("active");
  });
  it("uses the board owner's Pro entitlement and restores the Free quota when canceled", async () => {
    visitorId = `visitor-${randomUUID()}`;
    await db.insert(user).values({ id: visitorId, email: `${visitorId}@integration.invalid`, name: "Free visitor" });
    await db.insert(feedback).values(Array.from({ length: 3 }, (_, i) => ({ projectId, userId, title: `Fixture ${i}` })));
    const input = { projectId, slug, userId: visitorId, title: "An additional request", description: "A valid new feedback item." };
    expect(await insertPublicFeedback(db, input)).toBe("feedback_limit");
    await processPaddleEvent(db, event(), priceId);
    expect(await insertPublicFeedback(db, input)).toMatchObject({ id: expect.any(String) });
    await processPaddleEvent(db, event("canceled", "2026-09-22T00:00:00Z", "subscription.canceled"), priceId);
    expect(await insertPublicFeedback(db, input)).toBe("feedback_limit");
  });
  it("creates at most one transaction for concurrent Upgrade requests", async () => {
    await db.delete(billingCheckouts).where(eq(billingCheckouts.userId, userId));
    provider.createTransaction.mockImplementation(async () => ({ id: transactionId, customerId, status: "ready", collectionMode: "automatic", items: [{ price: { id: priceId }, quantity: 1 }] }));
    const results = await Promise.allSettled(Array.from({ length: 4 }, () => createBillingCheckout({ id: userId, email: `${userId}@integration.invalid`, name: "Fixture" })));
    expect(results.some((result) => result.status === "fulfilled")).toBe(true);
    expect(provider.createTransaction).toHaveBeenCalledTimes(1);
  });
  it("does not repeat a timed-out POST and restores its transaction by the persisted attempt", async () => {
    await db.update(billingCheckouts).set({ transactionId: null, status: "creating" }).where(eq(billingCheckouts.userId, userId));
    const [attempt] = await db.select().from(billingCheckouts).where(eq(billingCheckouts.userId, userId));
    await expect(createBillingCheckout({ id: userId, email: `${userId}@integration.invalid`, name: "Fixture" })).rejects.toMatchObject({ code: "BILLING_PENDING" });
    expect(provider.createTransaction).not.toHaveBeenCalled();
    provider.listTransactions.mockImplementation(() => ({ next: async () => [{ id: transactionId, customerId, customData: { checkoutAttemptId: attempt.attemptId }, status: "ready", collectionMode: "automatic", items: [{ price: { id: priceId }, quantity: 1 }], subscriptionId: null }], hasMore: false }));
    await reconcileBilling(userId);
    const [restored] = await db.select().from(billingCheckouts).where(eq(billingCheckouts.userId, userId));
    expect(restored.transactionId).toBe(transactionId);
    expect(provider.createTransaction).not.toHaveBeenCalled();
  });
});
