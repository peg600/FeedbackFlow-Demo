import { businessError } from "@/lib/errors";
import {
  publicFeedbackRouteSchema,
  type PublicFeedbackRoute,
} from "@/validators/public-feedback";

export type FeedbackVoteResult = {
  voteCount: number;
  voted: boolean;
};

export type VoteFeedbackDependencies = {
  countVotes: (feedbackId: string) => Promise<number>;
  createVote: (input: { feedbackId: string; userId: string }) => Promise<boolean>;
  deleteVote: (input: { feedbackId: string; userId: string }) => Promise<void>;
  findPublicFeedback: (input: {
    feedbackId: string;
    slug: string;
  }) => Promise<{ id: string } | null>;
  getSessionUser: () => Promise<{ id: string } | null>;
  hasVote: (input: { feedbackId: string; userId: string }) => Promise<boolean>;
};

/** 在登录和公开归属校验后切换投票；并发插入未新增记录时复查状态，返回数据库计票结果。 */
export async function executeFeedbackVote(
  input: PublicFeedbackRoute,
  dependencies: VoteFeedbackDependencies,
): Promise<FeedbackVoteResult> {
  const values = publicFeedbackRouteSchema.parse(input);
  const sessionUser = await dependencies.getSessionUser();
  if (!sessionUser) throw businessError("UNAUTHENTICATED");

  const publicFeedback = await dependencies.findPublicFeedback(values);
  if (!publicFeedback) throw businessError("FEEDBACK_NOT_AVAILABLE");

  const voteInput = {
    feedbackId: publicFeedback.id,
    userId: sessionUser.id,
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
