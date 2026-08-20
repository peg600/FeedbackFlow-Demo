import { describe, expect, it, vi } from "vitest";

import { executeOwnerStatusUpdate } from "@/server/services/dashboard-status";

const validInput = {
  feedbackId: "c0a80121-7ac0-4f4e-a1d8-2fe804b6c401",
  status: "planned",
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
  it("rejects invalid input before reading authentication", async () => {
    const deps = dependencies();
    const result = await executeOwnerStatusUpdate(
      { feedbackId: "not-a-uuid", status: "planned" },
      deps,
    );
    expect(result.ok).toBe(false);
    expect(deps.getSessionUser).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated updates", async () => {
    const deps = dependencies({ getSessionUser: vi.fn().mockResolvedValue(null) });
    expect((await executeOwnerStatusUpdate(validInput, deps)).ok).toBe(false);
    expect(deps.findOwnedProject).not.toHaveBeenCalled();
  });

  it("rejects a user without an owned project", async () => {
    const deps = dependencies({ findOwnedProject: vi.fn().mockResolvedValue(null) });
    expect((await executeOwnerStatusUpdate(validInput, deps)).ok).toBe(false);
    expect(deps.updateOwnedFeedback).not.toHaveBeenCalled();
  });

  it("scopes the update to the authenticated owner's project", async () => {
    const deps = dependencies();
    const result = await executeOwnerStatusUpdate(validInput, deps);
    expect(result).toMatchObject({ ok: true, status: "planned" });
    expect(deps.updateOwnedFeedback).toHaveBeenCalledWith({
      feedbackId: validInput.feedbackId,
      projectId: "project-1",
      status: "planned",
    });
  });

  it("returns a generic error when a dependency throws", async () => {
    const deps = dependencies({
      updateOwnedFeedback: vi.fn().mockRejectedValue(new Error("database details")),
    });

    const result = await executeOwnerStatusUpdate(validInput, deps);

    expect(result).toMatchObject({
      error: "Unable to update feedback. Try again.",
      ok: false,
    });
    expect(JSON.stringify(result)).not.toContain("database details");
  });
});
