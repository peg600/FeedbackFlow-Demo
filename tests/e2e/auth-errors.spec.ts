import { expect, test } from "@playwright/test";

test("login uses owned error messages instead of upstream details", async ({ page }) => {
  await page.route("**/api/auth/sign-in/email", (route) => route.fulfill({
    status: 401,
    contentType: "application/json",
    body: JSON.stringify({
      code: "INVALID_EMAIL_OR_PASSWORD",
      message: "PRIVATE_DATABASE_DETAILS",
    }),
  }));

  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("test@example.com");
  await page.getByLabel("Password", { exact: true }).fill("Test-only-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page.getByRole("form", { name: "Welcome back" }).getByRole("alert")).toHaveText("Invalid email or password");
  await expect(page.getByText("PRIVATE_DATABASE_DETAILS")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
});

test("login presents an actionable rate limit message", async ({ page }) => {
  await page.route("**/api/auth/sign-in/email", (route) => route.fulfill({
    status: 429,
    contentType: "application/json",
    body: JSON.stringify({ code: "TOO_MANY_REQUESTS", message: "PRIVATE_RATE_LIMIT_DETAILS" }),
  }));

  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("test@example.com");
  await page.getByLabel("Password", { exact: true }).fill("Test-only-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page.getByRole("form", { name: "Welcome back" }).getByRole("alert")).toHaveText("Too many attempts. Please wait before trying again.");
  await expect(page.getByText("PRIVATE_RATE_LIMIT_DETAILS")).toHaveCount(0);
});
