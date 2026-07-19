# DigiResiTh0n Design System

Design system for **DigiResiTh0n** (Digital Resilience Hackathon) — a [g0v](https://g0v.tw) community hackathon about keeping people connected, informed, and coordinated when digital infrastructure fails: cut sea cables, downed cell towers, disasters, blackouts.

**Sources provided:** one raster logo (`uploads/IMG_8503.PNG`, background removed by the user). Everything else is built from the ground up around that mark, g0v community conventions, and the event's theme. These materials will become a **static event website**.

The logo is a wifi-off pictogram — signal arcs, a red 45° slash, the dot replaced by a bold **0** — with a pixel wordmark. The system grows from it: pixel headings, mono everything-else, terminal chrome, hard edges, blackout-dark by default, ink + paper + signal red + terminal green.

User decisions (from kickoff Q&A): event-site focus · **EN-US copy only** · both themes with **dark first** · red + one terminal-green accent · **pixel headings + mono body** · the 0 lives **only in the logo/lockup** · serious mission, playful voice · motifs: **signal bars, scanlines/CRT, ASCII/box-drawing**.

---

## CONTENT FUNDAMENTALS

**Language.** EN-US only. The event is Taiwanese (g0v); occasional 繁中 strings may appear in community content — the mono stack falls back to IBM Plex Sans TC and `--font-pixel-tc` (Cubic 11) exists for pixel-set TC, but all system copy is English.

**The zero rule.** The `0` belongs to the **logo/lockup only**. In text — including headlines — write **DigiResiThon** (display caps: `DIGIRESITHON`). Don't zero-fy other words (`c0mmunity` ✕). `g0v` keeps its zero (it's their name).

**Tone.** Serious mission, playful hacker voice. Civic, not corporate; imperative, not salesy. "We/you", never "users". Jokes live in the meta-copy (terminal prompts, status lines), not in safety-critical info. One `!` per screen, max. g0v canon applies: *"Don't ask why nobody is doing this. You are the 'nobody'."*

**Casing.**
- Mono labels: ALL CAPS + `--tracking-label`, often bracketed/prefixed: `[ DAY 0 ]`, `$ status --all`, `>> NEXT`.
- Pixel display: ALL CAPS always (Press Start 2P has no lowercase). Keep pixel headlines ≤ 3–4 words per line.
- Body: sentence case, plain mono.

**Meta-copy patterns.** Timestamps `2026.10.24 SAT 09:00` · counters `T-42 DAYS` · statuses `ONLINE / DEGRADED / OFFLINE` · prompts `$ join --track comms` · dividers `── // ──`. Terminal logs are a *voice*, not just decoration.

**Emoji: never.** Unicode geometry (`▲ ■ ● → ▶ ░ █`) and box-drawing (`┌ ─ ╔ ═ │`) do that job.

**Sample copy in this repo is placeholder** — dates (2026.10.24–25), venue, tracks, stats are invented for layout. ⚠ Replace with real event facts.

---

## VISUAL FOUNDATIONS

**Themes.** **Dark ("blackout") is the default** — near-black `#0C0C0B`, warm paper ink, scanline texture on hero/terminal panels. Light ("paper") is the secondary theme via `data-theme="light"` on `<html>` or any subtree (print, daylight signage). Both are first-class; components must only use semantic tokens (`--bg --surface --ink --accent …`) so they flip cleanly.

**Color.** Ink discipline. Two accents only: **signal red** (`--accent`, `#FF4633` on dark / `#C40000` on paper — from the logo slash) for actions, alerts, LIVE; **terminal green** (`--accent-2`, phosphor `#2BD576` on dark) for live data, prompts, ok-states. Red is a *signal, not a decoration* — >5% of a screen in red is shouting. Amber exists only as `--status-degraded`. Status trio: `ONLINE` green · `DEGRADED` amber · `OFFLINE` red.

**Type.** Two working faces:
- `--font-pixel` **Press Start 2P** — all headings/display. 8px grid: `--px-*` steps only (16/24/32/48/64), `-webkit-font-smoothing: none`, never below 16px.
- `--font-mono` **IBM Plex Mono** — *everything else*: body (15px/1.7), labels, buttons, tables, logs.
Support faces: `--font-pixel-tc` Cubic 11 (OFL, via jsDelivr) for pixel-set TC strings; `--font-sans` IBM Plex Sans TC opt-in for rare long prose. A screen pairs a mono kicker over a pixel headline over mono body.

**Space & layout.** 8px grid (`--sp-*`), container 1120px. Layouts are drawn like a schematic: visible 2px rules divide regions (circuit board / terminal panes), generous black space, no floating soft cards.

