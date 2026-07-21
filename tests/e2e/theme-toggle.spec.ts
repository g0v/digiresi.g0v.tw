import { test, expect } from "@playwright/test";

test("theme toggle switches to light and persists across reload", async ({ page }) => {
  await page.goto("");
  // Default is dark — no data-theme attribute
  let theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  expect(theme).toBeNull();

  // Click toggle
  await page.click("#theme-toggle");
  theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  expect(theme).toBe("light");

  // Reload — no-flash init should restore light theme
  await page.reload();
  theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  expect(theme).toBe("light");

  // Click toggle again — back to dark
  await page.click("#theme-toggle");
  theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  expect(theme).toBeNull();
});
