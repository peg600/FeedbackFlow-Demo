import { beforeEach, describe, expect, it, vi } from "vitest";

import { voteFeedbackAction } from "@/features/feedback/actions/vote-feedback";
import { businessError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  limit: vi.fn(),
  executeFeedbackVote: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/server/auth", () => ({ auth: { api: { getSession: mocks.session } } }));
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/rate-limit", () => ({ enforceWriteRateLimit: mocks.limit }));
vi.mock("@/server/db/schema", () => ({ feedback: {}, projects: {}, votes: {} }));
vi.mock("@/features/feedback/server/voting", () => ({
  executeFeedbackVote: mocks.executeFeedbackVote,
}));

describe("voteFeedbackAction", () => {
  const input = {
    feedbackId: "c0a80121-7ac0-4f4e-a1d8-2fe804b6c401",
    slug: "acme-studio",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.limit.mockReset();
    mocks.session.mockResolvedValue({ user: { id: "user-1" } });
    mocks.limit.mockResolvedValue(undefined);
  });

  it("returns domain data and revalidates every affected page", async () => {
    mocks.executeFeedbackVote.mockResolvedValue({ voteCount: 83, voted: true });

    await expect(voteFeedbackAction(input)).resolves.toEqual({
      data: { voteCount: 83, voted: true },
    });

    expect(mocks.executeFeedbackVote).toHaveBeenCalledWith(
      input,
      "user-1",
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/p/acme-studio");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/p/acme-studio/roadmap");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/p/acme-studio/feedback/c0a80121-7ac0-4f4e-a1d8-2fe804b6c401",
    );
  });

  it("returns a uniform typed server error without invalidating routes", async () => {
    mocks.session.mockResolvedValue(null);
    mocks.executeFeedbackVote.mockRejectedValue(
      businessError("UNAUTHENTICATED"),
    );

    const result = await voteFeedbackAction(input);

    expect(result.serverError).toMatchObject({
      code: "UNAUTHENTICATED",
      message: expect.any(String),
      requestId: expect.any(String),
    });
    expect(mocks.executeFeedbackVote).toHaveBeenCalledWith(input, null);
    expect(mocks.limit).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("uses the session identity even when input contains a forged user ID", async () => {
    mocks.executeFeedbackVote.mockResolvedValue({ voteCount: 1, voted: true });
    const forgedInput = { ...input, userId: "victim-user", ownerId: "victim-user" };
    await voteFeedbackAction(forgedInput);
    expect(mocks.executeFeedbackVote).toHaveBeenCalledWith(input, "user-1");
  });

  it("stops before the service and cache invalidation when rate limited", async () => {
    mocks.limit.mockRejectedValue(businessError("RATE_LIMITED"));
    const result = await voteFeedbackAction(input);
    expect(result.serverError?.code).toBe("RATE_LIMITED");
    expect(mocks.limit).toHaveBeenCalledWith("user-1", "feedback.vote");
    expect(mocks.executeFeedbackVote).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
