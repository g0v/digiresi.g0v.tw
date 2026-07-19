# digiresi.g0v.tw — Design Spec

**Date:** 2026-07-17
**Status:** Approved design, pre-implementation
**Background:** https://github.com/g0v-data/g0v-hackmd-archive/blob/main/tags/digital-resilience.md

## 1. Overview

A static website for the g0v DigiResiThon (數位韌性松) community at `digiresi.g0v.tw`, with two zones:

1. **Portal** — introduces digital resilience and the hackathon community: mission, event timeline, how to join.
2. **Offline handbook** — the community's disaster-preparedness and mesh-networking guides, synced from HackMD, installable as a PWA that works fully offline after one visit.

The site dogfoods its own theme: the handbook must remain usable when the internet is down.

## 2. Decisions made (with rationale)

| Decision | Choice | Rationale |
|---|---|---|
| Purpose | Portal + offline handbook hybrid | Serves both community visibility and the practical disaster-prep use case |
| Content flow | Scheduled sync from `g0v-data/g0v-hackmd-archive` via review PR | HackMD stays the community editing home; content lands as reviewable commits (see §4) |
| Language | zh-TW throughout + one English About page (`/en/`) | Matches content and audience; minimal translation burden |
| Hosting | GitHub Pages + GitHub Actions, `CNAME digiresi.g0v.tw` | g0v convention, free, transparent, forkable |
| Offline scope | Full handbook precached on first visit | Clear, testable promise: 離線也能查手冊. Portal stays online-first |
| Event pages | Timeline + link out to HackMD | Working notes stay live where edited; site stays tidy |
| Stack | Astro + vite-plugin-pwa + Pagefind | Zero-JS-by-default → small precache; full portal design freedom; offline-capable search |

## 3. Site map

### Portal zone (online-first, network-first caching)

- `/` — mission intro (drawn from the founding manifesto), next-event callout, entry cards into handbook sections, community links (g0v Slack, HackMD 大全, GitHub repo).
- `/events/` — timeline of all hackathons (Th0n–Th15n and onward) rendered from hand-maintained `src/data/events.yaml` (fields: number, name, date, venue, one-line summary, HackMD URL). Upcoming event pinned at top and featured on the homepage.
- `/about/` — the manifesto (「IG 不能動，還有什麼值得我心痛」), what DigiResiThon is, how to participate.
- `/en/` — single English page: what digital resilience / DigiResiThon is, how to get involved.

### Handbook zone (`/handbook/**`, fully precached, offline-capable)

Organized by *when you need it*, not by source doc. ~18 of the 55 archive docs are synced:

| Section | Slug | Synced source notes |
|---|---|---|
| 準備 Prepare | `/handbook/prepare/` | 準備救難包 · 家庭常備物資清單 · 預防通訊中斷 · 了解避難位置 · 學習急救資訊 · 民防/防災相關證照 |
| 應變 Respond | `/handbook/respond/` | 災難時的通訊 · 災害時的交通 · 災害時保健 |
| 通訊網 Mesh | `/handbook/mesh/` | Meshtastic 入門（寫給不熟悉的朋友）· 如何購買 Meshtastic 裝置 · 刷韌體懶人包 · 台灣鏈網 · g0mesh README · g0mesh quickstart |
| 情境 Scenarios | `/handbook/scenarios/` | 數位韌性情境分級 · 海纜斷光會怎樣？ · 了解台灣可能造成全國性／地區性無法正常使用網路的災害 |
| 自架 Self-host | `/handbook/selfhost/` | 數位服務/軟體離線替代品 · SaaS 韌性產品 self-host guide |

All other archive docs (event working notes, logistics, fundraising templates, social-media prompts) are not synced; they remain in HackMD and are linked where relevant.

## 4. Content sync pipeline

**Source of truth stays HackMD.** We sync from the archive mirror repo (`g0v-data/g0v-hackmd-archive`) because it is stable raw Markdown.

