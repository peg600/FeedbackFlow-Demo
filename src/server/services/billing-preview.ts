import { count, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { feedback } from "@/server/db/schema";

/** 统计指定项目的反馈用量并返回 Free 套餐预览；此函数尚未接入真实订阅状态。 */
export async function getBillingPreview(projectId: string) {
  const [usage] = await db.select({ value: count() }).from(feedback).where(eq(feedback.projectId, projectId));
  return { plan: "Free" as const, feedbackLimit: 50, feedbackUsed: Number(usage?.value ?? 0), mode: "preview" as const, configured: false };
}
