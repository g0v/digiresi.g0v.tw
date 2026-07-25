import { test, expect, type Page } from "@playwright/test";
import { getBase } from "../../scripts/lib/deploy-base.mjs";

const BASE = getBase();

// Warm the offline cache: visit the handbook shell, wait for the service
// worker to activate, then poll until the go-bag article is precached.
// Workbox keys precache entries by file URL + __WB_REVISION__ query param,
// so we match both the pretty URL and the index.html form, ignoring search.
async function warmPrecache(page: Page, extraUrls: string[] = []): Promise<void> {
  await page.goto("handbook/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(
    async ([base, extras]: [string, string[]]) => {
      const pretty = await caches.match(`${base}handbook/prepare/go-bag/`, { ignoreSearch: true });
      const file = await caches.match(`${base}handbook/prepare/go-bag/index.html`, {
        ignoreSearch: true,
      });
      if (!pretty && !file) return false;
      // Precaching is one install transaction, but wait explicitly for the
      // routes under test rather than treating go-bag as a proxy for them.
      for (const extra of extras) {
        if (!(await caches.match(extra, { ignoreSearch: true }))) return false;
      }
      return true;
    },
    [BASE, extraUrls] as [string, string[]],
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

// The root is the one absolute key ("/") in an otherwise relative precache
// manifest, and trailing-slash handling at the root has bitten this repo before.
// Asserting the landing page's own hero copy — the /offline/ fallback would
// satisfy a bare "an h1 is visible" check.
test("the landing page renders offline", async ({ page, context }) => {
  await warmPrecache(page, [BASE]);
  await context.setOffline(true);
  await page.goto("");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("網路斷了");
  await expect(page).toHaveTitle(/數位韌性松 DigiResiThon/);
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
