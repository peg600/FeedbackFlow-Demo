import { describe, expect, it, vi } from "vitest";

import { executeProjectCreation } from "@/server/services/project-creation";

const validInput = {
  description: "Help us decide what to build next.",
  name: "Acme Studio",
  slug: "acme-studio",
};

function dependencies() {
  return {
    findProjectBySlug: vi.fn(
      async (): Promise<{ id: string; userId: string } | null> => null,
    ),
    findProjectByUser: vi.fn(
      async (): Promise<{ id: string; slug: string } | null> => null,
    ),
    getSessionUser: vi.fn(
      async (): Promise<{ id: string } | null> => ({ id: "user-1" }),
    ),
    insertProject: vi.fn(
      async (): Promise<{ id: string; slug: string } | null> => ({
        id: "project-1",
        slug: "acme-studio",
      }),
    ),
  };
}

describe("executeProjectCreation", () => {
  it("validates before reading identity or writing", async () => {
    const deps = dependencies();
    const result = await executeProjectCreation(
      { ...validInput, slug: "not valid" },
      deps,
    );

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.slug).toBeDefined();
    expect(deps.getSessionUser).not.toHaveBeenCalled();
    expect(deps.insertProject).not.toHaveBeenCalled();
  });

  it("creates one public workspace for the authenticated user", async () => {
    const deps = dependencies();
    const result = await executeProjectCreation(
      { ...validInput, isPublic: false, userId: "attacker" },
      deps,
    );

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        project: { id: "project-1", slug: "acme-studio" },
      }),
    );
    expect(deps.insertProject).toHaveBeenCalledWith({
      description: validInput.description,
      name: validInput.name,
      slug: validInput.slug,
      userId: "user-1",
    });
  });

  it("does not write without a fresh session", async () => {
    const deps = dependencies();
    deps.getSessionUser.mockResolvedValue(null);

    const result = await executeProjectCreation(validInput, deps);

    expect(result.ok).toBe(false);
    expect(result.code).toBe("unauthenticated");
    expect(result.error).toBe("Unable to create your workspace. Try again.");
    expect(deps.insertProject).not.toHaveBeenCalled();
  });

  it("treats a repeated submission as an idempotent success", async () => {
    const deps = dependencies();
    deps.insertProject.mockResolvedValue(null);
    deps.findProjectByUser.mockResolvedValue({
      id: "existing-project",
      slug: "acme-studio",
    });

    const result = await executeProjectCreation(validInput, deps);

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        project: { id: "existing-project", slug: "acme-studio" },
      }),
    );
    expect(deps.findProjectBySlug).not.toHaveBeenCalled();
  });

  it("reports a unique slug conflict after an insert conflict", async () => {
    const deps = dependencies();
    deps.insertProject.mockResolvedValue(null);
    deps.findProjectBySlug.mockResolvedValue({
      id: "other-project",
      userId: "user-2",
    });

    const result = await executeProjectCreation(validInput, deps);

    expect(result.ok).toBe(false);
    expect(result.fieldErrors).toEqual({
      slug: "This public URL slug is already in use.",
    });
  });

  it("does not expose database failures", async () => {
    const deps = dependencies();
    deps.insertProject.mockRejectedValue(new Error("connection details"));

    const result = await executeProjectCreation(validInput, deps);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Unable to create your workspace. Try again.");
    expect(JSON.stringify(result)).not.toContain("connection details");
  });
});
