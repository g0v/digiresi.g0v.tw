# design-kits guideline pages + ui_kits/website port — Design Spec

**Date:** 2026-07-20
**Status:** Approved sketch, pre-implementation
**Companion plan:** `docs/superpowers/plans/2026-07-20-design-kits.md` (to be written by the writing-plans skill)

## 1. Overview

Three things ship together:

1. **Refresh `design/`** from the Claude Design project (`0fdea157-882d-4628-8b39-a15b29bb8d77`) via the DesignSync MCP — specifically `ui_kits/website/**` and any drift in tokens/components. `design/` stays a read-only reference tree; nothing in it runs at build time.
2. **`/design-kits/` public route** on the Astro site — a self-hosted design-system reference so anyone forking the repo can browse tokens, components, and patterns without a Claude Design login. Doubles as the credit page for the logo/logotype.
3. **`ui_kits/website` port** — finish porting the Website canvas (`design/ui_kits/website/index.html` → `Website.jsx` → `Landing.jsx` + `Schedule.jsx` + `Projects.jsx`) into Astro. `Landing` and `Schedule` are already ported; this spec adds `Projects`, the register dialog, and the theme toggle, and consolidates the whole thing into a `/design-kits/website/` specimen.

After implementation, the entire design pack is reusable outside Claude Design: `design/` is a static reference, and `/design-kits/**` renders every component/page with live Astro code.

## 2. Non-goals (YAGNI)

