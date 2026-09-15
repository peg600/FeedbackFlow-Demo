import { count, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { feedback } from "@/server/db/schema";

export async function getBillingPreview(projectId: string) {
  const [usage] = await db.select({ value: count() }).from(feedback).where(eq(feedback.projectId, projectId));
  return { plan: "Free" as const, feedbackLimit: 50, feedbackUsed: Number(usage?.value ?? 0), mode: "preview" as const, configured: false };
}
