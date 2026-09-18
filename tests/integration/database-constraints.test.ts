import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestDatabase } from "../helpers/test-database";
import {
  feedback,
  projects,
  user,
  votes,
} from "../../src/server/db/schema";

const db = createTestDatabase();

type Fixture = {
  feedbackIds: string[];
  projectIds: string[];
  userIds: string[];
};

let fixture: Fixture;

/** 为每个数据库约束用例建立带唯一标识的最小关系图，清理时只删除本用例创建的数据。 */
function createFixture(): Fixture {
  return { feedbackIds: [], projectIds: [], userIds: [] };
}

async function createUserRecord(label: string) {
  const id = `test-${randomUUID()}`;
  fixture.userIds.push(id);
  await db.insert(user).values({
    email: `${label}-${id}@integration.invalid`,
    emailVerified: false,
    id,
    name: `Integration ${label}`,
  });
  return id;
}

async function createProjectRecord(userId: string, slug = `project-${randomUUID()}`) {
  const [project] = await db.insert(projects).values({
    description: "Integration-only project.",
    name: "Integration project",
    slug,
    userId,
  }).returning({ id: projects.id });
  if (!project) throw new Error("Project fixture insert returned no row.");
  fixture.projectIds.push(project.id);
  return project.id;
}

async function createFeedbackRecord(projectId: string, userId: string) {
  const [item] = await db.insert(feedback).values({
    description: "Integration feedback description.",
    projectId,
    title: "Integration feedback",
    userId,
  }).returning({ id: feedback.id });
  if (!item) throw new Error("Feedback fixture insert returned no row.");
  fixture.feedbackIds.push(item.id);
  return item.id;
}

/** 先按外键依赖删除投票与反馈，再移除本用例项目和用户；不触碰任何非测试记录。 */
async function cleanupFixture() {
  if (fixture.feedbackIds.length) {
    await db.delete(votes).where(eq(votes.feedbackId, fixture.feedbackIds[0]!));
    await db.delete(feedback).where(eq(feedback.projectId, fixture.projectIds[0]!));
  }
  if (fixture.projectIds.length) {
    await db.delete(projects).where(eq(projects.id, fixture.projectIds[0]!));
  }
  if (fixture.userIds.length) {
    await db.delete(user).where(eq(user.id, fixture.userIds[0]!));
    if (fixture.userIds[1]) await db.delete(user).where(eq(user.id, fixture.userIds[1]));
  }
}

describe.sequential("database uniqueness constraints", () => {
  beforeEach(() => {
    fixture = createFixture();
  });

  afterEach(async () => {
    await cleanupFixture();
  });

  it("enforces one project per owner and globally unique slugs", async () => {
    const ownerId = await createUserRecord("owner");
    const secondOwnerId = await createUserRecord("second-owner");
    await createProjectRecord(ownerId, `shared-${randomUUID()}`);

    await expect(db.insert(projects).values({
      name: "Second project",
      slug: `another-${randomUUID()}`,
      userId: ownerId,
    })).rejects.toThrow();

    await expect(db.insert(projects).values({
      name: "Slug collision",
      slug: (await db.select({ slug: projects.slug }).from(projects)
        .where(eq(projects.userId, ownerId)).limit(1))[0]!.slug,
      userId: secondOwnerId,
    })).rejects.toThrow();
  });

  it("enforces one vote per user and feedback pair", async () => {
    const ownerId = await createUserRecord("owner");
    const voterId = await createUserRecord("voter");
    const projectId = await createProjectRecord(ownerId);
    const feedbackId = await createFeedbackRecord(projectId, ownerId);

    await db.insert(votes).values({ feedbackId, userId: voterId });
    await expect(db.insert(votes).values({ feedbackId, userId: voterId }))
      .rejects.toThrow();

    const rows = await db.select().from(votes).where(and(
      eq(votes.feedbackId, feedbackId),
      eq(votes.userId, voterId),
    ));
    expect(rows).toHaveLength(1);
  });
});
