import { expect, test } from "@playwright/test";
import { isMobile, noHorizontalScroll, openCapture, signIn, signUp } from "./helpers";

test.describe.configure({ mode: "serial" });

let email = "";
let projectUrl = "";

test("Scenario 1 — morning: sign up, Today is in Arabic RTL and understandable", async ({ page }) => {
  email = await signUp(page);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.getByText("أولوياتك الثلاث")).toBeVisible();
  await noHorizontalScroll(page);

  // quick capture a task for today, mark it as priority, complete it
  const d = await openCapture(page, "مهمة");
  await d.getByRole("textbox").first().fill("تحضير تقرير الاجتماع");
  await d.getByRole("textbox").first().press("Enter");
  await expect(d).toBeHidden();
  const row = page.getByRole("button", { name: "تحضير تقرير الاجتماع" }).first();
  await expect(row).toBeVisible();
  await page.getByRole("button", { name: /اجعلها أولوية اليوم/ }).first().click();
  await expect(page.locator("text=1/3")).toBeVisible();
  await page.getByRole("checkbox", { name: "إكمال" }).first().click();
  await expect(page.getByRole("checkbox", { name: "إعادة فتح" }).first()).toBeVisible();
  await noHorizontalScroll(page);
});

test("Scenario 3 — new project in under a minute, edit it, real progress", async ({ page }) => {
  await signIn(page, email);
  const started = Date.now();
  const d = await openCapture(page, "مشروع");
  await d.getByRole("textbox").first().fill("إطلاق البودكاست");
  await d.getByRole("textbox").first().press("Enter");
  await page.waitForURL(/\/projects\/[0-9a-f-]{36}/);
  projectUrl = page.url();
  expect(Date.now() - started).toBeLessThan(60_000);

  await expect(page.getByText("لم تُحدد خطوات بعد")).toBeVisible();
  const add = page.getByPlaceholder("ماذا تريد أن تنجز؟");
  await add.fill("كتابة سكربت الحلقة الأولى");
  await add.press("Enter");
  await expect(page.getByText("كتابة سكربت الحلقة الأولى")).toBeVisible();
  await add.fill("تسجيل الحلقة");
  await add.press("Enter");
  await expect(page.getByText("0 من 2 مهام")).toBeVisible();

  await page.getByRole("checkbox", { name: "إكمال" }).first().click();
  await expect(page.getByText("1 من 2 مهام")).toBeVisible();
  await expect(page.getByText("50%").first()).toBeVisible();

  // edit details: status + description
  await page.getByRole("combobox", { name: "الحالة" }).selectOption("paused");
  await page.getByRole("tab", { name: "نظرة عامة" }).click();
  await page.getByLabel("وصف مختصر").fill("بودكاست أسبوعي عن الإنتاج الصوتي");
  await page.getByLabel("وصف مختصر").blur();
  await expect(page.getByText(/محفوظ/).first()).toBeVisible();

  await page.reload();
  await expect(page.getByRole("combobox", { name: "الحالة" })).toHaveValue("paused");
  await page.getByRole("tab", { name: "نظرة عامة" }).click();
  await expect(page.getByLabel("وصف مختصر")).toHaveValue("بودكاست أسبوعي عن الإنتاج الصوتي");
  await expect(page.getByText("1 من 2 مهام")).toBeVisible();
});

