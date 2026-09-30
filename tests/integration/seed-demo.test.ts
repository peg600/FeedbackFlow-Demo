import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { createTestDatabase, readTestDatabaseEnvironment } from "../helpers/test-database";
import { feedback, projects, user } from "../../src/server/db/schema";
import { seedDemo } from "../../scripts/seed-demo";

const database = createTestDatabase();
const runId = randomUUID();
const userEmail = `seed-${runId}@integration.invalid`;
const userPassword = "Seed-integration-password-2026!";
const projectId = randomUUID();
const feedbackIds = Array.from({ length: 3 }, () => randomUUID());

const demo = {
  feedback: [
    { description: "Seed fixture description one.", id: feedbackIds[0]!, status: "planned" as const, title: "Seed fixture planned" },
    { description: "Seed fixture description two.", id: feedbackIds[1]!, status: "in_progress" as const, title: "Seed fixture progress" },
    { description: "Seed fixture description three.", id: feedbackIds[2]!, status: "completed" as const, title: "Seed fixture complete" },
  ],
  name: "Seed integration fixture",
  projectDescription: "Idempotent seed fixture.",
  projectId,
  slug: `seed-${runId.slice(0, 8)}`,
};

/** 只删除本用例动态生成的项目和用户，固定模板的默认 /p/demo 数据不会被测试读取或修改。 */
async function cleanupSeedFixture() {
  await database.delete(projects).where(eq(projects.id, projectId));
  await database.delete(user).where(eq(user.email, userEmail));
}

afterEach(async () => {
  await cleanupSeedFixture();
});

afterAll(async () => { await database.$client.end(); });

describe.sequential("demo seed", () => {
  it("is idempotent and leaves existing seed records unchanged", async () => {
    const testEnvironment = readTestDatabaseEnvironment();
    const secret = process.env.TEST_BETTER_AUTH_SECRET;
    if (!secret) throw new Error("TEST_BETTER_AUTH_SECRET is required for seed integration tests.");
    const environment = {
      baseURL: "http://127.0.0.1:3100",
      databaseUrl: testEnvironment.databaseUrlUnpooled,
      email: userEmail,
      password: userPassword,
      secret,
    };

    await seedDemo(environment, demo);
    const firstFeedback = await database.select({ id: feedback.id, title: feedback.title })
      .from(feedback).where(eq(feedback.projectId, projectId));
    expect(firstFeedback).toHaveLength(3);

    await database.update(feedback).set({ title: "Owner edited title" })
      .where(eq(feedback.id, feedbackIds[0]!));
    await database.update(projects).set({ name: "Owner edited project" })
      .where(eq(projects.id, projectId));

    await seedDemo(environment, demo);
    const [project] = await database.select({ id: projects.id, name: projects.name, slug: projects.slug, userId: projects.userId })
      .from(projects).where(eq(projects.id, projectId));
    const secondFeedback = await database.select({ id: feedback.id, title: feedback.title })
      .from(feedback).where(eq(feedback.projectId, projectId));
    expect(project).toMatchObject({ id: projectId, name: "Owner edited project", slug: demo.slug });
    expect(secondFeedback).toHaveLength(3);
    expect(secondFeedback.map((item) => item.id).sort()).toEqual([...feedbackIds].sort());
    expect(secondFeedback.find((item) => item.id === feedbackIds[0])?.title).toBe("Owner edited title");

    // 旧版 Demo 已有四条时，重跑仅校验固定记录，不应删除历史数据或因新上限失败。
    await database.insert(feedback).values({
      description: "Legacy demo feedback kept after the quota change.",
      id: randomUUID(),
      isPublic: true,
      projectId,
      status: "under_review",
      title: "Legacy fourth feedback",
      userId: project!.userId,
    });
    await seedDemo(environment, demo);
    const legacyFeedback = await database.select({ id: feedback.id })
      .from(feedback).where(eq(feedback.projectId, projectId));
    expect(legacyFeedback).toHaveLength(4);
  });
});
