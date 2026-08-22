"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { feedback, projects, votes } from "@/server/db/schema";
import {
  executeFeedbackVote,
  type VoteFeedbackResult,
} from "@/server/services/feedback-voting";
import { publicFeedbackRouteSchema } from "@/validators/public-feedback";

export async function voteFeedbackAction(
  input: unknown,
): Promise<VoteFeedbackResult> {
  const result = await executeFeedbackVote(input, {
    countVotes: async (feedbackId) => {
      const [row] = await db
        .select({ value: count() })
        .from(votes)
        .where(eq(votes.feedbackId, feedbackId));
      return Number(row?.value ?? 0);
    },
    createVote: async (input) => {
      const [vote] = await db
        .insert(votes)
        .values(input)
        .onConflictDoNothing()
        .returning({ feedbackId: votes.feedbackId });
      return Boolean(vote);
    },
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

  if (result.ok) {
    const parsed = publicFeedbackRouteSchema.safeParse(input);
    if (parsed.success) {
      revalidatePath("/dashboard");
      revalidatePath(`/p/${parsed.data.slug}`);
      revalidatePath(
        `/p/${parsed.data.slug}/feedback/${parsed.data.feedbackId}`,
      );
    }
  }

  return result;
}
