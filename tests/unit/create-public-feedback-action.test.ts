import { beforeEach, describe, expect, it, vi } from "vitest";

import { createPublicFeedbackAction } from "@/features/feedback/actions/create-public-feedback";

const mocks = vi.hoisted(() => ({
  executePublicFeedbackCreation: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/auth", () => ({ auth: {} }));
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/db/schema", () => ({ feedback: {}, projects: {} }));
vi.mock("@/server/services/feedback-creation", () => ({
  executePublicFeedbackCreation: mocks.executePublicFeedbackCreation,
}));

function formData() {
  const data = new FormData();
  data.set("description", "A comfortable theme for reviewing updates after hours.");
  data.set("slug", "acme-studio");
  data.set("title", "Dark mode for the dashboard");
  return data;
}

describe("createPublicFeedbackAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revalidates the owner and public pages before opening the new feedback", async () => {
    mocks.executePublicFeedbackCreation.mockResolvedValue({
      feedback: { id: "feedback-1", slug: "acme-studio" },
      ok: true,
      requestId: "request-1",
    });

    await expect(createPublicFeedbackAction(null, formData())).rejects.toThrow(
      "NEXT_REDIRECT:/p/acme-studio/feedback/feedback-1",
    );

    expect(mocks.executePublicFeedbackCreation).toHaveBeenCalledWith(
      {
        description: "A comfortable theme for reviewing updates after hours.",
        slug: "acme-studio",
        title: "Dark mode for the dashboard",
      },
      expect.objectContaining({
        createFeedback: expect.any(Function),
        findPublicProject: expect.any(Function),
        getSessionUser: expect.any(Function),
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(1, "/dashboard");
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(2, "/p/acme-studio");
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/p/acme-studio/feedback/feedback-1",
    );
  });

  it("redirects an expired session to the validated internal board", async () => {
    mocks.executePublicFeedbackCreation.mockResolvedValue({
      code: "unauthenticated",
      error: "Unable to submit feedback. Try again.",
      ok: false,
      requestId: "request-2",
    });

    await expect(createPublicFeedbackAction(null, formData())).rejects.toThrow(
      "NEXT_REDIRECT:/login?returnTo=%2Fp%2Facme-studio",
    );
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
