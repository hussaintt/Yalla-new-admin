import { expect, test } from "@playwright/test";

test.describe("Settings", () => {
  test("maintenance page opens and the save dialog requires a reason when activating", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("اسم المستخدم / البريد الإلكتروني").fill("admin@yalla.app");
    await page.getByLabel("كلمة المرور").fill("Password1!");
    await page.getByRole("button", { name: "تسجيل الدخول" }).click();
    await page.waitForURL(/\/dashboard/);

    await page.goto("/settings/maintenance");
    await expect(page.getByRole("heading", { name: "وضع الصيانة" })).toBeVisible();

    // Toggle maintenance on, save → reason dialog appears, submit disabled until reason given.
    const toggle = page.getByRole("switch").first();
    await toggle.click();
    await page.getByRole("button", { name: /حفظ|تفعيل/ }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("سبب تفعيل وضع الصيانة")).toBeVisible();

    await expect(dialog.getByRole("button", { name: /تفعيل الصيانة|حفظ/ })).toBeDisabled();
    await dialog.getByLabel("سبب تفعيل وضع الصيانة").fill("اختبار Playwright");
    await dialog.getByRole("button", { name: /تفعيل الصيانة|حفظ/ }).click();
  });
});
