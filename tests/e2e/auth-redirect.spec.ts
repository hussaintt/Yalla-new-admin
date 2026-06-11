import { expect, test } from "@playwright/test";

test("redirects unauthenticated admins to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("heading", { name: "تسجيل دخول الإدارة" }),
  ).toBeVisible();
});

test.describe("admin route coverage", () => {
  for (const route of ["/reports", "/payouts"]) {
    test(`${route} exists and redirects unauthenticated admins`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
      await expect(
        page.getByRole("heading", { name: "تسجيل دخول الإدارة" }),
      ).toBeVisible();
    });
  }
});
