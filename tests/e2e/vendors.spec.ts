import { expect, test } from "@playwright/test";

test.describe("Vendors", () => {
  test("suspend action requires a reason and shows a success toast", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("اسم المستخدم / البريد الإلكتروني").fill("admin@yalla.app");
    await page.getByLabel("كلمة المرور").fill("Password1!");
    await page.getByRole("button", { name: "تسجيل الدخول" }).click();
    await page.waitForURL(/\/dashboard/);

    await page.goto("/vendors");
    await expect(page.getByRole("heading", { name: "البائعون" })).toBeVisible();

    // First row: click "إيقاف" → confirm dialog opens → submit without reason → blocked.
    const firstRow = page.locator("tbody tr").first();
    await firstRow.getByRole("button", { name: "إيقاف" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("سبب الإيقاف")).toBeVisible();

    // Try to confirm without a reason — submit stays disabled.
    await expect(dialog.getByRole("button", { name: "إيقاف" })).toBeDisabled();

    // Provide a reason and confirm.
    await dialog.getByLabel("سبب الإيقاف").fill("اختبار الإيقاف من Playwright");
    await dialog.getByRole("button", { name: "إيقاف" }).click();

    await expect(page.getByText("تم إيقاف البائع")).toBeVisible();
  });
});
