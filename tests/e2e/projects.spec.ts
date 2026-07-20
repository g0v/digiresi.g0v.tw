import { test, expect } from "@playwright/test";

test("projects page returns 200 and shows SAMPLE DATA badge", async ({ page }) => {
  const response = await page.goto("projects/");
  expect(response?.status()).toBe(200);
  await expect(page.getByText("SAMPLE DATA · YEAR 0")).toBeVisible();
  await expect(page.getByText("MESHBOX")).toBeVisible();
});

test("projects tab filter shows only matching track", async ({ page }) => {
  await page.goto("projects/");
  // Click Comms tab
  await page.click("[data-tab-id='comms']");
  // MESHBOX is comms — should be visible
  await expect(page.locator(".proj-card[data-track='comms']").first()).toBeVisible();
  // PAPERSYNC is civic — should be hidden
  await expect(page.locator(".proj-card[data-track='civic']").first()).toBeHidden();
  // YOUR IDEA (__always) should still be visible
  await expect(page.locator(".proj-card[data-track='__always']")).toBeVisible();
});

test("projects search filters by name", async ({ page }) => {
  await page.goto("projects/");
  await page.fill("#projects-search", "mesh");
  // MESHBOX name contains "mesh"
  await expect(page.locator("[data-name='meshbox']")).toBeVisible();
  // PAPERSYNC name doesn't contain "mesh"
  await expect(page.locator("[data-name='papersync']")).toBeHidden();
});