- **`sync.config.yaml`** — curation manifest. One entry per handbook page: HackMD note ID → site slug, section, order, optional title override. Adding a doc to the handbook = one YAML entry.
- **`scripts/sync-content.mjs`** — for each manifest entry:
  1. Fetch the raw note from the archive repo.
  2. Strip HackMD-isms: tag lines, `:::info` / `:::spoiler` / `:::warning` containers → styled callout / `<details>` HTML.
  3. Rewrite links: `../notes/<id>.md` → local slug if the target is in the manifest, else the public `g0v.hackmd.io` URL.
  4. **Vendor all images**: download imgur/HackMD-CDN images into the repo so offline pages never depend on external image hosts.
  5. Prepend generated frontmatter: `title`, `section`, `order`, `sourceUrl`, `sourceCommit`, `syncedAt`.
- Each rendered handbook page shows a visible attribution: 「本頁同步自 HackMD 共筆」 linking to the live note.
- **Synced content is committed** to `src/content/handbook/` (not fetched at build). Rationale:
  - Hermetic builds — the site rebuilds even if GitHub raw/HackMD is unreachable.
  - Reviewable content diffs.
  - **Security**: HackMD notes are world-editable. A weekly scheduled GitHub Action runs the sync and opens a **PR**; a human reviews and merges. Nothing flows from a publicly editable pad to an official-looking g0v subdomain without review.
- **Error handling**: per-item loud failures (404 note, dead image) with a summary report; atomic writes (temp dir → swap); a page is never half-updated. A failed scheduled sync produces no PR and never affects the deployed site.

## 5. Offline / PWA strategy

Via `vite-plugin-pwa` (Workbox):

- **Precache** (generated at build): every `/handbook/**` HTML page, its CSS/JS, vendored images, Pagefind index chunks, web-app manifest and icons.
- **Runtime caching**: portal pages network-first with cache fallback; uncached routes while offline get a friendly `/offline/` fallback page.
- **Updates**: service worker auto-updates in the background (no update-nag UI).
- **UX on `/handbook/`**: install hint (native prompt on Android/desktop; manual 加入主畫面 instructions for iOS) and an online/offline status indicator that verifies the promise: 「✓ 手冊已完整下載，離線可用」.
- **Precache budget enforced in CI**: build fails if the handbook precache exceeds **10 MB**. An offline kit that can't finish caching on degraded disaster-day connectivity isn't resilient.

## 6. Search

- **Pagefind** indexes handbook pages post-build; index chunks are included in the precache so search works offline.
- CJK: force `zh` language handling in Pagefind config.
- Search UI appears on handbook pages only.

## 7. Visual & UX principles

- Custom g0v-flavored design (implementation phase uses the frontend-design skill).
- zh-TW typography: Noto Sans TC (self-hosted/subset — no external font CDN at runtime).
- Mobile-first (disaster use = phones), dark mode (battery saving during outages), print-friendly handbook pages (paper is the ultimate offline).
- Accessibility: semantic HTML, sufficient contrast in both themes.

## 8. Testing

- **Vitest** unit tests for every sync transform: link rewriting, HackMD syntax cleanup, image vendoring, frontmatter generation. (Highest-churn, highest-risk code.)
- **Playwright e2e (the product-promise test)**: load `/handbook/`, wait for service-worker install, set browser context offline, navigate to a handbook page → content must render.
- Build-time internal link check; `astro check` + full build on every PR.
- CI precache-budget assertion (see §5).

## 9. Deployment & operations

- **`ci.yml`** — test + build on every PR.
- **`deploy.yml`** — build + deploy to GitHub Pages on push to `main`.
- **`sync.yml`** — weekly scheduled content sync; opens a PR with the content diff for human review.
- `public/CNAME` = `digiresi.g0v.tw`.
- README documents the one-time DNS step: PR to g0v's domain repo pointing `digiresi.g0v.tw` at GitHub Pages.

## 10. Repository layout

