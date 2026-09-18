import { beforeEach, describe, expect, it, vi } from "vitest";

import { createPublicFeedbackAction } from "@/features/feedback/actions/create-public-feedback";
import { businessError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  executePublicFeedbackCreation: vi.fn(),
  redirect: vi.fn((path: string) => {
    const error = new Error("NEXT_REDIRECT");
    Object.assign(error, { digest: `NEXT_REDIRECT;replace;${path};307;` });
    throw error;
  }),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/auth", () => ({ auth: {} }));
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/rate-limit", () => ({ enforceWriteRateLimit: vi.fn() }));
vi.mock("@/server/db/schema", () => ({ feedback: {}, projects: {} }));
vi.mock("@/server/services/feedback-creation", () => ({
  executePublicFeedbackCreation: mocks.executePublicFeedbackCreation,
}));

const input = {
  description: "A comfortable theme for reviewing updates after hours.",
  slug: "acme-studio",
  title: "Dark mode for the dashboard",
};

describe("createPublicFeedbackAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revalidates public pages before opening the new feedback", async () => {
    mocks.executePublicFeedbackCreation.mockResolvedValue({
      feedback: { id: "feedback-1", slug: "acme-studio" },
    });

    await expect(createPublicFeedbackAction(input)).rejects.toMatchObject({
      digest:
        "NEXT_REDIRECT;replace;/p/acme-studio/feedback/feedback-1;307;",
    });

    expect(mocks.executePublicFeedbackCreation).toHaveBeenCalledWith(
      input,
      expect.objectContaining({
        createFeedback: expect.any(Function),
        findPublicProject: expect.any(Function),
        getSessionUser: expect.any(Function),
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(1, "/dashboard");
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(2, "/p/acme-studio");
  });

  it("redirects an expired session to the validated internal board", async () => {
    mocks.executePublicFeedbackCreation.mockRejectedValue(
      businessError("UNAUTHENTICATED"),
    );

    await expect(createPublicFeedbackAction(input)).rejects.toMatchObject({
      digest:
        "NEXT_REDIRECT;replace;/login?returnTo=%2Fp%2Facme-studio;307;",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
