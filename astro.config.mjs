import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import AstroPWA from "@vite-pwa/astro";
import { precacheGlobs } from "./scripts/precache-globs.mjs";

// Single source of truth for the deployment base path.
//   "/"                    → custom apex domain (needs public/CNAME)
//   "/digiresi.g0v.tw/"    → GitHub Pages project subpath
// Everything else in the codebase derives from this value.
const BASE = "/digiresi.g0v.tw/";

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

export default defineConfig({
  site: "https://digiresi.g0v.tw",
  base: BASE,
  // "always" makes @vite-pwa/astro's precache manifest URLs end in "/"
  // ("handbook/prepare/go-bag/", "offline/") — exactly what the browser
  // requests on GitHub Pages. Without it the precache keys have no trailing
  // slash, offline navigations miss, and createHandlerBoundToURL("/offline/")
  // fails at SW startup. All internal links already use trailing slashes.
  trailingSlash: "always",
  integrations: [
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
            urlPattern: ({ request, url }) =>
              request.destination === "document" &&
              !url.pathname.startsWith(`${BASE}handbook/`),
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
