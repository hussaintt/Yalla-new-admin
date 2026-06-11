import { expect, test } from "@playwright/test";

test.describe("KYC verification", () => {
  test("admin can log in and open the KYC queue without 404", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("اسم المستخدم / البريد الإلكتروني").fill("admin@yalla.app");
    await page.getByLabel("كلمة المرور").fill("Password1!");
    await page.getByRole("button", { name: "تسجيل الدخول" }).click();
    await page.waitForURL(/\/dashboard/);

    await page.goto("/verifications");
    await expect(page.getByRole("heading", { name: "طلبات KYC" })).toBeVisible();
    await expect(page).toHaveURL(/\/verifications/);
  });
});
