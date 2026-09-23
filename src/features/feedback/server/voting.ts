import { and, count, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { feedback, projects, votes } from "@/server/db/schema";

import { businessError } from "@/lib/errors";
import {
  publicFeedbackRouteSchema,
  type PublicFeedbackRoute,
} from "@/features/feedback/schemas";

export type FeedbackVoteResult = {
  voteCount: number;
  voted: boolean;
};

export type VoteFeedbackDependencies = {
  countVotes: (feedbackId: string) => Promise<number>;
  createVote: (input: { feedbackId: string; userId: string; }) => Promise<boolean>;
  deleteVote: (input: { feedbackId: string; userId: string; }) => Promise<void>;
  findPublicFeedback: (input: {
    feedbackId: string;
    slug: string;
  }) => Promise<{ id: string; } | null>;
  hasVote: (input: { feedbackId: string; userId: string; }) => Promise<boolean>;
};

const defaultDependencies: VoteFeedbackDependencies = {
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
  }
};

/** 使用入口传入的可信会话身份校验公开归属后切换投票；并发冲突时复查状态，返回数据库计票结果。 */
export async function executeFeedbackVote(
  input: PublicFeedbackRoute,
  userId: string | null,
  dependencies: VoteFeedbackDependencies = defaultDependencies,
): Promise<FeedbackVoteResult> {
  const values = publicFeedbackRouteSchema.parse(input);
  if (!userId) throw businessError("UNAUTHENTICATED");

  const publicFeedback = await dependencies.findPublicFeedback(values);
  if (!publicFeedback) throw businessError("FEEDBACK_NOT_AVAILABLE");

  const voteInput = {
    feedbackId: publicFeedback.id,
    userId,
  };
  const alreadyVoted = await dependencies.hasVote(voteInput);
  let voted = false;

  if (alreadyVoted) {
    await dependencies.deleteVote(voteInput);
  } else {
    voted = await dependencies.createVote(voteInput);
    if (!voted) voted = await dependencies.hasVote(voteInput);
  }

  return {
    voteCount: await dependencies.countVotes(publicFeedback.id),
    voted,
  };
}
