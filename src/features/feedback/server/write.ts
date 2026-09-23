import { and, count, eq, sql } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";

import * as schema from "@/server/db/schema";
import { hasProEntitlement } from "@/features/billing/entitlement";
import { readPaddleConfig } from "@/features/billing/server/config";
import type { CreatePublicFeedbackDependencies } from "@/features/feedback/server/creation";

/** 在项目配额锁内复核公开范围并插入；生产 Action 与数据库集成测试共用同一并发保护实现。 */
export async function insertPublicFeedback(
  database: NeonDatabase<typeof schema>,
  input: Parameters<CreatePublicFeedbackDependencies["createFeedback"]>[0],
) {
  return database.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.projectId}))`);
    const [project] = await tx.select({ id: schema.projects.id, userId: schema.projects.userId }).from(schema.projects)
      .where(and(eq(schema.projects.id, input.projectId), eq(schema.projects.isPublic, true),
        eq(schema.projects.slug, input.slug))).limit(1);
    if (!project) return "public_board_unavailable" as const;

    const [total] = await tx.select({ value: count() }).from(schema.feedback)
      .where(eq(schema.feedback.projectId, project.id));
    if (Number(total?.value ?? 0) >= 50) {
      const priceId = readPaddleConfig()?.priceId;
      const rows = priceId ? await tx.select({ subscription: schema.subscriptions }).from(schema.subscriptions)
        .innerJoin(schema.billingCustomers, eq(schema.subscriptions.paddleCustomerId, schema.billingCustomers.paddleCustomerId))
        .where(eq(schema.billingCustomers.userId, project.userId)) : [];
      if (!rows.some(({ subscription }) => hasProEntitlement(subscription, priceId))) return "feedback_limit" as const;
    }

    const [created] = await tx.insert(schema.feedback).values({
      description: input.description, projectId: project.id,
      title: input.title, userId: input.userId,
    }).returning({ id: schema.feedback.id });
    return created ?? null;
  });
}
