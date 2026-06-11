import { expect, test } from "@playwright/test";

test.describe("Logout", () => {
  test("logout clears cookies and redirects to /login", async ({ page, context }) => {
    await page.goto("/login");
    await page.getByLabel("اسم المستخدم / البريد الإلكتروني").fill("admin@yalla.app");
    await page.getByLabel("كلمة المرور").fill("Password1!");
    await page.getByRole("button", { name: "تسجيل الدخول" }).click();
    await page.waitForURL(/\/dashboard/);

    const cookiesBefore = await context.cookies();
    const sessionBefore = cookiesBefore.some((c) =>
      c.name.includes("yalla_admin") || c.name.includes("session"),
    );
    expect(sessionBefore).toBe(true);

    await page.getByRole("button", { name: "تسجيل الخروج" }).click();
    await page.waitForURL(/\/login/);

    const cookiesAfter = await context.cookies();
    const sessionAfter = cookiesAfter.some(
      (c) => c.value && c.value.length > 0 && (c.name.includes("yalla_admin") || c.name.includes("session")),
    );
    expect(sessionAfter).toBe(false);

    // Refresh the login page — should not bounce us back to a session.
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
  });
});
