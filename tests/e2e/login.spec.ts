import { expect, test } from "@playwright/test";

test.describe("Login", () => {
  test("rejects invalid credentials and shows Arabic error", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "تسجيل دخول الإدارة" })).toBeVisible();

    await page.getByLabel("اسم المستخدم / البريد الإلكتروني").fill("invalid@example.com");
    await page.getByLabel("كلمة المرور").fill("wrong-password-1234");

    const responsePromise = page.waitForResponse(
      (response) => response.url().endsWith("/api/auth/login") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "تسجيل الدخول" }).click();
    const response = await responsePromise;

    expect(response.status()).toBe(401);
    await expect(page.getByText("بيانات الدخول غير صحيحة")).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
});
