import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import fs from "node:fs";
import path from "node:path";
import sitemap from "@astrojs/sitemap";
import AstroPWA from "@vite-pwa/astro";
import { precacheGlobs } from "./scripts/precache-globs.mjs";
import rehypeBaseUrl from "./scripts/rehype-base-url.mjs";
import rehypeDemoteHeadings from "./scripts/rehype-demote-headings.mjs";
import rehypeImageDimensions from "./scripts/rehype-image-dimensions.mjs";

// Single source of truth for the deployment base path.
//   "/"                    → custom domain (needs public/CNAME)
//   "/digiresi.g0v.tw/"    → GitHub Pages project subpath
// Everything else in the codebase derives from this value.
const BASE = "/";

// Runs Pagefind BEFORE @vite-pwa/astro's own astro:build:done hook (Astro runs
// same-name hooks in integrations-array order) so sw.js precaches /pagefind/**.
// The trailing `pagefind --site dist` in `npm run build` is an idempotent
// re-run over identical input — content-hashed index files come out identical,
// so the precache revisions in sw.js stay valid.
const pagefindBeforeServiceWorker = {
  name: "pagefind-before-sw",
  hooks: {
    "astro:build:done": ({ dir }) => {
      execSync(`npx pagefind --site "${fileURLToPath(dir)}"`, {
        stdio: "inherit",
      });
    },
  },
};

// Must equal `site` below (tests/unit/deployment.test.mjs pins that literal).
const SITE = "https://digiresi.g0v.tw/";

// Sitemap lastmod for handbook pages = their HackMD sync date (frontmatter
// `syncedAt`, written by `npm run sync`), the same value as dateModified.
function handbookSyncDates() {
  const root = "src/content/handbook";
  const dates = new Map();
  for (const rel of fs.readdirSync(root, { recursive: true })) {
    if (!rel.endsWith(".md")) continue;
    const m = /^syncedAt:\s*"?(\d{4}-\d{2}-\d{2})"?\s*$/m.exec(fs.readFileSync(path.join(root, rel), "utf8"));
    if (m) dates.set(`${SITE}handbook/${rel.replace(/\.md$/, "").split(path.sep).join("/")}/`, m[1]);
  }
  return dates;
}
const syncDates = handbookSyncDates();

// zh-Hant <-> en-US pairs (same as the HTML hreflang in SeoHead.astro).
const TRANSLATIONS = [{ "zh-Hant": `${SITE}`, "en-US": `${SITE}en/` }];

export default defineConfig({
  site: "https://digiresi.g0v.tw/",
  base: BASE,
  // "always" makes @vite-pwa/astro's precache manifest URLs end in "/"
  // ("handbook/prepare/go-bag/", "offline/") — exactly what the browser
  // requests on GitHub Pages. Without it the precache keys have no trailing
  // slash, offline navigations miss, and createHandlerBoundToURL("/offline/")
  // fails at SW startup. All internal links already use trailing slashes.
  trailingSlash: "always",
  markdown: {
    rehypePlugins: [[rehypeBaseUrl, { base: BASE }], rehypeDemoteHeadings, [rehypeImageDimensions, { base: BASE }]],
  },
  integrations: [
    sitemap({
      // /offline/ is the service worker's fallback page (noindex).
      filter: (page) => !page.endsWith("/offline/"),
      serialize(item) {
        const lastmod = syncDates.get(item.url);
        if (lastmod) item.lastmod = lastmod;
        const pair = TRANSLATIONS.find((t) => Object.values(t).includes(item.url));
        if (pair) {
          item.links = [
            ...Object.entries(pair).map(([lang, url]) => ({ lang, url })),
            { lang: "x-default", url: pair["zh-Hant"] },
          ];
        }
        return item;
      },
    }),
    pagefindBeforeServiceWorker,
    AstroPWA({
      registerType: "autoUpdate",
      strategies: "generateSW",
      // Registration lives in BaseLayout.astro (the integration injects no
      // script into Astro pages) — disable the unused auto-register asset.
      injectRegister: false,
      manifest: {
        name: "數位韌性手冊",
        short_name: "韌性手冊",
        start_url: `${BASE}handbook/`,
        display: "standalone",
        lang: "zh-Hant-TW",
        theme_color: "#0c0c0b",
        background_color: "#0c0c0b",
        icons: [
          { src: `${BASE}icons/icon-192.png`, sizes: "192x192", type: "image/png" },
          { src: `${BASE}icons/icon-512.png`, sizes: "512x512", type: "image/png" },
          {
            src: `${BASE}icons/icon-maskable-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: precacheGlobs,
        // Pagefind fetches /pagefind/pagefind-entry.json with a `?ts=<epoch>`
        // cache-buster. Workbox matches precache entries INCLUDING the query
        // string — its default ignoreURLParametersMatching covers only utm_*
        // and fbclid — so that request missed the precache and went to the
        // network, and offline search hung at "正在搜尋…" forever. Ignoring
        // `ts` lets the precached entry match. Keep the workbox defaults.
        ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^ts$/],
        // Offline fallback for /handbook/** navigations that miss the precache.
        navigateFallback: `${BASE}offline/`,
        // Keep the precache-fallback NavigationRoute away from portal URLs:
        // workbox registers it BEFORE runtimeCaching routes, so without this
        // denylist "/" and "/schedule/" would serve the precached /offline/
        // page even when online. Portal documents fall through to the
        // NetworkFirst route below instead.
        navigateFallbackDenylist: [new RegExp(`^${BASE.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}(?!handbook/)`)],
        runtimeCaching: [
          {
            // Portal pages: network-first; when offline and uncached, the
            // precacheFallback plugin serves the precached /offline/ page.
            //
            // urlPattern is a function whose body is toString'd into sw.js by workbox-build,
            // so it CANNOT close over the build-time `BASE` const (ReferenceError at runtime).
            // Look up the base from the SW's own registration scope instead — same value,
            // resolved at runtime.
            urlPattern: ({ request, url }) => {
              const scope = new URL(self.registration.scope).pathname;
              return request.destination === "document" && !url.pathname.startsWith(`${scope}handbook/`);
            },
            handler: "NetworkFirst",
            options: {
              cacheName: "portal-pages",
              precacheFallback: { fallbackURL: `${BASE}offline/` },
            },
          },
          {
            // Runtime-cached fonts (body TC face etc.). IBM Plex Mono 400/600/700
            // are precached (globPatterns above), so this route only catches the
            // rest, e.g. the Noto Sans TC subset files.
            urlPattern: ({ url }) => url.pathname.endsWith(".woff2"),
            handler: "CacheFirst",
            options: { cacheName: "fonts" },
          },
        ],
      },
    }),
  ],
});
