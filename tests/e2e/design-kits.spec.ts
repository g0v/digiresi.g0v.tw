import { test, expect } from "@playwright/test";

test("/design-kits/ returns 200 and shows rules heading", async ({ page }) => {
  const response = await page.goto("design-kits/");
  expect(response?.status()).toBe(200);
  await expect(page.getByText("RULES OF THE WORLD")).toBeVisible();
});
