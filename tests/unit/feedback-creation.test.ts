import { describe, expect, it, vi } from "vitest";

import { executePublicFeedbackCreation } from "@/server/services/feedback-creation";

const validInput = {
  description: "A comfortable theme for reviewing updates after hours.",
  slug: "acme-studio",
  title: "Dark mode for the dashboard",
};

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    createFeedback: vi.fn().mockResolvedValue({ id: "feedback-1" }),
    findPublicProject: vi.fn().mockResolvedValue({
      id: "project-1",
      slug: "acme-studio",
    }),
    getSessionUser: vi.fn().mockResolvedValue({ id: "user-1" }),
    ...overrides,
  };
}

describe("executePublicFeedbackCreation", () => {
  it("rejects malformed feedback before reading authentication", async () => {
    const deps = dependencies();

    const result = await executePublicFeedbackCreation(
      { ...validInput, title: "x" },
      deps,
    );

    expect(result.ok).toBe(false);
    expect(result.fieldErrors).toMatchObject({
      title: "Title must be at least 3 characters.",
    });
    expect(deps.getSessionUser).not.toHaveBeenCalled();
  });

  it("returns an authentication outcome before resolving the project", async () => {
    const deps = dependencies({ getSessionUser: vi.fn().mockResolvedValue(null) });

    await expect(executePublicFeedbackCreation(validInput, deps)).resolves.toMatchObject({
      code: "unauthenticated",
      ok: false,
    });
    expect(deps.findPublicProject).not.toHaveBeenCalled();
  });

  it("does not write when the board is hidden or missing", async () => {
    const deps = dependencies({ findPublicProject: vi.fn().mockResolvedValue(null) });

    const result = await executePublicFeedbackCreation(validInput, deps);

    expect(result.ok).toBe(false);
    expect(deps.createFeedback).not.toHaveBeenCalled();
  });

  it("binds the new feedback to the authenticated author and public project", async () => {
    const deps = dependencies();

    await expect(executePublicFeedbackCreation(validInput, deps)).resolves.toMatchObject({
      feedback: { id: "feedback-1", slug: "acme-studio" },
      ok: true,
    });
    expect(deps.createFeedback).toHaveBeenCalledWith({
      description: validInput.description,
      projectId: "project-1",
      slug: "acme-studio",
      title: validInput.title,
      userId: "user-1",
    });
  });

  it("exposes the server-enforced Free feedback limit", async () => {
    const deps = dependencies({
      createFeedback: vi.fn().mockResolvedValue("feedback_limit"),
    });

    await expect(executePublicFeedbackCreation(validInput, deps)).resolves.toMatchObject({
      code: "feedback_limit",
      error: "This public board has reached its 50 feedback limit.",
      ok: false,
    });
  });

  it("does not leak database details", async () => {
    const deps = dependencies({
      createFeedback: vi.fn().mockRejectedValue(new Error("database details")),
    });

    const result = await executePublicFeedbackCreation(validInput, deps);

    expect(result).toMatchObject({
      error: "Unable to submit feedback. Try again.",
      ok: false,
    });
    expect(JSON.stringify(result)).not.toContain("database details");
  });
});
