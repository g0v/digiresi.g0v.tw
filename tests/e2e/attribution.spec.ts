import { test, expect } from "@playwright/test";

test("YellowOne attribution visible in footer on home page", async ({ page }) => {
  await page.goto("");
  const footer = page.locator(".site-footer");
  await expect(footer).toBeVisible();
  await expect(footer.getByText("LOGO © YELLOWONE · CC BY-SA 4.0")).toBeVisible();
});
