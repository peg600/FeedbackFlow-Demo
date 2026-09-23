import { describe, expect, it, vi } from "vitest";

import { executeProjectCreation } from "@/features/projects/server/creation";

vi.mock("@/server/db", () => ({ db: {} }));

const validInput = {
  description: "Help us decide what to build next.",
  name: "Acme Studio",
  slug: "acme-studio",
};

/** 为每个用例创建独立的身份与数据库替身，默认模拟无冲突创建成功。 */
function dependencies() {
  return {
    findProjectBySlug: vi.fn(
      async (): Promise<{ id: string; userId: string } | null> => null,
    ),
    findProjectByUser: vi.fn(
      async (): Promise<{ id: string; slug: string } | null> => null,
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
  it("validates before accessing the database", async () => {
    const deps = dependencies();

    await expect(
      executeProjectCreation({ ...validInput, slug: "not valid" }, "user-1", deps),
    ).rejects.toMatchObject({ name: "ZodError" });
    expect(deps.insertProject).not.toHaveBeenCalled();
    expect(deps.insertProject).not.toHaveBeenCalled();
  });

  it("creates one workspace for the authenticated user", async () => {
    const deps = dependencies();

    await expect(executeProjectCreation(validInput, "user-1", deps)).resolves.toEqual({
      project: { id: "project-1", slug: "acme-studio" },
    });
    expect(deps.insertProject).toHaveBeenCalledWith({
      description: validInput.description,
      name: validInput.name,
      slug: validInput.slug,
      userId: "user-1",
    });
  });

  it("returns a typed authentication failure without writing", async () => {
    const deps = dependencies();

    await expect(executeProjectCreation(validInput, null, deps)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    expect(deps.insertProject).not.toHaveBeenCalled();
  });

  it("treats a repeated submission as an idempotent success", async () => {
    const deps = dependencies();
    deps.insertProject.mockResolvedValue(null);
    deps.findProjectByUser.mockResolvedValue({
      id: "existing-project",
      slug: "acme-studio",
    });

    await expect(executeProjectCreation(validInput, "user-1", deps)).resolves.toEqual({
      project: { id: "existing-project", slug: "acme-studio" },
    });
    expect(deps.findProjectBySlug).not.toHaveBeenCalled();
  });

  it("maps a known slug conflict to a stable business code", async () => {
    const deps = dependencies();
    deps.insertProject.mockResolvedValue(null);
    deps.findProjectBySlug.mockResolvedValue({
      id: "other-project",
      userId: "user-2",
    });

    await expect(executeProjectCreation(validInput, "user-1", deps)).rejects.toMatchObject({
      code: "PROJECT_SLUG_TAKEN",
      field: "slug",
    });
  });

  it("lets unknown infrastructure failures reach the action boundary", async () => {
    const deps = dependencies();
    const databaseError = new Error("connection details");
    deps.insertProject.mockRejectedValue(databaseError);

    await expect(executeProjectCreation(validInput, "user-1", deps)).rejects.toBe(
      databaseError,
    );
  });
});