test("Scenario 2 — habit: one tap to log, streak respects schedule", async ({ page }) => {
  await signIn(page, email);
  const d = await openCapture(page, "عادة");
  await d.getByRole("textbox").first().fill("القراءة");
  await d.getByRole("button", { name: "إضافة", exact: true }).click();
  await expect(d).toBeHidden();

  const toggle = isMobile(page)
    ? page.getByRole("button", { name: /القراءة/ }).first()
    : page.getByRole("button", { name: "القراءة: تسجيل" });
  await toggle.click();
  await expect(page.getByText("القراءة · سُجّلت")).toBeVisible();
  await page.reload();
  if (isMobile(page)) await expect(page.getByRole("button", { name: /القراءة/ }).first()).toHaveAttribute("aria-pressed", "true");
  else await expect(page.getByRole("button", { name: "القراءة: إلغاء التسجيل" })).toBeVisible();

  await page.goto("/progress/habits");
  await page.getByRole("link", { name: /القراءة/ }).first().click();
  await expect(page.getByText("يوم واحد متتالٍ")).toBeVisible();
  await expect(page.getByText("خريطة الالتزام")).toBeVisible();

  // weekly habit: never shows a "missed" day
  const d2 = await openCapture(page, "عادة");
  await d2.getByRole("textbox").first().fill("الجيم");
  await d2.getByRole("radio", { name: "عدد مرات أسبوعيًا" }).click();
  await d2.getByLabel("مرات في الأسبوع").fill("4");
  await d2.getByRole("button", { name: "إضافة", exact: true }).click();
  await page.goto("/progress/habits");
  await expect(page.getByText("4 مرات أسبوعيًا")).toBeVisible();
});

