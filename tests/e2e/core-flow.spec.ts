import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";

import { createTestDatabase } from "../helpers/test-database";
import { feedback, projects, user } from "../../src/server/db/schema";

const db = createTestDatabase();
const runId = randomUUID().slice(0, 8);
const owner = {
  email: `owner-${runId}@e2e.invalid`,
  name: "E2E Owner",
  password: "E2E-owner-password-2026!",
};
const visitor = {
  email: `visitor-${runId}@e2e.invalid`,
  name: "E2E Visitor",
  password: "E2E-visitor-password-2026!",
};
const initialSlug = `e2e-${runId}`;
const updatedSlug = `e2e-updated-${runId}`;
const feedbackTitle = `E2E feedback ${runId}`;

/** 通过真实注册界面建立测试账户，覆盖浏览器 Cookie、Better Auth 与首次登录跳转，而不伪造会话。 */
async function register(page: Page, account: typeof owner) {
  await page.goto("/register");
  await page.getByLabel("Name", { exact: true }).fill(account.name);
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
}

/** E2E 完成后仅通过本轮邮箱找到并删除项目再删除用户，不清理任何未知账号或公共演示数据。 */
async function cleanupE2ERecords() {
  const users = await db.select({ id: user.id }).from(user)
    .where(inArray(user.email, [owner.email, visitor.email]));
  const userIds = users.map((item) => item.id);
  if (!userIds.length) return;
  const ownedProjects = await db.select({ id: projects.id }).from(projects)
    .where(inArray(projects.userId, userIds));
  if (ownedProjects.length) {
    await db.delete(projects).where(inArray(
      projects.id,
      ownedProjects.map((item) => item.id),
    ));
  }
  await db.delete(user).where(inArray(user.id, userIds));
}

test.afterAll(async () => {
  await cleanupE2ERecords();
});

test("owner can create a workspace, submit and vote on feedback, update its roadmap status, and save settings", async ({ browser, page }) => {
  await register(page, owner);
  await page.getByLabel("Project name", { exact: true }).fill("E2E workspace");
  await page.getByLabel("Public URL slug", { exact: true }).fill(initialSlug);
  await page.getByLabel("Project description", { exact: true })
    .fill("A test-only workspace used for the complete browser flow.");
  await page.getByRole("button", { name: "Create workspace", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto(`/p/${initialSlug}`);
  await page.getByLabel("Title", { exact: true }).fill(feedbackTitle);
  await page.getByLabel("Details", { exact: true })
    .fill("This feedback is created by the core E2E flow.");
  await page.getByRole("button", { name: "Submit feedback", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/p/${initialSlug}/feedback/[0-9a-f-]{36}$`));
  const feedbackId = page.url().split("/").at(-1)!;

  await page.getByRole("button", { name: "Vote for this", exact: true }).click();
  await expect(page.getByRole("button", { name: "Voted", exact: true })).toBeVisible();

  await page.goto("/dashboard");
  const statusRequest = page.waitForRequest((request) =>
    request.method() === "POST" && Boolean(request.headers()["next-action"]),
  );
  await page.locator(`#status-${feedbackId}`).click();
  await page.getByRole("option", { name: "Planned", exact: true }).click();
  const ownerStatusRequest = await statusRequest;
  await expect(page.locator(`#status-${feedbackId}`)).toHaveText("Planned");

  await page.goto(`/p/${initialSlug}/roadmap`);
  await expect(page.getByRole("heading", { name: "Planned", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: feedbackTitle, exact: true })).toBeVisible();

  await page.goto("/dashboard/settings");
  await page.getByLabel("Project name", { exact: true }).fill("Updated E2E workspace");
  await page.getByLabel("Public URL slug", { exact: true }).fill(updatedSlug);
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("Project settings saved.", { exact: true })).toBeVisible();
  await page.goto(`/p/${updatedSlug}`);
  await expect(page.getByRole("link", { name: feedbackTitle, exact: true })).toBeVisible();

  const visitorContext = await browser.newContext();
  const visitorPage = await visitorContext.newPage();
  try {
    await register(visitorPage, visitor);
    await visitorPage.getByLabel("Project name", { exact: true }).fill("Visitor workspace");
    await visitorPage.getByLabel("Public URL slug", { exact: true }).fill(`visitor-${runId}`);
    await visitorPage.getByRole("button", { name: "Create workspace", exact: true }).click();
    await expect(visitorPage).toHaveURL(/\/dashboard$/);
    await visitorPage.goto(`/p/${updatedSlug}`);
    await expect(visitorPage.getByText("No feedback yet")).toHaveCount(0);
    await expect(visitorPage.locator(`#status-${feedbackId}`)).toHaveCount(0);

    const originalBody = ownerStatusRequest.postData() ?? "";
    expect(originalBody).toContain("planned");
    const replayHeaders = ownerStatusRequest.headers();
    const replay = await visitorPage.request.fetch("/dashboard", {
      data: originalBody.replace("planned", "completed"),
      headers: {
        accept: replayHeaders.accept ?? "text/x-component",
        "content-type": replayHeaders["content-type"] ?? "text/plain;charset=UTF-8",
        "next-action": replayHeaders["next-action"]!,
        origin: "http://127.0.0.1:3100",
      },
      method: "POST",
    });
    expect(replay.ok()).toBe(true);
    expect(await replay.text()).toContain("FEEDBACK_NOT_AVAILABLE");
    const [unchanged] = await db.select({ status: feedback.status }).from(feedback)
      .where(eq(feedback.id, feedbackId));
    expect(unchanged?.status).toBe("planned");
  } finally {
    await visitorContext.close();
  }
});
