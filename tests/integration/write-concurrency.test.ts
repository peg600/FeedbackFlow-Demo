import { createHmac, randomUUID } from "node:crypto";

import { count, eq, inArray } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestDatabase } from "../helpers/test-database";
import {
  feedback,
  projects,
  rateLimitBuckets,
  user,
} from "../../src/server/db/schema";
import { createRateLimitStore } from "../../src/server/rate-limit/store";
import { insertPublicFeedback } from "../../src/features/feedback/server/write";

const db = createTestDatabase();
const rateLimitSecret = "integration-test-secret-only";

type Fixture = {
  projectId?: string;
  rateLimitKeys: string[];
  userIds: string[];
};

let fixture: Fixture;

/** 为并发用例生成隔离项目、用户和限流 key，保证重试或并行测试不会命中已有数据。 */
async function createFixture() {
  fixture = { rateLimitKeys: [], userIds: [] };
  const ownerId = `test-owner-${randomUUID()}`;
  fixture.userIds.push(ownerId);
  await db.insert(user).values({
    email: `${ownerId}@integration.invalid`,
    emailVerified: false,
    id: ownerId,
    name: "Integration owner",
  });
  const [project] = await db.insert(projects).values({
    description: "Concurrent quota fixture.",
    name: "Concurrent fixture",
    slug: `quota-${randomUUID()}`,
    userId: ownerId,
  }).returning({ id: projects.id, slug: projects.slug });
  if (!project) throw new Error("Project fixture insert returned no row.");
  fixture.projectId = project.id;
  return { ownerId, project };
}

/** 只删除本用例的项目级联数据、测试用户和由相同 HMAC 算出的精确限流桶。 */
async function cleanupFixture() {
  if (fixture.rateLimitKeys.length) {
    const hashes = fixture.rateLimitKeys.map((key) => createHmac("sha256", rateLimitSecret)
      .update(key).digest("hex"));
    await db.delete(rateLimitBuckets).where(inArray(rateLimitBuckets.key, hashes));
  }
  if (fixture.projectId) await db.delete(projects).where(eq(projects.id, fixture.projectId));
  if (fixture.userIds.length) await db.delete(user).where(inArray(user.id, fixture.userIds));
}

describe.sequential("database-backed write protections", () => {
  beforeEach(async () => {
    await createFixture();
  });

  afterEach(async () => {
    await cleanupFixture();
  });

  it("allows only one concurrent feedback write once a public project reaches 49 items", async () => {
    const ownerId = fixture.userIds[0]!;
    const projectId = fixture.projectId!;
    const project = (await db.select({ slug: projects.slug }).from(projects)
      .where(eq(projects.id, projectId)).limit(1))[0]!;

    await db.insert(feedback).values(Array.from({ length: 49 }, (_, index) => ({
      description: `Seeded description ${index}`,
      projectId,
      title: `Seeded feedback ${index}`,
      userId: ownerId,
    })));

    const results = await Promise.all(Array.from({ length: 4 }, (_, index) =>
      insertPublicFeedback(db, {
        description: `Concurrent description ${index}`,
        projectId,
        slug: project.slug,
        title: `Concurrent feedback ${index}`,
        userId: ownerId,
      }),
    ));
    expect(results.filter((result) => typeof result === "object")).toHaveLength(1);
    expect(results.filter((result) => result === "feedback_limit")).toHaveLength(3);

    const [total] = await db.select({ value: count() }).from(feedback)
      .where(eq(feedback.projectId, projectId));
    expect(Number(total?.value)).toBe(50);
  });

  it("consumes an atomic fixed-window rate limit under concurrent requests", async () => {
    const store = createRateLimitStore(db, rateLimitSecret);
    const key = `integration:${randomUUID()}`;
    fixture.rateLimitKeys.push(key);

    const decisions = await Promise.all(Array.from({ length: 7 }, () =>
      store.consume(key, { max: 3, window: 60 }),
    ));
    expect(decisions.filter((decision) => decision.allowed)).toHaveLength(3);
    expect(decisions.filter((decision) => !decision.allowed)).toHaveLength(4);
    expect(decisions.filter((decision) => !decision.allowed)
      .every((decision) => Number.isInteger(decision.retryAfter) && decision.retryAfter! >= 1)).toBe(true);
  });
});
