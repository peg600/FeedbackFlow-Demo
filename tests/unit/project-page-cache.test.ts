import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { revalidatePublicProjectPages } from "@/features/projects/server/cache";

describe("revalidatePublicProjectPages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refreshes the public subtree after project-level changes", () => {
    revalidatePublicProjectPages("old-slug");

    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/p/old-slug",
      "layout",
    );
    expect(mocks.revalidatePath).toHaveBeenCalledTimes(1);
  });

  it("refreshes only the affected detail for feedback-level changes", () => {
    revalidatePublicProjectPages("acme", "feedback-1");

    expect(mocks.revalidatePath).toHaveBeenCalledWith("/p/acme");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/p/acme/roadmap");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/p/acme/feedback/feedback-1",
    );
    expect(mocks.revalidatePath).not.toHaveBeenCalledWith(
      "/p/acme",
      "layout",
    );
  });
});
