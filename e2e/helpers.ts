import { expect, type Page } from "@playwright/test";

export const PASSWORD = "password-123";

export async function signUp(page: Page, name = "أمين") {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.local`;
  await page.goto("/login");
  await page.getByRole("button", { name: "إنشاء حساب" }).last().click();
  await page.fill("#name", name);
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: "إنشاء حساب" }).first().click();
  await page.waitForURL("**/today");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(name);
  return email;
}

export async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await page.waitForURL("**/today");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

export async function openCapture(page: Page, type: string) {
  await page.getByRole("button", { name: "إضافة" }).first().click();
  const dialog = page.getByRole("dialog", { name: "إضافة سريعة" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("tab", { name: type }).click();
  return dialog;
}

export function isMobile(page: Page) {
  return (page.viewportSize()?.width ?? 1280) < 1024;
}

export async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}
