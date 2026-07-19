/**
 * Single source of truth for what the service worker precaches (globs are
 * relative to dist/). Imported by BOTH astro.config.mjs (workbox globPatterns)
 * and scripts/check-budget.mjs (10 MB budget enforcement) so the budget always
 * measures exactly what ships offline.
 */
export const precacheGlobs = [
  "handbook/**/*.html",
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
