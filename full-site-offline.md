---
id: ctgh94xpjy379xeehs4p1kac
title: Full-site offline PWA
status: implementation
source: "captain request"
started:
completed:
verdict:
score: 0.8
worktree: .worktrees/install-affordance
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

## Validation stage outcome (2026-07-25)

Fresh validator, did not build this. Worktree `.worktrees/full-site-offline` at
`2626721`, 15 commits ahead of `main` (`f812556`). Everything below was re-run
independently; no number is copied from the implementation report.

### Verdict: REJECTED

Twelve of twelve offline ACs reproduce green, and the four falsification probes
I ran confirm the tests are real checks rather than tests that cannot fail. Two
of the three interactive ACs pass at the drive. **AC-I1 fails at the drive on
iOS**, for one line of CSS. That is the whole rejection; everything else in this
branch is in good shape and should not be touched.

### Offline acceptance criteria — reproduced

Clean run: `rm -rf dist && npm run build` (exit 0), then each suite.

| AC | Command / test | Exit | Actual |
|---|---|---|---|
| AC-1 | `precache-scope.test.mjs` "precaches every visitor-facing portal route" | 0 | pass; emitted keys include `/`, `about/`, `schedule/`, `projects/`, `en/` |
| AC-2 | same file, "keeps design-kits out of the precache" | 0 | pass; zero `design-kits/` keys in the emitted `dist/sw.js` |
| AC-3 | `npm run check:budget` | 0 | `TOTAL 101 files, 7971839 bytes (7785.0 KiB)` / `PASS: precache total 7971839 bytes <= 10485760` |
| AC-4 | `offline.spec.ts` landing page + `/about/` `/schedule/` `/projects/` `/en/` | 0 | 5 tests pass; each asserts route-specific copy plus title |
| AC-5 | "uncached portal route falls back to the offline page" (`/design-kits/`) | 0 | pass |
| AC-6 | "the offline page leads back to a route that works offline" | 0 | pass; lands on handbook with `navigator.onLine === false` |
| AC-7 | install-affordance presence + count-of-one tests | 0 | pass at `/`, `/schedule/`, `/en/`; exactly 1 on `/handbook/` |
| AC-8 | "handbook search returns results while offline" | 0 | pass; result href matches `/handbook/` |
| AC-9 | `search-scope.test.mjs` "indexes handbook pages only" | 0 | pass; 20 fragments, all `/handbook/` |
| AC-10 | `manifest-guards.test.mjs` start_url | 0 | pass; `start_url` is `/handbook/` |
| AC-11 | `manifest-guards.test.mjs` SAMPLE DATA | 0 | pass |
| AC-12 | full sweep | 0 | see below |

AC-12 sweep, real output:

```
npm run build        exit 0   precache  102 entries (7785.00 KiB)
npm run test         exit 0   Test Files 11 passed (11) / Tests 67 passed | 2 skipped (69)
npm run test:e2e     exit 0   34 passed (8.3s)
npm run check:budget exit 0   TOTAL 101 files, 7971839 bytes; PASS <= 10485760
npm run check:links  exit 0   PASS: 0 broken internal links (763 internal refs across 34 HTML files)
```

### Falsification probes — the tests can fail

Run in a disposable detached worktree, never in the feature worktree.

1. **AC-8's test genuinely fails without the `?ts` fix.** Checked out `3e1f758`
   (the commit that adds the test, before the fix in `2626721`), rebuilt clean,
   ran the search test: **1 failed** —
   `locator('#search .pagefind-ui__result-link')` "element(s) not found" after
   15 s. It fails for exactly the claimed reason: offline search returns nothing.
   The fix is real and the test is not vacuous.
2. **AC-5's retargeted fallback test genuinely fails.** Added
   `design-kits/**/*.html` to `precacheGlobs` at HEAD, rebuilt: the test fails —
   `getByText('目前離線')` "element(s) not found". The same build also flipped
   `precache-scope.test.mjs` "keeps design-kits out of the precache" to red.
   Retargeting preserved a real check.
3. **AC-4's root test genuinely fails.** Removed `index.html` from
   `precacheGlobs`, rebuilt: "the landing page renders offline" fails on
   `toContainText("網路斷了")`.

### Interactive acceptance criteria — live drive

Driven against `npm run preview` on `http://localhost:4321/` with real page
loads and screenshots I looked at, at 1280×900 and at iPhone 13 (390 CSS px),
online and with the context genuinely offline after warming the cache.

**AC-I2 — PASS.** Read while genuinely disconnected the status is accurate and
matches the site's voice. Observed strings, offline, cache warm:

