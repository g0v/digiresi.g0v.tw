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

// The install copy follows the page's DECLARED lang, not a /en/ path prefix —
// /projects/ is lang="en" too. Asserted as a script-range property rather than
// exact wording, so the captain can settle AC-I1's wording at the drive without
// the test dictating it. Still falsifiable: it fails if a page renders the
// wrong language's string, and if the zh copy goes back to promising 手冊.
const CJK = /[㐀-鿿]/;

for (const path of ["", "schedule/"]) {
  test(`install copy is zh-Hant and site-shaped at /${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant-TW");
    for (const sel of ["[data-install-btn]", "[data-ios-hint]"]) {
      const text = (await page.locator(sel).textContent()) ?? "";
      expect(CJK.test(text)).toBe(true);
      // The overpromise this feature exists to remove.
      expect(text).not.toContain("手冊");
    }
  });
}

for (const path of ["en/", "projects/"]) {
  test(`install copy is English at /${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    for (const sel of ["[data-install-btn]", "[data-ios-hint]"]) {
      const text = (await page.locator(sel).textContent()) ?? "";
      expect(CJK.test(text)).toBe(false);
      expect(text.trim().length).toBeGreaterThan(0);
    }
  });
}

// AC-I1's wording stays interactive; what is checked here is the behavioural
// fact underneath it — a browser that cannot install must not be offered a
// one-tap install. On iOS `beforeinstallprompt` never fires, so the component
// shows the share-sheet instructions instead; the button carries `hidden`, but
// `.btn { display: inline-flex }` in global.css defeats the UA's
// `[hidden] { display: none }` unless the component says so itself. A visible,
// focusable button that cannot install is the overpromise AC-I1 forbids,
// expressed through presentation rather than wording. Fails if
// `.install-hint [hidden] { display: none; }` is dropped.
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

test.describe("a browser that cannot install", () => {
  test.use({ userAgent: IPHONE_UA, viewport: { width: 390, height: 844 } });

  test("is shown the manual instructions and no install button", async ({ page }) => {
    await page.goto("");
    // The iOS branch has run: the container and the instructions are unhidden.
    await expect(page.locator("[data-ios-hint]")).toBeVisible();
    await expect(page.locator("[data-install-btn]")).toBeHidden();
  });
});

// AC-I2's tone is the captain's call at the drive; what is checked here is the
// behavioural claim underneath it — that the status is computed from the SITE
// being cached (a portal probe, not a handbook-only probe) and that it names
// the one exception. Fails if OfflineStatus goes back to probing /handbook/
// alone, or stops mentioning design-kits.
test("offline status reports the site as saved and names the exception", async ({
  page,
  context,
}) => {
  await warmPrecache(page, [BASE, `${BASE}handbook/`]);
  await context.setOffline(true);
  await page.goto("");
  const msg = page.locator("[data-offline-status] [data-msg]");
  await expect(msg).toContainText("設計元件庫");
  await expect(page.locator("[data-offline-status] [data-dot]")).toHaveAttribute(
    "data-state",
    "offline"
  );
});

// The header chip used to render a static ONLINE, so while a visitor was
// genuinely disconnected the header said ONLINE and the footer said OFFLINE on
// the same screen. The chip now reports live connectivity and must AGREE with
// the footer's status, which is asserted here in the same breath — the two
// components disagreeing is the bug this replaces. The label is bilingual
// because the header takes no `lang` prop (BaseLayout passes lang to the footer
// only), so the same chip has to be right on zh-Hant and lang="en" pages alike;
// the /en/ comparison below is what would catch a zh-only label shipping.
test("the header status chip reports the real connection state", async ({ page, context }) => {
  await warmPrecache(page, [BASE, `${BASE}en/`]);
  const chip = page.locator(".site-header .status-dot");

  await page.goto("");
  await expect(chip).toHaveAttribute("data-state", "online");
  await expect(chip).toContainText("ONLINE");

  await context.setOffline(true);
  await page.goto("");
  await expect(chip).toContainText("OFFLINE");
  await expect(chip).toHaveAttribute("data-state", "offline");
  // Agrees with the footer instead of contradicting it.
  await expect(page.locator("[data-offline-status] [data-dot]")).toHaveAttribute(
    "data-state",
    "offline"
  );

  const zhText = (await chip.textContent())?.trim();
  await page.goto("en/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect((await chip.textContent())?.trim()).toBe(zhText);
});

// AC-8. Search is the handbook's whole point on disaster day, and it depends on
// /pagefind/** being precached — which in turn depends on the Pagefind
// integration running BEFORE @vite-pwa/astro's build hook in astro.config.mjs.
// Fails if pagefind/**/* leaves the precache globs or the integrations are
// reordered.
test("handbook search returns results while offline", async ({ page, context }) => {
  await warmPrecache(page, [`${BASE}handbook/`, `${BASE}pagefind/pagefind-ui.js`]);
  await context.setOffline(true);
  await page.goto("handbook/");
  const input = page.locator("#search input[type='text']");
  await input.waitFor({ timeout: 15_000 });
  await input.fill("救難包");
  const results = page.locator("#search .pagefind-ui__result-link");
  await expect(results.first()).toBeVisible({ timeout: 15_000 });
  await expect(results.first()).toHaveAttribute("href", /\/handbook\//);
});

test("blackout theme is the default", async ({ page }) => {
  // Fresh context (Playwright default per test): no stored drt-theme, no
  // data-theme attribute — the body must be blackout near-black #0c0c0b.
  await page.goto("");
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(12, 12, 11)");
});
