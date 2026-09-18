"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { feedback, projects, votes } from "@/server/db/schema";
import { actionClient } from "@/server/safe-action";
import { executeFeedbackVote } from "@/server/services/feedback-voting";
import { publicFeedbackRouteSchema } from "@/validators/public-feedback";

// 校验公开范围和登录身份后切换当前用户的投票，再查询票数并返回本次操作确认的投票状态。
export const voteFeedbackAction = actionClient
  .metadata({ operation: "feedback.vote" })
  .inputSchema(publicFeedbackRouteSchema)
  .action(async ({ parsedInput }) => {
    const result = await executeFeedbackVote(parsedInput, {
      countVotes: async (feedbackId) => {
        const [row] = await db
          .select({ value: count() })
          .from(votes)
          .where(eq(votes.feedbackId, feedbackId));
        return Number(row?.value ?? 0);
      },
      // 复合唯一约束配合 onConflictDoNothing，使并发重复投票最多只插入一条记录。
      createVote: async (input) => {
        const [vote] = await db
          .insert(votes)
          .values(input)
          .onConflictDoNothing()
          .returning({ feedbackId: votes.feedbackId });
        return Boolean(vote);
      },
      // 删除条件同时限定用户和反馈，撤票不会影响其他用户的记录。
      deleteVote: async (input) => {
        await db
          .delete(votes)
          .where(
            and(
              eq(votes.feedbackId, input.feedbackId),
              eq(votes.userId, input.userId),
            ),
          );
      },
      // 同时校验反馈可见、项目公开及 Slug 归属，防止用已知 ID 跨项目投票。
      findPublicFeedback: async (input) => {
        const [item] = await db
          .select({ id: feedback.id })
          .from(feedback)
          .innerJoin(projects, eq(feedback.projectId, projects.id))
          .where(
            and(
              eq(feedback.id, input.feedbackId),
              eq(feedback.isPublic, true),
              eq(projects.isPublic, true),
              eq(projects.slug, input.slug),
            ),
          )
          .limit(1);
        return item ?? null;
      },
      getSessionUser: async () => {
        const session = await auth.api.getSession({ headers: await headers() });
        return session ? { id: session.user.id } : null;
      },
      // 查询用户与反馈这一对记录，用于判断当前状态和确认并发插入冲突后的结果。
      hasVote: async (input) => {
        const [vote] = await db
          .select({ feedbackId: votes.feedbackId })
          .from(votes)
          .where(
            and(
              eq(votes.feedbackId, input.feedbackId),
              eq(votes.userId, input.userId),
            ),
          )
          .limit(1);
        return Boolean(vote);
      },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/p/${parsedInput.slug}`);
    revalidatePath(
      `/p/${parsedInput.slug}/feedback/${parsedInput.feedbackId}`,
    );

    return result;
  });
