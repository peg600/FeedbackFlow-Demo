import { and, asc, count, eq, isNull, sql } from "drizzle-orm";
import type { Transaction } from "@paddle/paddle-node-sdk";

import { hasProEntitlement } from "@/features/billing/entitlement";
import { businessError, isBusinessError } from "@/lib/errors";
import { readPaddleConfig } from "@/features/billing/server/config";
import { db } from "@/server/db";
import { billingCheckouts, billingCustomers, feedback, subscriptions, user as authUser } from "@/server/db/schema";
import { getPaddle } from "@/features/billing/server/paddle";
import { syncSubscriptionInTransaction } from "@/features/billing/server/sync";

type BillingUser = { id: string; email: string; name: string };

/** 只用 Session 用户关联本地客户；不以浏览器参数或未验证邮箱推断账务归属。 */
async function findCustomer(userId: string) {
  const [customer] = await db.select().from(billingCustomers).where(eq(billingCustomers.userId, userId)).limit(1);
  return customer;
}

/** 持久化创建意图后至多发送一次 Customer POST；超时后只恢复带同一随机标记的远端客户。 */
async function ensureCustomer(user: BillingUser, recoverOnly = false) {
  await db.insert(billingCustomers).values({ userId: user.id }).onConflictDoNothing();
  let customer = (await findCustomer(user.id))!;
  if (customer.paddleCustomerId) return customer.paddleCustomerId;
  const paddle = getPaddle();
  const candidatesCollection = paddle.customers.list({ email: [user.email], status: ["active", "archived"], perPage: 200 });
  const candidates = await candidatesCollection.next();
  if (candidatesCollection.hasMore) throw businessError("BILLING_PENDING");
  const match = candidates.find((item) => item.customData?.provisioningId === customer.provisioningId);
  if (match) {
    if (match.status !== "active") throw businessError("BILLING_CUSTOMER_CONFLICT");
    await db.update(billingCustomers).set({ paddleCustomerId: match.id }).where(eq(billingCustomers.userId, user.id));
    return match.id;
  }
  if (candidates.length) throw businessError("BILLING_CUSTOMER_CONFLICT");
  if (recoverOnly) {
    if (customer.creationStartedAt && Date.now() - customer.creationStartedAt.getTime() > 300_000) {
      await db.update(billingCustomers).set({ creationStartedAt: null }).where(and(
        eq(billingCustomers.userId, user.id), isNull(billingCustomers.paddleCustomerId),
        eq(billingCustomers.creationStartedAt, customer.creationStartedAt),
      ));
    }
    return null;
  }
  const [reserved] = await db.update(billingCustomers).set({ creationStartedAt: new Date() })
    .where(and(eq(billingCustomers.userId, user.id), isNull(billingCustomers.creationStartedAt), isNull(billingCustomers.paddleCustomerId)))
    .returning();
  if (!reserved) throw businessError("BILLING_PENDING");
  customer = reserved;
  const remote = await paddle.customers.create({
    email: user.email, name: user.name, customData: { provisioningId: customer.provisioningId },
  });
  if (remote.customData?.provisioningId !== customer.provisioningId) throw businessError("BILLING_CUSTOMER_CONFLICT");
  await db.update(billingCustomers).set({ paddleCustomerId: remote.id }).where(eq(billingCustomers.userId, user.id));
  return remote.id;
}

/** 对 API 返回的交易重新检查客户和商品；前端可改的 customData 从不用于用户授权。 */
export function assertCheckoutTransaction(transaction: Pick<Transaction, "customerId" | "items" | "collectionMode">, customerId: string, priceId: string) {
  if (transaction.customerId !== customerId || transaction.collectionMode !== "automatic" ||
    transaction.items.length !== 1 || transaction.items[0].price?.id !== priceId || transaction.items[0].quantity !== 1) {
    throw businessError("BILLING_INVALID_TRANSACTION");
  }
}