- `/` (`lang="zh-Hant-TW"`): `OFFLINE — 網站已存，離線可用；設計元件庫需連線`, dot `data-state="offline"`.
- `/en/` (`lang="en"`): `OFFLINE — site saved, works offline. Design kits need a connection.`
- Online, warm: `✓ 網站已存離線可用；設計元件庫需連線` / `✓ Site saved, works offline. Design kits need a connection.`
- First visit, cold: `↓ 網站下載中…`.
- `/projects/` correctly gets the English string — the `lang="en"` case the
  implementer flagged and fixed in `dd5b44a` is right on the page.

I also drove `/design-kits/` offline and read the `/offline/` page as a visitor
sees it: it names design-kits as the page that needs a connection, lists what is
saved (首頁、關於、時程、專案、EN、手冊全文), and offers 開啟手冊 and 回首頁.
Both work while still offline.

**AC-I3 — PASS.** At 390 px the footer row wraps cleanly: status on its own
lines, then the affordance; no horizontal overflow, no overlap with the mark
logos or the attribution block. The status dot sits beside the second line of a
two-line message rather than the first — cosmetic, not damage.

**AC-I1 — FAIL.** The copy itself is correct and is not the problem: zh-Hant
`安裝離線版網站` / `iOS：用 Safari 的分享選單「加入主畫面」，整個網站即可離線使用`,
English `Save this site offline` / `iOS: Share menu in Safari, then Add to Home
Screen, to keep this site offline`, each rendering on the pages that declare the
matching `lang`. It reads as site-shaped and does not overclaim in words.

What fails is the affordance itself, on iOS. See the finding below.

### Findings

**F-1 — MATERIAL (breaks AC-I1). On iOS Safari the install affordance renders a
dead button that cannot install.**

`InstallHint.astro`'s iOS branch unhides the container and the manual
instructions, leaving `[data-install-btn]` with its `hidden` attribute set. But
`.btn { display: inline-flex }` in `global.css` overrides the UA agent's
`[hidden] { display: none }`, so the attribute does not hide it. Probed on a
live iPhone 13 context against the preview server:

```
beforeinstallpromptFired: false
btnHiddenAttr: true      btnDisplay: "flex"    btnBox: { w: 87, h: 45 }
iosHiddenAttr: false     iosDisplay: "block"
```

An iOS visitor therefore sees a button labelled 安裝離線版網站 / SAVE THIS SITE
OFFLINE sitting next to instructions telling them to use the share sheet.
`beforeinstallprompt` never fires on iOS, so `deferred` is null and tapping the
button does nothing. It is also in the accessibility tree as an operable button.
That is the affordance overpromising — a one-tap install that does not exist —
which is the failure mode AC-I1 names, expressed through presentation rather
than wording. The same defect also leaves the button on screen after a
successful Chromium install prompt, since `btn.hidden = true` is equally inert
until `appinstalled` hides the container.

