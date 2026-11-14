import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { getBase } from "../../scripts/lib/deploy-base.mjs";

// Binds two independent values: the glob list in scripts/precache-globs.mjs and
// what the build actually emitted into dist/sw.js. They can diverge (a glob that
// matches nothing, a page that stops being generated), so this is not a
// tautology over a file the implementer also wrote.
const SW_PATH = "dist/sw.js";
const hasBuild = fs.existsSync(SW_PATH);

// Workbox minifies the precache manifest into sw.js as {revision:...,url:"..."}
// pairs. Read the emitted keys back out.
function manifestUrls() {
  const sw = fs.readFileSync(SW_PATH, "utf8");
  return [...sw.matchAll(/url:"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
}

describe.skipIf(!hasBuild)("service worker precache scope", () => {
  it("precaches every visitor-facing portal route", () => {
    const urls = manifestUrls();
    // vite-pwa rewrites "X/index.html" to "X/". The root was predicted to come
    // out as a degenerate empty key; it does not — the build emits the base, the
    // one absolute key in an otherwise relative manifest. Asserted exactly so a
    // change in that form is noticed. That it RESOLVES offline is proved
    // separately by the Playwright test, not by this key's presence.
    // Base-aware like manifest-guards.test.mjs: under a subpath base the root
    // key becomes "/digiresi.g0v.tw/", and hardcoding "/" made this the one
    // base-unaware file in the suite.
    expect(urls).toContain(getBase());
    for (const route of ["about/", "schedule/", "projects/", "en/"]) {
      expect(urls).toContain(route);
    }
  });

  it("keeps OG share images out of the precache", () => {
    // dist/og/** (one 1200x630 PNG per page) is for link previews only; it must
    // not count against the 10 MB offline budget.
    expect(manifestUrls().filter((u) => u.startsWith("og/") || u.endsWith(".png") && u.includes("/og/"))).toEqual([]);
  });

  it("keeps crawler and AI files out of the precache", () => {
    // robots.txt, the sitemaps and llms*.txt are for crawlers and agents, not
    // for offline visitors; llms-full.txt alone is ~50 KB of handbook text.
    const urls = manifestUrls();
    for (const file of ["robots.txt", "llms.txt", "llms-full.txt", "sitemap-index.xml", "sitemap-0.xml", "schedule/feed.xml"]) {
      expect(fs.existsSync(`dist/${file}`), file).toBe(true);
      expect(urls.filter((u) => u.endsWith(file)), file).toEqual([]);
    }
  });

  it("keeps design-kits out of the precache", () => {
    // Contributor-facing specimen tree, deliberately excluded (2026-07-25
    // captain ruling). Excluding it is also what keeps /offline/ reachable.
    expect(manifestUrls().filter((u) => u.startsWith("design-kits/"))).toEqual([]);
  });

  it("still precaches the handbook and the search index", () => {
    const urls = manifestUrls();
    expect(urls.some((u) => u.startsWith("handbook/"))).toBe(true);
    expect(urls.some((u) => u.startsWith("pagefind/"))).toBe(true);
    expect(urls).toContain("offline/");
  });
});

it.skipIf(hasBuild)("precache scope needs a build", () => {
  console.warn("precache-scope: dist/sw.js not found — run `npm run build` first.");
});