**Edges.** `border-radius: 0` everywhere (`--radius: 0px` makes the rule legible). Borders are structural: `--border` (2px). Dashed `--border-offline` means *offline / pending / placeholder*.

**Shadows.** Hard pixel offsets only: `--shadow-1` (3px), `--shadow-2` (6px), `--shadow-accent` (red). Lifted blocks press *into* their shadow on click.

**Patterns & motifs** (in priority order):
1. **Signal bars** — ascending rectangles (see `SignalBars`); the connectivity glyph of the brand.
2. **Scanlines / CRT** — `--scanlines` texture over dark panels; subtle (≤6% alpha), never over long body text.
3. **ASCII / box-drawing** — `┌─ SECTION ─────┐` headers, `──//──` dividers, tree lists `├─`. Set in mono, they ARE the ornament.
4. The **slash** — one 45° red diagonal cutting a hero or divider; echoes the logo. At most one per view.
Supporting: `--stripe-caution` for alert zones, `--checker` (8px) for image placeholders.

**Imagery.** Documentary hackathon photography, printed **grayscale, hard contrast**, optionally behind scanlines/dither. No stock gloss, no gradients. Placeholder = checker + mono caption.

**Motion.** Stepped, not eased: `steps(2..4)`, 100–200ms (`--ease-step-*`, `--dur-*`). Elements snap like sprites. `drt-blink` for cursors/live dots; `drt-marquee` for tickers. No parallax, no soft fades, no bounce.

**Interaction states.** Hover = invert (ink↔paper) or red fill on primary; press = translate(2-3px) + shadow removed; focus = 2px dashed red ring (`--focus-ring`), offset 2; disabled = dashed border + `--ink-3`. Links: red, 2px underline; hover = red block invert (see `tokens/base.css`).

---

## ICONOGRAPHY

- **Icon set: [Pixelarticons](https://pixelarticons.com)** (MIT, 24px pixel grid) — matches the logo's construction. Loaded per-icon from CDN and colored with the CSS-mask recipe so tokens apply:
  ```html
  <span style="display:inline-block;width:24px;height:24px;background:var(--ink);
    -webkit-mask:url(https://unpkg.com/pixelarticons@1.8.1/svg/cellular-signal-off.svg) center/contain no-repeat;
    mask:url(https://unpkg.com/pixelarticons@1.8.1/svg/cellular-signal-off.svg) center/contain no-repeat"></span>
  ```
  Core vocabulary: `radio-signal radio-tower cellular-signal-off alert map users calendar-month clock chat code git-branch battery-1 battery-charging power download external-link arrow-right zap server moon sun`. (No wifi glyphs exist in the set at 1.8.1 — for wifi-off semantics use the logo mark or `cellular-signal-off`.)
- **Unicode geometry + box-drawing** for inline glyphs: `▲ ▼ ◀ ▶ ● ■ □ ░ █ → ├─ └─`.
- **Signal bars / status dots** are plain rectangles from `SignalBars` / `StatusDot` — never hand-drawn SVG.
- **No emoji. No stroke-icon sets** (Lucide/Feather clash with the pixel grid).
- ⚠ For the static site, `npm i pixelarticons` and serve locally instead of unpkg.

**Logo assets** (`assets/logo/`, transparent PNGs from the provided file):
- `lockup.png` / `lockup-dark.png` — mark + DIGI RESITHON wordmark
- `mark.png` / `mark-dark.png` — wifi-off mark alone (use ≥ 48px tall)
- `wordmark.png` / `wordmark-dark.png` — pixel wordmark alone
`-dark` = paper-white ink for dark surfaces (the default theme!); red stays red. Clear space = height of the "0". Don't recolor, skew, round, or add effects. ⚠ Raster only — ask the community for vector originals.

---

## INDEX

- `styles.css` — global entry; imports everything under `tokens/`
- `tokens/` — `fonts.css` `colors.css` `typography.css` `spacing.css` `effects.css` `base.css`
- `assets/logo/` — six logo crops (above)
- `guidelines/` — foundation specimen cards (rendered in the Design System tab)
- `components/core/` — `Button` `Badge` `Card` `Tabs` `Alert`
- `components/forms/` — `Input` `Select` `Checkbox` `Radio` `Switch`
- `components/brand/` — `Logo` `SignalBars` `StatusDot` `TerminalBlock` `Marquee`
- `ui_kits/website/` — event site (interactive `index.html`: landing / schedule / projects)
- `SKILL.md` — agent-facing usage guide

**Intentional additions** (no component source existed; standard set + brand language): the form/UI set above, plus `SignalBars`, `StatusDot`, `TerminalBlock`, `Marquee`, `Logo` — derived from the logo's signal/terminal language.