import { beforeEach, describe, expect, it, vi } from "vitest";

import { voteFeedbackAction } from "@/features/feedback/actions/vote-feedback";

const mocks = vi.hoisted(() => ({
  executeFeedbackVote: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/server/auth", () => ({ auth: {} }));
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/db/schema", () => ({ feedback: {}, projects: {}, votes: {} }));
vi.mock("@/server/services/feedback-voting", () => ({
  executeFeedbackVote: mocks.executeFeedbackVote,
}));

describe("voteFeedbackAction", () => {
  const input = {
    feedbackId: "c0a80121-7ac0-4f4e-a1d8-2fe804b6c401",
    slug: "acme-studio",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revalidates every page that can show a changed vote", async () => {
    mocks.executeFeedbackVote.mockResolvedValue({
      ok: true,
      requestId: "request-1",
      voteCount: 83,
      voted: true,
    });

    await expect(voteFeedbackAction(input)).resolves.toMatchObject({
      ok: true,
      voteCount: 83,
    });

    expect(mocks.executeFeedbackVote).toHaveBeenCalledWith(
      input,
      expect.objectContaining({
        countVotes: expect.any(Function),
        createVote: expect.any(Function),
        deleteVote: expect.any(Function),
        findPublicFeedback: expect.any(Function),
        getSessionUser: expect.any(Function),
        hasVote: expect.any(Function),
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(1, "/dashboard");
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(2, "/p/acme-studio");
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(
      3,
      "/p/acme-studio/feedback/c0a80121-7ac0-4f4e-a1d8-2fe804b6c401",
    );
  });

  it("does not invalidate routes when a vote was rejected", async () => {
    mocks.executeFeedbackVote.mockResolvedValue({
      error: "Sign in to vote for feedback.",
      ok: false,
      requestId: "request-2",
    });

    await voteFeedbackAction(input);

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
