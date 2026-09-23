import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { feedback, projects } from "@/server/db/schema";

import { businessError } from "@/lib/errors";
import {
  updateFeedbackStatusSchema,
  type FeedbackStatus,
} from "@/features/feedback/schemas";

export type OwnerStatusUpdateResult = {
  feedbackId: string;
  status: FeedbackStatus;
  slug: string;
};

export type UpdateStatusDependencies = {
  findOwnedProject: (userId: string) => Promise<{ id: string; slug: string; } | null>;
  updateOwnedFeedback: (input: {
    feedbackId: string;
    projectId: string;
    status: FeedbackStatus;
  }) => Promise<boolean>;
};

const defaultDependencies: UpdateStatusDependencies = {
  // 从会话用户反查其唯一项目，后续更新只允许命中该项目下的反馈。
  findOwnedProject: async (userId) => {
    const [project] = await db
      .select({ id: projects.id, slug: projects.slug })
      .from(projects)
      .where(eq(projects.userId, userId))
      .limit(1);
    return project ?? null;
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
  }
};

/** 使用入口传入的可信会话身份验证项目后更新反馈状态；不存在或不归属该项目的反馈统一视为不可用。 */
export async function executeOwnerStatusUpdate(
  input: { feedbackId: string; status: FeedbackStatus; },
  userId: string | null,
  dependencies: UpdateStatusDependencies = defaultDependencies,
): Promise<OwnerStatusUpdateResult> {
  const values = updateFeedbackStatusSchema.parse(input);
  if (!userId) throw businessError("UNAUTHENTICATED");

  const project = await dependencies.findOwnedProject(userId);
  if (!project) throw businessError("PROJECT_NOT_FOUND");

  const updated = await dependencies.updateOwnedFeedback({
    feedbackId: values.feedbackId,
    projectId: project.id,
    status: values.status,
  });

  if (!updated) throw businessError("FEEDBACK_NOT_AVAILABLE");

  return {
    feedbackId: values.feedbackId,
    status: values.status,
    slug: project.slug,
  };
}
