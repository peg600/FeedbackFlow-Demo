import { expect, test } from "@playwright/test";

test("shows recovery links for an unknown route", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: /this page took a wrong turn/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /go to homepage/i })).toHaveAttribute(
    "href",
    "/",
  );
  await expect(page.getByRole("link", { name: /open dashboard/i })).toHaveAttribute(
    "href",
    "/dashboard",
  );
});