/** 找回已知交易或 POST 结果未知的交易；无法证明结果时保持 pending，绝不盲目重复创建。 */
async function recoverTransaction(userId: string, customerId: string, allowAbandon = false) {
  const [checkout] = await db.select().from(billingCheckouts).where(eq(billingCheckouts.userId, userId)).limit(1);
  if (!checkout || checkout.status === "abandoned") return null;
  const paddle = getPaddle();
  const priceId = readPaddleConfig()!.priceId;
  let transaction: Transaction | undefined;
  if (checkout.transactionId) {
    transaction = await paddle.transactions.get(checkout.transactionId);
    if (transaction.id !== checkout.transactionId) throw businessError("BILLING_INVALID_TRANSACTION");
  }
  else {
    // 按客户与创建时间限定恢复范围；超出分页预算时交给后续重试或人工核对。
    const collection = paddle.transactions.list({ customerId: [customerId], "createdAt[GTE]": checkout.createdAt.toISOString(), perPage: 30 });
    for (let page = 0; page < 4; page++) {
      const items = await collection.next();
      const matches = items.filter((item) => item.customData?.checkoutAttemptId === checkout.attemptId);
      if (matches.length > 1 || (transaction && matches.length)) throw businessError("BILLING_PENDING");
      transaction = matches[0] ?? transaction;
      if (!collection.hasMore) break;
      if (page === 3) throw businessError("BILLING_PENDING");
    }
  }
  if (!transaction) {
    if (allowAbandon && Date.now() - checkout.createdAt.getTime() > 300_000) {
      await db.update(billingCheckouts).set({ status: "abandoned" }).where(and(
        eq(billingCheckouts.userId, userId), eq(billingCheckouts.attemptId, checkout.attemptId), isNull(billingCheckouts.transactionId),
      ));
      return null;
    }
    throw businessError("BILLING_PENDING");
  }
  assertCheckoutTransaction(transaction, customerId, priceId);
  const [saved] = await db.update(billingCheckouts).set({ transactionId: transaction.id, status: transaction.status, subscriptionId: transaction.subscriptionId })
    .where(and(eq(billingCheckouts.userId, userId), eq(billingCheckouts.attemptId, checkout.attemptId),
      sql`${billingCheckouts.status} <> 'abandoned'`)).returning();
  if (!saved) throw businessError("BILLING_PENDING");
  return transaction;
}

/** 用已绑定客户与本地交易核对订阅；API 快照和 Webhook 共用单调版本写入，失败不授予权限。 */
export async function reconcileBilling(userId: string, allowAbandon = true) {
  let customer = await findCustomer(userId);
  if (!customer) return;
  if (!customer.paddleCustomerId) {
    const [user] = await db.select().from(authUser).where(eq(authUser.id, userId)).limit(1);
    if (!user) return;
    await ensureCustomer(user, true);
    customer = await findCustomer(userId);
    if (!customer?.paddleCustomerId) return;
  }
  const paddle = getPaddle();
  const priceId = readPaddleConfig()!.priceId;
  let transaction: Transaction | null = null;
  let pending = false;
  try { transaction = await recoverTransaction(userId, customer.paddleCustomerId, allowAbandon); }
  catch (error) {
    if (!isBusinessError(error) || error.code !== "BILLING_PENDING") throw error;
    pending = true;
  }
  const collection = paddle.subscriptions.list({ customerId: [customer.paddleCustomerId], perPage: 30 });
  for (let page = 0; page < 4; page++) {
    const rows = await collection.next();
    for (const subscription of rows) {
      const [known] = await db.select({ id: subscriptions.paddleSubscriptionId }).from(subscriptions)
        .where(eq(subscriptions.paddleSubscriptionId, subscription.id)).limit(1);
      const sourceId = transaction?.subscriptionId === subscription.id ? transaction.id : undefined;
      if (!known && !sourceId) continue;
      await db.transaction((tx) => syncSubscriptionInTransaction(tx, subscription, priceId, sourceId));
    }
    if (!collection.hasMore) break;
    if (page === 3) throw businessError("BILLING_PENDING");
  }
  await db.update(billingCustomers).set({ lastReconciledAt: new Date() }).where(eq(billingCustomers.userId, userId));
  if (pending) throw businessError("BILLING_PENDING");
}

