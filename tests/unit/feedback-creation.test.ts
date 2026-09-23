import { describe, expect, it, vi } from "vitest";

import { executePublicFeedbackCreation } from "@/features/feedback/server/creation";

vi.mock("@/server/db", () => ({ db: {} }));

const validInput = {
  description: "A comfortable theme for reviewing updates after hours.",
  slug: "acme-studio",
  title: "Dark mode for the dashboard",
};

/** 默认模拟登录用户向公开项目提交成功，允许用例替换配额、可见性或写入结果。 */
function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    createFeedback: vi.fn().mockResolvedValue({ id: "feedback-1" }),
    findPublicProject: vi.fn().mockResolvedValue({
      id: "project-1",
      slug: "acme-studio",
    }),
    ...overrides,
  };
}

describe("executePublicFeedbackCreation", () => {
  it("validates before accessing the database", async () => {
    const deps = dependencies();

    await expect(
      executePublicFeedbackCreation({ ...validInput, title: "x" }, "user-1", deps),
    ).rejects.toMatchObject({ name: "ZodError" });
    expect(deps.findPublicProject).not.toHaveBeenCalled();
  });

  it("returns an authentication error before resolving the project", async () => {
    const deps = dependencies();

    await expect(
      executePublicFeedbackCreation(validInput, null, deps),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(deps.findPublicProject).not.toHaveBeenCalled();
  });

  it("does not write when the board is hidden, missing, or mismatched", async () => {
    const deps = dependencies({
      findPublicProject: vi.fn().mockResolvedValue(null),
    });

    await expect(
      executePublicFeedbackCreation(validInput, "user-1", deps),
    ).rejects.toMatchObject({ code: "PUBLIC_BOARD_UNAVAILABLE" });
    expect(deps.createFeedback).not.toHaveBeenCalled();
  });

  it("binds feedback to the authenticated author and public project", async () => {
    const deps = dependencies();

    await expect(
      executePublicFeedbackCreation(validInput, "user-1", deps),
    ).resolves.toEqual({
      feedback: { id: "feedback-1", slug: "acme-studio" },
    });
    expect(deps.createFeedback).toHaveBeenCalledWith({
      description: validInput.description,
      projectId: "project-1",
      slug: "acme-studio",
      title: validInput.title,
      userId: "user-1",
    });
  });

  it("exposes the server-enforced feedback limit as a business error", async () => {
    const deps = dependencies({
      createFeedback: vi.fn().mockResolvedValue("feedback_limit"),
    });

    await expect(
      executePublicFeedbackCreation(validInput, "user-1", deps),
    ).rejects.toMatchObject({ code: "FEEDBACK_LIMIT_REACHED" });
  });

  it("reports a board changed during the transaction as unavailable", async () => {
    const deps = dependencies({
      createFeedback: vi.fn().mockResolvedValue("public_board_unavailable"),
    });

    await expect(
      executePublicFeedbackCreation(validInput, "user-1", deps),
    ).rejects.toMatchObject({ code: "PUBLIC_BOARD_UNAVAILABLE" });
  });

  it("lets infrastructure failures reach the action boundary", async () => {
    const databaseError = new Error("database details");
    const deps = dependencies({
      createFeedback: vi.fn().mockRejectedValue(databaseError),
    });

    await expect(
      executePublicFeedbackCreation(validInput, "user-1", deps),
    ).rejects.toBe(databaseError);
  });
});
