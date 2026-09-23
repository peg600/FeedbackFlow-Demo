"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { businessError } from "@/lib/errors";
import { auth } from "@/server/auth";
import { requireOwnedProject } from "@/features/projects/server/access";
import { enforceWriteRateLimit } from "@/server/rate-limit";
import { actionClient } from "@/server/safe-action";
import { createBillingCheckout, createBillingPortal, getBillingOverview, reconcileBilling } from "@/features/billing/server/billing";

/** 每次调用重新验证 Session 与唯一项目，并在业务事务外消费共享限流额度。 */
async function requireBillingUser(operation: "billing.checkout" | "billing.portal" | "billing.status" | "billing.reconcile") {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw businessError("UNAUTHENTICATED");
  await enforceWriteRateLimit(session.user.id, operation);
  const project = await requireOwnedProject(session.user.id);
  return { user: session.user, project };
}

/** 服务端固定价格与客户，客户端只接收当前用户的交易 ID。 */
export const createCheckoutAction = actionClient.metadata({ operation: "billing.checkout" })
  .inputSchema(z.object({}).strict()).action(async () => {
    const { user } = await requireBillingUser("billing.checkout");
    return createBillingCheckout(user);
  });

/** 门户 URL 只按当前 Session 生成，不接受客户、订阅或回跳地址作为输入。 */
export const createPortalAction = actionClient.metadata({ operation: "billing.portal" })
  .inputSchema(z.object({}).strict()).action(async () => {
    const { user } = await requireBillingUser("billing.portal");
    return createBillingPortal(user.id);
  });

/** 轮询仅读取本地数据库，不随每次请求调用 Paddle。 */
export const getBillingStatusAction = actionClient.metadata({ operation: "billing.status" })
  .inputSchema(z.object({}).strict()).action(async () => {
    const { user, project } = await requireBillingUser("billing.status");
    return getBillingOverview(user.id, project.id);
  });

/** 付款回跳或门户返回时按已绑定客户对账；来自可信 API 的状态通过统一同步函数更新。 */
export const reconcileBillingAction = actionClient.metadata({ operation: "billing.reconcile" })
  .inputSchema(z.object({}).strict()).action(async () => {
    const { user, project } = await requireBillingUser("billing.reconcile");
    await reconcileBilling(user.id);
    revalidatePath("/dashboard", "layout");
    return getBillingOverview(user.id, project.id);
  });
