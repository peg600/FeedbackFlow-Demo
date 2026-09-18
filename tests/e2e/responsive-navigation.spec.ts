import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";

import { createTestDatabase } from "../helpers/test-database";
import { projects, user } from "../../src/server/db/schema";

const db = createTestDatabase();
const fixtureId = randomUUID();
const fixtureUserId = `test-mobile-${fixtureId}`;
const fixtureSlug = `mobile-${fixtureId.slice(0, 8)}`;
let fixtureProjectId: string | undefined;

/** 创建一个无会话依赖的公开看板，用于检查窄屏导航而不共享其他 E2E 用例的状态。 */
test.beforeAll(async () => {
  await db.insert(user).values({
    email: `${fixtureUserId}@e2e.invalid`,
    emailVerified: false,
    id: fixtureUserId,
    name: "Mobile navigation fixture",
  });
  const [project] = await db.insert(projects).values({
    description: "Public board for mobile navigation verification.",
    name: "Mobile navigation fixture",
    slug: fixtureSlug,
    userId: fixtureUserId,
  }).returning({ id: projects.id });
  fixtureProjectId = project?.id;
});

/** 仅删除本文件生成的固定 user/project，项目删除会级联其可能创建的反馈而不影响其他测试。 */
test.afterAll(async () => {
  if (fixtureProjectId) await db.delete(projects).where(eq(projects.id, fixtureProjectId));
  await db.delete(user).where(eq(user.id, fixtureUserId));
});

test("mobile public navigation exposes both feedback and roadmap routes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/p/${fixtureSlug}`);

  const navigation = page.getByLabel("Public project mobile navigation");
  await expect(navigation.getByRole("link", { name: "Feedback", exact: true })).toBeVisible();
  await navigation.getByRole("link", { name: "Roadmap", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/p/${fixtureSlug}/roadmap$`));
  await expect(navigation.getByRole("link", { name: "Roadmap", exact: true }))
    .toHaveAttribute("aria-current", "page");
});

test("marketing, profile, and roadmap layouts avoid horizontal overflow at responsive boundaries", async ({ page }) => {
  const viewports = [
    { height: 480, width: 390 },
    { height: 844, width: 767 },
    { height: 844, width: 768 },
    { height: 844, width: 1023 },
    { height: 844, width: 1024 },
    { height: 844, width: 1279 },
    { height: 844, width: 1280 },
  ];
  const routes = ["/", "/profile", `/p/${fixtureSlug}/roadmap`];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await page.goto(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true);
    }
  }
});
