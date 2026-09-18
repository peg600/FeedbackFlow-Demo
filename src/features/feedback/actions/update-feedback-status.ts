"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { feedback, projects } from "@/server/db/schema";
import { actionClient } from "@/server/safe-action";
import { executeOwnerStatusUpdate } from "@/server/services/dashboard-status";
import { updateFeedbackStatusSchema } from "@/validators/dashboard";

// 验证当前用户对反馈所属项目的所有权后更新状态，并失效控制台、公开看板和路线图缓存。
export const updateFeedbackStatusAction = actionClient
  .metadata({ operation: "feedback.status.update" })
  .inputSchema(updateFeedbackStatusSchema)
  .action(async ({ parsedInput }) => {
    const ownedProject: { current: { id: string; slug: string } | null } = {
      current: null,
    };

    const result = await executeOwnerStatusUpdate(parsedInput, {
      getSessionUser: async () => {
        const session = await auth.api.getSession({ headers: await headers() });
        return session ? { id: session.user.id } : null;
      },
      // 从会话用户反查其唯一项目，后续更新只允许命中该项目下的反馈。
      findOwnedProject: async (userId) => {
        const [project] = await db
          .select({ id: projects.id, slug: projects.slug })
          .from(projects)
          .where(eq(projects.userId, userId))
          .limit(1);
        ownedProject.current = project ?? null;
        return ownedProject.current;
      },
      // 把反馈 ID 与所属项目同时放入 UPDATE 条件，避免越权修改其他项目的数据。
      updateOwnedFeedback: async ({ feedbackId, projectId, status }) => {
        const rows = await db
          .update(feedback)
          .set({ status, updatedAt: new Date() })
          .where(
            and(eq(feedback.id, feedbackId), eq(feedback.projectId, projectId)),
          )
          .returning({ id: feedback.id });
        return rows.length === 1;
      },
    });

    if (ownedProject.current) {
      revalidatePath("/dashboard");
      revalidatePath(`/p/${ownedProject.current.slug}`);
      revalidatePath(`/p/${ownedProject.current.slug}/roadmap`);
      revalidatePath(
        `/p/${ownedProject.current.slug}/feedback/${result.feedbackId}`,
      );
    }

    return result;
  });
