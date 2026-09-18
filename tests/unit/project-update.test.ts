import { describe, expect, it, vi } from "vitest";

import { updateOwnedProject } from "@/server/services/project-update";

vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/db/schema", () => ({ projects: {} }));

const input = {
  description: "A public feedback board.",
  isPublic: true,
  name: "Acme Studio",
  slug: "acme-studio",
};

/** 默认模拟用户拥有项目且 Slug 可用，允许用例覆盖冲突和更新期间资源消失的情况。 */
function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    findProjectByUser: vi.fn().mockResolvedValue({
      id: "project-1",
      slug: "old-slug",
    }),
    findSlugConflict: vi.fn().mockResolvedValue(null),
    updateProject: vi.fn().mockResolvedValue({
      description: "A public feedback board.",
      isPublic: true,
      name: "Acme Studio",
      slug: "acme-studio",
    }),
    ...overrides,
  };
}

describe("updateOwnedProject", () => {
  it("updates only the authenticated user's project", async () => {
    const deps = dependencies();

    await expect(updateOwnedProject("user-1", input, deps)).resolves.toEqual({
      oldSlug: "old-slug",
      project: {
        description: "A public feedback board.",
        isPublic: true,
        name: "Acme Studio",
        slug: "acme-studio",
      },
    });
    expect(deps.updateProject).toHaveBeenCalledWith({
      description: input.description,
      id: "project-1",
      isPublic: true,
      name: "Acme Studio",
      slug: "acme-studio",
      userId: "user-1",
    });
  });

  it("returns a field-addressable slug conflict", async () => {
    const deps = dependencies({
      findSlugConflict: vi.fn().mockResolvedValue({ id: "project-2" }),
    });

    await expect(updateOwnedProject("user-1", input, deps)).rejects.toMatchObject({
      code: "PROJECT_SLUG_TAKEN",
      field: "slug",
    });
    expect(deps.updateProject).not.toHaveBeenCalled();
  });

  it("detects a project deleted between read and update", async () => {
    const deps = dependencies({ updateProject: vi.fn().mockResolvedValue(null) });

    await expect(updateOwnedProject("user-1", input, deps)).rejects.toMatchObject({
      code: "PROJECT_NOT_FOUND",
    });
  });
});
