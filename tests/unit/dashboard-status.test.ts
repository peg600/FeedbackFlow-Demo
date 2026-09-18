import { describe, expect, it, vi } from "vitest";

import { executeOwnerStatusUpdate } from "@/server/services/dashboard-status";

const validInput = {
  feedbackId: "c0a80121-7ac0-4f4e-a1d8-2fe804b6c401",
  status: "planned" as const,
};

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    findOwnedProject: vi.fn().mockResolvedValue({ id: "project-1" }),
    getSessionUser: vi.fn().mockResolvedValue({ id: "user-1" }),
    updateOwnedFeedback: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("executeOwnerStatusUpdate", () => {
  it("validates before reading authentication", async () => {
    const deps = dependencies();

    await expect(
      executeOwnerStatusUpdate(
        { feedbackId: "not-a-uuid", status: "planned" },
        deps,
      ),
    ).rejects.toMatchObject({ name: "ZodError" });
    expect(deps.getSessionUser).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated updates", async () => {
    const deps = dependencies({ getSessionUser: vi.fn().mockResolvedValue(null) });

    await expect(
      executeOwnerStatusUpdate(validInput, deps),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(deps.findOwnedProject).not.toHaveBeenCalled();
  });

  it("rejects a user without an owned project", async () => {
    const deps = dependencies({
      findOwnedProject: vi.fn().mockResolvedValue(null),
    });

    await expect(
      executeOwnerStatusUpdate(validInput, deps),
    ).rejects.toMatchObject({ code: "PROJECT_NOT_FOUND" });
    expect(deps.updateOwnedFeedback).not.toHaveBeenCalled();
  });

  it("scopes the update to the authenticated owner's project", async () => {
    const deps = dependencies();

    await expect(executeOwnerStatusUpdate(validInput, deps)).resolves.toEqual({
      feedbackId: validInput.feedbackId,
      status: "planned",
    });
    expect(deps.updateOwnedFeedback).toHaveBeenCalledWith({
      feedbackId: validInput.feedbackId,
      projectId: "project-1",
      status: "planned",
    });
  });

  it("does not report success if the scoped row disappeared", async () => {
    const deps = dependencies({
      updateOwnedFeedback: vi.fn().mockResolvedValue(false),
    });

    await expect(
      executeOwnerStatusUpdate(validInput, deps),
    ).rejects.toMatchObject({ code: "FEEDBACK_NOT_AVAILABLE" });
  });
});
