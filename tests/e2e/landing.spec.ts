import { expect, test } from "@playwright/test";

test("loads the landing page", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /to get started, edit the page\.tsx file/i,
    }),
  ).toBeVisible();
});
