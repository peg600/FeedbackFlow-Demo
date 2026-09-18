import { beforeEach, describe, expect, it, vi } from "vitest";

import { createProjectAction } from "@/features/projects/actions/create-project";
import { businessError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  executeProjectCreation: vi.fn(),
  redirect: vi.fn((path: string) => {
    const error = new Error("NEXT_REDIRECT");
    Object.assign(error, { digest: `NEXT_REDIRECT;replace;${path};307;` });
    throw error;
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

const input = {
  description: "A public feedback board.",
  name: "Acme Studio",
  slug: "acme-studio",
};

describe("createProjectAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses native flattened validation errors", async () => {
    const result = await createProjectAction({ ...input, slug: "not valid" });

    expect(result.validationErrors?.fieldErrors.slug).toEqual([
      "Use lowercase letters, numbers, and single hyphens only.",
    ]);
    expect(mocks.executeProjectCreation).not.toHaveBeenCalled();
  });

  it("revalidates protected routes before redirecting after creation", async () => {
    mocks.executeProjectCreation.mockResolvedValue({
      project: { id: "project-1", slug: "acme-studio" },
    });

    await expect(createProjectAction(input)).rejects.toMatchObject({
      digest: "NEXT_REDIRECT;replace;/dashboard;307;",
    });

    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(1, "/dashboard");
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(2, "/onboarding");
    expect(mocks.executeProjectCreation).toHaveBeenCalledWith(
      input,
      expect.objectContaining({
        findProjectBySlug: expect.any(Function),
        findProjectByUser: expect.any(Function),
        getSessionUser: expect.any(Function),
        insertProject: expect.any(Function),
      }),
    );
  });

  it("preserves the login redirect for an expired session", async () => {
    mocks.executeProjectCreation.mockRejectedValue(
      businessError("UNAUTHENTICATED"),
    );

    await expect(createProjectAction(input)).rejects.toMatchObject({
      digest: "NEXT_REDIRECT;replace;/login?returnTo=/onboarding;307;",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
