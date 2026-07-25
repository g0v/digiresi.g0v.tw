---
id: ctgh94xpjy379xeehs4p1kac
title: Full-site offline PWA
status: implementation
source: "captain request"
started:
completed:
verdict:
score: 0.8
worktree: .worktrees/full-site-offline
issue:
pr:
mod-block:
---

## Problem

The site offers a single "save this for offline" affordance — the install button in `InstallHint.astro`, labelled 安裝離線手冊 — and a visitor who taps it reasonably comes away believing digiresi.g0v.tw will work the next time they open it without a connection. It does not. Only `/handbook/` survives disconnection. Every other route a visitor can reach from the header — the landing page at `/`, `/about/`, `/schedule/`, `/projects/`, the design-kits tree, and the whole `/en/` locale — is served network-first, so offline they collapse into the same generic `/offline/` fallback page. The gap is worst precisely where it hurts: someone browsing the schedule on venue wifi that drops, or an English-reading visitor who installed the app after reading `/en/`, loses the page they were just looking at, with no signal beforehand that this page was not among the saved ones. The captain's framing — "the whole website ... even when they are disconnected" — names the same gap from the outside: the promise the install button makes is site-shaped, and the delivery is handbook-shaped.

This reads as a problem regardless of how it is solved. Narrowing the button's copy to say only the handbook is saved would also close the gap between promise and delivery; so would saving more of the site. Which direction is right is the captain's call, and that is what makes this a real gate decision rather than a glob edit.

## Sketch of the user-visible change

A visitor who saves digiresi.g0v.tw and later opens it with no connection gets the site, not a fallback notice: the pages they can normally navigate to load from the device, with the same layout, fonts, and images they saw online. Where a page genuinely cannot be served offline, they are told which parts are available rather than being dropped onto a dead end. The install affordance's copy matches whatever that saved scope actually turns out to be, in both zh-Hant and English, so a visitor's expectation after tapping it is the one the site can keep.

## Open questions for design

1. **Does "the whole website" include the reference and specimen routes?** Commit `40a5d07` deliberately excluded `/design-kits/` and `/projects/` from both precache and the search index, and README invariant 2 encodes that exclusion as standing policy. Reversing it is a policy change, not an oversight fix — does the captain intend these routes to be saved, or is "the whole website" the visitor-facing portal only?
2. **Is the 10 MB precache budget the ceiling or a parameter?** `scripts/check-budget.mjs` fails CI when the expanded precache globs exceed 10 MB. Adding every portal page, and especially design-kits imagery, may breach it. Does the scope narrow to fit the budget, or does the budget move — and if it moves, to what, and on what reasoning?
3. **Where should the installed app open?** The manifest's `start_url` is `${BASE}handbook/`. An installed "whole site" arguably launches at `/`. Changing it changes the launch destination for everyone who has already installed the app, silently, on their next update.
4. **What should the install button say?** 安裝離線手冊 promises an offline handbook. If the saved scope becomes the site, that string and its English counterpart change; if the scope stays handbook-only, the string may still need to change to stop over-promising. Either way the copy decision belongs with the scope decision, not after it.
5. **Is the `/en/` tree in or out?** Including the English locale roughly doubles the precached HTML and interacts directly with question 2. Excluding it means an English-reading visitor gets the least of the offline experience.
6. **What happens to the offline fallback routing, and to `/offline/` itself?** The `navigateFallbackDenylist` regex and the NetworkFirst `portal-pages` route exist *because* portal pages are not precached. If they become precached, that routing needs rethinking, `/offline/` may become unreachable in normal use, and any existing test that exercises the fallback path changes meaning or stops being a real check.

## Design stage outcome (2026-07-25)

Spec: `docs/superpowers/specs/2026-07-25-full-site-offline.md`
Plan: `docs/superpowers/plans/2026-07-25-full-site-offline.md` — 14 tasks.
Both paths are under the gitignored `docs/superpowers/` tree, per existing repo
convention; they are not tracked. AC split: **12 offline, 3 interactive**.

### Question status

