import { test, expect } from "@playwright/test";

test("register dialog opens on hero button click", async ({ page }) => {
  await page.goto("");
  const opener = page.locator("[data-open-register]").first();
  await opener.click();
  const dialog = page.locator("#register-dialog");
  await expect(dialog).toBeVisible();
});

test("register dialog closes on ESC and returns focus to opener", async ({ page }) => {
  await page.goto("");
  const opener = page.locator("[data-open-register]").first();
  await opener.click();
  await expect(page.locator("#register-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#register-dialog")).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test("register dialog closes on backdrop click", async ({ page }) => {
  await page.goto("");
  await page.locator("[data-open-register]").first().click();
  const dialog = page.locator("#register-dialog");
  await expect(dialog).toBeVisible();
  // The dialog panel is 460px wide, centered in a 1280px viewport
  // (panel left edge ~410px). Click at x=10,y=10 — well outside the panel.
  await page.mouse.click(10, 10);
  await expect(dialog).not.toBeVisible();
});
