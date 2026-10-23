import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPublicDiscoveryPaths } from "@/features/feedback/server/discovery";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/server/db", async () => {
  const { drizzle } = await import("drizzle-orm/pg-proxy");
  return { db: drizzle(mocks.query) };
});

describe("public sitemap discovery", () => {
  beforeEach(() => mocks.query.mockReset());

  it("enforces both visibility predicates in SQL and selects only routing fields", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [["demo"]] });
    mocks.query.mockResolvedValueOnce({ rows: [["feedback-id", "demo"]] });

    expect(await getPublicDiscoveryPaths()).toEqual([
      "/p/demo", "/p/demo/roadmap", "/p/demo/feedback/feedback-id",
    ]);
    const [boards, items] = mocks.query.mock.calls;
    expect(boards[0]).toMatch(/select "slug" from "projects" where "projects"\."is_public" = \$1/);
    expect(boards[1]).toEqual([true]);
    expect(items[0]).toContain('"feedback"."project_id" = "projects"."id"');
    expect(items[0]).toContain('"projects"."is_public" = $1');
    expect(items[0]).toContain('"feedback"."is_public" = $2');
    expect(items[1]).toEqual([true, true]);
    for (const [sql] of mocks.query.mock.calls) {
      expect(sql).not.toMatch(/email|password|owner_id|author_id|description/);
    }
  });
});
