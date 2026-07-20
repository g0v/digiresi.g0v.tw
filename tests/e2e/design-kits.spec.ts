import { test, expect } from "@playwright/test";

test("/design-kits/ returns 200 and shows rules heading", async ({ page }) => {
  const response = await page.goto("design-kits/");
  expect(response?.status()).toBe(200);
  await expect(page.getByText("RULES OF THE WORLD")).toBeVisible();
});

test("/design-kits/logo/ shows YellowOne attribution and CC BY-SA 4.0", async ({ page }) => {
  const response = await page.goto("design-kits/logo/");
  expect(response?.status()).toBe(200);
  await expect(page.getByText(/© YellowOne/)).toBeVisible();
  await expect(page.getByText(/CC BY-SA 4\.0/)).toBeVisible();
});
