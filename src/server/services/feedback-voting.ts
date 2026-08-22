import { publicFeedbackRouteSchema } from "@/validators/public-feedback";

export type VoteFeedbackResult = {
  code?: "unauthenticated";
  error?: string;
  ok: boolean;
  requestId: string;
  voteCount?: number;
  voted?: boolean;
};

type VoteFeedbackDependencies = {
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

function rejection(
  code?: VoteFeedbackResult["code"],
): VoteFeedbackResult {
  return {
    ...(code ? { code } : {}),
    error:
      code === "unauthenticated"
        ? "Sign in to vote for feedback."
        : "Unable to update your vote. Try again.",
    ok: false,
    requestId: crypto.randomUUID(),
  };
}

export async function executeFeedbackVote(
  input: unknown,
  dependencies: VoteFeedbackDependencies,
): Promise<VoteFeedbackResult> {
  const parsed = publicFeedbackRouteSchema.safeParse(input);
  if (!parsed.success) return rejection();

  try {
    const sessionUser = await dependencies.getSessionUser();
    if (!sessionUser) return rejection("unauthenticated");

    const publicFeedback = await dependencies.findPublicFeedback(parsed.data);
    if (!publicFeedback) return rejection();

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
      if (!voted) {
        voted = await dependencies.hasVote(voteInput);
      }
    }

    return {
      ok: true,
      requestId: crypto.randomUUID(),
      voteCount: await dependencies.countVotes(publicFeedback.id),
      voted,
    };
  } catch {
    return rejection();
  }
}
