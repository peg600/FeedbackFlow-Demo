export type SubscriptionEntitlement = {
  status: string;
  priceId: string | null;
  currentPeriodEnd: Date | null;
  scheduledAction: string | null;
  scheduledChangeAt: Date | null;
};

/** 统一页面与服务端写入的 Pro 判定；欠费、试用、未知价格和过期数据均不解锁。 */
export function hasProEntitlement(subscription: SubscriptionEntitlement, proPriceId: string | undefined, now = new Date()) {
  if (!proPriceId || subscription.status !== "active" || subscription.priceId !== proPriceId) return false;
  if (!subscription.currentPeriodEnd || subscription.currentPeriodEnd.getTime() <= now.getTime()) return false;
  if ((subscription.scheduledAction === "cancel" || subscription.scheduledAction === "pause") &&
    subscription.scheduledChangeAt && subscription.scheduledChangeAt.getTime() <= now.getTime()) return false;
  return Number.isFinite(subscription.currentPeriodEnd.getTime());
}