| # | State | Outcome |
|---|---|---|
| 1 | RESOLVED (captain) | Everything except `/design-kits/`. `/projects/` comes back in; design-kits stays out. Partial, deliberate reversal of `40a5d07`. |
| 2 | RESOLVED (measured) | Budget is not a live issue. Not moved. |
| 3 | RECOMMENDED — captain call | Leave `start_url` at `${BASE}handbook/`. |
| 4 | RECOMMENDED | Copy changes AND moves location; wording is an interactive AC. |
| 5 | RESOLVED (captain) | `/en/` in — and it is one page, not a locale mirror. |
| 6 | RESOLVED (investigated) | No routing change needed. `/offline/` stays reachable. One existing test must be retargeted. |

### Q2 — measured, not estimated

Against a clean `npm run build`:

- current precache: 7,816,274 bytes (7.45 MB, 96 files)
- expanded precache: 7,900,433 bytes (7.53 MB, 101 files)
- delta: **+84,159 bytes, 0.80% of the 10 MB budget**
- headroom remaining: 2,585,327 bytes (2.47 MB)

The budget does not move and scope does not narrow. Excluded `/design-kits/`
HTML is 152,193 bytes across 7 files — it would also have fit. Design-kits is
excluded on editorial grounds, not budget grounds.

### Q3 — recommendation: leave `start_url` alone

The handbook is the disaster-day payload, so an installed resilience app opening
into it is correct under duress. Changing it would relocate existing installs
**inconsistently**: Chromium re-reads the manifest and would move users silently;
iOS bakes `start_url` at add-to-home-screen time and would not. The app is also
named 數位韌性手冊 — moving the launch target without renaming the app is
incoherent, and renaming is a larger identity decision. If the captain wants `/`,
ship it as its own change together with the name.

### Q4 — recommendation: copy AND location

`InstallHint` and `OfflineStatus` render on `/handbook/` **only**. A visitor on
`/`, `/schedule/`, or `/en/` is never offered the install prompt at all — the
promise is not merely worded wrong, it is unreachable from most of the site.
Recommendation: move both into `SiteFooter`, use a site-shaped zh-Hant string,
and add an English counterpart keyed on the page's declared `lang`.

### Q6 — no routing change needed

Verified against the generated `dist/sw.js`: `precacheAndRoute` is registered
**before** the `NavigationRoute` and before the runtime routes, so a precached
portal route is served by the precache route. The `navigateFallbackDenylist`
keeps doing its existing job for `/design-kits/`, and the `NetworkFirst`
`portal-pages` route is not dead — it becomes exactly the design-kits route.
`/design-kits/` staying excluded is what keeps `/offline/` a live page.

`tests/e2e/offline.spec.ts`'s "uncached portal route falls back to the offline
page" drives `/schedule/` and **will fail** once `/schedule/` is precached. It
must be **retargeted to `/design-kits/`** — not deleted (that drops the only
fallback coverage) and not relaxed (that leaves a test which can no longer fail).

### Deliberate asymmetry: precache vs search index

Portal pages are **IN precache and OUT of the search index**. Pagefind indexes
20 fragments, all handbook, because handbook articles carry `data-pagefind-body`
and Pagefind then indexes only such pages. Search here answers "what do I do
about X" and the handbook holds the answers; indexing portal chrome dilutes
results. Recorded so a future reader does not read the asymmetry as an oversight
and "fix" it.

### Corrections to the stated grounding

- `_astro/*.js` matches **nothing** — `dist/_astro/` holds 1 CSS file and 443
  font files, no JS. Portal interactivity ships as inline module scripts inside
  the HTML, so precaching portal HTML precaches its behaviour too.
- `/en/` is a **single page** (8,935 bytes), not a locale tree. Question 5's
  "roughly doubles the precached HTML" premise was wrong.
- `/projects/` declares `lang="en"` — it is an English page, so language-aware
  install copy must cover it, not just `/en/`.
- `manifest.webmanifest` is auto-added to the precache by vite-pwa but is not
  matched by any glob, so `check-budget.mjs` under-measures by that file. The
  shipped manifest has 97 entries; the budget counts 96.
- vite-pwa rewrites `X/index.html` to `X/` in the manifest, so the root
  `dist/index.html` may emit a degenerate key. Given its own test-first task.

## Implementation stage outcome (2026-07-25)

Branch `feat/full-site-offline` in worktree `.worktrees/full-site-offline`,
15 commits, all 14 plan tasks landed plus one unplanned material fix.

### Verification (real output, clean build)

