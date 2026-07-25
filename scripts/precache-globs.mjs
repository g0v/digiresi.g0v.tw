/**
 * Single source of truth for what the service worker precaches (globs are
 * relative to dist/). Imported by BOTH astro.config.mjs (workbox globPatterns)
 * and scripts/check-budget.mjs (10 MB budget enforcement) so the budget always
 * measures exactly what ships offline.
 */
export const precacheGlobs = [
  "handbook/**/*.html",
  // Visitor-facing portal routes. Per the 2026-07-25 captain ruling, "the whole
  // website works offline" means everything EXCEPT design-kits. This is a
  // partial, deliberate reversal of 40a5d07, which excluded /projects/ and
  // /design-kits/ together: /projects/ is linked from the site header and comes
  // back in; /design-kits/ is a contributor-facing specimen tree and stays out.
  // Keeping design-kits out is also what keeps /offline/ a reachable page and
  // the offline-fallback e2e test a real check. Do not "fix" the asymmetry.
  "index.html",
  "about/**/*.html",
  "schedule/**/*.html",
  "projects/**/*.html",
  "en/**/*.html",
  "pagefind/**/*",
  "handbook-assets/**/*",
  // Intentionally precaches ALL Astro bundles (including portal pages, not
  // just handbook pages). The CI budget gate (`check:budget`) enforces the
  // 10 MB size ceiling, so a future heavy portal-page bundle will fail that
  // check rather than silently bloating the service worker.
  "_astro/*.css",
  "_astro/*.js",
  "_astro/press-start-2p-latin-400*.woff2",
  "_astro/ibm-plex-mono-latin-400*.woff2",
  "_astro/ibm-plex-mono-latin-600*.woff2",
  "_astro/ibm-plex-mono-latin-700*.woff2",
  "fonts/Cubic_11.woff2",
  "icons/**/*",
  "brand/**/*",
  "offline/index.html",
];
