import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BillingPanel } from "@/features/billing/components/billing-panel";
import { readPaddleConfig } from "@/lib/paddle-config";
import { getBillingOverview } from "@/server/services/billing";
import { requireDashboardAccess } from "@/server/services/project-access";

export const metadata: Metadata = { title: "Billing | FeedbackFlow" };

/** 读取当前 Owner 的本地权益；回跳参数只控制同步提示，不能作为付款或授权证明。 */
export default async function BillingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { project, session } = await requireDashboardAccess();
  const params = await searchParams;
  // Paddle 默认付款链接可携带任意交易 ID；先移除，恢复时只使用服务端绑定的当前交易。
  if (params._ptxn !== undefined) redirect("/dashboard/billing?checkout=pending");
  const billing = await getBillingOverview(session.user.id, project.id);
  return <BillingPanel initial={billing} clientToken={readPaddleConfig()?.clientToken ?? null}
    returned={params.checkout === "return" || params.checkout === "pending"} />;
}
