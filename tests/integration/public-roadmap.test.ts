import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db", async () => {
  const { createTestDatabase } = await import("../helpers/test-database");
  return { db: createTestDatabase() };
});

import { db } from "@/server/db";
import { feedback, projects, user, votes } from "@/server/db/schema";
import { getPublicRoadmap } from "@/features/feedback/server/roadmap";

const ownerId = `roadmap-${randomUUID()}`;
const projectId = randomUUID();
const slug = `roadmap-${randomUUID()}`;
const statuses = ["planned", "in_progress", "completed"] as const;

afterAll(async () => {
  try {
    await db.delete(projects).where(eq(projects.id, projectId));
    await db.delete(user).where(eq(user.id, ownerId));
  } finally {
    await db.$client.end();
  }
});

describe("public roadmap database query", () => {
  it("limits each lane, counts all visible items, and orders votes, recency, then ID", async () => {
    await db.insert(user).values({
      id: ownerId, name: "Roadmap fixture", email: `${ownerId}@integration.invalid`,
    });
    await db.insert(projects).values({ id: projectId, userId: ownerId, slug, name: "Roadmap fixture" });

    const idsByStatus = statuses.map(() => Array.from({ length: 6 }, () => randomUUID()).sort());
    for (const [laneIndex, status] of statuses.entries()) {
      const ids = idsByStatus[laneIndex]!;
      await db.insert(feedback).values(ids.map((id, index) => ({
        id, projectId, userId: ownerId, status, title: `Visible ${status} ${index}`,
        updatedAt: new Date(index === 4 ? "2026-02-01" : "2026-01-01"),
      })));
      await db.insert(votes).values({ userId: ownerId, feedbackId: ids[5]! });
      await db.insert(feedback).values({
        projectId, userId: ownerId, status, title: `Hidden ${status}`, isPublic: false,
      });
    }
    await db.insert(feedback).values({
      projectId, userId: ownerId, status: "under_review", title: "Not on roadmap",
    });

    const result = await getPublicRoadmap(slug);
    expect(result?.lanes).toHaveLength(3);
    for (const [laneIndex, lane] of result!.lanes.entries()) {
      const ids = idsByStatus[laneIndex]!;
      expect(lane.status).toBe(statuses[laneIndex]);
      expect(lane.total).toBe(6);
      expect(lane.items.map((item) => item.id)).toEqual([ids[5], ids[4], ids[0], ids[1]]);
      expect(lane.items.map((item) => item.voteCount)).toEqual([1, 0, 0, 0]);
    }

    await db.update(projects).set({ isPublic: false }).where(eq(projects.id, projectId));
    expect(await getPublicRoadmap(slug)).toBeNull();
  });
});