/** 校验定价后串行预留一个结账意图；活动、暂停、欠费订阅统一通过门户管理，防止重复购买。 */
export async function createBillingCheckout(user: BillingUser) {
  const config = readPaddleConfig();
  if (!config) throw businessError("BILLING_NOT_CONFIGURED");
  const paddle = getPaddle();
  const price = await paddle.prices.get(config.priceId);
  if (price.status !== "active" || price.billingCycle?.interval !== "month" || price.billingCycle.frequency !== 1 ||
    price.trialPeriod || price.unitPrice.currencyCode !== "USD" || price.unitPrice.amount !== "1900") {
    throw businessError("BILLING_NOT_CONFIGURED");
  }
  const customerId = await ensureCustomer(user);
  if (!customerId) throw businessError("BILLING_PENDING");
  await reconcileBilling(user.id, false);
  const live = await paddle.subscriptions.list({ customerId: [customerId], status: ["active", "trialing", "past_due", "paused"], perPage: 1 }).next();
  if (live.length) throw businessError("BILLING_ALREADY_SUBSCRIBED");
  const existing = await recoverTransaction(user.id, customerId);
  if (existing && ["draft", "ready"].includes(existing.status)) return { transactionId: existing.id };
  if (existing && existing.status !== "canceled") {
    if (existing.status !== "completed" || !existing.subscriptionId) throw businessError("BILLING_PENDING");
    const ended = await paddle.subscriptions.get(existing.subscriptionId);
    if (ended.customerId !== customerId || ended.status !== "canceled") throw businessError("BILLING_ALREADY_SUBSCRIBED");
  }
  const reserved = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`billing:${user.id}`}))`);
    const [current] = await tx.select().from(billingCheckouts).where(eq(billingCheckouts.userId, user.id)).limit(1);
    if (current && current.status !== "abandoned" && (!existing || current.transactionId !== existing.id)) throw businessError("BILLING_PENDING");
    const attemptId = crypto.randomUUID();
    const [row] = await tx.insert(billingCheckouts).values({ userId: user.id, attemptId }).onConflictDoUpdate({
      target: billingCheckouts.userId,
      set: { attemptId, transactionId: null, subscriptionId: null, status: "creating", createdAt: new Date() },
    }).returning();
    return row;
  });
  const transaction = await paddle.transactions.create({
    customerId, collectionMode: "automatic", items: [{ priceId: config.priceId, quantity: 1 }],
    customData: { checkoutAttemptId: reserved.attemptId },
  });
  assertCheckoutTransaction(transaction, customerId, config.priceId);
  const [saved] = await db.update(billingCheckouts).set({ transactionId: transaction.id, status: transaction.status })
    .where(and(eq(billingCheckouts.userId, user.id), eq(billingCheckouts.attemptId, reserved.attemptId),
      isNull(billingCheckouts.transactionId), eq(billingCheckouts.status, "creating"))).returning();
  // 已放弃意图的迟到结果不得暴露给浏览器，否则新旧结账都可能付款。
  if (!saved) throw businessError("BILLING_PENDING");
  return { transactionId: transaction.id };
}

/** 每次由本地归属关系创建新的门户临时链接，链接不存库、不进入日志。 */
export async function createBillingPortal(userId: string) {
  const customer = await findCustomer(userId);
  if (!customer?.paddleCustomerId) throw businessError("BILLING_NO_CUSTOMER");
  const session = await getPaddle().customerPortalSessions.create(customer.paddleCustomerId, []);
  const url = new URL(session.urls.general.overview);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".paddle.com")) throw businessError("BILLING_UNAVAILABLE");
  return { url: url.href };
}

/** 所有普通授权读取本地镜像；缺少支付配置时关闭 Pro，避免错误配置扩大权限。 */
export async function getBillingPlan(userId: string) {
  const config = readPaddleConfig();
  if (!config) return "Free" as const;
  const rows = await db.select({ subscription: subscriptions }).from(subscriptions)
    .innerJoin(billingCustomers, eq(subscriptions.paddleCustomerId, billingCustomers.paddleCustomerId))
    .where(eq(billingCustomers.userId, userId));
  return rows.some(({ subscription }) => hasProEntitlement(subscription, config.priceId)) ? "Pro" as const : "Free" as const;
}

/** 汇总当前用户的账务状态和其项目用量，不向浏览器暴露客户 ID 或门户凭据。 */
export async function getBillingOverview(userId: string, projectId: string) {
  const [usage] = await db.select({ value: count() }).from(feedback).where(eq(feedback.projectId, projectId));
  const config = readPaddleConfig();
  const customer = config ? await findCustomer(userId) : undefined;
  const rows = customer?.paddleCustomerId ? await db.select().from(subscriptions)
    .where(eq(subscriptions.paddleCustomerId, customer.paddleCustomerId)).orderBy(sql`${subscriptions.providerUpdatedAt} desc`) : [];
  const active = rows.find((row) => hasProEntitlement(row, config?.priceId));
  const selected = active ?? rows[0];
  const [checkout] = customer ? await db.select().from(billingCheckouts).where(eq(billingCheckouts.userId, userId)).limit(1) : [];
  return {
    plan: active ? "Pro" as const : "Free" as const,
    feedbackUsed: Number(usage?.value ?? 0), feedbackLimit: active ? null : 50,
    configured: Boolean(config), hasCustomer: Boolean(customer?.paddleCustomerId),
    status: selected?.status ?? "none",
    currentPeriodEnd: selected?.currentPeriodEnd?.toISOString() ?? null,
    scheduledAction: selected?.scheduledAction ?? null,
    scheduledChangeAt: selected?.scheduledChangeAt?.toISOString() ?? null,
    checkoutPending: Boolean(checkout && ["creating", "draft", "ready", "paid", "billed", "completed"].includes(checkout.status) && !active &&
      (!checkout.subscriptionId || !rows.some((row) => row.paddleSubscriptionId === checkout.subscriptionId && row.status === "canceled"))),
    lastReconciledAt: customer?.lastReconciledAt?.toISOString() ?? null,
  };
}

/** 每次处理一批最久未核对的客户；更新时间用作公平游标，单个失败不阻塞其他用户。 */
export async function reconcileBillingBatch() {
  const rows = await db.select().from(billingCustomers)
    .orderBy(sql`${billingCustomers.lastReconcileAttemptAt} asc nulls first`, asc(billingCustomers.userId)).limit(50);
  let succeeded = 0;
  let failed = 0;
  const deadline = Date.now() + 240_000;
  for (const row of rows) {
    if (Date.now() >= deadline) break;
    await db.update(billingCustomers).set({ lastReconcileAttemptAt: new Date() }).where(eq(billingCustomers.userId, row.userId));
    try { await reconcileBilling(row.userId); succeeded++; }
    catch { failed++; }
  }
  return { processed: succeeded + failed, succeeded, failed, hasMore: rows.length === 50 || succeeded + failed < rows.length };
}