The component's author already knew this hazard: `.install-hint[hidden] {
display: none; }` exists in the same style block precisely because
`display: inline-flex` defeats `[hidden]`. It was applied to the container and
missed on the button.

This is **pre-existing** — the same markup and CSS shipped on `main`. It is
recorded as material rather than waived because (a) ACs are end-state properties
of the shipped site, not properties of the delta, and AC-I1 is not satisfied in
the end state; (b) this feature multiplies the blast radius from one page
(`/handbook/`) to every page on the site; and (c) the affordance is the subject
of the feature.

**Fix (serves AC-I1)** — one line in `src/components/InstallHint.astro`'s style
block:

```css
.install-hint [hidden] { display: none; }
```

I verified this candidate in a disposable worktree: rebuilt and re-probed the
same iPhone 13 context, `btnDisplay: "none"`, `btnBox: { w: 0, h: 0 }`, and the
iOS instructions take the full row. Specificity is sufficient without
`!important`. Optionally worth a Playwright guard — "the install button is not
visible when the browser cannot install" is an objective behavioural fact and is
testable without automating AC-I1's tone, which stays interactive.

**F-2 — DECLINE (correct-but-disproportionate). `precache-scope.test.mjs`
hardcodes the root key as `"/"` and is not base-aware.**

Its sibling `manifest-guards.test.mjs` imports `getBase()`; this one does not.
Reproduced: rebuilt the branch with `BASE = "/digiresi.g0v.tw/"` and ran the new
unit tests with `SITE_BASE` set — `manifest-guards` and `search-scope` pass,
`precache-scope` fails with `expected [ 'handbook/', …(101) ] to include '/'`.

Declined rather than routed back: no AC is at risk, and a subpath deploy is not
a supported configuration today — `deployment.test.mjs` already pins
`const BASE = "/";` in `astro.config.mjs`, so moving to a subpath is a deliberate
multi-file change and this test is one more file in it.
**Promotion condition:** the day the site is moved to a subpath base, or a CI
lane builds one, this becomes material and must be fixed in the same change.
The fix is `expect(urls).toContain(getBase())`.

**F-3 — DECLINE (correct-but-disproportionate). The header's static
`ONLINE` chip contradicts the footer's `OFFLINE —` status on the same screen.**

Visible on the `/offline/` page while genuinely disconnected. `SiteHeader.astro`
renders `<StatusDot status="online" label="ONLINE" />`, unchanged since the init
commit — it is an event-status chip, not a connectivity indicator. No AC covers
it and this branch did not introduce it, but the two now sit on one screen for
the first time. **Promotion condition:** if the captain reads the header chip as
connectivity at the drive, it becomes a copy fix in its own right.

**F-4 — Observation, no action.** `.offline-row:empty { display: none; }` in
`SiteFooter.astro` is dead: the row always contains two components. Harmless.

### Site invariants — all four, with evidence

1. **Base path — HOLDS.** Reproduced the implementer's strongest claim rather
   than reading it. Rebuilt `2626721` in a disposable worktree with
   `const BASE = "/digiresi.g0v.tw/"` and parsed the emitted `dist/sw.js`:
   the root precache key becomes `/digiresi.g0v.tw/`, the fallback becomes
   `createHandlerBoundToURL("/digiresi.g0v.tw/offline/")`, the denylist becomes
   `/^\/digiresi.g0v.tw\/(?!handbook\/)/`, `manifest.webmanifest` carries
   `"start_url":"/digiresi.g0v.tw/handbook/"` and subpath icon URLs, and
   `design-kits` remains absent. The remaining portal keys stay relative
   (`about/`, `schedule/`, `projects/`, `en/`) and resolve against the worker's
   scope. The claim was accurate. The one base-unaware artifact found is a test
   file, F-2, not a route or an asset URL.
2. **Precache / search index — HOLDS, with the intended asymmetry.** Portal IN
   precache (`precache-scope.test.mjs`), OUT of the search index
   (`search-scope.test.mjs`, 20 fragments all `/handbook/`); `/design-kits/` OUT
   of both. Guarded in both directions, and probe 2 above shows the
   design-kits exclusion guard actually fires.
3. **Vitest glob — HOLDS.** `vitest.config.mjs` still excludes `.worktrees/**`.
   Evidenced positively, not by reading: `ls .worktrees/*/tests/unit/*.mjs`
   finds **20** sibling test files across the `custom-domain-migration` and
   `design-kits` worktrees, and `npx vitest list --filesOnly` at the main repo
   root collects **8** files, none of them from a sibling worktree. The run
   inside this worktree collected 11 files, all under its own `tests/unit/`.
4. **Playwright — HOLDS.** `playwright.config.ts` derives both `baseURL` and
   `webServer.url` from `getBase()`; `webServer.command` is `npm run preview`.
   The 34-test run resolved against that preview server, and my own live drive
   used the same server.

### Did any implementer claim turn out untrue or overstated?

Substantively, no — this is the most accurate implementation report I could have
asked for. Every load-bearing claim reproduced:

- **Base-path verification** — reproduced exactly, including the specific
  emitted values. Not faked by inspection.
- **Budget divergence** — reproduced from both ends. Built `main` (`f812556`)
  clean: **96 files, 7,816,274 bytes**, matching the design's figure to the byte.
  Branch: **101 files, 7,971,839 bytes**. Delta **+155,565**, exactly as
  reported. File count `96 → 101` is precisely the five new portal HTML files;
  no new file class appears. The extra bytes are HTML growth of already-precached
  files, as claimed: `handbook/` 288.1 → 340.3 KiB across the same 21 files,
  `offline/` 7.7 → 10.7 KiB, `_astro/` 347.6 → 348.7 KiB. Nothing unintended is
  precached. Worth adding: the five new pages themselves also came in ~13 KB
  above the design's prediction for the same footer reason, so the design's
  +84,159 under-counted on both sides, not just on existing files.
- **Root precache key is not degenerate** — confirmed against the generated
  `sw.js`: the key is `"/"`, the one absolute key in an otherwise relative
  manifest, and `/` renders offline.
- **Task 5's retargeted test still bites** — confirmed by making it fail.
- **Two self-reviewed findings, zero declines, no AC narrowed** — I read the
  whole diff against the plan for this. Nothing in the diff is unrequested
  except the `ignoreURLParametersMatching` line, which is the documented
  material AC-8 fix and is commented as such. AC-7 was implemented *stricter*
  than written (count-of-one at every asserted route, plus a count-of-one on
  `[data-offline-status]`), and AC-8 was widened from a non-existent "existing"
  test to a real one. No AC was narrowed to make a finding pass. Zero declines
  was an honest count for the implementation stage.

Two small inaccuracies, neither load-bearing:

- The report's budget note reads "97 shipped vs 101 counted globs + 1". The
  shipped precache is **102 entries** (build log: `precache 102 entries`);
  `check-budget.mjs` counts 101. The substance — under-measures by exactly one
  file, `manifest.webmanifest` — is correct; `97` is a stale design-stage number.
- "the run from inside this worktree collected 11 files, none from sibling
  worktrees" is true but weak evidence, since no `.worktrees` directory exists
  inside the worktree at all. The invariant does hold; see item 3 above for the
  check that could actually have failed.

### What a re-run needs to clear this

One fix, F-1, serving AC-I1: hide `[data-install-btn]` when its `hidden`
attribute is set. Nothing else in this branch needs to change. F-2 and F-3 are
declines with promotion conditions recorded and must not be fixed as part of
this correction round.

## Correction round 1 (2026-07-25)

Branch `fix/install-affordance` in worktree `.worktrees/install-affordance`,
cut from `origin/main` at `1a2962e` — the feature is already merged and live, so
this round corrects production, not an open branch. Three commits; F-3 escalated
and not yet committed.

**Captain override.** The validator declined F-2 and F-3 with promotion
conditions and wrote that they "must not be fixed as part of this correction
round". The captain overrode that and asked for all four. This is recorded so
the dispositions do not read as an ensign quietly ignoring them: both declines
were correct calls on the validator's part; the captain chose to do more than
the gate required. No acceptance criterion was narrowed or weakened by the
override.

### F-1 — MATERIAL, serves AC-I1 — FIXED (`8463339`)

`src/components/InstallHint.astro` style block gained
`.install-hint [hidden] { display: none; }`, alongside the container rule the
author had already written for the same hazard.

Test-first. Added a Playwright guard to `tests/e2e/offline.spec.ts` — an
iPhone user-agent context at 390 px asserting the manual instructions are
visible and `[data-install-btn]` is not. Watched it fail on the unfixed build,
for the right reason:

```
Error: expect(locator).toBeHidden() failed
Locator:  locator('[data-install-btn]')
Expected: hidden
Received: visible
  14 x locator resolved to <button hidden="" type="button" data-install-btn=""
       data-astro-cid-ncwmmf27="" class="btn btn-secondary btn-sm"> 安裝離線版網站 </button>
     - unexpected value "visible"
```

The button carrying `hidden=""` while resolving as visible is precisely the
defect. After the CSS fix the same test passes.

Live re-probe, reproduced independently rather than assumed — Playwright
`devices["iPhone 13"]` context against `npm run preview`, real page load of `/`:

```
beforeinstallpromptFired: false
rootHiddenAttr: false    rootDisplay: "flex"
btnHiddenAttr: true      btnDisplay: "none"    btnBox: { w: 0, h: 0 }
iosHiddenAttr: false     iosDisplay: "block"   iosBox: { w: 342, h: 41 }
```

Matches the validator's verified candidate exactly: `btnDisplay: "none"`,
`btnBox: {0,0}`, and the iOS instructions take the full row (342 px of the
397 px reported inner width, two lines). Specificity was sufficient without
`!important`, as the validator said.

### F-2 — declined by the validator, fixed under captain override (`d29f504`)

`tests/unit/precache-scope.test.mjs` now imports `getBase()` from
`scripts/lib/deploy-base.mjs` — the same import its sibling
`manifest-guards.test.mjs` already uses — and asserts
`expect(urls).toContain(getBase())` instead of a hardcoded `"/"`.

Reproduced the failure first. Set `const BASE = "/digiresi.g0v.tw/"` in
`astro.config.mjs`, rebuilt clean, ran with `SITE_BASE=/digiresi.g0v.tw/`:

```
FAIL tests/unit/precache-scope.test.mjs > service worker precache scope >
     precaches every visitor-facing portal route
AssertionError: expected [ 'handbook/', ...(101) ] to include '/'
  26|     expect(urls).toContain("/");
```

Byte-identical to the validator's reported reproduction. After the fix, the
same subpath build leaves exactly one failure in the whole unit suite —
`deployment.test.mjs > keeps Astro's browser base at the domain root`, which
deliberately pins `const BASE = "/";` and is *supposed* to fail when the config
is edited. That is the guard working, not a regression.

**`BASE` restored to `"/"` and rebuilt** before anything was committed;
`git diff astro.config.mjs` is empty and the full unit suite is green at
`BASE = "/"`. Site invariant 1 is intact.

### F-3 — escalated, then redirected by the captain — FIXED (`755941b`)

F-3 was first dispatched as "disambiguate the label minimally; do NOT make the
chip connectivity-aware". No relabel was clearly right, so it was escalated with
three options rather than guessed at. **The captain then withdrew that
instruction and asked for real behaviour: the chip reports live connectivity.**
The relabel options were dropped; no wording change was committed and then
built on. Recorded because the instruction genuinely reversed mid-round.

Two facts found during the escalation, both of which shaped the implementation:

- **`SiteHeader` is entirely lang-unaware.** `BaseLayout.astro:58` renders
  `<SiteHeader />` with no props while line 62 renders `<SiteFooter lang={lang} />`.
  Every header string is already bilingual-or-zh on `lang="en"` pages: the nav
  reads `首頁 HOME` / `時程 SCHEDULE`, and the register button is bare `報名` on
  `/en/` and `/projects/`. So a per-language header string is not a minimal
  relabel — it requires threading `lang` into the header and giving the whole
  header a language. A bilingual label matches the header's existing voice and
  needs no plumbing.
- **The chip's intent is under-specified in the record.** The only design
  evidence is the design-kits plan's website specimen
  (`docs/superpowers/plans/2026-07-20-design-kits.md:1849`):
  `STATUS · ONLINE · [ DAY 0 ] · T-42 DAYS · 2026.10.24 SAT`. "ONLINE" is
  terminal-aesthetic system/event chrome beside the event countdown. Nothing
  states whether it is about the project, the event, or is decoration — which is
  the fork that made this escalate rather than decide.

The first finding decided the language question: **labels are bilingual and
`lang` is NOT threaded into `SiteHeader`.** The second stopped being a blocker
once the chip became dynamic — a chip reporting live connectivity has a real
referent and cannot go stale, which is the falsifiability problem the static
options all had.

**What shipped.** `SiteHeader.astro` passes bilingual copy on data attributes
(`連線中 ONLINE` / `離線 OFFLINE`) and carries a blocking `is:inline` script,
placed after `</header>` so the element exists during parse. It uses the *same*
detection as `OfflineStatus` — `navigator.onLine` plus the `online`/`offline`
events — so the two components cannot disagree about state. The chip stays a
chip; the footer keeps the sentence.

**Test-first.** Watched fail on the unfixed build:

```
Error: expect(locator).toHaveAttribute(expected) failed
Locator:  locator('.site-header .status-dot')
Expected: "online"    Received: ""
  14 × locator resolved to <span class="status-dot status-dot--online">…</span>
     - unexpected value "null"
```

That first assertion only proves the attribute was absent, so the contradiction
itself was reproduced separately with a throwaway spec, genuinely offline after
warming the cache — and then deleted, not committed:

```
HEADER CHIP TEXT WHILE OFFLINE: "ONLINE"
FOOTER DOT STATE: offline
```

Header and footer disagreeing on one screen, which is F-3 exactly. The shipped
test asserts both the state and the agreement with the footer's dot, and
compares the chip text on `/` against `/en/` — that comparison is what would
catch a zh-only label shipping onto a `lang="en"` page.

**`StatusDot`'s contract — checked before changing, per the stop condition.**
`grep` over `src/` and `tests/` finds no reference to `.status-dot` or
`.status-dot--*` outside the component itself; the three other call sites
(`design-kits/website.astro:36`, `design-kits/components.astro:125-127`) pass
only `status`/`label`. **No existing prop changed meaning and no required prop
was added**, so no call site was affected and the stop condition did not fire.
The changes are additive: a `data-state` attribute, a `[data-sd-label]` wrapper
around the label text (one inline element in place of one text node — same
flex item, no styles), and a rest-spread so a caller can attach its own hooks.
Colours moved from `.status-dot--{status}` to `[data-state="…"]` so a runtime
state change is one attribute write rather than a class swap plus a text patch.

Verified the specimens render identically rather than assuming it — computed
styles read off `/design-kits/components/`:

```
online   rgb(43, 213, 118)  animation drt-blink
degraded rgb(255, 176, 32)  animation none
offline  rgb(255, 70, 51)   animation none
```

Unchanged from the modifier-class rules they replace. One deliberate addition:
`[data-state="offline"] .sd-blink { animation: none; }`, so a chip that flips to
offline at runtime goes solid — a blinking red dot reads as an alarm, and the
footer's offline dot is solid.

**No flash, and which SSR default.** Server-rendered state is `online`.
`navigator.onLine` is client-only, and a visitor who fetched the page over the
network *is* online, so the common case never flips; the offline case — a
visitor opening the site from the precache — is corrected before first paint by
the blocking inline script, the same pattern as BaseLayout's theme init.
Measured rather than assumed: an init-script poll firing at the earliest moment
the element exists on an online load observed `online:連線中 ONLINE` and nothing
else.

**Re-driven at both widths, both states**, against `npm run preview`:

| | text | dot | chip width | header height |
|---|---|---|---|---|
| 1280 online | `連線中 ONLINE` | `rgb(43,213,118)` | 114 px | 66 px |
| 1280 offline | `離線 OFFLINE` | `rgb(255,70,51)` | 109 px | 66 px |
| 390 online | `連線中 ONLINE` | `rgb(43,213,118)` | 114 px | 157 px |
| 390 offline | `離線 OFFLINE` | `rgb(255,70,51)` | 109 px | 157 px |

The label is 5 px *narrower* offline, so no state widens the header. At 390 px
the page reports 7 px of horizontal overflow (`scrollWidth` 397 vs 390, from
`nav`/`.nav-link`) — **pre-existing and not caused by this change**: rebuilt
with the F-3 edits stashed and measured the same 397 px and the same 157 px
header height. Untouched, as this is a correction round.

**One consequence left deliberately alone.** `design-kits/website.astro`'s
header specimen still hardcodes `<StatusDot status="online" label="ONLINE" />`,
so it no longer mirrors the real header's copy. Changing it is a design-kits
edit outside this round's scope; it remains a valid static specimen of the
component. Flagged here rather than fixed.

### F-4 — observation, fixed under captain override (`7872b6d`)

Removed `.offline-row:empty { display: none; }` from `SiteFooter.astro`.
Confirmed dead before removing rather than assuming: parsed all 34 emitted HTML
files in `dist/` and found `.offline-row` present in 34 and empty in 0. The
selector could not match, so removal cannot change rendering. The validator's
observation was correct.

### Verification (real output, clean build, after all four commits)

| Command | Exit | Result |
|---|---|---|
| `rm -rf dist && npm run build` | 0 | clean |
| `npm run test` | 0 | Test Files 11 passed (11) / Tests 67 passed, 2 skipped (69) |
| `npm run test:e2e` | 0 | 36 passed (9.5s) — 34 at validation, plus the F-1 and F-3 guards |
| `npm run check:budget` | 0 | `TOTAL 101 files, 8006501 bytes`; `PASS: <= 10485760` |
| `npm run check:links` | 0 | `PASS: 0 broken internal links (763 internal refs across 34 HTML files)` |

Precache total moved 7,971,839 → 8,006,501 bytes (+34,662): the F-1 CSS rule
plus the header's inline connectivity script and its copy attributes, which land
in all 34 precached HTML files. File count unchanged at 101. Headroom
2,479,259 bytes (2.36 MB) against the 10 MB ceiling.

### Site invariants

1. **Base path — HOLDS, and F-2 improved it.** `astro.config.mjs` is back at
   `const BASE = "/";` (verified by an empty `git diff` on that file, not by
   reading it), and the one base-unaware file the validator found is now
   base-aware.
2. **Precache / search index — unchanged.** No glob touched; the design-kits
   exclusion guard and the search-scope guard both still pass.
3. **Vitest glob — unchanged.** `vitest.config.mjs` untouched; the run collected
   11 files, all under this worktree's `tests/unit/`.
4. **Playwright — HOLDS.** Both new guards resolve against the same
   `webServer`-managed preview as the rest of the suite. The F-1 guard sets only
   `userAgent` and `viewport` via `test.use`, and the F-3 guard navigates with
   relative paths through `baseURL` and derives its cache probes from
   `getBase()` — neither adds a path assumption.

### Anything in the validator's report that turned out wrong

Nothing. Every claim I acted on reproduced: F-1's mechanism and its verified fix
values (`btnDisplay: "none"`, `btnBox: {0,0}`, no `!important` needed), F-2's
exact assertion message, F-3's header/footer contradiction, and F-4's deadness.
This is the second stage in a row whose report survived independent
reproduction intact.

One nuance the validator's F-3 write-up understates: it describes the chip as
"an event-status chip, not a connectivity indicator", but nothing in the repo
ever said which it was — the only evidence is a design-kit specimen line. The
observation that the two contradict each other was correct; the attribution of
intent was an inference, and the captain resolved it the other way.

### Not done

- Nothing else in the branch was touched. No cleanup pass was taken. The
  design-kits header specimen's stale `label="ONLINE"` is flagged under F-3 and
  deliberately left.
- The pre-existing 7 px horizontal overflow at 390 px (from `nav`) was measured,
  confirmed unrelated to this round, and left alone.
- Branch is local: not merged, not pushed. The captain decides how it lands,
  because merging deploys to production.

## Re-validation (2026-07-25)

Fresh re-validator; did not build the fixes and did not write the original
validation. `fix/install-affordance` is merged: `main` is at `22aed8b` and this
is what is deployed, so everything below was run against the main checkout at
that commit, from a clean `rm -rf dist && npm run build`. Scoped per the
README's small-change fast path — AC-I1 re-judged at a live drive, each of the
four fixes reproduced, and a regression sweep. The twelve offline ACs and the
four falsification probes from the first validation were not re-run.

### Verdict: PASSED

AC-I1 passes at the drive. All four fixes do what the correction round claims,
reproduced independently. Both new guards were made to go red. Nothing material
was refuted; no new finding rises above an observation.

### AC-I1 — live drive, iPhone 13 @ 390 px

Playwright `devices["iPhone 13"]` against `npm run preview`, real page load of
`/`, screenshots looked at. `beforeinstallprompt` does not fire in this context,
so it is the genuine iOS branch:

```
beforeinstallpromptFired: false     innerWidth: 397
rootHiddenAttr: false   rootDisplay: "flex"
btnHiddenAttr: true     btnDisplay: "none"    btnBox: { w: 0, h: 0 }
iosHiddenAttr: false    iosDisplay: "block"   iosBox: { w: 342, h: 41 }
playwright btn visible: false       ios visible: true
```

`btnDisplay` and `btnBox` match the correction round's reported values exactly.
The button is also gone from the accessibility tree — an aria snapshot of the
footer lists no button node for 安裝離線版網站; the only offline-affordance text
is the share-sheet line. What an iOS visitor sees is instructions and nothing
else, which is what F-1 broke.

On `/en/` the same context gives `btnDisplay: "none"`, `btnBox: {0,0}`, button
text `Save this site offline`, and the visible instruction
`iOS: Share menu in Safari, then Add to Home Screen, to keep this site offline`.
Copy is site-shaped in both languages and no longer overpromises in either
wording or presentation. **AC-I1 — PASS.**

I also checked the direction nobody tested, since over-hiding is the obvious way
a `display: none` fix could go wrong: on a context that *can* install (synthetic
`beforeinstallprompt`), the button becomes `display: "flex"`, `119 × 30`, the
iOS hint hides, and after the prompt is accepted the button correctly goes to
`display: "none"`. The fix hides only what should be hidden, and it does close
the second half of the defect the report claimed for it.

### Falsification — both new guards go red

Disposable detached worktree at `22aed8b` outside `.worktrees/`, removed
afterwards.

1. **F-1 guard.** Deleted the single line `.install-hint [hidden] { display:
   none; }` from `InstallHint.astro`, rebuilt clean:

   ```
   Error: expect(locator).toBeHidden() failed
   Locator:  locator('[data-install-btn]')
   Expected: hidden   Received: visible
     14 × locator resolved to <button hidden="" type="button" data-install-btn=""
          data-astro-cid-ncwmmf27="" class="btn btn-secondary btn-sm"> 安裝離線版網站 </button>
        - unexpected value "visible"
   ```

   Byte-identical to the failure the correction round recorded watching.

   **Procedural note against my own first attempt:** the same revert initially
   reported `1 passed`, because a preview server I had left running on 4321 from
   the main checkout was reused by Playwright's `webServer`, so the test drove
   the *fixed* build. Killing it produced the failure above. Recorded because a
   green run under a stale server is exactly the way a falsification probe lies.

2. **F-3 guard.** Removed the `is:inline` connectivity script from
   `SiteHeader.astro`, rebuilt clean: the header-chip test fails at the offline
   assertion, `toContainText("OFFLINE")` receiving `連線中 ONLINE` from a chip
   still carrying `data-state="online"`. The guard binds to real behaviour.

### F-3 — driven genuinely offline, both widths, three routes

Cache warmed over `/`, `/en/`, `/projects/`, `/about/`, `/schedule/`,
`/handbook/`, `/offline/`, then `context.setOffline(true)`. Header chip and
footer status agree everywhere:

| viewport | route | `html lang` | chip | chip dot | footer state | footer text |
|---|---|---|---|---|---|---|
| 1280 | `/` | zh-Hant-TW | `離線 OFFLINE` | `rgb(255,70,51)`, animation `none` | `offline` | `OFFLINE — 網站已存，離線可用；設計元件庫需連線` |
| 1280 | `/en/` | en | `離線 OFFLINE` | same | `offline` | `OFFLINE — site saved, works offline. Design kits need a connection.` |
| 1280 | `/projects/` | en | `離線 OFFLINE` | same | `offline` | same English string |
| iPhone 13 | `/`, `/en/`, `/projects/` | — | `離線 OFFLINE` | same | `offline` | as above |

Online and warm, both widths: chip `連線中 ONLINE`, dot `rgb(43,213,118)`,
animation `drt-blink`, footer `✓ 網站已存離線可用；設計元件庫需連線`. The
contradiction F-3 named is gone, and the bilingual label is neither broken nor
zh-only on the two `lang="en"` pages — it is the same string the header uses
everywhere, matching the header's existing bilingual voice (首頁 HOME).

**No flash, confirmed by measurement not by argument.** An init-time poll
installed before any document script, sampling every animation frame until
`readyState === "complete"` plus a settle tick, recorded exactly one distinct
state on an online load of `/` at both widths:
`["online:連線中 ONLINE"]`. The SSR default is never visibly corrected.

### F-3 — `StatusDot`'s other callers

Computed styles read off a live `/design-kits/components/`:

```
online    rgb(43, 213, 118)   animation drt-blink   10px × 10px
degraded  rgb(255, 176, 32)   animation none        10px × 10px
offline   rgb(255, 70, 51)    animation none        10px × 10px
```

Identical to the correction round's figures and to the modifier-class rules they
replace. `/design-kits/website/` renders two dots — the real header's dynamic
one and the specimen's static `ONLINE` — both green and blinking. `grep` over
`src/` and `tests/` confirms nothing outside `StatusDot.astro` references
`.status-dot--*`, so moving the colours onto `[data-state]` affected no caller.

### F-2 — `BASE` is really restored, and the fix really works

`astro.config.mjs:12` is `const BASE = "/";` in the shipped config, and
`git status --porcelain` at the repo root is empty, so nothing is uncommitted on
top of it. Full unit suite at that base: **11 files, 67 passed, 2 skipped**.

The fix's substance was checked rather than assumed: in the disposable worktree,
set `const BASE = "/digiresi.g0v.tw/"`, rebuilt clean, ran with
`SITE_BASE=/digiresi.g0v.tw/` — **1 failed | 66 passed | 2 skipped**, and the
one failure is `deployment.test.mjs > keeps Astro's browser base at the domain
root`, the guard that deliberately pins `const BASE = "/";`.
`precache-scope.test.mjs` passes at the subpath, which it could not do before.
Exactly as reported.

### F-4

`.offline-row:empty` is gone from `SiteFooter.astro`; the footer renders
unchanged at both widths in every drive above.

### Regression sweep — clean build, real output

| Command | Exit | Result |
|---|---|---|
| `rm -rf dist && npm run build` | 0 | clean |
| `npm run test` | 0 | Test Files 11 passed (11) / Tests 67 passed, 2 skipped (69) |
| `npm run test:e2e` | 0 | 36 passed (9.4s) |
| `npm run check:budget` | 0 | `TOTAL 101 files, 8006501 bytes (7818.8 KiB)` / `PASS: <= 10485760` |
| `npm run check:links` | 0 | `PASS: 0 broken internal links (763 internal refs across 34 HTML files)` |

Precache total 8,006,501 bytes — matches the correction round's figure to the
byte. 101 files, unchanged.

### Site invariants

1. **Base path — HOLDS.** Parsed the emitted `dist/sw.js`: 102 precache
   entries, root key `"/"`, `createHandlerBoundToURL("/offline/")`, denylist
   `/^\/(?!handbook\/)/`. The subpath rebuild above is the check that could have
   failed and did not; the one base-unaware file the first validation found is
   now base-aware.
2. **Precache / search index — HOLDS.** Portal keys `/`, `about/`, `schedule/`,
   `projects/`, `en/`, `offline/`, `handbook/` all present in the emitted
   manifest; `grep -c design-kits dist/sw.js` is **0**. `search-scope` still
   green. Neither fix touched a glob.
3. **Vitest glob — HOLDS,** evidenced positively rather than by reading:
   `ls .worktrees/*/tests/unit/*.mjs` finds **29** sibling test files, and
   `npx vitest list --filesOnly` at the repo root collects **11**, all under
   `tests/unit/`. None from a sibling worktree.
4. **Playwright — HOLDS.** Both new guards resolve through `baseURL` and the
   `webServer`-managed preview; the F-1 guard sets only `userAgent` and
   `viewport`. No path assumption added. (See the falsification note above for
   the one way this can be undermined — a stray preview server, which is an
   operator hazard, not a config defect.)

### Findings

**Nothing material. Nothing to route back.** One observation:

**R-1 — Observation, no action. The chip's `status-dot--online` modifier class
goes stale when the state flips.** The inline script rewrites `data-state` and
the label but leaves `class="status-dot status-dot--online"` in place, so an
offline chip carries an `--online` class. It has no rendering effect — all
colour rules key off `[data-state]` and nothing anywhere selects
`.status-dot--*` — and the component's own comment documents the choice. It is
recorded only because it is a latent trap for a future selector or test that
reaches for `.status-dot--offline` and finds it never appears.

### Anything the correction round claimed that did not hold

**Nothing.** Every claim I reproduced came out at the same values, several to
the byte: F-1's `btnDisplay: "none"` / `btnBox: {0,0}` / `iosBox: {342, 41}`,
the F-1 guard's exact failure text on the unfixed build, F-2's single remaining
subpath failure being `deployment.test.mjs`, F-3's specimen colours and blink
states, the 8,006,501-byte precache total, and the 36-test e2e count. The two
open items the dispatch named are still true as recorded — the design-kits
website specimen still hardcodes `label="ONLINE"`, and the 390 px horizontal
overflow (`scrollWidth` 397 vs 390) is present and unrelated to these edits.

The only thing worth adding to the record is a gap in coverage rather than an
error: the correction round verified that the F-1 fix hides the button, and
never verified that it still *shows* the button on a browser that can install.
It does — I checked — but that half was taken on faith, and a `display: none`
rule with one character more specificity than intended would have shipped a site
where nobody can install at all, with every test still green.
