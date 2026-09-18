import { beforeEach, describe, expect, it, vi } from "vitest";

import { voteFeedbackAction } from "@/features/feedback/actions/vote-feedback";
import { businessError } from "@/lib/errors";

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

  it("returns domain data and revalidates every affected page", async () => {
    mocks.executeFeedbackVote.mockResolvedValue({ voteCount: 83, voted: true });

    await expect(voteFeedbackAction(input)).resolves.toEqual({
      data: { voteCount: 83, voted: true },
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
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/p/acme-studio");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/p/acme-studio/roadmap");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/p/acme-studio/feedback/c0a80121-7ac0-4f4e-a1d8-2fe804b6c401",
    );
  });

  it("returns a uniform typed server error without invalidating routes", async () => {
    mocks.executeFeedbackVote.mockRejectedValue(
      businessError("UNAUTHENTICATED"),
    );

    const result = await voteFeedbackAction(input);

    expect(result.serverError).toMatchObject({
      code: "UNAUTHENTICATED",
      message: expect.any(String),
      requestId: expect.any(String),
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