| Command | Exit | Result |
|---|---|---|
| `npm run build` | 0 | clean, from `rm -rf dist` |
| `npm run test` | 0 | 11 files, 67 passed, 2 skipped |
| `npm run test:e2e` | 0 | 34 passed |
| `npm run check:budget` | 0 | 101 files, 7,971,839 bytes <= 10,485,760 |
| `npm run check:links` | 0 | 0 broken links, 763 refs across 34 HTML files |

Precache delta: **+155,565 bytes** against a predicted +84,159. See
"Budget divergence" below — it is explained, not unanticipated.

### Site invariants

1. **Base path** — verified by building with `BASE = "/digiresi.g0v.tw/"` and
   reading the emitted `sw.js`: the root precache key becomes
   `/digiresi.g0v.tw/`, `navigateFallback` becomes `/digiresi.g0v.tw/offline/`.
   The root key tracks `BASE`; it is not a hardcoded `/`. Config restored.
2. **Precache / search index** — portal IN precache (`precache-scope.test.mjs`),
   OUT of the search index (`search-scope.test.mjs`); design-kits OUT of both.
   The asymmetry is deliberate and now guarded in both directions.
3. **Vitest glob** — `vitest.config.mjs` still excludes `.worktrees/**`; the run
   from inside this worktree collected 11 files, none from sibling worktrees.
4. **Playwright** — resolves `baseURL` and `webServer.url` from
   `getBase()`; run against the preview server as configured.

### What the plan got wrong

- **AC-8 had no task and no existing coverage.** The spec's "existing/extended
  Playwright coverage" for offline search was false — there was no search e2e
  test at all. Added one.
- **Offline handbook search never worked.** The new AC-8 test exposed a
  pre-existing defect: Pagefind fetches `/pagefind/pagefind-entry.json?ts=`,
  and workbox matches precache entries including the query string (its default
  `ignoreURLParametersMatching` covers only `utm_*`/`fbclid`), so the request
  missed the precache and offline search hung at 正在搜尋… forever. Fixed by
  adding `/^ts$/`. AC-8's word "still" was false before this feature.
- **The root precache key is not degenerate.** The predicted empty key does not
  occur; the build emits `"/"` — the one absolute key in an otherwise relative
  manifest. Task 3 needed no glob or workbox fix.
- **`/offline/` has no `h1`.** AC-4's rationale ("a visible h1, which the
  /offline/ fallback would also satisfy") is wrong in the other direction. The
  tests assert route-specific copy regardless, so the AC is unaffected.
- **The handbook index has no heading element at all**, so Task 6's escape test
  asserts the page's own content and title instead of a heading role.
- **Task 11 needed language-awareness the plan gave only to Task 10.** Task 9
  put `OfflineStatus` on every page, including the two that declare `lang="en"`,
  so a zh-only status string would have shipped onto `/en/` and `/projects/`.

### Budget divergence

Predicted +84,159 bytes; actual +155,565. The **file count matched the
prediction exactly (101)** — nothing unanticipated is being precached. The
extra 71,406 bytes is growth of already-precached HTML: Task 9 moved
`OfflineStatus` and `InstallHint` into `SiteFooter`, so all 21 handbook pages
plus `/offline/` now carry those inline scripts and copy attributes. The design
measured only the newly added files, not the footer's cost to existing ones.
Headroom remaining: 2,513,921 bytes (2.40 MB). The 10 MB ceiling is untouched.

`check-budget.mjs` still under-measures by one file (`manifest.webmanifest`,
97 shipped vs 101 counted globs + 1). Behaviour deliberately unchanged.

### Feedback Cycles

No review round was run at this stage, so no external findings were triaged.
Two findings surfaced during self-review; both were classed **material** and
fixed, because each breaks a declared acceptance criterion:

- **Offline search broken by the `?ts=` cache-buster** — material, breaks AC-8
  on a path every visitor reaches. Fixed in `2626721`.
- **`OfflineStatus` would render zh-Hant copy on `lang="en"` pages** — material,
  puts AC-I2 out of reach at the drive on `/en/` and `/projects/`. Fixed in
  `dd5b44a`.

No declines recorded. No acceptance criterion was narrowed. Nothing was
escalated as needs-decision.

### Left for validation

- AC-I1, AC-I2, AC-I3 are interactive and were NOT judged here. The install and
  status copy shipped as a defensible first draft, flagged for the captain's
  call at the drive.
- `start_url` remains `${BASE}handbook/`, now guarded by a test that fails if it
  drifts.
