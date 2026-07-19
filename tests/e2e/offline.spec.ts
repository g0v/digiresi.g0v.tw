import { test, expect, type Page } from "@playwright/test";

// Warm the offline cache: visit the handbook shell, wait for the service
// worker to activate, then poll until the go-bag article is precached.
// Workbox keys precache entries by file URL + __WB_REVISION__ query param,
// so we match both the pretty URL and the index.html form, ignoring search.
async function warmPrecache(page: Page): Promise<void> {
  await page.goto("handbook/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(
    async () => {
      const pretty = await caches.match("/digiresi.g0v.tw/handbook/prepare/go-bag/", { ignoreSearch: true });
      const file = await caches.match("/digiresi.g0v.tw/handbook/prepare/go-bag/index.html", {
        ignoreSearch: true,
      });
      return Boolean(pretty || file);
    },
    undefined,
    { timeout: 30_000 }
  );
}

test("handbook article renders fully offline", async ({ page, context }) => {
  await warmPrecache(page);
  await context.setOffline(true);
  await page.goto("handbook/prepare/go-bag/");
  const h1 = page.locator("h1").first();
  await expect(h1).toBeVisible();
  expect((await h1.innerText()).trim().length).toBeGreaterThan(0);
});

test("uncached portal route falls back to the offline page", async ({ page, context }) => {
  await warmPrecache(page);
  await context.setOffline(true);
  // /schedule/ is portal zone: network-first, never precached, never visited
  // in this context — the service worker must serve the /offline/ fallback.
  await page.goto("schedule/");
  await expect(page.getByText("目前離線").first()).toBeVisible();
});

test("blackout theme is the default", async ({ page }) => {
  // Fresh context (Playwright default per test): no stored drt-theme, no
  // data-theme attribute — the body must be blackout near-black #0c0c0b.
  await page.goto("");
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(12, 12, 11)");
});
