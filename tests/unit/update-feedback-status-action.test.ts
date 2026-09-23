import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateFeedbackStatusAction } from "@/features/feedback/actions/update-feedback-status";
import { businessError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  update: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/server/auth", () => ({ auth: { api: { getSession: mocks.session } } }));
vi.mock("@/features/feedback/server/status", () => ({ executeOwnerStatusUpdate: mocks.update }));

const input = {
  feedbackId: "c0a80121-7ac0-4f4e-a1d8-2fe804b6c401",
  status: "planned" as const,
};

describe("updateFeedbackStatusAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockResolvedValue({ user: { id: "owner-1" } });
    mocks.update.mockResolvedValue({ ...input, slug: "owned-board" });
  });

  it("uses session ownership and the server-resolved slug while preserving response shape", async () => {
    const result = await updateFeedbackStatusAction({
      ...input, userId: "victim", slug: "victim-board",
    } as typeof input);

    expect(mocks.update).toHaveBeenCalledWith(input, "owner-1");
    expect(result).toEqual({ data: input });
    expect(mocks.revalidate.mock.calls).toEqual([
      ["/dashboard"],
      ["/p/owned-board"],
      ["/p/owned-board/roadmap"],
      [`/p/owned-board/feedback/${input.feedbackId}`],
    ]);
  });

  it("passes a missing session explicitly and does not invalidate rejected writes", async () => {
    mocks.session.mockResolvedValue(null);
    mocks.update.mockRejectedValue(businessError("UNAUTHENTICATED"));
    expect((await updateFeedbackStatusAction(input)).serverError?.code).toBe("UNAUTHENTICATED");
    expect(mocks.update).toHaveBeenCalledWith(input, null);
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("does not invalidate routes when ownership validation rejects feedback", async () => {
    mocks.update.mockRejectedValue(businessError("FEEDBACK_NOT_AVAILABLE"));
    expect((await updateFeedbackStatusAction(input)).serverError?.code).toBe("FEEDBACK_NOT_AVAILABLE");
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
