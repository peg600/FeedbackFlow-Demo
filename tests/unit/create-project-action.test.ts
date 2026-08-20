import { beforeEach, describe, expect, it, vi } from "vitest";

import { createProjectAction } from "@/features/projects/actions/create-project";

const mocks = vi.hoisted(() => ({
  executeProjectCreation: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/auth", () => ({ auth: {} }));
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/db/schema", () => ({ projects: {} }));
vi.mock("@/server/services/project-creation", () => ({
  executeProjectCreation: mocks.executeProjectCreation,
}));

describe("createProjectAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function formData() {
    const data = new FormData();
    data.set("name", "Acme Studio");
    data.set("slug", "acme-studio");
    data.set("description", "A public feedback board.");
    return data;
  }

  it("revalidates protected routes before redirecting after creation", async () => {
    mocks.executeProjectCreation.mockResolvedValue({
      ok: true,
      project: { id: "project-1", slug: "acme-studio" },
      requestId: "request-1",
    });

    await expect(createProjectAction(null, formData())).rejects.toThrow(
      "NEXT_REDIRECT:/dashboard",
    );

    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(1, "/dashboard");
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(2, "/onboarding");
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
    expect(mocks.executeProjectCreation).toHaveBeenCalledWith(
      {
        description: "A public feedback board.",
        name: "Acme Studio",
        slug: "acme-studio",
      },
      expect.objectContaining({
        findProjectBySlug: expect.any(Function),
        findProjectByUser: expect.any(Function),
        getSessionUser: expect.any(Function),
        insertProject: expect.any(Function),
      }),
    );
  });

  it("returns an expired session to login without revalidating", async () => {
    mocks.executeProjectCreation.mockResolvedValue({
      code: "unauthenticated",
      error: "Unable to create your workspace. Try again.",
      ok: false,
      requestId: "request-2",
    });

    await expect(createProjectAction(null, formData())).rejects.toThrow(
      "NEXT_REDIRECT:/login?returnTo=/onboarding",
    );

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/login?returnTo=/onboarding",
    );
  });
});
