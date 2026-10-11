import { expect, test } from "@playwright/test";

const localeCookie = "feedbackflow-locale";

test("language preference preserves URL and form draft, survives reload, and follows internal links", async ({ page, context }) => {
  await page.goto("/login?returnTo=%2Fdashboard%3Fstatus%3Dplanned#form");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill("draft@example.com");
  const originalUrl = page.url();

  await page.getByRole("button", { name: "中文", exact: true }).click();
  await expect(page.getByRole("heading", { name: "欢迎回来" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.getByLabel("邮箱", { exact: true })).toHaveValue("draft@example.com");
  expect(page.url()).toBe(originalUrl);
  await expect(page.getByRole("button", { name: "中文", exact: true })).toHaveAttribute("aria-pressed", "true");
  const cookie = (await context.cookies()).find((value) => value.name === localeCookie);
  expect(cookie).toMatchObject({ value: "zh", path: "/", sameSite: "Lax" });
  expect(cookie!.expires).toBeGreaterThan(Date.now() / 1000 + 360 * 24 * 60 * 60);

  await page.reload();
  await expect(page.getByRole("heading", { name: "欢迎回来" })).toBeVisible();
  await page.getByRole("button", { name: "登录", exact: true }).click();
  const email = page.getByLabel("邮箱", { exact: true });
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAttribute("aria-describedby", "email-error");
  await expect(page.locator("#email-error")).toContainText("邮箱");

  await page.getByRole("link", { name: "注册", exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.getByLabel("邮箱", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
});

test("unsupported language cookies fall back to English", async ({ page, context }) => {
  await context.addCookies([{ name: localeCookie, value: "fr", url: "http://127.0.0.1:3100" }]);
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByRole("button", { name: "English", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("Chinese top language controls and public pages fit narrow and breakpoint viewports", async ({ page, context }) => {
  await context.addCookies([{ name: localeCookie, value: "zh", url: "http://127.0.0.1:3100" }]);
  for (const viewport of [
    { width: 360, height: 480 },
    { width: 390, height: 844 },
    { width: 767, height: 480 },
    { width: 768, height: 844 },
    { width: 1023, height: 480 },
    { width: 1024, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const path of ["/", "/login", "/profile"]) {
      await page.goto(path);
      const switcher = page.getByRole("group", { name: "Language / 语言" });
      await expect(switcher).toBeVisible();
      await expect(switcher.getByRole("button", { name: "中文", exact: true })).toHaveAttribute("aria-pressed", "true");
      const box = await switcher.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      expect(box!.y).toBeLessThan(viewport.height / 2);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${path} at ${viewport.width}px`)
        .toBe(true);
    }
  }
});
