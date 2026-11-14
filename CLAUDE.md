# CLAUDE.md

Notes for coding agents working in this repository. User-facing copy (page
text, descriptions, alt text, llms.txt prose) is Traditional Chinese as used
in Taiwan; English only on English pages (`/en/`, `/projects/`, `/design-kits/*`).

## What this repository is

- **g0v/digiresi.g0v.tw**. Workflows in `.github/workflows/`: `ci.yml` (pull
  requests: test, check, build, budget, links, e2e), `deploy.yml` (push to
  `main` deploys the site), `sync.yml` (weekly HackMD sync).
- Astro static site, canonical origin **https://digiresi.g0v.tw** (`site` in
  `astro.config.mjs`, trailing slashes always). Layout: `src/layouts/BaseLayout.astro`.
- `design/` is a read-only design reference; use the semantic tokens ported to
  `src/styles/global.css` (`--bg`, `--ink`, `--accent`, `--accent-2`, …).

## Handbook content

- `src/content/handbook/` is **synced from HackMD by `npm run sync`** (curation in
  `sync.config.yaml`). **Never hand-edit it**; the next sync overwrites it.
- Anything derived from it (descriptions, dates, headings) is computed at build
  time; overrides live in separate data files (see SEO below).
- `scripts/rehype-demote-headings.mjs` shifts a page's headings down one level
  at render time when the HackMD body has an `<h1>`, so each page has exactly one H1.
- Handbook pages show 「最後同步：YYYY-MM-DD」 from the `syncedAt` frontmatter.

## Offline / PWA budget

The service worker precaches what `scripts/precache-globs.mjs` lists, under a
10 MB budget (`npm run check:budget`). Crawler and AI files (`/og/**`,
`robots.txt`, `sitemap-*.xml`, `llms.txt`, `llms-full.txt`) must stay **outside**
the precache; `tests/unit/precache-scope.test.mjs` enforces it.

## SEO and AI search

Baseline: **https://crcolab.art** (repo `crcolab/crccolab.github.io`; the old
`crccolab.github.io` URL now 404s). Audit and plan: `docs/seo/audit.md`.

- **`src/components/SeoHead.astro`** (rendered by `BaseLayout.astro`) emits title,
  description, canonical, robots, hreflang (+x-default), `og:*`, `twitter:*`,
  `article:*`, `<link rel="sitemap">` and JSON-LD for every page.
- **Titles and descriptions:** non-handbook pages in **`src/lib/seo/pages.ts`**
  (pages use `<BaseLayout {...seoProps("/path/")}>`); handbook pages from
  frontmatter, else the opening prose, else **`src/data/handbook-seo.yaml`**
  (`src/lib/seo/handbook.ts`). Title rule (`composeTitle`, crcolab's): name + the
  longest suffix that keeps width ≤ 60, CJK counting 2. Descriptions 70–160 chars,
  unique. A new page needs an entry in `pages.ts`, or the build fails.
- **OG images:** `src/pages/og/[...slug].png.ts` + `src/lib/og/` render one
  1200×630 PNG per page at build time (satori + @resvg/resvg-js, sharp palette
  compression) into `dist/og/`, plus `/og/default.png`. Cubic 11 is decompressed
  from woff2 in memory; missing glyphs fall back to Noto Sans TC, and a glyph no
  font has fails the build (no tofu).
- **JSON-LD:** `src/lib/seo/jsonld.ts` (WebSite + Organization on `/` and `/en/`,
  Event per dated `src/data/events.yaml` entry on `/schedule/`, TechArticle +
  BreadcrumbList on handbook pages). Only real data; no invented authors, dates,
  ratings or FAQs.
- **Crawl and AI files:** `src/pages/robots.txt.ts` (Content Signals, AI crawler
  groups by purpose, Sitemap line), `@astrojs/sitemap` in `astro.config.mjs`
  (`/offline/` excluded, `/` ↔ `/en/` hreflang, handbook `lastmod` = sync date),
  `src/pages/llms.txt.ts` and `src/pages/llms-full.txt.ts` (`src/lib/seo/llms.ts`).
  The footer links to `/llms.txt`.
- **`check-seo` runs inside `npm run build`** (`scripts/seo/check.mjs`; also
  `npm run check:seo`) and fails the build on a missing/duplicate tag, a bad OG
  image, a wrong H1 count, invalid JSON-LD, or robots/sitemap/llms files out of
  step with the pages. `npm run seo:inventory` refreshes `docs/seo/inventory.*`.
- `/offline/` is noindex; design-kits pages stay indexable. No IndexNow key or
  search-console verification file here: the deploy belongs to g0v.

## Checks before pushing

`npm ci` (once), `npm run build` (includes check-seo), `npm test`,
`npm run check:budget`, `npm run check` (astro check). `npm run test:e2e`
(Playwright, Chromium only) for release gates. Don't commit `dist/` or `.astro/`.