```
digiresi.g0v.tw/
├── astro.config.mjs
├── package.json
├── sync.config.yaml            # curation manifest
├── scripts/
│   └── sync-content.mjs        # HackMD-archive → content collection sync
├── src/
│   ├── content/handbook/       # synced pages (committed)
│   ├── data/events.yaml        # hand-maintained event timeline
│   ├── pages/                  # portal pages + handbook routes
│   ├── layouts/  components/  styles/
├── public/                     # icons, manifest, CNAME
├── tests/                      # vitest unit + playwright e2e
└── .github/workflows/          # ci.yml, deploy.yml, sync.yml
```

## 11. Out of scope (v1)

- Full bilingual i18n (only `/en/` About page).
- Rendering event working notes on-site (timeline links out).
- Any server/backend component — the site is fully static.
- Automatic HackMD → site publishing without human review.
- User accounts, comments, analytics beyond simple privacy-friendly counting (if ever).

## 12. Open items for implementation phase

- Populate `events.yaml` from the 大全 master doc (one-time manual curation).
- Confirm the exact 18-doc sync list against the archive during manifest authoring (titles above are from the tag index).
- Icon/visual identity for the PWA manifest (design phase).
- DNS PR to g0v domain repo once first deploy is live.

## 13. Addendum (2026-07-17, post-design-import): DigiResiTh0n Design System

The visual design is defined by the **DigiResiTh0n Design System** Claude Design project, imported read-only into `design/` in this repo. Its `ui_kits/website/` kit is the recreation target for this site ("the site doesn't exist yet — this kit defines it").

**Revised IA (supersedes the §3 portal zone):**
- Nav: HOME (`/`) · SCHEDULE (`/schedule/`) · 手冊 HANDBOOK (`/handbook/`) + Register affordance (kit dialog, terminal-ACK style; shows the next event's registration info from events data, or 報名尚未開放 when none).
- `/` implements the kit Landing: pixel headline + terminal block + red slash + scanlines hero, marquee ticker, stats strip, tracks grid, who-should-come — with real DigiResiThon facts replacing the kit's SAMPLE data.
- `/schedule/` implements the kit Schedule for the next/most-recent event (day tabs, box-drawing timetable, blackout-drill alert, packing checklist) and absorbs the former `/events/` timeline as a 歷次活動 archive section (timeline + link out to HackMD).
- The kit's Projects view is NOT implemented (user decision: "swap /showcase/ to /handbook/") — the handbook takes its nav slot, reusing the kit's card + SYNC signal-bars motifs for section cards and offline status.
- `/about/` and `/en/` remain (per §3) as footer-linked pages in the same design language.

**Language reconciliation:** the DS readme's "EN-US copy only" rule is superseded for this site by the §2 language decision (zh-TW primary): informational copy is zh-TW set in the DS visual language (Cubic 11 pixel for TC headlines via `--font-pixel-tc`, IBM Plex Sans TC/Mono for body), while terminal meta-copy — statuses (`ONLINE/OFFLINE`), prompts (`$ join`), counters (`T-42 DAYS`) — stays EN as brand voice. `/en/` remains the English page.

**Design tokens & components:** ported from `design/tokens/*.css` (blackout dark default + paper light theme via `data-theme="light"`) and `design/components/**` (Logo, SignalBars, StatusDot, TerminalBlock, Marquee; Alert, Badge, Button, Card, Tabs) as Astro components + CSS — no React runtime ships to production.

**Fonts (supersedes §7 typography):** all self-hosted from `public/fonts/`, no CDN at runtime: Press Start 2P (EN pixel display), Cubic 11 俐方體11號 (TC pixel display, OFL, vendored from github.com/ACh-K/Cubic-11), IBM Plex Mono (labels/chrome), IBM Plex Sans TC (body; system TC stack as offline fallback). The kit's DotGothic16 fallback is dropped in favor of locally vendored Cubic 11. Display/mono fonts are precached; the body TC font is runtime-cached and excluded from the precache budget.

**Theme (supersedes §7):** dark ("blackout") is the default; light ("paper") only via the nav toggle setting `data-theme="light"`, persisted in localStorage. No automatic prefers-color-scheme switch.

**PWA identity:** manifest theme_color/background_color `#0c0c0b`; icons generated from `design/assets/logo/mark-dark.png`.