- Not replacing existing zh-TW handbook content with EN. Site chrome stays zh-TW; design-kits pages are EN (matches the design system's own language).
- Not building a projects backend. The six projects from `Projects.jsx` are carried as sample data with a visible `SAMPLE DATA` badge, matching the convention already used on `/schedule/`.
- Not editing `design/*.jsx` sources. They stay as read-only reference. Rendering moves to Astro.
- Not deleting `design/ui_kits/website/index.html`. It's the upstream artefact from Claude Design; `IMPORT-NOTES.md` documents that the CDN-loading HTML is intentionally not runnable locally, and `/design-kits/website/` is its self-contained replacement.
- No linked URL for YellowOne yet — plain text attribution with a TODO grep-marker to fill in later.

## 3. Attribution & licensing

The repo currently declares one blanket license for content (CC BY 4.0). Logo + logotype are a separate work by **YellowOne** under **CC BY-SA 4.0** and need calling out wherever the asset appears or is documented.

| Location | Change |
|---|---|
| `design/assets/logo/LICENSE.md` (new) | "Logo mark, wordmark, and lockup © YellowOne, licensed under CC BY-SA 4.0. Source: DigiResiTh0n Design System (Claude Design project)." Locally-added sibling file; survives re-imports because DesignSync writes only listed paths. |
| `README.md` | Split licensing into three bullets: **code** (repo LICENSE), **handbook content** (CC BY 4.0, from g0v pads), **logo & logotype** (© YellowOne, CC BY-SA 4.0). |
| `src/components/SiteFooter.astro` | Append one mono line: `LOGO © YELLOWONE · CC BY-SA 4.0`. |
| `src/pages/design-kits/logo.astro` | Full attribution block: license text, note that derivative works must also be CC BY-SA 4.0, downloads for mark/wordmark/lockup, TODO comment for the YellowOne URL. |
| `design/IMPORT-NOTES.md` | Dated entry noting the re-import from `0fdea157-…` and that `assets/logo/LICENSE.md` is locally-added, not upstream. |

`design/readme.md` is **not** edited (import-source; edits would fight the next sync). Attribution lives in the sibling `LICENSE.md`.

## 4. `/design-kits/` route — public design-system reference

Seven pages, all in the portal zone (online-first, excluded from PWA precache and from Pagefind's index):

| Path | Content |
|---|---|
| `/design-kits/` | Overview: rules of the world (radius 0, 2px borders, hard shadows, stepped motion, no emoji, red-as-signal), quick nav to sub-pages, source of truth link to `design/readme.md`. |
| `/design-kits/logo/` | Mark, wordmark, lockup. Dark + light previews. Downloads. **Prominent YellowOne CC BY-SA 4.0 attribution.** |
| `/design-kits/colors/` | Base palette + semantic tokens. Dark and light side-by-side. Callouts for the two-accent rule and the "red is a signal, not decoration" limit. |
| `/design-kits/typography/` | Press Start 2P + IBM Plex Mono. Pixel grid (`--px-*` steps). Size/leading table for both faces. TC fallback note (`--font-pixel-tc` Cubic 11). |
| `/design-kits/components/` | Live specimens: Button (variants + sizes), Card (default + lifted + offline), Badge (all statuses), Alert (tones), Input/Select/Checkbox, SignalBars (levels 1–4), StatusDot (online/degraded/offline), TerminalBlock, Marquee, Tabs. |
| `/design-kits/patterns/` | Scanlines, box-drawing headers, the 45° slash, motion tokens (`--dur-*`, `--ease-step-*`), stripe-caution, checker placeholders. |
| `/design-kits/website/` | Full ui_kits/website specimen — header + Landing + Schedule + Projects + Register dialog + theme toggle — rendered by the same Astro components the live site uses (component-inlined, not iframed). |

**Navigation** within `/design-kits/**` handled by a shared `DesignKitsNav.astro` (top or left rail; picked at implementation time based on width). Linked from `SiteFooter.astro` under "COLOPHON".

## 5. `ui_kits/website` port — completing the live site

Canvas source lives in `design/ui_kits/website/`. Port status:

| Canvas source | Lands as | Status |
|---|---|---|
| `Website.jsx` shell (nav, theme toggle, register) | `SiteHeader.astro` (theme + nav) + `RegisterDialog.astro` | Header exists; theme toggle + register wiring **new** |
| `Landing.jsx` | `src/pages/index.astro` | Already ported; add register CTA wiring |
| `Schedule.jsx` | `src/pages/schedule.astro` | Already ported; no change |
| `Projects.jsx` | `src/components/Projects.astro` + `src/data/projects.yaml` + `src/pages/projects.astro` | **New** |
| `core/Tabs.jsx` | `src/components/Tabs.astro` | **New** (used by Projects) |
| `SAMPLE.targetDate` countdown | Existing upcoming-event countdown on index | No change |

**Theme toggle:**
- Button in `SiteHeader`, sun/moon pixel icon, toggles `document.documentElement.dataset.theme` between `light` and unset (dark default).
- Persisted in `localStorage["digiresi:theme"]`.
- **No-flash init**: inline `<script>` in `BaseLayout.astro` `<head>` reads localStorage and stamps `data-theme` before first paint. Small enough to inline; runs before styles.

**Register dialog:**
- Opens from any `Register` CTA when the current `upcoming` event has a `registerUrl`. If no upcoming event or no URL, the CTA links to the next event's HackMD instead (existing fallback).
- Backdrop + ESC dismiss. Focus trap on open. Returns focus to the opening button on close.
- Mono form styling matches canvas (Callsign / Email / Track / Battery-pack checkbox / Submit + Cancel).

**Nav extension:**
Current: HOME · HANDBOOK · SCHEDULE · ABOUT.
New: HOME · HANDBOOK · SCHEDULE · PROJECTS · ABOUT · DESIGN. "DESIGN" points to `/design-kits/`.

## 6. File layout

**New:**
```
src/pages/design-kits/
├── index.astro
├── logo.astro
├── colors.astro
├── typography.astro
├── components.astro
├── patterns.astro
└── website.astro
src/pages/projects.astro
src/components/
├── DesignKitsNav.astro
├── DesignSpecimen.astro   # framed viewport wrapper (viewport pill + reset button)
├── ThemeToggle.astro
├── Projects.astro
└── Tabs.astro
src/data/projects.yaml
design/assets/logo/LICENSE.md
```

**Modified:**
- `src/components/SiteHeader.astro` — ThemeToggle, extend nav
- `src/components/SiteFooter.astro` — YellowOne attribution line
- `src/layouts/BaseLayout.astro` — no-flash theme init script
- `src/pages/index.astro` — wire Register CTA to shared RegisterDialog
- `astro.config.mjs` (PWA config) — exclude `/design-kits/**` + `/projects/` from precache
- `pagefind.yml` — exclude the same paths from search
- `README.md` — three-way license split
- `design/IMPORT-NOTES.md` — dated re-import entry

## 7. Testing

- **Unit (Vitest)** — none new. Specimen pages are presentational; no new pipeline transforms.
- **E2E (Playwright)** — new specs:
  - Theme toggle flips `data-theme` and persists across reload.
  - `/design-kits/` reachable; all sub-pages return 200.
  - `/projects/` reachable with `SAMPLE DATA` badge visible.
  - Register dialog opens/closes; ESC and backdrop dismiss; focus returns to opener.
  - **Regression:** existing `/handbook/**` offline spec still passes (design-kits must NOT enter precache).
- **`npm run check:budget`** — verify `/design-kits/**` + `/projects/` are excluded from precache manifest (specimen images would blow the 10 MB budget).
- **`npm run check:links`** — includes new pages.
- **`npm run check`** — astro type check across new files.

## 8. Rollout order (drives plan sequence)

1. DesignSync refresh from `0fdea157-…` + `design/IMPORT-NOTES.md` update.
2. `design/assets/logo/LICENSE.md` + `README.md` license split + `SiteFooter` attribution line.
3. `ThemeToggle.astro` + no-flash init in `BaseLayout.astro` + toggle in `SiteHeader.astro`.
4. `src/data/projects.yaml` + `Projects.astro` + `Tabs.astro` + `src/pages/projects.astro`.
5. `RegisterDialog` wiring on `index.astro` (existing component; just connect the CTA).
6. `/design-kits/**` pages, in order: index → logo → colors → typography → components → patterns → website.
7. PWA + Pagefind exclusions; run `check:budget` and `check:links`.
8. E2E specs (theme, design-kits reachability, register dialog, projects sample banner) + regression run.

## 9. Open questions / TODOs

- **YellowOne URL** — plain text for now; TODO comment in `design-kits/logo.astro` so it's grep-able when the URL arrives.
- **DesignKitsNav layout** — sidebar vs. top rail decided at implementation time based on the components-page density; both work with the current tokens.
- **`design/ui_kits/website/index.html`** kept as upstream artefact. If it starts confusing contributors, follow-up: emit a static rendered snapshot into `design/ui_kits/website/rendered.html` from the Astro build. Out of scope for this spec.
