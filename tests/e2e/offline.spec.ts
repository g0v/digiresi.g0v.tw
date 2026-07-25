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

// Each assertion names copy that only this route carries. A bare "an h1 is
// visible" check would not do — and in fact the /offline/ fallback has no h1 at
// all, so such a check would pass for a different reason than the one claimed.
const PORTAL_ROUTES: Array<{ path: string; text: string; title: RegExp }> = [
  { path: "about/", text: "IG 不能動", title: /關於｜數位韌性松/ },
  { path: "schedule/", text: "OFFLINE SURVIVAL KIT", title: /時程｜數位韌性松/ },
  { path: "projects/", text: "MESHBOX", title: /Projects — DigiResiThon/ },
  { path: "en/", text: "WHEN THE NET", title: /Digital Resilience Hackathon/ },
];

for (const route of PORTAL_ROUTES) {
  test(`/${route.path} renders offline`, async ({ page, context }) => {
    await warmPrecache(page, [`${BASE}${route.path}`]);
    await context.setOffline(true);
    await page.goto(route.path);
    await expect(page.getByText(route.text).first()).toBeVisible();
    await expect(page).toHaveTitle(route.title);
  });
}

test("uncached portal route falls back to the offline page", async ({ page, context }) => {
  await warmPrecache(page);
  await context.setOffline(true);
  // /design-kits/ is the contributor-facing specimen tree: deliberately kept
  // out of the precache, so it stays network-first and, offline and unvisited,
  // must get the /offline/ fallback. This test used to drive /schedule/, which
  // is precached as of this feature — retargeted rather than deleted, because
  // it is the only coverage of the fallback path, and not relaxed, because a
  // test that can no longer fail is not a check.
  await page.goto("design-kits/");
  await expect(page.getByText("目前離線").first()).toBeVisible();
});

// Exercises behaviour, not copy: a visitor who lands on /offline/ while still
// disconnected must be able to click through to something that actually works.
// Fails if the offline page's primary link ever points at a route that is not
// precached.
test("the offline page leads back to a route that works offline", async ({ page, context }) => {
  await warmPrecache(page, [`${BASE}handbook/`]);
  await context.setOffline(true);
  await page.goto("design-kits/");
  await expect(page.getByText("目前離線").first()).toBeVisible();
  await page.locator(".offline-page a.btn").first().click();
  // The handbook index carries no heading element at all — assert its own
  // content and title rather than a role that is not there.
  await expect(page).toHaveTitle(/手冊 HANDBOOK/);
  await expect(page.getByText("開始閱讀").first()).toBeVisible();
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
});

// The install affordance used to render on /handbook/ only, so a visitor
// standing anywhere else was never offered it. The count-of-one assertion is
// what catches double-mounting: both components resolve a single instance with
// document.querySelector, so leaving the handbook copy in place while adding a
// footer copy would bind the script to the wrong element.
for (const path of ["", "schedule/", "en/"]) {
  test(`the install affordance is present at /${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("[data-install-hint]")).toHaveCount(1);
  });
}

test("the install affordance is mounted exactly once on /handbook/", async ({ page }) => {
  await page.goto("handbook/");
  await expect(page.locator("[data-install-hint]")).toHaveCount(1);
  await expect(page.locator("[data-offline-status]")).toHaveCount(1);
});

test("blackout theme is the default", async ({ page }) => {
  // Fresh context (Playwright default per test): no stored drt-theme, no
  // data-theme attribute — the body must be blackout near-black #0c0c0b.
  await page.goto("");
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(12, 12, 11)");
});