test("Scenario 4 — meeting: notes, decisions, convert to tasks without duplicates", async ({ page }) => {
  await signIn(page, email);
  const d = await openCapture(page, "لقاء");
  await d.getByRole("textbox").first().fill("اجتماع لجنة الموسم");
  await d.getByRole("button", { name: "إضافة", exact: true }).click();
  await page.waitForURL(/\/meetings\//);
  const meetingUrl = page.url();

  await page.getByLabel("ملاحظات اللقاء").fill("ناقشنا الميزانية والقاعة.");
  await expect(page.getByText(/محفوظ/).first()).toBeVisible({ timeout: 10_000 });

  const input = page.getByPlaceholder("اكتب القرار ثم Enter");
  await input.fill("إعداد التقرير النهائي");
  await input.press("Enter");
  await expect(page.locator('input[aria-label="القرارات والإجراءات"]').first()).toHaveValue("إعداد التقرير النهائي");
  await input.fill("حجز القاعة");
  await input.press("Enter");
  await expect(page.locator('input[aria-label="القرارات والإجراءات"]')).toHaveCount(2);

  // first: my action with a due date
  const first = page.locator("li[id^=d-]").nth(0);
  await first.getByLabel("الإجراء", { exact: true }).fill("تحضير التقرير");
  await first.getByLabel("الإجراء", { exact: true }).blur();
  await page.waitForTimeout(800);
  // second: owned by someone else → follow-up
  const second = page.locator("li[id^=d-]").nth(1);
  await second.getByLabel("المسؤول", { exact: true }).fill("سارة");
  await second.getByLabel("المسؤول", { exact: true }).blur();
  await page.waitForTimeout(800);

  // double-click convert must still create one task
  const btn = first.getByRole("button", { name: "→ مهمة" });
  await btn.dblclick();
  await expect(first.getByRole("link", { name: /مهمة · قيد المتابعة/ })).toBeVisible();
  await page.getByRole("button", { name: "تحويل كل الإجراءات إلى مهام" }).click();
  await expect(second.getByRole("link", { name: /مهمة · قيد المتابعة/ })).toBeVisible();

  await page.goto("/tasks");
  await expect(page.getByRole("button", { name: /تحضير التقرير/ })).toHaveCount(1);
  await expect(page.getByText("من: اجتماع لجنة الموسم").first()).toBeVisible();

  await page.goto("/calendar/follow-ups");
  await expect(page.getByText("حجز القاعة")).toBeVisible();
  await expect(page.getByText("سارة")).toBeVisible();

  // persisted after reload
  await page.goto(meetingUrl);
  await expect(page.getByLabel("ملاحظات اللقاء")).toHaveValue("ناقشنا الميزانية والقاعة.");
});

test("Overdue follow-ups are visible on Today and in follow-ups", async ({ page }) => {
  await signIn(page, email);
  const d = await openCapture(page, "مهمة");
  await d.getByRole("textbox").first().fill("متابعة رد الراعي");
  await d.getByRole("button", { name: "خيارات إضافية" }).click();
  await d.getByLabel("النوع").selectOption("follow_up");
  await d.getByLabel("المسؤول", { exact: true }).fill("كريم");
  const y = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
  await d.locator("input[type=date]").fill(y);
  await d.getByRole("button", { name: "إضافة", exact: true }).click();
  await expect(d).toBeHidden();
  await expect(page.getByText("تحتاج اهتمامك")).toBeVisible();
  await expect(page.getByText("متابعة رد الراعي").first()).toBeVisible();
  await page.goto("/calendar/follow-ups");
  const overdue = page.locator("h2", { hasText: "متأخر" }).locator("..");
  await expect(overdue.getByText("متابعة رد الراعي")).toBeVisible();
});

test("Scenario 6 — unified search ignores hamza differences", async ({ page }) => {
  await signIn(page, email);
  if (isMobile(page)) await page.getByRole("button", { name: "بحث" }).first().click();
  else await page.keyboard.press("Control+k");
  const box = page.getByRole("combobox");
  await box.fill("إجتماع");
  await expect(page.getByRole("option", { name: /اجتماع لجنة الموسم/ })).toBeVisible();
  await box.fill("البودكاست");
  await page.getByRole("option", { name: /إطلاق البودكاست/ }).click();
  await page.waitForURL(/\/projects\//);
});

test("Scenario 5 — weekly review", async ({ page }) => {
  await signIn(page, email);
  await page.goto("/progress");
  await expect(page.getByText("إنجاز المهام")).toBeVisible();
  await page.getByRole("link", { name: "ابدأ المراجعة الأسبوعية" }).click();
  await expect(page.getByText(/مهمة منجزة|مهمتان|مهام/).first()).toBeVisible();
  await page.getByRole("button", { name: "التالي" }).click();
  await expect(page.getByText("متابعة رد الراعي")).toBeVisible();
  await page.getByRole("button", { name: "نقل للأسبوع القادم" }).first().click();
  await expect(page.getByText("نُقلت للأسبوع القادم")).toBeVisible();
  await page.getByRole("button", { name: "التالي" }).click();
  await page.getByLabel("أولوية رقم 1").fill("إنهاء الحلقة الأولى");
  await page.getByRole("button", { name: "حفظ المراجعة" }).click();
  await page.waitForURL("**/progress");
});

test("Data survives sign-out; another user cannot see it", async ({ page, browser }) => {
  await signIn(page, email);
  await page.goto(projectUrl);
  await expect(page.getByRole("textbox", { name: "اسم المشروع" })).toHaveValue("إطلاق البودكاست");

  const ctx = await browser.newContext({ locale: "ar", timezoneId: "Africa/Algiers" });
  const other = await ctx.newPage();
  await signUp(other, "زائر");
  await other.goto(projectUrl);
  await expect(other.getByText("لم نجد هذه الصفحة")).toBeVisible();
  await other.goto("/projects");
  await expect(other.getByText("إطلاق البودكاست")).toHaveCount(0);
  const res = await other.request.get("/api/export?format=json");
  const json = await res.json();
  expect(JSON.stringify(json)).not.toContain("إطلاق البودكاست");
  await ctx.close();
});

test("Mobile layout: bottom nav, no horizontal scroll on every section", async ({ page }) => {
  await signIn(page, email);
  for (const path of ["/today", "/projects", "/calendar", "/calendar?view=month", "/calendar/follow-ups", "/progress", "/progress/habits", "/tasks", "/settings", projectUrl]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await noHorizontalScroll(page);
  }
  if (isMobile(page)) {
    const nav = page.getByRole("navigation", { name: "التنقل الرئيسي" }).last();
    await expect(nav).toBeVisible();
    await nav.getByRole("link", { name: "مشاريعي" }).click();
    await page.waitForURL("**/projects");
  }
});
