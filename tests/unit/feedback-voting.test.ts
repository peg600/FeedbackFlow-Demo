import { describe, expect, it, vi } from "vitest";

import { executeFeedbackVote } from "@/server/services/feedback-voting";

const validInput = {
  feedbackId: "c0a80121-7ac0-4f4e-a1d8-2fe804b6c401",
  slug: "acme-studio",
};

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    countVotes: vi.fn().mockResolvedValue(83),
    createVote: vi.fn().mockResolvedValue(true),
    deleteVote: vi.fn().mockResolvedValue(undefined),
    findPublicFeedback: vi.fn().mockResolvedValue({ id: validInput.feedbackId }),
    getSessionUser: vi.fn().mockResolvedValue({ id: "user-1" }),
    hasVote: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

describe("executeFeedbackVote", () => {
  it("rejects malformed input before reading a session", async () => {
    const deps = dependencies();

    const result = await executeFeedbackVote(
      { feedbackId: "not-a-uuid", slug: "acme-studio" },
      deps,
    );

    expect(result.ok).toBe(false);
    expect(deps.getSessionUser).not.toHaveBeenCalled();
  });

  it("asks an anonymous visitor to sign in without querying feedback", async () => {
    const deps = dependencies({ getSessionUser: vi.fn().mockResolvedValue(null) });

    await expect(executeFeedbackVote(validInput, deps)).resolves.toMatchObject({
      code: "unauthenticated",
      ok: false,
    });
    expect(deps.findPublicFeedback).not.toHaveBeenCalled();
  });

  it("does not mutate hidden, missing, or cross-project feedback", async () => {
    const deps = dependencies({
      findPublicFeedback: vi.fn().mockResolvedValue(null),
    });

    const result = await executeFeedbackVote(validInput, deps);

    expect(result.ok).toBe(false);
    expect(deps.hasVote).not.toHaveBeenCalled();
    expect(deps.createVote).not.toHaveBeenCalled();
    expect(deps.deleteVote).not.toHaveBeenCalled();
  });

  it("creates a vote only for the authenticated user and public feedback", async () => {
    const deps = dependencies();

    await expect(executeFeedbackVote(validInput, deps)).resolves.toMatchObject({
      ok: true,
      voteCount: 83,
      voted: true,
    });
    expect(deps.createVote).toHaveBeenCalledWith({
      feedbackId: validInput.feedbackId,
      userId: "user-1",
    });
    expect(deps.deleteVote).not.toHaveBeenCalled();
  });

  it("removes an existing vote instead of creating a duplicate", async () => {
    const deps = dependencies({ hasVote: vi.fn().mockResolvedValue(true) });

    await expect(executeFeedbackVote(validInput, deps)).resolves.toMatchObject({
      ok: true,
      voted: false,
    });
    expect(deps.deleteVote).toHaveBeenCalledWith({
      feedbackId: validInput.feedbackId,
      userId: "user-1",
    });
    expect(deps.createVote).not.toHaveBeenCalled();
  });

  it("accepts a database-conflict vote when the final relationship exists", async () => {
    const deps = dependencies({
      createVote: vi.fn().mockResolvedValue(false),
      hasVote: vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true),
    });

    await expect(executeFeedbackVote(validInput, deps)).resolves.toMatchObject({
      ok: true,
      voted: true,
    });
    expect(deps.hasVote).toHaveBeenCalledTimes(2);
  });

  it("keeps dependency details out of the displayed error", async () => {
    const deps = dependencies({
      countVotes: vi.fn().mockRejectedValue(new Error("database details")),
    });

    const result = await executeFeedbackVote(validInput, deps);

    expect(result).toMatchObject({
      error: "Unable to update your vote. Try again.",
      ok: false,
    });
    expect(JSON.stringify(result)).not.toContain("database details");
  });
});
