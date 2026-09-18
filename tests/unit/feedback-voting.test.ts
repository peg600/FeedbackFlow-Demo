import { describe, expect, it, vi } from "vitest";

import { executeFeedbackVote } from "@/server/services/feedback-voting";

const validInput = {
  feedbackId: "c0a80121-7ac0-4f4e-a1d8-2fe804b6c401",
  slug: "acme-studio",
};

/** 创建独立的投票依赖替身，通过覆盖查询和写入结果模拟重复投票或失败路径。 */
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
  it("validates before reading authentication", async () => {
    const deps = dependencies();

    await expect(
      executeFeedbackVote(
        { feedbackId: "not-a-uuid", slug: "acme-studio" },
        deps,
      ),
    ).rejects.toMatchObject({ name: "ZodError" });
    expect(deps.getSessionUser).not.toHaveBeenCalled();
  });

  it("returns a typed authentication error without querying feedback", async () => {
    const deps = dependencies({ getSessionUser: vi.fn().mockResolvedValue(null) });

    await expect(executeFeedbackVote(validInput, deps)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    expect(deps.findPublicFeedback).not.toHaveBeenCalled();
  });

  it("does not mutate hidden, missing, or cross-project feedback", async () => {
    const deps = dependencies({
      findPublicFeedback: vi.fn().mockResolvedValue(null),
    });

    await expect(executeFeedbackVote(validInput, deps)).rejects.toMatchObject({
      code: "FEEDBACK_NOT_AVAILABLE",
    });
    expect(deps.hasVote).not.toHaveBeenCalled();
    expect(deps.createVote).not.toHaveBeenCalled();
    expect(deps.deleteVote).not.toHaveBeenCalled();
  });

  it("creates a vote for the authenticated user", async () => {
    const deps = dependencies();

    await expect(executeFeedbackVote(validInput, deps)).resolves.toEqual({
      voteCount: 83,
      voted: true,
    });
    expect(deps.createVote).toHaveBeenCalledWith({
      feedbackId: validInput.feedbackId,
      userId: "user-1",
    });
  });

  it("removes an existing vote instead of creating a duplicate", async () => {
    const deps = dependencies({ hasVote: vi.fn().mockResolvedValue(true) });

    await expect(executeFeedbackVote(validInput, deps)).resolves.toMatchObject({
      voted: false,
    });
    expect(deps.deleteVote).toHaveBeenCalledWith({
      feedbackId: validInput.feedbackId,
      userId: "user-1",
    });
    expect(deps.createVote).not.toHaveBeenCalled();
  });

  it("treats a concurrent duplicate as voted when the row now exists", async () => {
    const deps = dependencies({
      createVote: vi.fn().mockResolvedValue(false),
      hasVote: vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true),
    });

    await expect(executeFeedbackVote(validInput, deps)).resolves.toMatchObject({
      voted: true,
    });
    expect(deps.hasVote).toHaveBeenCalledTimes(2);
  });
});
