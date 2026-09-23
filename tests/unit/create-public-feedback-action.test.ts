import { beforeEach, describe, expect, it, vi } from "vitest";

import { createPublicFeedbackAction } from "@/features/feedback/actions/create-public-feedback";
import { businessError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  limit: vi.fn(),
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
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/server/auth", () => ({ auth: { api: { getSession: mocks.session } } }));
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/rate-limit", () => ({ enforceWriteRateLimit: mocks.limit }));
vi.mock("@/server/db/schema", () => ({ feedback: {}, projects: {} }));
vi.mock("@/features/feedback/server/creation", () => ({
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
    mocks.limit.mockReset();
    mocks.session.mockResolvedValue({ user: { id: "user-1" } });
    mocks.limit.mockResolvedValue(undefined);
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
      "user-1",
    );
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(1, "/dashboard");
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(2, "/p/acme-studio");
  });

  it("redirects an expired session to the validated internal board", async () => {
    mocks.session.mockResolvedValue(null);
    mocks.executePublicFeedbackCreation.mockRejectedValue(
      businessError("UNAUTHENTICATED"),
    );

    await expect(createPublicFeedbackAction(input)).rejects.toMatchObject({
      digest:
        "NEXT_REDIRECT;replace;/login?returnTo=%2Fp%2Facme-studio;307;",
    });
    expect(mocks.executePublicFeedbackCreation).toHaveBeenCalledWith(input, null);
    expect(mocks.limit).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("uses the session identity even when input contains a forged user ID", async () => {
    mocks.executePublicFeedbackCreation.mockResolvedValue({ feedback: { id: "feedback-1", slug: "acme-studio" } });
    const forgedInput = { ...input, userId: "victim-user", ownerId: "victim-user" };
    await expect(createPublicFeedbackAction(forgedInput)).rejects.toMatchObject({ message: "NEXT_REDIRECT" });
    expect(mocks.executePublicFeedbackCreation).toHaveBeenCalledWith(input, "user-1");
  });

  it("stops before the service and cache invalidation when rate limited", async () => {
    mocks.limit.mockRejectedValue(businessError("RATE_LIMITED"));
    const result = await createPublicFeedbackAction(input);
    expect(result.serverError?.code).toBe("RATE_LIMITED");
    expect(mocks.limit).toHaveBeenCalledWith("user-1", "feedback.create");
    expect(mocks.executePublicFeedbackCreation).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
