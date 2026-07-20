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
  await expect(page.locator('.attribution-block').getByText(/CC BY-SA 4\.0/)).toBeVisible();
});

test("/design-kits/colors/ returns 200 and shows SEMANTIC TOKENS heading", async ({ page }) => {
  const response = await page.goto("design-kits/colors/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'SEMANTIC TOKENS' })).toBeVisible();
});

test("/design-kits/typography/ returns 200 and shows PRESS START 2P heading", async ({ page }) => {
  const response = await page.goto("design-kits/typography/");
  expect(response?.status()).toBe(200);
  await expect(page.locator('h2').filter({ hasText: 'PRESS START 2P' })).toBeVisible();
});

test("/design-kits/components/ returns 200 and shows group labels", async ({ page }) => {
  const response = await page.goto("design-kits/components/");
  expect(response?.status()).toBe(200);
  await expect(page.locator('h2').filter({ hasText: 'BUTTON' })).toBeVisible();
  await expect(page.locator('h2').filter({ hasText: 'BADGE' })).toBeVisible();
  await expect(page.locator('h2').filter({ hasText: 'ALERT' })).toBeVisible();
  await expect(page.locator('h2').filter({ hasText: 'FORMS' })).toBeVisible();
  await expect(page.locator('h2').filter({ hasText: 'SIGNAL BARS' })).toBeVisible();
  await expect(page.locator('h2').filter({ hasText: 'TERMINAL BLOCK' })).toBeVisible();
  await expect(page.locator('h2').filter({ hasText: 'MARQUEE' })).toBeVisible();
  await expect(page.locator('h2').filter({ hasText: 'TABS' })).toBeVisible();
});
