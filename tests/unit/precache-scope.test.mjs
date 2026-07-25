import fs from "node:fs";
import { describe, expect, it } from "vitest";

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
    // vite-pwa rewrites "X/index.html" to "X/"; the root may come out as "".
    // Accept whichever form the build emits — Task 3's Playwright test is what
    // proves the root actually resolves offline.
    expect(urls.some((u) => u === "" || u === "index.html")).toBe(true);
    for (const route of ["about/", "schedule/", "projects/", "en/"]) {
      expect(urls).toContain(route);
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
