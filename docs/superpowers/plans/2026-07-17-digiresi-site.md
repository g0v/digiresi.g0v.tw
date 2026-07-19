# digiresi.g0v.tw Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build digiresi.g0v.tw — a static event portal + offline-first PWA handbook for the g0v DigiResiThon community, in the DigiResiTh0n design system, with handbook content synced from the g0v HackMD archive.

**Architecture:** Astro 5 static site implementing the `design/ui_kits/website/` kit (blackout theme, pixel+mono type, terminal chrome): Landing home, Schedule (featured event timetable + past-events archive), and the offline Handbook in the kit's former Projects slot. 20 zh-TW guides sync from g0v-data/g0v-hackmd-archive via a manifest-driven script that vendors images; @vite-pwa/astro precaches the handbook + Pagefind search + display fonts under a CI-enforced 10 MB budget. GitHub Pages deploys; a weekly Action opens content-sync PRs for human review.

**Tech Stack:** Astro ^5.12, @vite-pwa/astro ^1.1 (Workbox generateSW), Pagefind ^1.3, fontsource (Press Start 2P / IBM Plex Mono / IBM Plex Sans TC) + vendored Cubic 11, pixelarticons, js-yaml, Vitest ^3, Playwright ^1.54, sharp, GitHub Actions + Pages.

## Global Constraints

- Node >= 22; npm; all commands run from the repo root `/workspace/digiresi.g0v.tw`.
- Fully static; ZERO runtime requests to external hosts: fonts self-hosted (fontsource + vendored `public/fonts/Cubic_11.woff2`), pixelarticons served from `public/icons/px/`, content images vendored at sync time.
- Design system binds (see `design/readme.md`): semantic tokens only, border-radius 0, 2px borders, hard offset shadows, two accents (signal red / terminal green, amber = degraded only), pixel headings at stepped sizes only, mono everything else, max one red slash per view, no emoji in UI copy, zero-rule (text spells DigiResiThon).
- Language: zh-TW informational copy (`<html lang="zh-Hant-TW">`), EN terminal meta-copy (statuses/prompts/counters) as brand voice, English page only at `/en/`.
- Theme: dark ("blackout") default; light ("paper") only via the nav toggle (`data-theme="light"`, localStorage `drt-theme`); print forces paper.
- Handbook section enum everywhere: `prepare | respond | mesh | scenarios | selfhost`.
- Sync manifest `sync.config.yaml` at repo root; synced pages COMMITTED under `src/content/handbook/`; images under `public/handbook-assets/`; content never fetched at build time.
- Service-worker precache budget: 10485760 bytes (10 MB), enforced by `scripts/check-budget.mjs` in CI.
- Every commit message ends with the trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Custom domain: `public/CNAME` containing exactly `digiresi.g0v.tw`.

---

### Task 1: Project scaffold and build pipeline

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/pages/index.astro`, `src/styles/global.css`
- Modify: `.gitignore`
- Test: none (config/scaffold task — verified by running the build pipeline; no unit-testable logic exists yet)

**Interfaces:**
- Consumes: nothing (first task; repo contains only `design/`, `docs/`, and an untracked `.gitignore`)
- Produces:
  - npm scripts every later task invokes verbatim: `npm run dev`, `npm run build` (= `astro build && pagefind --site dist`), `npm run preview`, `npm run sync`, `npm run assets`, `npm run icons`, `npm test` (= `vitest run`), `npm run test:e2e`, `npm run check:budget`, `npm run check:links`, `npm run check` (= `astro check`)
  - Installed dependencies at the contract versions: `astro ^5.12.0`; dev: `@vite-pwa/astro ^1.1.0`, `pagefind ^1.3.0`, `js-yaml ^4.1.0`, `vitest ^3.2.0`, `@playwright/test ^1.54.0`, `sharp ^0.34.0`, `@fontsource/press-start-2p ^5.2.0`, `@fontsource/ibm-plex-mono ^5.2.0`, `@fontsource/noto-sans-tc ^5.2.0`, `pixelarticons ^1.8.1` — plus `@astrojs/check ^0.9.9` and `typescript ^5.6.0`, which the contract's own `"check": "astro check"` script requires to run at all (`astro check` errors out without `@astrojs/check`; `typescript ^5.0.0 || ^6.0.0` is its declared peer dependency)
  - `astro.config.mjs` exporting `defineConfig({ site: "https://digiresi.g0v.tw" })` — Task 11 modifies this same file to add the `@vite-pwa/astro` integration and the `precacheGlobs` import; no integrations exist yet
  - `tsconfig.json` extending `astro/tsconfigs/strict` — `npm run check` in Task 2 and beyond depends on it
  - `src/styles/global.css` at its final path (placeholder body; Task 6 replaces the contents with the real design tokens/classes)
  - `src/pages/index.astro` at its final path (placeholder body; Task 7 replaces it with the kit Landing recreation)

- [ ] **Step 1: Write `package.json` by hand (no `npm create astro` — the scaffolder would drag in files the contract does not want)**

Create `package.json` at the repo root with exactly this content:

```json
{
  "name": "digiresi-g0v-tw",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build && pagefind --site dist",
    "preview": "astro preview",
    "sync": "node scripts/sync-content.mjs",
    "assets": "node scripts/fetch-assets.mjs",
    "icons": "node scripts/make-icons.mjs",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "check:budget": "node scripts/check-budget.mjs",
    "check:links": "node scripts/check-links.mjs",
    "check": "astro check"
  },
  "dependencies": {
    "astro": "^5.12.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.9",
    "@fontsource/ibm-plex-mono": "^5.2.0",
    "@fontsource/noto-sans-tc": "^5.2.0",
    "@fontsource/press-start-2p": "^5.2.0",
    "@playwright/test": "^1.54.0",
    "@vite-pwa/astro": "^1.1.0",
    "js-yaml": "^4.1.0",
    "pagefind": "^1.3.0",
    "pixelarticons": "^1.8.1",
    "sharp": "^0.34.0",
    "typescript": "^5.6.0",
    "vitest": "^3.2.0"
  }
}
```

Notes for the implementer:
- The `sync`/`assets`/`icons`/`check:budget`/`check:links`/`test`/`test:e2e` scripts reference files created in later tasks. Declaring them now is intentional — `package.json` is written once, by hand, in this task and later tasks only add the files the scripts point at. Do not run those scripts yet.
- `@astrojs/check` + `typescript` are the only two packages beyond the contract's dependency list. They are required because `astro check` (the contract-mandated `check` script, first executed in Task 2) refuses to run without them.
- `@fontsource/noto-sans-tc` is the self-hosted body TC face. The contract's original `@fontsource/ibm-plex-sans-tc` does NOT exist on npm (`npm view @fontsource/ibm-plex-sans-tc` → E404, re-verified 2026-07-17; Fontsource ships no TC variant of IBM Plex Sans), so the spec §7 fallback face is pinned here from the start — otherwise `npm install` in Step 7 fails and every later task is blocked.

- [ ] **Step 2: Write `astro.config.mjs`**

Create `astro.config.mjs` at the repo root:

```js
// @ts-check
import { defineConfig } from "astro/config";

// No integrations yet — @vite-pwa/astro (service worker + manifest) is added in Task 11.
export default defineConfig({
  site: "https://digiresi.g0v.tw",
});
```

- [ ] **Step 3: Write `tsconfig.json`**

Create `tsconfig.json` at the repo root (this is the Astro 5 recommended shape: include the generated `.astro/types.d.ts`, exclude build output):

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 4: Write the placeholder `src/styles/global.css`**

```bash
mkdir -p src/styles
```

Create `src/styles/global.css`:

```css
/* Placeholder. Real design tokens + component classes land in Task 6,
 * ported from design/tokens/*.css (blackout dark default + paper light theme). */
```

- [ ] **Step 5: Write the placeholder `src/pages/index.astro`**

```bash
mkdir -p src/pages
```

Create `src/pages/index.astro` (minimal `h1` only — the real kit-Landing homepage is Task 7; it imports `global.css` so the CSS pipeline is exercised by this task's build):

```astro
---
import "../styles/global.css";
---

<!doctype html>
<html lang="zh-Hant-TW">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>DigiResiThon 數位韌性松</title>
  </head>
  <body>
    <h1>DIGIRESITHON</h1>
  </body>
</html>
```

(Zero rule: the text spells `DIGIRESITHON` with the letter O — the `0` glyph appears only in logo assets, which arrive in Task 6.)

- [ ] **Step 6: Update `.gitignore`**

The file currently contains only `.DS_Store`. Replace it with this complete final content (appends the four contract entries):

```gitignore
.DS_Store
node_modules/
dist/
.astro/
.sync-tmp/
```

- [ ] **Step 7: Install dependencies**

```bash
cd /workspace/digiresi.g0v.tw
node --version
npm install
```

Expected output: `node --version` prints `v22.x` or newer (the `engines` field requires `>=22`). `npm install` takes a couple of minutes (`sharp` and `@playwright/test` download platform binaries) and ends with lines like:

```
added 4XX packages, and audited 4XX packages in XXs
found 0 vulnerabilities
```

(The exact package count varies with the resolved minor versions; what matters is that it exits 0 and creates `package-lock.json` and `node_modules/`.) Do NOT run `npx playwright install` here — browser download belongs to the e2e task.

- [ ] **Step 8: Run the full build pipeline**

```bash
cd /workspace/digiresi.g0v.tw
npm run build
echo "exit=$?"
ls dist/ dist/pagefind/pagefind.js
```

Expected output — first the Astro build:

```
> digiresi-g0v-tw@0.1.0 build
> astro build && pagefind --site dist

HH:MM:SS [types] Generated Xms
HH:MM:SS [build] output: "static"
...
HH:MM:SS [build] 1 page(s) built in X.XXs
HH:MM:SS [build] Complete!
```

then Pagefind (version prints as whatever `^1.3.0` resolved to, e.g. `1.5.x`):

```
Running Pagefind v1.x.x
Source:       "dist"
Output:       "dist/pagefind"

[Walking source directory]
Found 1 files matching **/*.{html}

[Parsing files]
Did not find a data-pagefind-body element on the site.
↳ Indexing all <body> elements on the site.
...
  Indexed 1 page
...
Finished in X.XXX seconds
```

NOTE on the page count: zero pages carry `data-pagefind-body` yet (the attribute arrives with the handbook article template in Task 9), so Pagefind falls back to whole-`<body>` indexing and reports the single placeholder page. This is harmless and expected on the scaffold. The assertions that matter: `echo "exit=$?"` prints `exit=0`, and `ls` shows `dist/index.html` plus `dist/pagefind/pagefind.js`.

- [ ] **Step 9: Commit**

```bash
cd /workspace/digiresi.g0v.tw
git add package.json package-lock.json astro.config.mjs tsconfig.json src/pages/index.astro src/styles/global.css .gitignore
git commit -m "chore: scaffold Astro 5 project with build pipeline" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

Expected: commit succeeds; `git status` afterwards shows a clean tree except pre-existing untracked/unrelated paths (`node_modules/`, `dist/`, `.astro/` are ignored).

### Task 2: Content collection schema + sync manifest

**Files:**
- Create: `src/content.config.ts`, `src/content/handbook/.gitkeep`, `sync.config.yaml`
- Test: none (schema + data manifest — verified with `astro sync`, `astro check`, and a `js-yaml` shape check; the sync pipeline that consumes the manifest gets full TDD in its own tasks)

**Interfaces:**
- Consumes:
  - `npm run check` script, installed `astro`/`@astrojs/check`/`typescript`/`js-yaml`, and `tsconfig.json` from Task 1
- Produces:
  - Astro content collection **`handbook`** (Astro 5 glob loader over `src/content/handbook/**/*.md`) with the exact schema `{ title: string, section: "prepare"|"respond"|"mesh"|"scenarios"|"selfhost", order: number, sourceUrl: url string, sourceCommit?: string, syncedAt: string, description?: string }` — the handbook routes (Task 9) query it via `getCollection("handbook")`, and the sync script's `buildFrontmatter` output (transform/sync tasks) must validate against it
  - `sync.config.yaml` at the repo root with keys `archiveBase` (string), `hackmdBase` (string), `pages` (array of `{ id, slug, section, order, title }`, 20 entries) — consumed by `scripts/sync-content.mjs` `syncAll({ configPath, ... })` and by the weekly sync workflow
  - `src/content/handbook/` directory (kept empty via `.gitkeep`) where `npm run sync` later writes committed `.md` pages as `<section>/<page>.md`

- [ ] **Step 1: Write `src/content.config.ts`**

Create `src/content.config.ts` with exactly this content (Astro 5 file location — repo `src/` root, NOT the legacy `src/content/config.ts`):

```ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const handbook = defineCollection({
  loader: glob({ base: "./src/content/handbook", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string(),
    section: z.enum(["prepare", "respond", "mesh", "scenarios", "selfhost"]),
    order: z.number(),
    sourceUrl: z.string().url(),
    sourceCommit: z.string().optional(),
    syncedAt: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = { handbook };
```

- [ ] **Step 2: Create the empty content directory with `.gitkeep`**

```bash
mkdir -p /workspace/digiresi.g0v.tw/src/content/handbook
touch /workspace/digiresi.g0v.tw/src/content/handbook/.gitkeep
```

- [ ] **Step 3: Write `sync.config.yaml` with the complete 20-page manifest**

Create `sync.config.yaml` at the repo root with exactly this content — all 20 entries, never abbreviated. `id` values are quoted because HackMD note IDs may start with `_`, `-`, or a digit:

```yaml
# Curation manifest: one entry per handbook page.
# Adding a doc to the handbook = one entry here, then `npm run sync` (opens as a review PR via sync.yml).
archiveBase: https://raw.githubusercontent.com/g0v-data/g0v-hackmd-archive/main/notes
hackmdBase: https://g0v.hackmd.io
pages:
  - id: "Ojw57urwQ1O8Bs9NJH_NfA"
    slug: prepare/go-bag
    section: prepare
    order: 1
    title: "準備救難包"
  - id: "bpj79hk8TamOdG4PaYXh1A"
    slug: prepare/household-supplies
    section: prepare
    order: 2
    title: "家庭常備物資清單"
  - id: "kh_Qh0WEQQ6kAbaFhvuEjQ"
    slug: prepare/comms-backup
    section: prepare
    order: 3
    title: "預防通訊中斷"
  - id: "nRcyyTFNQLqIk1dYwccLCg"
    slug: prepare/shelter-locations
    section: prepare
    order: 4
    title: "了解避難位置"
  - id: "vbliKPdyQ12V7QfoR8YJPg"
    slug: prepare/first-aid
    section: prepare
    order: 5
    title: "學習急救資訊"
  - id: "B-ky08JbR4-HD3lFDwynLQ"
    slug: prepare/certifications
    section: prepare
    order: 6
    title: "民防/防災相關證照"
  - id: "dxFHfKK-Rj2BXd_J1gx1aQ"
    slug: respond/communication
    section: respond
    order: 1
    title: "災難時的通訊"
  - id: "jxLUGcNUTwm0qNHl6GZvLg"
    slug: respond/transport
    section: respond
    order: 2
    title: "災害時的交通"
  - id: "VXWnM_jqQMqPdd_H2HmzVw"
    slug: respond/health
    section: respond
    order: 3
    title: "災害時保健"
  - id: "V8ozO9RQS4ieWC1th3fleg"
    slug: mesh/intro
    section: mesh
    order: 1
    title: "寫給還不熟悉 Meshtastic 的朋友"
  - id: "rW7Kbi7AR1uTMtuy8YAahA"
    slug: mesh/buying
    section: mesh
    order: 2
    title: "如何購買 Meshtastic 裝置"
  - id: "BCNqWGEeRJms5A77oGewaw"
    slug: mesh/firmware
    section: mesh
    order: 3
    title: "購買後如何設定與刷韌體"
  - id: "ZGuA7fUZQi-fbD06EenmGQ"
    slug: mesh/taiwan-mesh
    section: mesh
    order: 4
    title: "台灣鏈網"
  - id: "_WnRRY4sRZOIBxgAMpz1-w"
    slug: mesh/g0mesh
    section: mesh
    order: 5
    title: "g0mesh 介紹"
  - id: "2p681378QaypIOy1NVj2aw"
    slug: mesh/g0mesh-quickstart
    section: mesh
    order: 6
    title: "g0mesh 快速上手"
  - id: "SYTBWVohTyuCgPGUqfAl9g"
    slug: scenarios/levels
    section: scenarios
    order: 1
    title: "數位韌性情境分級"
  - id: "vN3UkdeyS7KqUw1QneQVRw"
    slug: scenarios/submarine-cables
    section: scenarios
    order: 2
    title: "海纜斷光會怎樣？"
  - id: "xs79Cd6QTBefX8zoxhesOg"
    slug: scenarios/outage-risks
    section: scenarios
    order: 3
    title: "台灣全國性斷網災害風險"
  - id: "vMiVU4G2RqqbY0tVJ9YaRg"
    slug: selfhost/alternatives
    section: selfhost
    order: 1
    title: "數位服務離線替代品"
  - id: "9Z2EhRAFQq-jfsoixrwD5A"
    slug: selfhost/saas-guide
    section: selfhost
    order: 2
    title: "SaaS 韌性產品 self-host 指南"
```

- [ ] **Step 4: Verify the manifest parses and has the right shape**

```bash
cd /workspace/digiresi.g0v.tw
node --input-type=module -e "
import yaml from 'js-yaml';
import { readFileSync } from 'node:fs';
const c = yaml.load(readFileSync('sync.config.yaml', 'utf8'));
const sections = ['prepare', 'respond', 'mesh', 'scenarios', 'selfhost'];
console.log('pages:', c.pages.length);
console.log('archiveBase:', c.archiveBase);
console.log('hackmdBase:', c.hackmdBase);
console.log('shape ok:', c.pages.every(p =>
  typeof p.id === 'string' && typeof p.slug === 'string' &&
  sections.includes(p.section) && Number.isInteger(p.order) &&
  typeof p.title === 'string' && p.slug.startsWith(p.section + '/')));
console.log('unique slugs:', new Set(c.pages.map(p => p.slug)).size);
"
```

Expected output (exact):

```
pages: 20
archiveBase: https://raw.githubusercontent.com/g0v-data/g0v-hackmd-archive/main/notes
hackmdBase: https://g0v.hackmd.io
shape ok: true
unique slugs: 20
```

- [ ] **Step 5: Generate collection types**

```bash
cd /workspace/digiresi.g0v.tw
npx astro sync
ls .astro/types.d.ts
```

Expected output (timestamps/durations vary; the collection is legitimately empty — only `.gitkeep` is in `src/content/handbook/` — and that is not an error):

```
HH:MM:SS [content] Syncing content
HH:MM:SS [content] Synced content
HH:MM:SS [types] Generated Xms
```

and `ls` prints `.astro/types.d.ts`.

- [ ] **Step 6: Type-check the project**

```bash
cd /workspace/digiresi.g0v.tw
npm run check
```

Expected output ends with (file count may vary as Astro counts `.astro`/`.ts` files; all three counters must be zero):

```
Result (N files): 
- 0 errors
- 0 warnings
- 0 hints
```

and the command exits 0. If it errors with "The `@astrojs/check` package is required", Task 1 Step 1 was not followed — `@astrojs/check` and `typescript` must be in `devDependencies`.

- [ ] **Step 7: Commit**

```bash
cd /workspace/digiresi.g0v.tw
git add src/content.config.ts src/content/handbook/.gitkeep sync.config.yaml
git commit -m "feat: handbook content collection schema and 20-page sync manifest" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

Expected: commit succeeds with 3 files changed.

### Task 3: Markdown transform library (TDD)

**Files:**
- Create: `scripts/lib/transform.mjs`
- Test: `tests/unit/transform.test.mjs`

**Interfaces:**
- Consumes: `package.json` with devDependency `vitest ^3.2.0` and node engines `>=22` (Task 1 scaffold — `npx vitest` must resolve).
- Produces (consumed by Task 5 `scripts/sync-content.mjs`):
  - `stripHackmdMeta(markdown) -> string`
  - `extractTitle(markdown) -> { title: string|null, body: string }`
  - `convertContainers(markdown) -> string`
  - `rewriteLinks(markdown, { idToSlug, hackmdBase }) -> string`
  - `buildFrontmatter({ title, section, order, sourceUrl, sourceCommit, syncedAt, description }) -> string`

All commands in this task run from the repo root `/workspace/digiresi.g0v.tw`. Five TDD cycles, one per function, one commit per function. `transform.mjs` is pure string processing — it imports nothing. The test file grows by appending one `import` + one `describe` block per cycle; ESM allows `import` declarations anywhere at module top level (they are hoisted), so append-only edits are valid.

#### Cycle 1: stripHackmdMeta

- [ ] **Step 1: Write the failing test for stripHackmdMeta**

Create `tests/unit/transform.test.mjs` (new directory `tests/unit/` included) with exactly:

```js
import { describe, it, expect } from "vitest";
import { stripHackmdMeta } from "../../scripts/lib/transform.mjs";

describe("stripHackmdMeta", () => {
  it("removes the YAML frontmatter block at the top of a note", () => {
    const input = [
      "---",
      "tags: civil-defense, 民防, 數位韌性松",
      "---",
      "",
      "# 準備救難包",
      "",
      "內文開始。",
    ].join("\n");
    const out = stripHackmdMeta(input);
    expect(out).not.toContain("tags: civil-defense");
    expect(out.startsWith("# 準備救難包")).toBe(true);
    expect(out).toContain("內文開始。");
  });

  it('removes "###### tags:" lines anywhere in the body', () => {
    const input = [
      "# 災難時的通訊",
      "",
      "###### tags: `數位韌性` `通訊`",
      "",
      "斷網時先確認鄰里通訊點。",
    ].join("\n");
    const out = stripHackmdMeta(input);
    expect(out).not.toContain("###### tags:");
    expect(out).toContain("斷網時先確認鄰里通訊點。");
  });

  it("leaves a note without frontmatter unchanged (a later --- rule is not frontmatter)", () => {
    const input = "# 台灣鏈網\n\n節點分佈地圖如下。\n\n---\n\n以上為分隔線之後的內容。";
    expect(stripHackmdMeta(input)).toBe(input);
  });
});
```

- [ ] **Step 2: Run the test and watch it fail (module does not exist)**

```sh
npx vitest run tests/unit/transform.test.mjs
```

Expected output includes (module cannot be resolved):

```
 FAIL  tests/unit/transform.test.mjs [ tests/unit/transform.test.mjs ]
Error: Failed to load url ../../scripts/lib/transform.mjs
 Test Files  1 failed (1)
```

- [ ] **Step 3: Implement stripHackmdMeta**

Create `scripts/lib/transform.mjs` (new directory `scripts/lib/` included) with exactly:

```js
// Pure string transforms for the HackMD-archive -> handbook sync pipeline.
// No imports: every function here is deterministic string -> string work.

export function stripHackmdMeta(markdown) {
  // Remove a YAML frontmatter block only when it opens on the very first line.
  let out = markdown.replace(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n/, "");
  // Remove HackMD "###### tags:" lines wherever they appear.
  out = out
    .split("\n")
    .filter((line) => !/^######\s*tags:/i.test(line.trim()))
    .join("\n");
  // Trim whitespace-only lines left dangling at the top of the note.
  return out.replace(/^\s*\n+/, "");
}
```

- [ ] **Step 4: Run the test and watch it pass**

```sh
npx vitest run tests/unit/transform.test.mjs
```

Expected output includes:

```
 ✓ tests/unit/transform.test.mjs (3 tests)
 Test Files  1 passed (1)
      Tests  3 passed (3)
```

- [ ] **Step 5: Commit stripHackmdMeta**

```sh
git add scripts/lib/transform.mjs tests/unit/transform.test.mjs
git commit -m "feat: add stripHackmdMeta transform" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

#### Cycle 2: extractTitle

- [ ] **Step 6: Write the failing test for extractTitle**

Append to the end of `tests/unit/transform.test.mjs`:

```js
import { extractTitle } from "../../scripts/lib/transform.mjs";

describe("extractTitle", () => {
  it('extracts the first "# " heading and removes it from the body', () => {
    const input = "# 準備救難包\n\n每個家庭都該有一個 72 小時救難包。\n\n## 內容物\n";
    const { title, body } = extractTitle(input);
    expect(title).toBe("準備救難包");
    expect(body.startsWith("每個家庭都該有一個 72 小時救難包。")).toBe(true);
    expect(body).not.toContain("# 準備救難包");
  });

  it("returns title null and the body untouched when there is no level-1 heading", () => {
    const input = "## 只有次標題\n\n內文。";
    expect(extractTitle(input)).toEqual({ title: null, body: input });
  });
});
```

- [ ] **Step 7: Run the test and watch it fail (missing export)**

```sh
npx vitest run tests/unit/transform.test.mjs
```

Expected output includes:

```
SyntaxError: The requested module '../../scripts/lib/transform.mjs' does not provide an export named 'extractTitle'
 Test Files  1 failed (1)
```

- [ ] **Step 8: Implement extractTitle**

Append to the end of `scripts/lib/transform.mjs` (note the fence-detection regex contains three literal backticks):

````js
export function extractTitle(markdown) {
  const lines = markdown.split("\n");
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^(```|~~~)/.test(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue; // a "# comment" inside a code block is not a title
    const m = lines[i].match(/^#[ \t]+(.+?)\s*$/);
    if (m) {
      const body = [...lines.slice(0, i), ...lines.slice(i + 1)]
        .join("\n")
        .replace(/^\s*\n+/, "");
      return { title: m[1], body };
    }
  }
  return { title: null, body: markdown };
}
````

- [ ] **Step 9: Run the test and watch it pass**

```sh
npx vitest run tests/unit/transform.test.mjs
```

Expected output includes:

```
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

- [ ] **Step 10: Commit extractTitle**

```sh
git add scripts/lib/transform.mjs tests/unit/transform.test.mjs
git commit -m "feat: add extractTitle transform" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

#### Cycle 3: convertContainers

- [ ] **Step 11: Write the failing test for convertContainers**

Append to the end of `tests/unit/transform.test.mjs`:

```js
import { convertContainers } from "../../scripts/lib/transform.mjs";

describe("convertContainers", () => {
  it(":::info and :::warning become callout divs with the markdown body preserved", () => {
    const input = [
      "前文。",
      ":::info",
      "斷網時 **不要恐慌**，先確認家人位置。",
      ":::",
      "",
      ":::warning",
      "注意餘震。",
      ":::",
      "後文。",
    ].join("\n");
    const out = convertContainers(input);
    expect(out).toContain('<div class="callout callout-info">');
    expect(out).toContain('<div class="callout callout-warning">');
    expect(out).toContain("斷網時 **不要恐慌**，先確認家人位置。");
    expect(out).toContain("</div>");
    expect(out).not.toContain(":::");
  });

  it(":::spoiler with a summary becomes a <details> block", () => {
    const input = ":::spoiler 點我展開\n完整的物資清單在此。\n:::";
    const out = convertContainers(input);
    expect(out).toContain("<details><summary>點我展開</summary>");
    expect(out).toContain("完整的物資清單在此。");
    expect(out).toContain("</details>");
  });

  it("an unknown container type falls back to a plain callout div", () => {
    const input = ":::mycustom\n內容照舊。\n:::";
    const out = convertContainers(input);
    expect(out).toContain('<div class="callout">');
    expect(out).toContain("內容照舊。");
    expect(out).toContain("</div>");
  });
});
```

- [ ] **Step 12: Run the test and watch it fail (missing export)**

```sh
npx vitest run tests/unit/transform.test.mjs
```

Expected output includes:

```
SyntaxError: The requested module '../../scripts/lib/transform.mjs' does not provide an export named 'convertContainers'
 Test Files  1 failed (1)
```

- [ ] **Step 13: Implement convertContainers**

Append to the end of `scripts/lib/transform.mjs`:

```js
const CALLOUT_TYPES = new Set(["info", "warning", "success", "danger"]);

export function convertContainers(markdown) {
  // Blank lines around the injected HTML keep the inner markdown rendering
  // as markdown (CommonMark closes an HTML block at a blank line).
  const lines = markdown.split("\n");
  const out = [];
  const stack = [];
  for (const line of lines) {
    if (line.trim() === ":::" && stack.length > 0) {
      out.push("", stack.pop() === "details" ? "</details>" : "</div>");
      continue;
    }
    const open = line.match(/^:::\s*([A-Za-z][\w-]*)\s*(.*)$/);
    if (open) {
      const type = open[1].toLowerCase();
      if (type === "spoiler") {
        const summary = open[2].trim() || "展開";
        out.push(`<details><summary>${summary}</summary>`, "");
        stack.push("details");
      } else if (CALLOUT_TYPES.has(type)) {
        out.push(`<div class="callout callout-${type}">`, "");
        stack.push("div");
      } else {
        out.push('<div class="callout">', "");
        stack.push("div");
      }
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}
```

- [ ] **Step 14: Run the test and watch it pass**

```sh
npx vitest run tests/unit/transform.test.mjs
```

Expected output includes:

```
 Test Files  1 passed (1)
      Tests  8 passed (8)
```

- [ ] **Step 15: Commit convertContainers**

```sh
git add scripts/lib/transform.mjs tests/unit/transform.test.mjs
git commit -m "feat: add convertContainers transform" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

#### Cycle 4: rewriteLinks

- [ ] **Step 16: Write the failing test for rewriteLinks**

Append to the end of `tests/unit/transform.test.mjs`:

```js
import { rewriteLinks } from "../../scripts/lib/transform.mjs";

describe("rewriteLinks", () => {
  const idToSlug = new Map([["abc123XYZ", "prepare/go-bag"]]);
  const hackmdBase = "https://g0v.hackmd.io";

  it("rewrites ../notes/<id>.md links to the local handbook slug when mapped", () => {
    const input = "見 [救難包指南](../notes/abc123XYZ.md) 一文。";
    expect(rewriteLinks(input, { idToSlug, hackmdBase })).toBe(
      "見 [救難包指南](/handbook/prepare/go-bag/) 一文。"
    );
  });

  it("rewrites /<id> links to the local handbook slug when mapped", () => {
    const input = "另見 [救難包](/abc123XYZ)。";
    expect(rewriteLinks(input, { idToSlug, hackmdBase })).toBe(
      "另見 [救難包](/handbook/prepare/go-bag/)。"
    );
  });

  it("falls back to the public HackMD URL for unmapped ../notes/ links", () => {
    const input = "參考 [其他共筆](../notes/unmapped00.md)。";
    expect(rewriteLinks(input, { idToSlug, hackmdBase })).toBe(
      "參考 [其他共筆](https://g0v.hackmd.io/unmapped00)。"
    );
  });

  it("leaves ordinary short absolute links untouched", () => {
    const input = "回到 [關於](/about) 或 [手冊](/handbook/prepare/go-bag/)。";
    expect(rewriteLinks(input, { idToSlug, hackmdBase })).toBe(input);
  });
});
```

- [ ] **Step 17: Run the test and watch it fail (missing export)**

```sh
npx vitest run tests/unit/transform.test.mjs
```

Expected output includes:

```
SyntaxError: The requested module '../../scripts/lib/transform.mjs' does not provide an export named 'rewriteLinks'
 Test Files  1 failed (1)
```

- [ ] **Step 18: Implement rewriteLinks**

Append to the end of `scripts/lib/transform.mjs`:

```js
export function rewriteLinks(markdown, { idToSlug, hackmdBase }) {
  const base = hackmdBase.replace(/\/+$/, "");
  // Archive-relative note links: ](../notes/<id>.md)
  let out = markdown.replace(
    /\]\((?:\.\.\/)+notes\/([A-Za-z0-9_-]+)\.md\)/g,
    (match, id) =>
      idToSlug.has(id) ? `](/handbook/${idToSlug.get(id)}/)` : `](${base}/${id})`
  );
  // Root-absolute note links: ](/<id>). Only mapped ids, or unmapped strings
  // long enough to be real HackMD note ids (>= 20 chars), are rewritten —
  // short site-local links such as ](/about) pass through unchanged.
  out = out.replace(/\]\(\/([A-Za-z0-9_-]+)\)/g, (match, id) => {
    if (idToSlug.has(id)) return `](/handbook/${idToSlug.get(id)}/)`;
    if (/^[A-Za-z0-9_-]{20,}$/.test(id)) return `](${base}/${id})`;
    return match;
  });
  return out;
}
```

- [ ] **Step 19: Run the test and watch it pass**

```sh
npx vitest run tests/unit/transform.test.mjs
```

Expected output includes:

```
 Test Files  1 passed (1)
      Tests  12 passed (12)
```

- [ ] **Step 20: Commit rewriteLinks**

```sh
git add scripts/lib/transform.mjs tests/unit/transform.test.mjs
git commit -m "feat: add rewriteLinks transform" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

#### Cycle 5: buildFrontmatter

- [ ] **Step 21: Write the failing test for buildFrontmatter**

Append to the end of `tests/unit/transform.test.mjs`:

```js
import { buildFrontmatter } from "../../scripts/lib/transform.mjs";

describe("buildFrontmatter", () => {
  it("emits every field as a YAML block when all fields are present", () => {
    const fm = buildFrontmatter({
      title: "準備救難包",
      section: "prepare",
      order: 1,
      sourceUrl: "https://g0v.hackmd.io/Ojw57urwQ1O8Bs9NJH_NfA",
      sourceCommit: "0123abcd0123abcd0123abcd0123abcd0123abcd",
      syncedAt: "2026-07-17",
      description: "72 小時救難包打包清單",
    });
    expect(fm).toBe(
      [
        "---",
        'title: "準備救難包"',
        "section: prepare",
        "order: 1",
        'sourceUrl: "https://g0v.hackmd.io/Ojw57urwQ1O8Bs9NJH_NfA"',
        'sourceCommit: "0123abcd0123abcd0123abcd0123abcd0123abcd"',
        'syncedAt: "2026-07-17"',
        'description: "72 小時救難包打包清單"',
        "---",
        "",
      ].join("\n")
    );
  });

  it("omits sourceCommit and description when they are undefined", () => {
    const fm = buildFrontmatter({
      title: "災難時的通訊",
      section: "respond",
      order: 1,
      sourceUrl: "https://g0v.hackmd.io/dxFHfKK-Rj2BXd_J1gx1aQ",
      syncedAt: "2026-07-17",
    });
    expect(fm).not.toContain("sourceCommit");
    expect(fm).not.toContain("description");
    expect(fm).toContain('title: "災難時的通訊"');
    expect(fm.endsWith("---\n")).toBe(true);
  });
});
```

- [ ] **Step 22: Run the test and watch it fail (missing export)**

```sh
npx vitest run tests/unit/transform.test.mjs
```

Expected output includes:

```
SyntaxError: The requested module '../../scripts/lib/transform.mjs' does not provide an export named 'buildFrontmatter'
 Test Files  1 failed (1)
```

- [ ] **Step 23: Implement buildFrontmatter**

Append to the end of `scripts/lib/transform.mjs`:

```js
export function buildFrontmatter({
  title,
  section,
  order,
  sourceUrl,
  sourceCommit,
  syncedAt,
  description,
}) {
  // JSON.stringify produces a valid YAML double-quoted scalar (quotes and
  // backslashes escaped, CJK preserved verbatim).
  const lines = ["---"];
  lines.push(`title: ${JSON.stringify(title)}`);
  lines.push(`section: ${section}`);
  lines.push(`order: ${order}`);
  lines.push(`sourceUrl: ${JSON.stringify(sourceUrl)}`);
  if (sourceCommit !== undefined) lines.push(`sourceCommit: ${JSON.stringify(sourceCommit)}`);
  lines.push(`syncedAt: ${JSON.stringify(syncedAt)}`);
  if (description !== undefined) lines.push(`description: ${JSON.stringify(description)}`);
  lines.push("---", "");
  return lines.join("\n");
}
```

- [ ] **Step 24: Run the full transform suite and watch it pass**

```sh
npx vitest run tests/unit/transform.test.mjs
```

Expected output includes:

```
 ✓ tests/unit/transform.test.mjs (14 tests)
 Test Files  1 passed (1)
      Tests  14 passed (14)
```

- [ ] **Step 25: Commit buildFrontmatter**

```sh
git add scripts/lib/transform.mjs tests/unit/transform.test.mjs
git commit -m "feat: add buildFrontmatter transform" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Image vendoring (TDD)

**Files:**
- Create: `scripts/lib/images.mjs`
- Test: `tests/unit/images.test.mjs`

**Interfaces:**
- Consumes: `package.json` with devDependency `vitest ^3.2.0` (Task 1); Node >= 22 built-ins only (`node:crypto`, `node:fs`, `node:path`, `node:os`).
- Produces (consumed by Task 5 `scripts/sync-content.mjs`):
  - `findImageUrls(markdown) -> string[]`
  - `vendorImages(markdown, { slug, fetchImpl, publicDir }) -> Promise<{ markdown, downloaded: Array<{url, localPath}> }>`

All commands run from `/workspace/digiresi.g0v.tw`. Two TDD cycles. Tests never touch the network: `fetchImpl` is a stub, files land in `fs.mkdtempSync` temp dirs.

#### Cycle 1: findImageUrls

- [ ] **Step 1: Write the failing test for findImageUrls**

Create `tests/unit/images.test.mjs` with exactly:

```js
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { findImageUrls } from "../../scripts/lib/images.mjs";

const hash8 = (url) => createHash("sha256").update(url).digest("hex").slice(0, 8);

describe("findImageUrls", () => {
  it("finds http(s) URLs in markdown image syntax", () => {
    const md = "說明圖：\n\n![救難包內容物](https://i.imgur.com/AbCd123.png)\n";
    expect(findImageUrls(md)).toEqual(["https://i.imgur.com/AbCd123.png"]);
  });

  it("finds http(s) URLs in raw <img> tags", () => {
    const md = '節點照片 <img src="https://hackmd.io/_uploads/r1node.jpg" alt="node"> 如上。';
    expect(findImageUrls(md)).toEqual(["https://hackmd.io/_uploads/r1node.jpg"]);
  });

  it("skips data: URIs and local paths", () => {
    const md = [
      "![inline](data:image/png;base64,iVBORw0KGgo=)",
      "![local](./diagram.png)",
      '<img src="/handbook-assets/mesh/intro/x.png">',
      "![remote](https://example.com/ok.png)",
    ].join("\n");
    expect(findImageUrls(md)).toEqual(["https://example.com/ok.png"]);
  });
});
```

(The `hash8` helper and the fs/os/path imports are used by Cycle 2, which appends to this file.)

- [ ] **Step 2: Run the test and watch it fail (module does not exist)**

```sh
npx vitest run tests/unit/images.test.mjs
```

Expected output includes:

```
 FAIL  tests/unit/images.test.mjs [ tests/unit/images.test.mjs ]
Error: Failed to load url ../../scripts/lib/images.mjs
 Test Files  1 failed (1)
```

- [ ] **Step 3: Implement findImageUrls**

Create `scripts/lib/images.mjs` with exactly:

```js
// Image vendoring for the sync pipeline: find remote image references,
// download them into public/handbook-assets/<slug>/, rewrite the markdown.

const MD_IMAGE_RE = /!\[[^\]]*\]\(\s*<?(https?:\/\/[^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
const HTML_IMG_RE = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;

export function findImageUrls(markdown) {
  const urls = new Set();
  for (const m of markdown.matchAll(MD_IMAGE_RE)) urls.add(m[1]);
  for (const m of markdown.matchAll(HTML_IMG_RE)) {
    if (/^https?:\/\//i.test(m[1])) urls.add(m[1]);
  }
  return [...urls];
}
```

- [ ] **Step 4: Run the test and watch it pass**

```sh
npx vitest run tests/unit/images.test.mjs
```

Expected output includes:

```
 ✓ tests/unit/images.test.mjs (3 tests)
 Test Files  1 passed (1)
      Tests  3 passed (3)
```

- [ ] **Step 5: Commit findImageUrls**

```sh
git add scripts/lib/images.mjs tests/unit/images.test.mjs
git commit -m "feat: add findImageUrls image scanner" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

#### Cycle 2: vendorImages

- [ ] **Step 6: Write the failing test for vendorImages**

Append to the end of `tests/unit/images.test.mjs`:

```js
import { vendorImages } from "../../scripts/lib/images.mjs";

describe("vendorImages", () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "digiresi-images-"));
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const pngBytes = new TextEncoder().encode("fake-png-bytes");
  const okFetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: (name) => (name.toLowerCase() === "content-type" ? "image/png" : null) },
    arrayBuffer: async () => pngBytes.buffer,
  });

  it("downloads each image, names it <stem>-<8char-sha256>.<ext>, and rewrites the reference", async () => {
    const url = "https://i.imgur.com/AbCd123.png";
    const md = `開箱照：\n\n![救難包](${url})\n`;
    const { markdown, downloaded } = await vendorImages(md, {
      slug: "prepare/go-bag",
      fetchImpl: okFetch,
      publicDir: tmpDir,
    });
    const expectedFile = `AbCd123-${hash8(url)}.png`;
    const expectedLocal = `/handbook-assets/prepare/go-bag/${expectedFile}`;
    expect(markdown).toBe(`開箱照：\n\n![救難包](${expectedLocal})\n`);
    expect(downloaded).toEqual([{ url, localPath: expectedLocal }]);
    const onDisk = fs.readFileSync(
      path.join(tmpDir, "handbook-assets", "prepare", "go-bag", expectedFile)
    );
    expect(onDisk.toString()).toBe("fake-png-bytes");
  });

  it("rewrites <img src> too and derives the extension from content-type when the URL has none", async () => {
    const url = "https://hackmd.io/_uploads/SkQ9nodePhoto";
    const md = `<img src="${url}" alt="node">`;
    const { markdown } = await vendorImages(md, {
      slug: "mesh/intro",
      fetchImpl: okFetch,
      publicDir: tmpDir,
    });
    const expectedFile = `SkQ9nodePhoto-${hash8(url)}.png`;
    expect(markdown).toBe(`<img src="/handbook-assets/mesh/intro/${expectedFile}" alt="node">`);
    expect(
      fs.existsSync(path.join(tmpDir, "handbook-assets", "mesh", "intro", expectedFile))
    ).toBe(true);
  });

  it("throws an Error whose message includes the URL when the response is not ok", async () => {
    const url = "https://i.imgur.com/gone404.png";
    const failFetch = async () => ({
      ok: false,
      status: 404,
      headers: { get: () => null },
      arrayBuffer: async () => new ArrayBuffer(0),
    });
    await expect(
      vendorImages(`![x](${url})`, { slug: "prepare/go-bag", fetchImpl: failFetch, publicDir: tmpDir })
    ).rejects.toThrow(url);
  });
});
```

- [ ] **Step 7: Run the test and watch it fail (missing export)**

```sh
npx vitest run tests/unit/images.test.mjs
```

Expected output includes:

```
SyntaxError: The requested module '../../scripts/lib/images.mjs' does not provide an export named 'vendorImages'
 Test Files  1 failed (1)
```

- [ ] **Step 8: Implement vendorImages**

Replace the entire contents of `scripts/lib/images.mjs` with:

```js
// Image vendoring for the sync pipeline: find remote image references,
// download them into public/handbook-assets/<slug>/, rewrite the markdown.

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MD_IMAGE_RE = /!\[[^\]]*\]\(\s*<?(https?:\/\/[^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
const HTML_IMG_RE = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;

const KNOWN_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif"]);
const EXT_BY_CONTENT_TYPE = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/gif", ".gif"],
  ["image/webp", ".webp"],
  ["image/svg+xml", ".svg"],
  ["image/avif", ".avif"],
]);

export function findImageUrls(markdown) {
  const urls = new Set();
  for (const m of markdown.matchAll(MD_IMAGE_RE)) urls.add(m[1]);
  for (const m of markdown.matchAll(HTML_IMG_RE)) {
    if (/^https?:\/\//i.test(m[1])) urls.add(m[1]);
  }
  return [...urls];
}

function localFileName(url, contentType) {
  const pathname = new URL(url).pathname;
  const rawBase = path.posix.basename(decodeURIComponent(pathname));
  const urlExt = path.posix.extname(rawBase).toLowerCase();
  const known = KNOWN_EXTS.has(urlExt);
  const ext = known
    ? urlExt
    : EXT_BY_CONTENT_TYPE.get((contentType || "").split(";")[0].trim().toLowerCase()) || ".png";
  const stemSource = known ? rawBase.slice(0, -urlExt.length) : rawBase;
  const stem =
    stemSource.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[-.]+|[-.]+$/g, "") || "image";
  // Hash the URL (not the bytes): the filename is deterministic across
  // re-syncs and collision-proof for same-basename images from different hosts.
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 8);
  return `${stem}-${hash}${ext}`;
}

export async function vendorImages(markdown, { slug, fetchImpl, publicDir }) {
  // Longest URL first so no URL that is a prefix of another gets half-replaced.
  const urls = findImageUrls(markdown).sort((a, b) => b.length - a.length);
  const dir = path.join(publicDir, "handbook-assets", slug);
  const downloaded = [];
  let out = markdown;
  for (const url of urls) {
    let res;
    try {
      res = await fetchImpl(url);
    } catch (cause) {
      throw new Error(`image download failed: ${url} (${cause.message})`);
    }
    if (!res.ok) {
      throw new Error(`image download failed: ${url} (HTTP ${res.status})`);
    }
    const contentType =
      res.headers && typeof res.headers.get === "function"
        ? res.headers.get("content-type")
        : "";
    const fileName = localFileName(url, contentType);
    const bytes = Buffer.from(await res.arrayBuffer());
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, fileName), bytes);
    const localPath = `/handbook-assets/${slug}/${fileName}`;
    out = out.split(url).join(localPath);
    downloaded.push({ url, localPath });
  }
  return { markdown: out, downloaded };
}
```

- [ ] **Step 9: Run the test and watch it pass**

```sh
npx vitest run tests/unit/images.test.mjs
```

Expected output includes:

```
 ✓ tests/unit/images.test.mjs (6 tests)
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

- [ ] **Step 10: Commit vendorImages**

```sh
git add scripts/lib/images.mjs tests/unit/images.test.mjs
git commit -m "feat: add vendorImages downloader with hashed local filenames" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Sync orchestrator + first real content sync

**Files:**
- Create: `scripts/sync-content.mjs`
- Test: `tests/unit/sync.test.mjs`
- Generated by the real sync run and committed: `src/content/handbook/**/*.md` (20 files), `public/handbook-assets/**` (vendored images, if any note references remote images)

**Interfaces:**
- Consumes:
  - `stripHackmdMeta`, `extractTitle`, `convertContainers`, `rewriteLinks`, `buildFrontmatter` from `scripts/lib/transform.mjs` (Task 3)
  - `vendorImages` from `scripts/lib/images.mjs` (Task 4)
  - `js-yaml ^4.1.0` dependency and npm scripts `sync` / `test` / `build` (Task 1 `package.json`)
  - `sync.config.yaml` — the 20-page curation manifest committed in Task 2 (this task only reads it; it does NOT create or modify it)
  - `.gitignore` already containing `.sync-tmp/` as its last line (written complete in Task 1 Step 6)
  - `src/content.config.ts` `handbook` collection with the contract zod schema (Task 2) — required for `npx astro sync` / `npm run build` to validate the real content
- Produces:
  - `syncAll({ configPath, fetchImpl, contentDir, publicDir }) -> Promise<{ ok: Array<{slug}>, failed: Array<{slug, error}> }>` (exported from `scripts/sync-content.mjs`; reused by nothing else at runtime, but the module doubles as the `npm run sync` CLI used by the Task 14 `sync.yml` workflow)
  - Committed real content in `src/content/handbook/` + `public/handbook-assets/` (consumed by Task 9 handbook pages, Task 10 search, Task 11 PWA precache)

All commands run from `/workspace/digiresi.g0v.tw`. Steps 1–5 are a stubbed TDD cycle (no network). Steps 6–11 verify the Task 2 manifest and Task 1 `.gitignore` entry, run the real sync against the archive, and commit the real content.

- [ ] **Step 1: Write the failing test for syncAll**

Create `tests/unit/sync.test.mjs` with exactly:

```js
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { syncAll } from "../../scripts/sync-content.mjs";

const GOOD_ID = "goodnote000000000000gA";
const MISSING_ID = "missingnote000000000gB";
const IMG_URL = "https://i.imgur.com/kit0001.png";

const CONFIG_YAML = `archiveBase: https://raw.example.test/notes
hackmdBase: https://hackmd.example.test
pages:
  - id: ${GOOD_ID}
    slug: prepare/go-bag
    section: prepare
    order: 1
    title: 準備救難包
  - id: ${MISSING_ID}
    slug: respond/health
    section: respond
    order: 3
    title: 災害時保健
`;

const GOOD_NOTE = `---
tags: 民防, 數位韌性松
---

# 準備救難包

###### tags: \`民防\`

每人準備一個 72 小時救難包。

:::info
清單每季檢查一次。
:::

延伸閱讀：[災害時保健](../notes/${MISSING_ID}.md) 與 [其他共筆](../notes/unmapped00.md)。

![救難包](${IMG_URL})
`;

function stubFetch(url) {
  if (url === `https://raw.example.test/notes/${GOOD_ID}.md`) {
    return { ok: true, status: 200, text: async () => GOOD_NOTE };
  }
  if (url === `https://raw.example.test/notes/${MISSING_ID}.md`) {
    return { ok: false, status: 404, text: async () => "404: Not Found" };
  }
  if (url === "https://api.github.com/repos/g0v-data/g0v-hackmd-archive/commits/main") {
    return { ok: true, status: 200, json: async () => ({ sha: "fedcba9876543210feed" }) };
  }
  if (url === IMG_URL) {
    return {
      ok: true,
      status: 200,
      headers: { get: (n) => (n.toLowerCase() === "content-type" ? "image/png" : null) },
      arrayBuffer: async () => new TextEncoder().encode("png!").buffer,
    };
  }
  throw new Error(`unexpected fetch: ${url}`);
}
const fetchImpl = async (url) => stubFetch(String(url));

describe("syncAll", () => {
  let root;
  let contentDir;
  let publicDir;
  let result;

  beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "digiresi-sync-"));
    contentDir = path.join(root, "content", "handbook");
    publicDir = path.join(root, "public");
    const configPath = path.join(root, "sync.config.yaml");
    fs.writeFileSync(configPath, CONFIG_YAML);
    result = await syncAll({ configPath, fetchImpl, contentDir, publicDir });
  });

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("reports the reachable page in ok and the 404 page in failed", () => {
    expect(result.ok).toEqual([{ slug: "prepare/go-bag" }]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].slug).toBe("respond/health");
    expect(result.failed[0].error).toContain("404");
  });

  it("writes the successful page with full frontmatter and a transformed body", () => {
    const text = fs.readFileSync(path.join(contentDir, "prepare", "go-bag.md"), "utf8");
    expect(text.startsWith("---\n")).toBe(true);
    expect(text).toContain('title: "準備救難包"');
    expect(text).toContain("section: prepare");
    expect(text).toContain("order: 1");
    expect(text).toContain(`sourceUrl: "https://hackmd.example.test/${GOOD_ID}"`);
    expect(text).toContain('sourceCommit: "fedcba9876543210feed"');
    expect(text).toMatch(/syncedAt: "\d{4}-\d{2}-\d{2}"/);
    expect(text).not.toContain("tags: 民防, 數位韌性松");
    expect(text).not.toContain("###### tags:");
    expect(text).not.toMatch(/^# 準備救難包$/m);
    expect(text).toContain('<div class="callout callout-info">');
    expect(text).toContain("](/handbook/respond/health/)");
    expect(text).toContain("](https://hackmd.example.test/unmapped00)");
    expect(text).toContain("![救難包](/handbook-assets/prepare/go-bag/kit0001-");
  });

  it("vendors the note's image into publicDir", () => {
    const dir = path.join(publicDir, "handbook-assets", "prepare", "go-bag");
    const files = fs.readdirSync(dir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^kit0001-[0-9a-f]{8}\.png$/);
  });

  it("writes nothing at all for the failed page", () => {
    expect(fs.existsSync(path.join(contentDir, "respond", "health.md"))).toBe(false);
    expect(fs.existsSync(path.join(contentDir, "respond"))).toBe(false);
  });

  it("cleans up the .sync-tmp staging directory", () => {
    expect(fs.existsSync(path.join(root, "content", ".sync-tmp"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and watch it fail (module does not exist)**

```sh
npx vitest run tests/unit/sync.test.mjs
```

Expected output includes:

```
 FAIL  tests/unit/sync.test.mjs [ tests/unit/sync.test.mjs ]
Error: Failed to load url ../../scripts/sync-content.mjs
 Test Files  1 failed (1)
```

- [ ] **Step 3: Implement syncAll and the CLI entry point**

Create `scripts/sync-content.mjs` with exactly:

```js
// HackMD-archive -> src/content/handbook sync orchestrator.
//
//   npm run sync          (== node scripts/sync-content.mjs, from the repo root)
//
// Per page: fetch <archiveBase>/<id>.md -> stripHackmdMeta -> extractTitle
// -> convertContainers -> rewriteLinks -> vendorImages -> frontmatter + body.
// Writes are atomic: each page is staged in <contentDir>/../.sync-tmp/ and
// renamed into place only when the whole pipeline succeeded, so a page is
// never half-updated. Any per-page failure is loud: it lands in the summary
// table and flips the exit code to 1.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import {
  stripHackmdMeta,
  extractTitle,
  convertContainers,
  rewriteLinks,
  buildFrontmatter,
} from "./lib/transform.mjs";
import { vendorImages } from "./lib/images.mjs";

const COMMITS_API = "https://api.github.com/repos/g0v-data/g0v-hackmd-archive/commits/main";

export async function syncAll({ configPath, fetchImpl, contentDir, publicDir }) {
  const config = yaml.load(fs.readFileSync(configPath, "utf8"));
  const { archiveBase, hackmdBase, pages } = config;
  const archive = archiveBase.replace(/\/+$/, "");
  const hackmd = hackmdBase.replace(/\/+$/, "");
  const idToSlug = new Map(pages.map((p) => [p.id, p.slug]));

  let sourceCommit;
  try {
    const res = await fetchImpl(COMMITS_API, {
      headers: { accept: "application/vnd.github+json" },
    });
    if (res.ok) sourceCommit = (await res.json()).sha;
  } catch {
    // Offline or rate-limited: sourceCommit stays undefined and is omitted.
  }

  const syncedAt = new Date().toISOString().slice(0, 10);
  const tmpDir = path.join(path.dirname(contentDir), ".sync-tmp");
  const ok = [];
  const failed = [];
  try {
    for (const page of pages) {
      const noteUrl = `${archive}/${page.id}.md`;
      try {
        const res = await fetchImpl(noteUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${noteUrl}`);
        const raw = await res.text();
        const stripped = stripHackmdMeta(raw);
        const { title: extractedTitle, body } = extractTitle(stripped);
        let md = convertContainers(body);
        md = rewriteLinks(md, { idToSlug, hackmdBase: hackmd });
        const vendored = await vendorImages(md, {
          slug: page.slug,
          fetchImpl,
          publicDir,
        });
        const frontmatter = buildFrontmatter({
          title: page.title ?? extractedTitle ?? page.slug,
          section: page.section,
          order: page.order,
          sourceUrl: `${hackmd}/${page.id}`,
          sourceCommit,
          syncedAt,
        });
        fs.mkdirSync(tmpDir, { recursive: true });
        const tmpFile = path.join(tmpDir, `${page.slug.replace(/\//g, "__")}.md`);
        fs.writeFileSync(tmpFile, `${frontmatter}\n${vendored.markdown.trim()}\n`);
        const finalFile = path.join(contentDir, `${page.slug}.md`);
        fs.mkdirSync(path.dirname(finalFile), { recursive: true });
        fs.renameSync(tmpFile, finalFile);
        ok.push({ slug: page.slug });
      } catch (err) {
        failed.push({ slug: page.slug, error: err.message });
      }
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  return { ok, failed };
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const { ok, failed } = await syncAll({
    configPath: "sync.config.yaml",
    fetchImpl: fetch,
    contentDir: "src/content/handbook",
    publicDir: "public",
  });
  for (const { slug } of ok) {
    console.log(`  OK    ${slug.padEnd(28)}`);
  }
  for (const { slug, error } of failed) {
    console.log(`  FAIL  ${slug.padEnd(28)} ${error}`);
  }
  console.log(`\n${ok.length} synced, ${failed.length} failed`);
  if (failed.length > 0) process.exitCode = 1;
}
```

- [ ] **Step 4: Run the test and watch it pass**

```sh
npx vitest run tests/unit/sync.test.mjs
```

Expected output includes:

```
 ✓ tests/unit/sync.test.mjs (5 tests)
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

- [ ] **Step 5: Commit the orchestrator**

```sh
git add scripts/sync-content.mjs tests/unit/sync.test.mjs
git commit -m "feat: add sync orchestrator with atomic per-page writes" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Verify the Task 2 manifest and Task 1 `.gitignore` entry are present**

The 20-page curation manifest `sync.config.yaml` was created and committed in Task 2, and `.gitignore` already ends with `.sync-tmp/` from Task 1 — this task only consumes both files and must not recreate or modify them. Sanity-check before the real run:

```sh
node --input-type=module -e "
import yaml from 'js-yaml';
import { readFileSync } from 'node:fs';
console.log(yaml.load(readFileSync('sync.config.yaml', 'utf8')).pages.length + ' pages');
"
grep -c '^\.sync-tmp/$' .gitignore
```

Expected output:

```
20 pages
1
```

If either check fails, stop — Task 2 (manifest) or Task 1 (`.gitignore`) did not land; fix the root cause in those tasks instead of recreating the files here.

- [ ] **Step 7: Run the first real sync (network required)**

```sh
node scripts/sync-content.mjs
```

Expected output: 20 `OK` rows (one per manifest slug) and the summary line:

```
  OK    prepare/go-bag
  OK    prepare/household-supplies
  OK    prepare/comms-backup
  OK    prepare/shelter-locations
  OK    prepare/first-aid
  OK    prepare/certifications
  OK    respond/communication
  OK    respond/transport
  OK    respond/health
  OK    mesh/intro
  OK    mesh/buying
  OK    mesh/firmware
  OK    mesh/taiwan-mesh
  OK    mesh/g0mesh
  OK    mesh/g0mesh-quickstart
  OK    scenarios/levels
  OK    scenarios/submarine-cables
  OK    scenarios/outage-risks
  OK    selfhost/alternatives
  OK    selfhost/saas-guide

20 synced, 0 failed
```

(Trailing padding spaces after each slug are expected.) Troubleshooting, in order:
- A `FAIL <slug> HTTP 404 fetching https://raw.githubusercontent.com/...` row means that manifest `id` is wrong. Fix the `id` in `sync.config.yaml` against https://github.com/g0v-data/g0v-hackmd-archive/blob/main/tags/digital-resilience.md and re-run. Never delete the page entry to make the sync pass. (All 20 ids above were verified returning HTTP 200 on 2026-07-17.)
- A `FAIL <slug> image download failed: <url> ...` row names the exact dead or rate-limited image URL. Re-run once for transient rate limits; if it persists, the source note on HackMD references a dead image and must be fixed upstream — the pipeline intentionally refuses to publish a page with a broken offline image.

- [ ] **Step 8: Verify the synced content on disk**

```sh
find src/content/handbook -name '*.md' | wc -l
head -8 src/content/handbook/prepare/go-bag.md
ls public/handbook-assets 2>/dev/null || echo "(no vendored images -- no note referenced a remote image)"
```

Expected output: the count is exactly `20`; the head shows the generated frontmatter, e.g.:

```
---
title: "準備救難包"
section: prepare
order: 1
sourceUrl: "https://g0v.hackmd.io/Ojw57urwQ1O8Bs9NJH_NfA"
sourceCommit: "<40-char hex sha>"
syncedAt: "2026-07-17"
---
```

(`sourceCommit` may be absent if the GitHub API call was rate-limited — that is the documented fallback, not an error.) `ls public/handbook-assets` lists section directories for every note that had remote images, or prints the fallback message. For reference, a dry run of this exact pipeline on 2026-07-17 produced 20 pages, 0 leftover `:::` containers, 0 leftover remote image references, and 10 vendored images (about 5.5 MB, all under `public/handbook-assets/scenarios/submarine-cables/`) — image weight the Task 12 precache-budget gate must account for.

- [ ] **Step 9: Validate the content against the collection schema**

```sh
npx astro sync
```

Expected: exit code 0 and a `[types] Generated` (or `Types generated`) line, with **zero** zod/content errors. Any `[InvalidContentEntryDataError]`-style output means a synced page violates the Task 2 schema — inspect the named file, fix the root cause in the pipeline (never hand-edit the synced page), re-run Step 7.

- [ ] **Step 10: Run the full unit suite and a full build with real content**

```sh
npm test
npm run build
```

Expected `npm test` output includes:

```
 Test Files  3 passed (3)
      Tests  25 passed (25)
```

Expected `npm run build`: `astro build` finishes with a `[build] Complete!` line, then Pagefind runs (`Running Pagefind`) and exits 0. (At this point in the plan the handbook routes from Task 9 may not exist yet — Pagefind indexing only the scaffold pages is fine; the command must still exit 0.)

- [ ] **Step 11: Commit the first synced content**

```sh
git add src/content/handbook
if [ -d public/handbook-assets ]; then git add public/handbook-assets; fi
git commit -m "feat: add first synced handbook content" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

Verify with `git show --stat HEAD` — the commit contains 20 files under `src/content/handbook/`, plus any vendored images under `public/handbook-assets/` (and nothing else: `sync.config.yaml` and `.gitignore` were committed by Tasks 2 and 1 and are untouched here).

### Task 6: Design foundation — fonts, tokens, layout, header/footer, theme

**Files:**
- Create: `scripts/fetch-assets.mjs`, `src/layouts/BaseLayout.astro`, `src/components/SiteHeader.astro`, `src/components/SiteFooter.astro`, `src/components/Px.astro`, `src/components/StatusDot.astro`, `src/lib/sections.ts`; committed asset outputs `public/fonts/Cubic_11.woff2`, `public/icons/px/*.svg` (17 files), `public/brand/*.png` (4 files)
- Modify: `src/styles/global.css` (scaffold placeholder → full design-system port), `src/pages/index.astro` (scaffold placeholder → interim BaseLayout smoke page; Task 7 replaces it with the real landing)
- Test: no unit-testable logic (assets, CSS, layout chrome) — verified by `npm run assets` output, `npm run build`, and exact `grep`/`ls` checks against `dist/`

**Interfaces:**
- Consumes: scaffold `package.json` npm scripts (`assets`, `build`) and devDependencies (`@fontsource/press-start-2p`, `@fontsource/ibm-plex-mono`, `pixelarticons`, `sharp`, …) from Task 1; `design/tokens/*.css` and `design/assets/logo/{mark,mark-dark,wordmark,wordmark-dark}.png` (read-only reference/source material in this repo); the scaffold placeholder files `src/styles/global.css` and `src/pages/index.astro` (both wholly replaced here).
- Produces: `BaseLayout.astro` with props `{ title: string; description?: string; lang?: string }` (default lang `"zh-Hant-TW"`), containing the fontsource imports, the blocking `drt-theme` localStorage script, skip-link, `<SiteHeader/>`, `<main id="main"><slot/></main>`, `<SiteFooter/>`, `<meta name="theme-color" content="#0c0c0b">`; no-props `SiteHeader.astro` (sticky header; nav 首頁 HOME / 時程 SCHEDULE / 手冊 HANDBOOK; theme toggle persisting localStorage `"drt-theme"`; a `<button data-open-register>` that is inert until Task 8 wires the dialog — Task 8 modifies this file) and `SiteFooter.astro`; `Px.astro` props `{ name: string; size?: number; color?: string }` (CSS-mask icon from `/icons/px/<name>.svg`); `StatusDot.astro` props `{ status: "online"|"degraded"|"offline"; label?: string; blink?: boolean }`; `src/lib/sections.ts` exporting `SECTION_NAMES`, `SECTION_ORDER`, `SectionSlug`; global CSS classes `.container .skip-link .label .pixel-h .pixel-h--1..5 .pixel-h-tc .pixel-h-tc--1..4 .btn .btn-primary .btn-secondary .btn-ghost .btn-sm .btn-lg .btn-inert .card .card-lifted .card-offline .card-head .card-body .card-foot .card-title .card-title-tc .card-meta .badge .dot .dot--online .dot--degraded .dot--offline .dot--live .alert .alert-online .alert-degraded .alert-offline .alert-title .alert-body .tabs .tab .tab-active .field .input .check .check-box .scanlines .slash .callout .callout-info .callout-warning .callout-danger .callout-success .t-accent .t-accent-2 .t-2 .t-dim` plus keyframes `drt-blink`/`drt-marquee`, reduced-motion guards, and print overrides (paper tokens, chrome hidden). Committed assets under `public/fonts/`, `public/icons/px/`, `public/brand/` (no network at build or runtime).

Two verified deviations from the shared contract (both discovered by live checks on 2026-07-17 — the contract itself demands verification of third-party facts):

1. **`@fontsource/ibm-plex-sans-tc` does not exist on npm** (`npm view @fontsource/ibm-plex-sans-tc` → E404; Fontsource ships no TC variant of IBM Plex Sans). The body TC face is the spec §7 original choice `@fontsource/noto-sans-tc` (exists, v5.2.x), already pinned by Task 1's `package.json`. The `--font-sans` token keeps `"IBM Plex Sans TC"` first in its chain so a locally-installed copy is used when a visitor has one; `"Noto Sans TC"` (self-hosted) is the face that actually loads.
2. **The Cubic 11 contract URL 404s**: `https://cdn.jsdelivr.net/gh/ACh-K/Cubic-11@main/fonts/Cubic_11.woff2` returns HTTP 404 — the upstream repo moved web fonts into `fonts/web/`. Verified working: `https://cdn.jsdelivr.net/gh/ACh-K/Cubic-11@main/fonts/web/Cubic_11.woff2` (HTTP 206 on range probe, full size 400,228 bytes). `fetch-assets.mjs` tries the contract URL first, then the `fonts/web/` path.

- [ ] **Step 1: Verify `@fontsource/noto-sans-tc` is installed**

Task 1's `package.json` already pins the TC body face (`@fontsource/ibm-plex-sans-tc` does not exist on npm — see deviation note 1 above). Confirm it is present before wiring the font imports (from `/workspace/digiresi.g0v.tw`):

```bash
node -e "const p=require('./package.json');console.log(p.devDependencies['@fontsource/noto-sans-tc'] ?? 'MISSING')"
```

Expected output: `^5.2.0`. If it prints `MISSING`, Task 1 Step 1 was not followed — fix `package.json` in that task and re-run `npm install`; do not patch dependencies here.

- [ ] **Step 2: Create `scripts/fetch-assets.mjs`**

```js
#!/usr/bin/env node
// One-time asset vendoring for digiresi.g0v.tw. Outputs are COMMITTED —
// neither the build nor the runtime ever touches the network for these.
// Idempotent: the Cubic 11 download is skipped when the file already exists;
// icon/brand copies are cheap and always re-run.
import { access, copyFile, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const CUBIC11_URLS = [
  // URL as pinned by the design spec (upstream layout when the DS was authored):
  "https://cdn.jsdelivr.net/gh/ACh-K/Cubic-11@main/fonts/Cubic_11.woff2",
  // Current upstream layout — fonts moved into fonts/web/ (verified 2026-07-17):
  "https://cdn.jsdelivr.net/gh/ACh-K/Cubic-11@main/fonts/web/Cubic_11.woff2",
];

// The 17 pixelarticons used by the site (contract list, all verified to exist
// in pixelarticons@1.8.1 svg/).
const ICONS = [
  "radio-signal", "server", "alert", "users", "map", "calendar-month",
  "clock", "download", "external-link", "arrow-right", "zap", "moon",
  "sun", "cellular-signal-off", "battery-1", "chat", "code",
];

const BRAND = ["mark.png", "mark-dark.png", "wordmark.png", "wordmark-dark.png"];

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function fetchCubic11() {
  const dest = path.join("public", "fonts", "Cubic_11.woff2");
  if (await exists(dest)) {
    console.log(`skip  ${dest} (already present)`);
    return;
  }
  await mkdir(path.dirname(dest), { recursive: true });
  let lastError = null;
  for (const url of CUBIC11_URLS) {
    const res = await fetch(url);
    if (!res.ok) {
      lastError = new Error(`HTTP ${res.status} for ${url}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(dest, buf);
    console.log(`font  ${dest} (${buf.length} bytes) <- ${url}`);
    return;
  }
  throw lastError ?? new Error("no Cubic 11 URL responded");
}

async function copyIcons() {
  const destDir = path.join("public", "icons", "px");
  await mkdir(destDir, { recursive: true });
  for (const name of ICONS) {
    const src = path.join("node_modules", "pixelarticons", "svg", `${name}.svg`);
    await copyFile(src, path.join(destDir, `${name}.svg`));
  }
  console.log(`icons ${ICONS.length} pixelarticons -> ${destDir}/`);
}

async function copyBrand() {
  const destDir = path.join("public", "brand");
  await mkdir(destDir, { recursive: true });
  for (const file of BRAND) {
    await copyFile(path.join("design", "assets", "logo", file), path.join(destDir, file));
  }
  console.log(`brand ${BRAND.length} logo PNGs -> ${destDir}/`);
}

await fetchCubic11();
await copyIcons();
await copyBrand();
console.log("assets OK");
```

- [ ] **Step 3: Run the asset fetch and verify outputs**

```bash
npm run assets
```

Expected output (first URL currently 404s, so the `fonts/web/` fallback is used):

```
font  public/fonts/Cubic_11.woff2 (400228 bytes) <- https://cdn.jsdelivr.net/gh/ACh-K/Cubic-11@main/fonts/web/Cubic_11.woff2
icons 17 pixelarticons -> public/icons/px/
brand 4 logo PNGs -> public/brand/
assets OK
```

Then verify:

```bash
ls public/icons/px | wc -l
ls public/brand
stat -c%s public/fonts/Cubic_11.woff2
```

Expected: `17`; `mark-dark.png  mark.png  wordmark-dark.png  wordmark.png`; `400228`. Re-run `npm run assets` once more — expected first line `skip  public/fonts/Cubic_11.woff2 (already present)` (idempotence check).

- [ ] **Step 4: Replace `src/styles/global.css` with the full design-system port**

Replace the ENTIRE contents of `src/styles/global.css` with:

```css
/* ==========================================================================
   digiresi.g0v.tw — DigiResiTh0n design system (CSS port)
   Tokens ported verbatim from design/tokens/{colors,typography,spacing,
   effects,base}.css. Dark ("blackout") is the DEFAULT theme (no attribute);
   light ("paper") only via data-theme="light" on <html>.
   Rules of the world: radius 0, 2px structural borders, hard pixel shadows,
   stepped motion, no gradients-as-decoration, no blur, no emoji.
   ========================================================================== */

/* ---- color tokens (design/tokens/colors.css, verbatim) ---- */
:root {
  /* base palette */
  --black: #0a0a09;
  --paper: #fafaf8;
  --white: #ffffff;
  --gray-900: #1c1c1a;
  --gray-700: #4a4a45;
  --gray-500: #807f77;
  --gray-300: #c9c8bf;
  --gray-150: #e6e5dd;
  --gray-100: #f0efe9;
  --red: #c40000;
  --red-deep: #8e0000;
  --red-bright: #ff4633;
  --green: #00813d;
  --green-bright: #2bd576;
  --amber: #9a6b00;
  --amber-bright: #ffb020;

  /* semantic — components use ONLY these */
  --bg: #0c0c0b;
  --surface: #151513;
  --surface-sunken: #000000;
  --surface-ink: var(--paper);
  --ink: #f2f1ea;
  --ink-2: #b4b3a8;
  --ink-3: #85847a;
  --ink-on-accent: #ffffff;
  --ink-on-ink: var(--black);
  --line: #f2f1ea;
  --line-soft: #3a3934;
  --accent: var(--red-bright);
  --accent-hover: #ff6f5e;
  --accent-2: var(--green-bright);
  --status-online: var(--green-bright);
  --status-degraded: var(--amber-bright);
  --status-offline: var(--red-bright);
  --selection-bg: var(--red-bright);
  --selection-ink: #0c0c0b;
  --scanline-color: rgba(242, 241, 234, 0.055);
}

[data-theme="light"] {
  --bg: var(--paper);
  --surface: var(--white);
  --surface-sunken: var(--gray-100);
  --surface-ink: var(--black);
  --ink: var(--black);
  --ink-2: var(--gray-700);
  --ink-3: var(--gray-500);
  --ink-on-accent: var(--white);
  --ink-on-ink: var(--paper);
  --line: var(--black);
  --line-soft: var(--gray-300);
  --accent: var(--red);
  --accent-hover: var(--red-deep);
  --accent-2: var(--green);
  --status-online: var(--green);
  --status-degraded: var(--amber);
  --status-offline: var(--red);
  --selection-bg: var(--red);
  --selection-ink: var(--white);
  --scanline-color: rgba(10, 10, 9, 0.05);
}

/* ---- type tokens (design/tokens/typography.css) ----
   Deviations, both spec-mandated: DotGothic16 removed from the pixel chains
   (spec §13 drops it in favor of locally vendored Cubic 11); "Noto Sans TC"
   added as the self-hosted body TC face (@fontsource/ibm-plex-sans-tc does
   not exist on npm — verified 2026-07-17). */
:root {
  --font-pixel: "Press Start 2P", "Cubic 11", monospace;
  --font-mono: "IBM Plex Mono", "IBM Plex Sans TC", "Noto Sans TC", "Courier New", monospace;
  --font-pixel-tc: "Cubic 11", "Press Start 2P", monospace;
  --font-sans: "IBM Plex Sans TC", "Noto Sans TC", system-ui, sans-serif;

  --text-xs: 12px;
  --text-sm: 13px;
  --text-base: 15px;
  --text-lg: 18px;
  --text-prose: 16px; /* sans prose zone — handbook articles only (consumed in Task 9) */

  --px-1: 16px;
  --px-2: 24px;
  --px-3: 32px;
  --px-4: 48px;
  --px-5: 64px;

  --tc-1: 22px;
  --tc-2: 33px;
  --tc-3: 44px;
  --tc-4: 66px;

  --leading-body: 1.7;
  --leading-tight: 1.3;
  --leading-pixel: 1.5;
  --tracking-label: 0.08em;
  --weight-body: 400;
  --weight-medium: 500;
  --weight-bold: 700;
}

/* ---- spacing tokens (design/tokens/spacing.css, verbatim) ---- */
:root {
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-5: 24px;
  --sp-6: 32px;
  --sp-7: 48px;
  --sp-8: 64px;
  --sp-9: 96px;
  --sp-10: 128px;
  --container: 1120px;
  --gutter: 24px;
}

/* ---- effects tokens (design/tokens/effects.css, verbatim) ---- */
:root {
  --radius: 0px;
  --border-w: 2px;
  --border: 2px solid var(--line);
  --border-soft: 1px solid var(--line-soft);
  --border-offline: 2px dashed var(--line-soft);

  --shadow-1: 3px 3px 0 var(--line);
  --shadow-2: 6px 6px 0 var(--line);
  --shadow-accent: 6px 6px 0 var(--accent);

  --focus-ring: 2px dashed var(--accent);
  --focus-offset: 2px;

  --stripe-red: repeating-linear-gradient(-45deg, var(--accent) 0 10px, transparent 10px 20px);
  --stripe-caution: repeating-linear-gradient(-45deg, var(--ink) 0 10px, transparent 10px 20px);
  --checker: repeating-conic-gradient(var(--line-soft) 0% 25%, transparent 0% 50%);
  --scanlines: repeating-linear-gradient(0deg, var(--scanline-color) 0 1px, transparent 1px 3px);

  --dur-1: 100ms;
  --dur-2: 200ms;
  --ease-step-2: steps(2, end);
  --ease-step-4: steps(4, end);
}

/* ---- self-hosted Cubic 11 (TC pixel display; vendored by npm run assets) ---- */
@font-face {
  font-family: "Cubic 11";
  src: url(/fonts/Cubic_11.woff2) format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

/* ---- element defaults (design/tokens/base.css port) ---- */
*,
*::before,
*::after {
  box-sizing: border-box;
}
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: var(--text-base);
  line-height: var(--leading-body);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
main {
  flex: 1;
}
a {
  color: var(--accent);
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}
a:hover {
  background: var(--accent);
  color: var(--selection-ink);
  text-decoration: none;
}
::selection {
  background: var(--selection-bg);
  color: var(--selection-ink);
}
code,
kbd {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background: var(--surface-sunken);
  border: var(--border-soft);
  padding: 1px 5px;
}
hr {
  border: 0;
  border-top: var(--border);
}
img {
  max-width: 100%;
}
:focus-visible {
  outline: var(--focus-ring);
  outline-offset: var(--focus-offset);
}
@keyframes drt-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
@keyframes drt-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

/* ---- layout helpers ---- */
.container {
  max-width: var(--container);
  margin-inline: auto;
  padding-inline: var(--gutter);
}
.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  z-index: 100;
  background: var(--surface);
  color: var(--ink);
  border: var(--border);
  padding: var(--sp-2) var(--sp-4);
  font-family: var(--font-mono);
}
.skip-link:focus {
  left: var(--sp-2);
  top: var(--sp-2);
}

/* ---- type roles ---- */
.label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--ink-2);
}
.pixel-h {
  font-family: var(--font-pixel);
  -webkit-font-smoothing: none;
  font-weight: 400;
  line-height: var(--leading-pixel);
  text-transform: uppercase;
  margin: 0;
  font-size: var(--px-2);
}
.pixel-h--1 { font-size: var(--px-1); }
.pixel-h--2 { font-size: var(--px-2); }
.pixel-h--3 { font-size: var(--px-3); }
.pixel-h--4 { font-size: var(--px-4); }
.pixel-h--5 { font-size: var(--px-5); }
.pixel-h-tc {
  font-family: var(--font-pixel-tc);
  -webkit-font-smoothing: none;
  font-weight: 400;
  line-height: var(--leading-pixel);
  margin: 0;
  font-size: var(--tc-2);
}
.pixel-h-tc--1 { font-size: var(--tc-1); }
.pixel-h-tc--2 { font-size: var(--tc-2); }
.pixel-h-tc--3 { font-size: var(--tc-3); }
.pixel-h-tc--4 { font-size: var(--tc-4); }
.t-accent { color: var(--accent); }
.t-accent-2 { color: var(--accent-2); }
.t-2 { color: var(--ink-2); }
.t-dim { color: var(--ink-3); }

/* ---- buttons ---- */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  font-family: var(--font-mono);
  font-weight: 600;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  font-size: 13px;
  line-height: 1.2;
  padding: 10px 20px;
  border: 2px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow-1);
  cursor: pointer;
  user-select: none;
  text-decoration: none;
  transition: all var(--dur-1) var(--ease-step-2);
}
.btn:hover {
  background: var(--ink);
  color: var(--ink-on-ink);
  text-decoration: none;
}
.btn:active {
  transform: translate(3px, 3px);
  box-shadow: none;
}
.btn:focus-visible {
  outline: var(--focus-ring);
  outline-offset: var(--focus-offset);
}
.btn-primary {
  background: var(--accent);
  color: var(--ink-on-accent);
}
.btn-primary:hover {
  background: var(--accent-hover);
  color: var(--ink-on-accent);
}
.btn-secondary {
  background: var(--surface);
  color: var(--ink);
}
.btn-ghost {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}
.btn-ghost:hover {
  background: var(--surface-sunken);
  color: var(--ink);
}
.btn-sm { font-size: 12px; padding: 6px 12px; }
.btn-lg { font-size: 14px; padding: 14px 28px; }
/* Disabled LOOK that stays clickable (e.g. 報名 opens the dialog to explain). */
.btn-inert,
.btn-inert:hover {
  background: transparent;
  color: var(--ink-3);
  border: var(--border-offline);
  box-shadow: none;
}

/* ---- cards ---- */
.card {
  border: var(--border);
  background: var(--surface);
  color: var(--ink);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
}
.card-lifted { box-shadow: var(--shadow-2); }
.card-offline {
  border: var(--border-offline);
  color: var(--ink-3);
}
.card-head {
  border-bottom: var(--border);
  padding: 10px 16px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-3);
}
.card-offline > .card-head { border-bottom: var(--border-offline); }
.card-title {
  font-family: var(--font-pixel);
  font-size: var(--px-1);
  -webkit-font-smoothing: none;
  line-height: 1.4;
  text-transform: uppercase;
}
.card-title-tc {
  font-family: var(--font-pixel-tc);
  font-size: var(--tc-1);
  -webkit-font-smoothing: none;
  line-height: 1.4;
}
.card-meta {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--accent);
}
.card-offline .card-meta { color: var(--ink-3); }
.card-body {
  padding: var(--sp-4);
  flex: 1;
  font-size: var(--text-sm);
  line-height: var(--leading-body);
}
.card-foot {
  border-top: var(--border-soft);
  padding: 10px 16px;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--ink-2);
  display: flex;
  justify-content: space-between;
  gap: var(--sp-3);
}
.card-offline > .card-foot { border-top: var(--border-offline); }

/* ---- badges & status dots ---- */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  border: 2px solid var(--line);
  padding: 3px 9px;
  color: var(--ink);
  background: var(--surface);
  border-radius: var(--radius);
  line-height: 1.4;
}
.dot {
  width: 8px;
  height: 8px;
  flex: none;
  background: var(--ink-3);
}
.dot--online { background: var(--status-online); }
.dot--degraded { background: var(--status-degraded); }
.dot--offline { background: var(--status-offline); }
.dot--live {
  background: var(--accent);
  animation: drt-blink 1.2s steps(1) infinite;
}

/* ---- alerts (left band; caution stripes for degraded/offline) ---- */
.alert {
  position: relative;
  border: var(--border);
  background: var(--surface);
  padding: 12px 16px 12px 30px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  align-items: center;
}
.alert::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 10px;
  border-right: var(--border);
  background: var(--ink);
}
.alert-online::before { background: var(--status-online); }
.alert-degraded::before {
  background: repeating-linear-gradient(-45deg, var(--status-degraded) 0 10px, transparent 10px 20px);
}
.alert-offline::before {
  background: repeating-linear-gradient(-45deg, var(--status-offline) 0 10px, transparent 10px 20px);
}
.alert-title {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: var(--text-sm);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  width: 100%;
}
.alert-online .alert-title { color: var(--status-online); }
.alert-degraded .alert-title { color: var(--status-degraded); }
.alert-offline .alert-title { color: var(--status-offline); }
.alert-body {
  font-size: var(--text-sm);
  color: var(--ink-2);
  line-height: var(--leading-body);
  flex: 1;
  min-width: 20ch;
}

/* ---- tabs ---- */
.tabs {
  display: flex;
  flex-wrap: wrap;
}
.tab {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  padding: 9px 18px;
  cursor: pointer;
  line-height: 1.4;
  border: 2px solid var(--line);
  margin-left: -2px;
  background: var(--surface);
  color: var(--ink);
  position: relative;
  border-radius: var(--radius);
  transition: all var(--dur-1) var(--ease-step-2);
}
.tab:first-child { margin-left: 0; }
.tab:hover { background: var(--surface-sunken); }
.tab:focus-visible {
  outline: var(--focus-ring);
  outline-offset: var(--focus-offset);
  z-index: 2;
}
.tab-active,
.tab-active:hover {
  background: var(--ink);
  color: var(--ink-on-ink);
  z-index: 1;
}

/* ---- forms ---- */
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-family: var(--font-mono);
}
.input {
  display: block;
  width: 100%;
  background: var(--surface-sunken);
  border: 2px solid var(--line-soft);
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  padding: 10px 12px;
}
.input:focus {
  border-color: var(--line);
  outline: var(--focus-ring);
  outline-offset: var(--focus-offset);
}
.check {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--ink);
  user-select: none;
}
.check input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.check-box {
  width: 18px;
  height: 18px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--line);
  background: var(--surface-sunken);
  font-weight: 700;
  font-size: 13px;
  line-height: 1;
  color: var(--accent-2);
}
.check input:checked + .check-box::after { content: "✕"; }
.check input:focus-visible + .check-box {
  outline: var(--focus-ring);
  outline-offset: var(--focus-offset);
}

/* ---- motifs ---- */
.scanlines {
  position: absolute;
  inset: 0;
  background: var(--scanlines);
  pointer-events: none;
}
.slash {
  position: absolute;
  top: -20%;
  width: 18px;
  height: 140%;
  background: var(--accent);
  transform: rotate(45deg);
  pointer-events: none;
}

/* ---- callouts (rendered from synced HackMD :::containers) ---- */
.callout {
  border: var(--border-soft);
  border-left: 10px solid var(--line);
  background: var(--surface);
  padding: var(--sp-4) var(--sp-5);
  margin-block: var(--sp-5);
}
.callout > :first-child { margin-top: 0; }
.callout > :last-child { margin-bottom: 0; }
.callout-info { border-left-color: var(--line); }
.callout-warning { border-left-color: var(--status-degraded); }
.callout-danger { border-left-color: var(--status-offline); }
.callout-success { border-left-color: var(--status-online); }
details {
  border: var(--border-soft);
  background: var(--surface);
  padding: var(--sp-3) var(--sp-4);
  margin-block: var(--sp-4);
}
summary {
  cursor: pointer;
  font-family: var(--font-mono);
  font-weight: 600;
}

/* ---- motion guard ---- */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* ---- print: paper is the ultimate offline. Paper tokens + no site chrome. ---- */
@media print {
  :root {
    --bg: var(--paper);
    --surface: var(--white);
    --surface-sunken: var(--gray-100);
    --surface-ink: var(--black);
    --ink: var(--black);
    --ink-2: var(--gray-700);
    --ink-3: var(--gray-500);
    --ink-on-accent: var(--white);
    --ink-on-ink: var(--paper);
    --line: var(--black);
    --line-soft: var(--gray-300);
    --accent: var(--red);
    --accent-hover: var(--red-deep);
    --accent-2: var(--green);
    --status-online: var(--green);
    --status-degraded: var(--amber);
    --status-offline: var(--red);
    --selection-bg: var(--red);
    --selection-ink: var(--white);
    --scanline-color: rgba(10, 10, 9, 0.05);
  }
  .site-header,
  .site-footer,
  .skip-link {
    display: none !important;
  }
}
```

- [ ] **Step 5: Create `src/lib/sections.ts`**

```ts
// Handbook section enum display names + canonical order (shared contract).
export const SECTION_NAMES = {
  prepare: "準備",
  respond: "應變",
  mesh: "通訊網",
  scenarios: "情境",
  selfhost: "自架服務",
} as const;

export const SECTION_ORDER = ["prepare", "respond", "mesh", "scenarios", "selfhost"] as const;

export type SectionSlug = (typeof SECTION_ORDER)[number];
```

- [ ] **Step 6: Create `src/components/Px.astro`**

```astro
---
// Pixelarticon via CSS mask so semantic color tokens apply.
// Icons are vendored to public/icons/px/ by scripts/fetch-assets.mjs —
// NEVER loaded from unpkg/CDN.
interface Props {
  name: string;
  size?: number;
  color?: string;
}
const { name, size = 20, color = "var(--ink)" } = Astro.props;
const url = `url(/icons/px/${name}.svg)`;
const style = [
  `width:${size}px`,
  `height:${size}px`,
  `background:${color}`,
  `-webkit-mask:${url} center/contain no-repeat`,
  `mask:${url} center/contain no-repeat`,
].join(";");
---
<span class="px" aria-hidden="true" style={style}></span>
<style>
  .px {
    display: inline-block;
    flex: none;
  }
</style>
```

- [ ] **Step 7: Create `src/components/StatusDot.astro`**

```astro
---
interface Props {
  status: "online" | "degraded" | "offline";
  label?: string;
  blink?: boolean;
}
const { status, label, blink } = Astro.props;
const doBlink = blink ?? status === "online";
---
<span class={`status-dot status-dot--${status}`}>
  <span class:list={["sd-dot", { "sd-blink": doBlink }]}></span>
  {label ?? status}
</span>
<style>
  .status-dot {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--ink);
  }
  .sd-dot {
    width: 10px;
    height: 10px;
    flex: none;
  }
  .status-dot--online .sd-dot { background: var(--status-online); }
  .status-dot--degraded .sd-dot { background: var(--status-degraded); }
  .status-dot--offline .sd-dot { background: var(--status-offline); }
  .sd-blink { animation: drt-blink 1.2s steps(1) infinite; }
</style>
```

- [ ] **Step 8: Create `src/components/SiteHeader.astro`**

The Register button carries `data-open-register` and is inert until Task 8 renders the `<dialog>` and wires the openers. The composed logo (mark + wordmark side by side — the DS ships no lockup asset) swaps between `-dark` and plain PNGs via the theme attribute.

```astro
---
import Px from "./Px.astro";
import StatusDot from "./StatusDot.astro";

const nav = [
  { href: "/", label: "首頁 HOME" },
  { href: "/schedule/", label: "時程 SCHEDULE" },
  { href: "/handbook/", label: "手冊 HANDBOOK" },
];
const pathname = Astro.url.pathname;
const isActive = (href: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href.replace(/\/$/, ""));
---
<header class="site-header">
  <div class="container inner">
    <a class="brand" href="/" aria-label="DigiResiThon 首頁">
      <img class="only-dark" src="/brand/mark-dark.png" alt="" height="32" />
      <img class="only-dark wordmark" src="/brand/wordmark-dark.png" alt="DIGIRESITHON" height="16" />
      <img class="only-light" src="/brand/mark.png" alt="" height="32" />
      <img class="only-light wordmark" src="/brand/wordmark.png" alt="DIGIRESITHON" height="16" />
    </a>
    <nav aria-label="主選單">
      {nav.map((n) => (
        <a
          href={n.href}
          class:list={["nav-link", { "nav-active": isActive(n.href) }]}
          aria-current={isActive(n.href) ? "page" : undefined}
        >{n.label}</a>
      ))}
    </nav>
    <StatusDot status="online" label="ONLINE" />
    <button id="theme-toggle" type="button" aria-label="切換主題" title="blackout / paper">
      <span class="only-dark ticon"><Px name="sun" size={16} /></span>
      <span class="only-light ticon"><Px name="moon" size={16} /></span>
    </button>
    <button class="btn btn-primary btn-sm" type="button" data-open-register>報名</button>
  </div>
</header>
<style>
  .site-header {
    position: sticky;
    top: 0;
    z-index: 40;
    background: var(--bg);
    border-bottom: var(--border);
  }
  .inner {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--sp-2) var(--sp-5);
    min-height: 64px;
    padding-block: var(--sp-2);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    background: none;
  }
  .brand:hover { background: none; }
  .brand img {
    display: block;
    width: auto;
  }
  nav {
    display: flex;
    gap: 4px;
    margin-left: auto;
  }
  .nav-link {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--ink);
    text-decoration: none;
    padding: 8px 12px;
  }
  .nav-link:hover,
  .nav-active {
    background: var(--ink);
    color: var(--ink-on-ink);
  }
  #theme-toggle {
    background: transparent;
    border: 2px solid var(--line);
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
  }
  .ticon { display: flex; }
  /* Theme swap: default (dark) shows the *-dark assets + sun icon. */
  .only-light { display: none; }
  :global(html[data-theme="light"]) .only-light { display: flex; }
  :global(html[data-theme="light"]) .only-dark { display: none; }
  :global(html[data-theme="light"]) img.only-light { display: block; }
  :global(html[data-theme="light"]) img.only-dark { display: none; }
  @media (max-width: 760px) {
    .wordmark { display: none; }
    .nav-link { padding: 8px 8px; }
  }
</style>
<script>
  // Theme toggle. Dark ("blackout") = no attribute; light = data-theme="light".
  // Persisted to localStorage "drt-theme"; the blocking script in BaseLayout
  // <head> re-applies the choice before first paint.
  const btn = document.getElementById("theme-toggle");
  btn?.addEventListener("click", () => {
    const root = document.documentElement;
    const toLight = root.getAttribute("data-theme") !== "light";
    if (toLight) {
      root.setAttribute("data-theme", "light");
    } else {
      root.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem("drt-theme", toLight ? "light" : "dark");
    } catch {
      /* storage unavailable — toggle still works for this page view */
    }
  });
</script>
```

- [ ] **Step 9: Create `src/components/SiteFooter.astro`**

```astro
---
// Footer chrome: mark logo, mono-caps attribution, community links.
---
<footer class="site-footer">
  <div class="container inner">
    <img class="only-dark" src="/brand/mark-dark.png" alt="DigiResiThon mark" height="40" />
    <img class="only-light" src="/brand/mark.png" alt="DigiResiThon mark" height="40" />
    <div class="lines">
      A G0V COMMUNITY PROJECT · 內容 CC BY 4.0 ·
      <a href="https://g0v.hackmd.io/s/COC">CODE OF CONDUCT</a> APPLIES<br />
      NOBODY OWNS THIS. THAT MEANS YOU DO.
    </div>
    <div class="links">
      <a href="https://g0v.hackmd.io/fKrjZ3BlRfWmQ471wcSdBg">SLACK #DIGIRESITHON</a>
      <a href="https://g0v.hackmd.io/mGQcbKRDShmvyeGV74w_0w">大全</a>
      <a href="https://github.com/g0v/digiresi.g0v.tw">GIT</a>
      <a href="/about/">關於</a>
      <a href="/en/">EN</a>
    </div>
  </div>
</footer>
<style>
  .site-footer {
    border-top: var(--border);
    margin-top: auto;
  }
  .inner {
    display: flex;
    align-items: center;
    gap: var(--sp-5);
    flex-wrap: wrap;
    padding-block: 28px;
  }
  .inner img {
    display: block;
    width: auto;
  }
  .lines {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--ink-3);
    letter-spacing: var(--tracking-label);
    line-height: 2;
  }
  .links {
    margin-left: auto;
    display: flex;
    gap: var(--sp-4);
    flex-wrap: wrap;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-label);
  }
  .only-light { display: none; }
  :global(html[data-theme="light"]) .only-light { display: block; }
  :global(html[data-theme="light"]) .only-dark { display: none; }
</style>
```

- [ ] **Step 10: Create `src/layouts/BaseLayout.astro`**

```astro
---
import "../styles/global.css";
import "@fontsource/press-start-2p";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@fontsource/ibm-plex-mono/700.css";
import "@fontsource/noto-sans-tc/400.css";
import "@fontsource/noto-sans-tc/700.css";
import SiteHeader from "../components/SiteHeader.astro";
import SiteFooter from "../components/SiteFooter.astro";

interface Props {
  title: string;
  description?: string;
  lang?: string;
}
const { title, description, lang = "zh-Hant-TW" } = Astro.props;
---
<html lang={lang}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    {description && <meta name="description" content={description} />}
    <meta name="theme-color" content="#0c0c0b" />
    <link rel="icon" href="/icons/icon-64.png" />
    <script is:inline>
      // Blocking theme init — must run before first paint.
      // Dark ("blackout") is the default (no attribute). Light ONLY when the
      // visitor chose it via the nav toggle. No prefers-color-scheme switch.
      (function () {
        try {
          if (localStorage.getItem("drt-theme") === "light") {
            document.documentElement.setAttribute("data-theme", "light");
          }
        } catch (e) {
          /* storage disabled: stay dark */
        }
      })();
    </script>
  </head>
  <body>
    <a class="skip-link" href="#main">跳到主要內容</a>
    <SiteHeader />
    <main id="main">
      <slot />
    </main>
    <SiteFooter />
  </body>
</html>
```

(`/icons/icon-64.png` is generated by `scripts/make-icons.mjs` in Task 11; until then browsers log a harmless 404 for the favicon. `astro build` does not validate asset links.)

- [ ] **Step 11: Replace `src/pages/index.astro` with an interim BaseLayout smoke page**

Task 7 replaces this file with the full kit-Landing recreation; this interim version exists so this task's build verification exercises the layout, header, footer, fonts, and theme script. Replace the ENTIRE contents of `src/pages/index.astro` with:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
---
<BaseLayout
  title="數位韌性松 DigiResiThon｜g0v"
  description="g0v 數位韌性松：斷網也要能傳話。"
>
  <section class="container smoke">
    <h1 class="pixel-h-tc pixel-h-tc--3">網路斷了<br />我們<br /><span class="t-accent">不斷</span></h1>
    <p class="t-2">首頁施工中——完整版由下一個任務放進來。</p>
  </section>
</BaseLayout>
<style>
  .smoke {
    padding-block: var(--sp-8);
  }
</style>
```

- [ ] **Step 12: Verify — build and grep the foundation**

```bash
npm run build
```

Expected: exit code 0; Astro logs the built page(s) (at minimum `/index.html`; plus whatever earlier tasks added) followed by the Pagefind pass.

```bash
ls dist/_astro/ | grep -E "^(press-start-2p|ibm-plex-mono|noto-sans-tc)-.*woff2" | head -6
grep -c "drt-theme" dist/index.html
grep -F "/brand/mark-dark.png" dist/index.html && echo LOGO-OK
grep -F "手冊 HANDBOOK" dist/index.html && echo NAV-OK
grep -F 'data-open-register' dist/index.html && echo REGBTN-OK
grep -F "NOBODY OWNS THIS" dist/index.html && echo FOOTER-OK
grep -F 'class="skip-link"' dist/index.html && echo A11Y-OK
grep -rl "Cubic_11.woff2" dist/_astro/*.css && echo CUBIC-OK
test -f dist/fonts/Cubic_11.woff2 && echo FONTFILE-OK
ls dist/icons/px | wc -l
```

Expected: the `ls` lists hashed woff2 files for all three fontsource families (e.g. `press-start-2p-latin-400-normal.<hash>.woff2`, `ibm-plex-mono-latin-400-normal.<hash>.woff2`, `ibm-plex-mono-latin-600-normal.<hash>.woff2`, `noto-sans-tc-*.woff2`); `grep -c "drt-theme"` prints at least `1` (blocking inline script present); markers `LOGO-OK`, `NAV-OK`, `REGBTN-OK`, `FOOTER-OK`, `A11Y-OK`, `CUBIC-OK`, `FONTFILE-OK` all print; the final count is `17`.

- [ ] **Step 13: Commit**

```bash
git add scripts/fetch-assets.mjs public/fonts/Cubic_11.woff2 public/icons/px public/brand \
  src/styles/global.css src/lib/sections.ts \
  src/components/Px.astro src/components/StatusDot.astro \
  src/components/SiteHeader.astro src/components/SiteFooter.astro \
  src/layouts/BaseLayout.astro src/pages/index.astro
git commit -m "feat: design system foundation — tokens, fonts, layout chrome" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Landing homepage + about + en pages

**Files:**
- Create: `src/components/TerminalBlock.astro`, `src/components/SignalBars.astro`, `src/components/Marquee.astro`, `src/components/SectionHeader.astro`, `src/components/NextEvent.astro`, `src/data/events.yaml`, `src/lib/events.ts`, `src/pages/about.astro`, `src/pages/en/index.astro`
- Modify: `src/pages/index.astro` (Task 6 interim page → full kit-Landing recreation)
- Test: `tests/unit/events.test.ts` (TDD for the pure event-selection logic; pages verified by `npm run build` + exact `grep` checks)

**Interfaces:**
- Consumes: `BaseLayout.astro`, `Px.astro`, global classes `.container .btn .btn-primary .btn-lg .btn-sm .btn-ghost .btn-inert .card .card-body .card-foot .alert .alert-online .alert-title .alert-body .pixel-h .pixel-h-tc .pixel-h--2 .pixel-h-tc--1 .pixel-h-tc--3 .label .scanlines .slash .t-accent .t-2` and keyframes `drt-blink`/`drt-marquee` (Task 6); the `data-open-register` convention (Task 6; dialog wired in Task 8); devDependencies `js-yaml`, `vitest` (Task 1).
- Produces: `TerminalBlock.astro` props `{ title?: string; lines: Array<{ prompt?: string; text: string; tone?: "green"|"red"|"dim" }>; cursor?: boolean }` (plus a default `<slot/>` after the lines); `SignalBars.astro` props `{ level?: number; bars?: number; height?: number; animated?: boolean }`; `Marquee.astro` props `{ items: string[]; speed?: number }`; `SectionHeader.astro` props `{ label: string; right?: string }`; `NextEvent.astro` (no props); `src/data/events.yaml` — root-level array of all 16 events Th15n→Th0n (shape per contract: `number, name, date|null, venue|null, summary|null, url, registerUrl|null, days|null`); `src/lib/events.ts` exporting types `SessionTag`, `EventSession`, `EventDay`, `EventEntry` and functions `loadEvents(): EventEntry[]`, `upcomingEvent(events: EventEntry[], todayISO: string): EventEntry | null`, `featuredEvent(events: EventEntry[], todayISO: string): EventEntry | null`; routes `/`, `/about/`, `/en/`. Task 8 consumes `events.yaml`, `events.ts`, `TerminalBlock.astro`, `SectionHeader.astro`.

Event facts were mined from the 大全 master doc (`g0v.hackmd.io/mGQcbKRDShmvyeGV74w_0w`) and each round's archived note (`g0v-data/g0v-hackmd-archive`). The Th13n/Th14n notes carry copy-paste year typos ("2025"); the master doc's date prefixes (`20260118`, `20260308`) win. Session tables exist only in the Th0n/Th1n/Th2n notes → only those get `days`; everything else is `days: null`. Fields not determinable from sources are `null` — never guessed. As of the plan date (2026-07-17) every dated round is in the past and Th16n is not yet announced, so `upcomingEvent` returns `null` and all "registration open" branches render their closed/fallback states — the code paths for an announced next event are still written and typed.

- [ ] **Step 1: Create `src/components/TerminalBlock.astro`**

```astro
---
// Terminal panel: traffic squares header, sunken scanlined body, blinking
// block cursor. Prompts/statuses stay EN (brand voice); free text may be zh.
export interface TermLine {
  prompt?: string;
  text: string;
  tone?: "green" | "red" | "dim";
}
interface Props {
  title?: string;
  lines: TermLine[];
  cursor?: boolean;
}
const { title = "digiresithon@tw:~", lines, cursor = true } = Astro.props;
---
<div class="term">
  <div class="term-bar">
    <span class="sq sq-r"></span>
    <span class="sq sq-a"></span>
    <span class="sq sq-g"></span>
    <span class="term-title">{title}</span>
  </div>
  <div class="term-body">
    <div class="scanlines" aria-hidden="true"></div>
    <div class="term-lines">
      {lines.map((l) => (
        <div class={`term-line${l.tone ? ` tone-${l.tone}` : ""}`}>
          {l.prompt && <span class="term-prompt">{l.prompt}</span>}
          {l.text}
        </div>
      ))}
      <slot />
      {cursor && <span class="term-cursor" aria-hidden="true"></span>}
    </div>
  </div>
</div>
<style>
  .term {
    border: var(--border);
    background: var(--surface);
    display: flex;
    flex-direction: column;
  }
  .term-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: var(--border);
  }
  .sq { width: 10px; height: 10px; flex: none; }
  .sq-r { background: var(--accent); }
  .sq-a { background: var(--status-degraded); }
  .sq-g { background: var(--accent-2); }
  .term-title {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-label);
    color: var(--ink-2);
    margin-left: 6px;
  }
  .term-body {
    position: relative;
    background: var(--surface-sunken);
    flex: 1;
    overflow: hidden;
  }
  .term-lines {
    position: relative;
    padding: 14px 16px;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    line-height: 1.8;
  }
  .term-line {
    color: var(--ink);
    white-space: pre-wrap;
  }
  .tone-green { color: var(--accent-2); }
  .tone-red { color: var(--accent); }
  .tone-dim { color: var(--ink-3); }
  .term-prompt { color: var(--accent-2); margin-right: 8px; }
  .term-cursor {
    display: inline-block;
    width: 9px;
    height: 16px;
    background: var(--accent-2);
    vertical-align: -3px;
    animation: drt-blink 1s steps(1) infinite;
  }
</style>
```

- [ ] **Step 2: Create `src/components/SignalBars.astro`**

```astro
---
// Ascending signal bars — the connectivity glyph of the brand.
// animated: pure-CSS stepped cycle (level 0→4 in five 500ms phases), no JS.
// The animated variant is defined for the default bars=4.
interface Props {
  level?: number;
  bars?: number;
  height?: number;
  animated?: boolean;
}
const { level = 4, bars = 4, height = 24, animated = false } = Astro.props;
const w = Math.max(4, Math.round(height / 4));
const gap = Math.max(2, Math.round(w / 2));
const items = Array.from({ length: bars }, (_, i) => ({
  h: Math.round(((i + 1) / bars) * height),
  on: i < level,
  n: i + 1,
}));
---
<span
  class="sb"
  role="img"
  aria-label={animated ? "signal scanning" : `signal ${level}/${bars}`}
  style={`height:${height}px;gap:${gap}px;`}
>
  {items.map((b) => (
    <span
      class:list={["sb-bar", animated ? `sb-anim sb-anim-${b.n}` : b.on ? "sb-on" : "sb-off"]}
      style={`width:${w}px;height:${b.h}px;`}
    ></span>
  ))}
</span>
<style>
  .sb {
    display: inline-flex;
    align-items: flex-end;
  }
  .sb-bar { box-sizing: border-box; }
  .sb-on { background: var(--accent-2); }
  .sb-off {
    background: transparent;
    border: 1px solid var(--line-soft);
  }
  /* Bar N is lit in every 500ms phase where level >= N; steps(1) holds each
     phase flat — sprite motion, no easing. Unlit phases keep the kit's
     hollow 1px --line-soft outline: bars FILL, they never vanish. */
  .sb-anim {
    background: transparent;
    border: 1px solid var(--line-soft);
    animation: 2.5s steps(1, end) infinite;
  }
  .sb-anim-1 { animation-name: bar1; }
  .sb-anim-2 { animation-name: bar2; }
  .sb-anim-3 { animation-name: bar3; }
  .sb-anim-4 { animation-name: bar4; }
  @keyframes bar1 {
    0% { background: transparent; border-color: var(--line-soft); }
    20%, 100% { background: var(--accent-2); border-color: var(--accent-2); }
  }
  @keyframes bar2 {
    0% { background: transparent; border-color: var(--line-soft); }
    40%, 100% { background: var(--accent-2); border-color: var(--accent-2); }
  }
  @keyframes bar3 {
    0% { background: transparent; border-color: var(--line-soft); }
    60%, 100% { background: var(--accent-2); border-color: var(--accent-2); }
  }
  @keyframes bar4 {
    0% { background: transparent; border-color: var(--line-soft); }
    80%, 100% { background: var(--accent-2); border-color: var(--accent-2); }
  }
  @media (prefers-reduced-motion: reduce) {
    .sb-anim {
      animation: none;
      background: var(--accent-2);
      border-color: var(--accent-2);
    }
  }
</style>
```

- [ ] **Step 3: Create `src/components/Marquee.astro`**

```astro
---
// Ticker strip. Content is duplicated inline so drt-marquee's -50% translate
// loops seamlessly. Paused under prefers-reduced-motion.
interface Props {
  items: string[];
  speed?: number;
}
const { items, speed = 30 } = Astro.props;
const content = items.join(" /// ") + " /// ";
---
<div class="marquee" aria-hidden="true">
  <div class="marquee-track" style={`animation-duration:${speed}s;`}>
    <span class="marquee-chunk">{content}</span>
    <span class="marquee-chunk">{content}</span>
  </div>
</div>
<style>
  .marquee {
    overflow: hidden;
    border-top: var(--border);
    border-bottom: var(--border);
    background: var(--surface);
  }
  .marquee-track {
    display: inline-flex;
    white-space: nowrap;
    padding: 8px 0;
    animation-name: drt-marquee;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    font-weight: 600;
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--ink);
    will-change: transform;
  }
  .marquee-chunk {
    white-space: nowrap;
    padding-right: 24px;
  }
  @media (prefers-reduced-motion: reduce) {
    .marquee-track { animation: none; }
  }
</style>
```

(`drt-marquee` is declared in `global.css`; keyframe names declared OUTSIDE a component's own `<style>` are not rewritten by Astro's scoper, so the reference resolves globally.)

- [ ] **Step 4: Create `src/components/SectionHeader.astro`**

```astro
---
// Box-drawing section header: ┌─ LABEL ────────── RIGHT ┐
// Label is set in the TC pixel face so zh-TW labels (時程/手冊/關於…) render
// on the pixel grid; Cubic 11 covers Latin too.
interface Props {
  label: string;
  right?: string;
}
const { label, right } = Astro.props;
---
<div class="section-header">
  <span class="sh-corner">┌─</span>
  <span class="sh-label pixel-h-tc pixel-h-tc--1">{label}</span>
  <span class="sh-rule" aria-hidden="true"></span>
  {right && <span class="sh-right">{right}</span>}
  <span class="sh-corner">┐</span>
</div>
<style>
  .section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: var(--font-mono);
    color: var(--ink-2);
  }
  .sh-corner { font-size: var(--text-sm); }
  .sh-label {
    color: var(--ink);
    letter-spacing: 0.04em;
  }
  .sh-rule {
    flex: 1;
    border-top: 2px solid var(--line-soft);
    transform: translateY(1px);
  }
  .sh-right {
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
  }
</style>
```

- [ ] **Step 5: Create `src/data/events.yaml` with all 16 rounds (Th15n → Th0n)**

```yaml
# 數位韌性松歷次活動（手動維護，最新在前）。
# 來源：大全 https://g0v.hackmd.io/mGQcbKRDShmvyeGV74w_0w 與各場次共筆。
# 規則：
# - date 一律加引號 "YYYY-MM-DD"（js-yaml 依 YAML 1.1 會把裸日期轉成 Date 物件）；
#   查不到的欄位一律 null，不用猜的。
# - Th13n/Th14n 共筆內文年份為複製貼上筆誤（寫 2025），以大全的日期前綴
#   20260118 / 20260308 為準。
# - days 只在共筆留有「活動流程」時間表時填（Th0n/Th1n/Th2n），其餘 null。
# - registerUrl 為各場 KKTIX 頁（歷史場次頁面仍在，是否開放由程式依日期判斷）。
- number: 15
  name: DigiResiTh15n 第拾伍次數位韌性松
  date: "2026-06-21"
  venue: 摩茲工寮 MozTW Space
  summary: null
  url: https://g0v.hackmd.io/II9U3fe8RcqNWqpIfz8qpA
  registerUrl: https://g0v-digiresi.kktix.cc/events/digiresith15n
  days: null
- number: 14
  name: DigiResiTh14n 第拾肆次數位韌性松
  date: "2026-03-08"
  venue: g0v 台北社群空間
  summary: null
  url: https://g0v.hackmd.io/aoUgv0mUQL-pPQVHVh5tvQ
  registerUrl: https://g0v-digiresi.kktix.cc/events/digiresith14n
  days: null
- number: 13
  name: DigiResiTh13n 第拾參次數位韌性松
  date: "2026-01-18"
  venue: g0v 台北社群空間
  summary: null
  url: https://g0v.hackmd.io/dzEjfFD_RLe9DJzOMQ2C8A
  registerUrl: https://g0v-digiresi.kktix.cc/events/digiresith13n
  days: null
- number: 12
  name: DigiResiTh12n 第拾貳次數位韌性松
  date: "2025-12-21"
  venue: NPO HUB Taipei 台北NPO聚落
  summary: null
  url: https://g0v.hackmd.io/iuYFrLclS0CQKczvnZWDPQ
  registerUrl: https://g0v-digiresi.kktix.cc/events/digiresith12n
  days: null
- number: 11
  name: DigiResiTh11n 第拾壹次數位韌性松
  date: "2024-10-31"
  venue: 線上（Jitsi 視訊）
  summary: 線上場，透過 Jitsi 視訊進行。
  url: https://g0v.hackmd.io/3GFbzMscScSYuuRsVshbaw
  registerUrl: https://g0v-digiresi.kktix.cc/events/digiresith11n
  days: null
- number: 10
  name: DigiResiTh10n 第拾次數位韌性松
  date: "2024-09-21"
  venue: 摩茲工寮 MozTW Space
  summary: null
  url: https://g0v.hackmd.io/uLwn1o0AQ-qikfUdyPVbrw
  registerUrl: https://g0v-digiresi.kktix.cc/events/digiresith10n
  days: null
- number: 9
  name: DigiResiTh9n 第玖次數位韌性松
  date: "2024-08-31"
  venue: NPO HUB Taipei 台北NPO聚落
  summary: null
  url: https://g0v.hackmd.io/MouuawY4S5SRLtBYG1QIbQ
  registerUrl: https://g0v-digiresi.kktix.cc/events/digiresith9n
  days: null
- number: 8
  name: DigiResiTh8n 第捌次數位韌性松
  date: "2024-07-27"
  venue: NPO HUB Taipei 台北NPO聚落
  summary: null
  url: https://g0v.hackmd.io/H3ffGKZKSrmAAShdc2Cx9Q
  registerUrl: https://g0v-digiresi.kktix.cc/events/digiresith8n
  days: null
- number: 7
  name: DigiResiTh7n 第柒次數位韌性松
  date: "2024-06-15"
  venue: NPO HUB Taipei 台北NPO聚落
  summary: null
  url: https://g0v.hackmd.io/_WHs9N0eS3mzFHn5QzjvRg
  registerUrl: https://g0v-digiresi.kktix.cc/events/digiresith7n
  days: null
- number: 6
  name: DigiResiTh6n 第陸次數位韌性松
  date: "2024-05-25"
  venue: NPO HUB Taipei 台北NPO聚落
  summary: null
  url: https://g0v.hackmd.io/CLbAeY3wTZCaLr-YCYqafw
  registerUrl: https://g0v-digiresi.kktix.cc/events/digiresith6n
  days: null
- number: 5
  name: DigiResiTh5n 第伍次數位韌性松
  date: "2024-04-27"
  venue: NPO HUB Taipei 台北NPO聚落
  summary: null
  url: https://g0v.hackmd.io/ugNkTFLARwK4rmH7jCdO-g
  registerUrl: https://g0v-digiresi.kktix.cc/events/digiresith5n
  days: null
- number: 4
  name: DigiResiTh4n 第肆次數位韌性松
  date: "2024-03-23"
  venue: NPO HUB Taipei 台北NPO聚落
  summary: null
  url: https://g0v.hackmd.io/qcDX1C5mTE24UcCUkfTthQ
  registerUrl: https://g0v-digiresi.kktix.cc/events/digiresith4n
  days: null
- number: 3
  name: DigiResiTh3n 第參次數位韌性松
  date: "2024-02-24"
  venue: NPO HUB Taipei 台北NPO聚落
  summary: null
  url: https://g0v.hackmd.io/Xt7FoiZgTYq-7x20iNGN4A
  registerUrl: https://g0v-digiresi.kktix.cc/events/digiresith3n
  days: null
- number: 2
  name: DigiResiTh2n 第貳次數位韌性松
  date: "2024-01-20"
  venue: 國立臺灣大學霖澤館 1701 研討室
  summary: 場地由 IORG 台灣資訊環境研究中心贊助。
  url: https://g0v.hackmd.io/iC-7ZtqJTqG75GxUY3aiAQ
  registerUrl: https://g0v-digiresi.kktix.cc/events/digiresith2n
  days:
    - label: SAT 01.20
      date: "2024-01-20"
      sessions:
        - { t: "12:30", title: 活動入場, tag: ALL, loc: 1701 研討室 }
        - { t: "13:00", title: 介紹, tag: TALK, loc: 1701 研討室 }
        - { t: "13:15", title: 提案, tag: PITCH, loc: 1701 研討室 }
        - { t: "13:45", title: Hacking, tag: HACK, loc: 1701 研討室 }
        - { t: "16:00", title: 成果發表, tag: DEMO, loc: 1701 研討室 }
- number: 1
  name: DigiResiTh1n 第壹次數位韌性松
  date: "2023-12-30"
  venue: NPO HUB Taipei 台北NPO聚落
  summary: null
  url: https://g0v.hackmd.io/mKkOC9PLSXi0GZg7uGm1xA
  registerUrl: https://g0v-digiresi.kktix.cc/events/digiresith1n
  days:
    - label: SAT 12.30
      date: "2023-12-30"
      sessions:
        - { t: "12:30", title: 活動入場, tag: ALL, loc: 4F 廚房 }
        - { t: "13:00", title: 介紹, tag: TALK, loc: 4F 廚房 }
        - { t: "13:15", title: 提案, tag: PITCH, loc: 4F 廚房 }
        - { t: "13:45", title: Hacking, tag: HACK, loc: 4F 廚房 }
        - { t: "16:30", title: 成果發表, tag: DEMO, loc: 4F 廚房 }
- number: 0
  name: DigiResiTh0n 第零次數位韌性松
  date: "2023-11-04"
  venue: NPO HUB Taipei 台北NPO聚落
  summary: 一切的起點：第一場「假設網路斷光光」的黑客松。
  url: https://g0v.hackmd.io/oyNRfe4lTuaZ5RbcPSS7TQ
  registerUrl: https://g0v-digiresi.kktix.cc/events/digiresith0n
  days:
    - label: SAT 11.04
      date: "2023-11-04"
      sessions:
        - { t: "12:30", title: 活動入場, tag: ALL, loc: 4F 廚房 }
        - { t: "13:00", title: 介紹, tag: TALK, loc: 4F 廚房 }
        - { t: "13:15", title: 提案, tag: PITCH, loc: 4F 廚房 }
        - { t: "13:45", title: Hacking, tag: HACK, loc: 4F 廚房 }
        - { t: "16:30", title: 成果發表, tag: DEMO, loc: 4F 廚房 }
```

- [ ] **Step 6: Write the failing unit test for the events library**

Create `tests/unit/events.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  featuredEvent,
  loadEvents,
  upcomingEvent,
  type EventEntry,
} from "../../src/lib/events";

const ev = (number: number, date: string | null): EventEntry => ({
  number,
  name: `Th${number}n`,
  date,
  venue: null,
  summary: null,
  url: `https://g0v.hackmd.io/note-${number}`,
  registerUrl: null,
  days: null,
});

describe("upcomingEvent", () => {
  it("returns the earliest event on or after today", () => {
    const events = [ev(2, "2026-09-01"), ev(1, "2026-08-01"), ev(0, "2026-01-01")];
    expect(upcomingEvent(events, "2026-07-17")?.number).toBe(1);
  });

  it("treats an event happening today as upcoming", () => {
    expect(upcomingEvent([ev(0, "2026-07-17")], "2026-07-17")?.number).toBe(0);
  });

  it("ignores undated events and returns null when nothing is upcoming", () => {
    expect(upcomingEvent([ev(0, "2026-01-01"), ev(1, null)], "2026-07-17")).toBeNull();
  });
});

describe("featuredEvent", () => {
  it("prefers the next upcoming event", () => {
    const events = [ev(0, "2026-01-01"), ev(1, "2026-08-01")];
    expect(featuredEvent(events, "2026-07-17")?.number).toBe(1);
  });

  it("falls back to the highest-numbered dated past event", () => {
    const events = [ev(1, null), ev(14, "2026-03-08"), ev(15, "2026-06-21")];
    expect(featuredEvent(events, "2026-07-17")?.number).toBe(15);
  });

  it("returns null for an empty list", () => {
    expect(featuredEvent([], "2026-07-17")).toBeNull();
  });
});

describe("loadEvents (reads src/data/events.yaml)", () => {
  it("loads 16 rounds Th0n..Th15n, unique numbers, newest first", () => {
    const events = loadEvents();
    expect(events).toHaveLength(16);
    expect(events[0].number).toBe(15);
    expect(new Set(events.map((e) => e.number)).size).toBe(16);
    for (const e of events) {
      expect(e.url).toMatch(/^https:\/\/g0v\.hackmd\.io\//);
      if (e.date !== null) expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("keeps quoted dates as strings and null days as null", () => {
    const th15 = loadEvents().find((e) => e.number === 15)!;
    expect(th15.date).toBe("2026-06-21");
    expect(th15.days).toBeNull();
    const th0 = loadEvents().find((e) => e.number === 0)!;
    expect(th0.days).toHaveLength(1);
    expect(th0.days![0].sessions[0]).toEqual({
      t: "12:30",
      title: "活動入場",
      tag: "ALL",
      loc: "4F 廚房",
    });
  });
});
```

- [ ] **Step 7: Run the test — expect module-not-found failure**

```bash
npx vitest run tests/unit/events.test.ts
```

Expected: the run FAILS with a resolution error, e.g. `Error: Failed to resolve import "../../src/lib/events" from "tests/unit/events.test.ts"` (the library does not exist yet). Do not proceed until you see this failure.

- [ ] **Step 8: Implement `src/lib/events.ts`**

```ts
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export type SessionTag = "ALL" | "TALK" | "PITCH" | "HACK" | "DRILL" | "DEMO";

export interface EventSession {
  t: string; // "HH:MM"
  title: string;
  tag: SessionTag;
  loc: string;
}

export interface EventDay {
  label: string;
  date: string; // "YYYY-MM-DD"
  sessions: EventSession[];
}

export interface EventEntry {
  number: number;
  name: string;
  date: string | null; // "YYYY-MM-DD" (quoted in YAML so it stays a string)
  venue: string | null;
  summary: string | null;
  url: string; // g0v.hackmd.io event pad
  registerUrl: string | null;
  days: EventDay[] | null;
}

/**
 * Reads src/data/events.yaml relative to the repo root.
 * cwd is the repo root both under `astro build` and `vitest run`.
 */
export function loadEvents(): EventEntry[] {
  const file = path.resolve(process.cwd(), "src/data/events.yaml");
  return yaml.load(fs.readFileSync(file, "utf8")) as EventEntry[];
}

/** Earliest dated event with date >= todayISO ("YYYY-MM-DD"), else null. */
export function upcomingEvent(events: EventEntry[], todayISO: string): EventEntry | null {
  const future = events.filter(
    (e): e is EventEntry & { date: string } =>
      typeof e.date === "string" && e.date >= todayISO,
  );
  future.sort((a, b) => (a.date < b.date ? -1 : 1));
  return future[0] ?? null;
}

/**
 * The event the site features: the next upcoming one when announced,
 * else the highest-numbered dated past event.
 */
export function featuredEvent(events: EventEntry[], todayISO: string): EventEntry | null {
  const up = upcomingEvent(events, todayISO);
  if (up) return up;
  const past = events.filter((e) => typeof e.date === "string" && e.date < todayISO);
  past.sort((a, b) => b.number - a.number);
  return past[0] ?? null;
}
```

- [ ] **Step 9: Run the test — expect PASS**

```bash
npx vitest run tests/unit/events.test.ts
```

Expected output ends with:

```
 Test Files  1 passed (1)
      Tests  8 passed (8)
```

Also run the full suite to confirm nothing from earlier tasks broke: `npm test` → all test files pass.

- [ ] **Step 10: Create `src/components/NextEvent.astro`**

```astro
---
// Homepage callout for the next round. With no announced date (the current
// state), it renders the honest fallback: last round + where to watch.
import { featuredEvent, loadEvents, upcomingEvent } from "../lib/events";

const events = loadEvents();
const todayISO = new Date().toISOString().slice(0, 10);
const upcoming = upcomingEvent(events, todayISO);
const featured = featuredEvent(events, todayISO);
const countdown = upcoming?.date
  ? Math.max(0, Math.ceil((Date.parse(upcoming.date) - Date.parse(todayISO)) / 86400000))
  : null;
---
<aside class="next-event" aria-label="下一場活動">
  <div class="ne-label label">[ NEXT EVENT ]</div>
  {upcoming ? (
    <div class="ne-body">
      <div class="ne-name pixel-h-tc pixel-h-tc--1">{upcoming.name}</div>
      <div class="ne-meta">
        {upcoming.date!.replaceAll("-", ".")}
        {upcoming.venue && ` · ${upcoming.venue}`}
        {countdown !== null && <span class="ne-count">T-{countdown}D</span>}
      </div>
      <div class="ne-actions">
        <button class="btn btn-primary btn-sm" type="button" data-open-register>報名</button>
        <a class="btn btn-ghost btn-sm" href="/schedule/">看時程</a>
      </div>
    </div>
  ) : (
    <div class="ne-body">
      <div class="ne-line">
        下一場時間未定——日期敲定會公布在
        <a href="https://g0v.hackmd.io/mGQcbKRDShmvyeGV74w_0w">大全共筆</a> 與 g0v Slack。
      </div>
      {featured && (
        <div class="ne-meta">
          上一場：{featured.name} · {featured.date?.replaceAll("-", ".")} ·
          <a href={featured.url}>共筆</a>
        </div>
      )}
    </div>
  )}
</aside>
<style>
  .next-event {
    border: var(--border);
    background: var(--surface);
    padding: var(--sp-4) var(--sp-5);
  }
  .ne-label { display: block; margin-bottom: var(--sp-3); }
  .ne-body {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }
  .ne-meta {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--ink-2);
  }
  .ne-count {
    color: var(--accent-2);
    font-weight: 600;
    margin-left: var(--sp-3);
  }
  .ne-actions {
    display: flex;
    gap: var(--sp-3);
    margin-top: var(--sp-2);
  }
  .ne-line { color: var(--ink-2); }
</style>
```

- [ ] **Step 11: Replace `src/pages/index.astro` with the full kit-Landing recreation**

Replace the ENTIRE contents of `src/pages/index.astro` (the Task 6 interim page) with:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import TerminalBlock from "../components/TerminalBlock.astro";
import SignalBars from "../components/SignalBars.astro";
import Marquee from "../components/Marquee.astro";
import SectionHeader from "../components/SectionHeader.astro";
import NextEvent from "../components/NextEvent.astro";
import Px from "../components/Px.astro";
import { loadEvents, upcomingEvent } from "../lib/events";

const events = loadEvents();
const todayISO = new Date().toISOString().slice(0, 10);
const upcoming = upcomingEvent(events, todayISO);
const countdown = upcoming?.date
  ? Math.max(0, Math.ceil((Date.parse(upcoming.date) - Date.parse(todayISO)) / 86400000))
  : null;
const heroMeta = upcoming?.date
  ? `${upcoming.date.replaceAll("-", ".")} · ${upcoming.venue ?? "T.B.D."}`
  : "NEXT · T.B.D.";
const regOpen = Boolean(upcoming && upcoming.registerUrl);

// Four tracks — footers deep-link into the most relevant handbook section
// (first/most-relevant page; per-section index routes do not exist).
const tracks = [
  {
    icon: "radio-signal",
    name: "離線通訊",
    desc: "鏈網、LoRa、業餘無線電——骨幹斷了也能傳話。",
    href: "/handbook/mesh/intro/",
    foot: "→ 通訊網手冊",
  },
  {
    icon: "server",
    name: "資料備援",
    desc: "鏡像、離線快取、分散式備份。機房掛了，資料還在。",
    href: "/handbook/selfhost/alternatives/",
    foot: "→ 自架服務手冊",
  },
  {
    icon: "alert",
    name: "資訊真實",
    desc: "緊急資訊查證、謠言分流、低頻寬廣播。斷網時更要求真。",
    href: "/handbook/respond/communication/",
    foot: "→ 應變手冊",
  },
  {
    icon: "users",
    name: "公民協作",
    desc: "避難地圖、互助看板、紙本相容的流程。鄰居就是基礎設施。",
    href: "/handbook/prepare/certifications/",
    foot: "→ 準備手冊",
  },
];

// Verified facts: 16 rounds Th0n–Th15n (master doc); 55 archive pads under the
// digital-resilience tag (design-spec background index); 20 synced handbook
// pages (sync.config.yaml); 0 CLOUDS is the brand fact and stays. The round
// count is DERIVED from events.length so it tracks events.yaml automatically.
const stats = [
  { n: String(events.length), label: "場次 ROUNDS", accent: false },
  { n: "55+", label: "共筆 PADS", accent: false },
  { n: "0", label: "CLOUDS", accent: true },
  { n: "20", label: "頁離線手冊 PAGES", accent: false },
];

const marqueeItems = [
  "SIGNAL LOST",
  `${events.length} ROUNDS`,
  "台北 TAIPEI",
  "NO CLOUD",
  "斷網也能查",
  "OFFLINE FIRST",
  "自己的網路自己架",
];
---
<BaseLayout
  title="數位韌性松 DigiResiThon｜g0v"
  description="g0v 數位韌性松：假設網路斷光光，我們還能怎麼傳遞資訊？備援通訊、離線手冊、斷網情境盤點。"
>
  <section class="hero">
    <div class="scanlines" aria-hidden="true"></div>
    <div class="slash" aria-hidden="true" style="left:62%;"></div>
    <div class="container hero-grid">
      <div>
        <div class="kicker-row">
          <span class="kicker">[ G0V 社群黑客松 ]</span>
          <span class="kicker-meta">{heroMeta}</span>
        </div>
        <h1 class="pixel-h-tc pixel-h-tc--3 hero-title">
          網路斷了<br />我們<br /><span class="t-accent">不斷</span>
        </h1>
        <p class="hero-copy">
          數位韌性松是 g0v 社群發起的黑客松：假設海纜斷了、基地台倒了，
          我們還能用什麼傳遞訊息？一起動手做斷網也能用的工具——
          鏈網、離線資料、紙本，什麼撐得住就用什麼。
        </p>
        <div class="hero-actions">
          <button
            class:list={["btn", "btn-primary", "btn-lg", { "btn-inert": !regOpen }]}
            type="button"
            data-open-register
          >報名</button>
          <a class="btn btn-lg" href="/schedule/">看時程</a>
          {countdown !== null && <span class="hero-count">T-{countdown}D</span>}
        </div>
      </div>
      <div class="hero-side">
        <TerminalBlock
          title="digiresithon@tw:~"
          lines={[
            { prompt: "$", text: "ping intl.backbone.tw" },
            { text: "Request timeout ×3", tone: "red" },
            { text: "# 沒關係，我們自己架。", tone: "dim" },
            { prompt: "$", text: "join digiresithon --offline", tone: "green" },
            { text: "OK — 斷網那天見。", tone: "green" },
          ]}
        />
        <div class="uplink">
          <span class="label">VENUE UPLINK</span>
          <SignalBars animated height={22} />
        </div>
      </div>
    </div>
  </section>

  <Marquee items={marqueeItems} speed={26} />

  <section class="stats">
    <div class="container stats-grid">
      {stats.map((s) => (
        <div class="stat">
          <div class:list={["pixel-h", "pixel-h--3", { "t-accent": s.accent }]}>{s.n}</div>
          <div class="stat-l">{s.label}</div>
        </div>
      ))}
    </div>
  </section>

  <section class="container block">
    <NextEvent />
  </section>

  <section class="container block">
    <SectionHeader label="主題軌" right="TRACKS · 4 WAYS TO BE USEFUL" />
    <div class="tracks-grid">
      {tracks.map((t) => (
        <div class="card">
          <div class="card-body track-body">
            <Px name={t.icon} size={28} color="var(--accent-2)" />
            <div class="pixel-h-tc pixel-h-tc--1">{t.name}</div>
            <div class="track-desc">{t.desc}</div>
          </div>
          <div class="card-foot">
            <span>OPEN</span>
            <a class="track-link" href={t.href}>{t.foot}</a>
          </div>
        </div>
      ))}
    </div>
  </section>

  <section class="container block block-last">
    <SectionHeader label="誰該來" right="EVERYONE" />
    <div class="who-grid">
      <div class="who-copy">
        <p>
          會寫程式的當然歡迎，但韌性大多不是程式碼：田野調查、設計、文件、
          翻譯、業餘無線電、社區組織——都用得上。
        </p>
        <p>
          g0v 老話一句——不要問為何沒有人做這個，先承認<span class="who-strong">你就是「沒有人」</span>。
        </p>
      </div>
      {regOpen && upcoming ? (
        <div class="alert alert-online">
          <div class="alert-title">報名進行中</div>
          <div class="alert-body">
            {upcoming.name} · {upcoming.date!.replaceAll("-", ".")}。免費參加，遵守
            <a href="https://g0v.hackmd.io/s/COC">行為守則</a>。
          </div>
          <a class="btn btn-primary btn-sm" href={upcoming.registerUrl!} target="_blank" rel="noopener">前往報名</a>
        </div>
      ) : (
        <div class="alert">
          <div class="alert-title">下一場尚未公布</div>
          <div class="alert-body">
            日期敲定會公布在
            <a href="https://g0v.hackmd.io/mGQcbKRDShmvyeGV74w_0w">大全共筆</a> 與 g0v
            Slack——先把 <a href="/handbook/">手冊</a> 存進手機也不錯。
          </div>
        </div>
      )}
    </div>
  </section>
</BaseLayout>
<style>
  .hero {
    position: relative;
    overflow: hidden;
    border-bottom: var(--border);
  }
  .hero-grid {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 48px;
    align-items: center;
    padding-block: 72px 64px;
    position: relative;
  }
  .kicker-row {
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-label);
    color: var(--ink-2);
  }
  .kicker { color: var(--accent); }
  .hero-title { margin-top: 20px; }
  .hero-copy {
    max-width: 52ch;
    color: var(--ink-2);
    margin: 20px 0 0;
  }
  .hero-actions {
    display: flex;
    gap: 14px;
    margin-top: 28px;
    align-items: center;
    flex-wrap: wrap;
  }
  .hero-count {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--accent-2);
    font-weight: 600;
  }
  .hero-side {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .uplink {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: var(--border);
    background: var(--surface);
    padding: 10px 14px;
  }
  .stats { border-bottom: var(--border); }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
  }
  .stat {
    padding: 28px 20px;
    text-align: center;
    border-left: var(--border);
  }
  .stat:first-child { border-left: none; }
  .stat-l {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--ink-3);
    margin-top: 8px;
  }
  .block { padding-block: 64px 0; }
  .block-last { padding-bottom: 64px; }
  .tracks-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-top: 24px;
  }
  .track-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .track-desc {
    font-size: var(--text-sm);
    color: var(--ink-2);
  }
  .track-link {
    color: var(--accent);
    text-decoration: none;
  }
  .who-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-top: 24px;
    align-items: start;
  }
  .who-copy { color: var(--ink-2); }
  .who-copy p { margin: 0 0 12px; }
  .who-strong { color: var(--ink); }
  @media (max-width: 900px) {
    .hero-grid { grid-template-columns: 1fr; }
    .tracks-grid { grid-template-columns: repeat(2, 1fr); }
    .who-grid { grid-template-columns: 1fr; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .stat:nth-child(3) { border-left: none; }
  }
  @media (max-width: 520px) {
    .tracks-grid { grid-template-columns: 1fr; }
  }
</style>
```

- [ ] **Step 12: Verify the landing build**

```bash
npm run build
grep -F "網路斷了" dist/index.html && echo HERO-OK
grep -F "VENUE UPLINK" dist/index.html && echo UPLINK-OK
grep -F "CLOUDS" dist/index.html && echo STATS-OK
grep -F "NEXT · T.B.D." dist/index.html && echo HEROMETA-OK
grep -F "下一場尚未公布" dist/index.html && echo ALERT-OK
grep -F "不要問為何沒有人做這個" dist/index.html && echo CANON-OK
grep -F "/handbook/mesh/intro/" dist/index.html && echo TRACKLINK-OK
grep -F "btn-inert" dist/index.html && echo REGCLOSED-OK
```

Expected: build exits 0; all eight markers print. (`HEROMETA-OK`, `ALERT-OK`, and `REGCLOSED-OK` reflect the current no-upcoming-event data state; once a future round with a `registerUrl` lands in `events.yaml`, those three greps are expected to fail and the open-registration branches render instead — that is correct behavior.) The round count in the stats strip and marquee is derived from `events.length`: it renders `16` against current data and tracks `events.yaml` as rounds are added.

- [ ] **Step 13: Create `src/pages/about.astro`**

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import SectionHeader from "../components/SectionHeader.astro";
---
<BaseLayout
  title="關於｜數位韌性松 DigiResiThon"
  description="為什麼要辦「假設網路斷光光」的黑客松：數位韌性松的緣起、正在做的事、參加方式。"
>
  <div class="container page">
    <SectionHeader label="關於" right="ABOUT" />
    <article class="prose-mono">
      <h1 class="pixel-h-tc pixel-h-tc--2">IG 不能動，<br />還有什麼值得我心痛</h1>
      <p>
        2023 年 2 月，馬祖僅有的兩條海底電纜同時被中國籍船隻切斷。台灣的對外網路
        幾乎全靠海纜；華府智庫研究員 Elisabeth Braw 在《外交政策》撰文警告：想把
        台灣網路與世界隔開，只需要切斷十五條海纜。
      </p>
      <p>
        真的斷了會怎樣？LINE 的主要資料中心在日本與韓國；Instagram、Facebook、
        YouTube 的機房也都不在台灣——連外一斷，這些服務全部跟著失聯。低軌衛星在
        頻寬有限時會優先給救災人員與公部門，一般人分不到多少。
      </p>
      <p>
        所以 g0v 社群夥伴把「假設網路斷光光」的黑客松辦了起來。完整的發起宣言
        請讀共筆：<a href="https://g0v.hackmd.io/qkj6dwSFS0q8zpZO4-GxOQ">〈IG 不能動，還有什麼值得我心痛〉</a>。
      </p>

      <h2 class="pixel-h-tc pixel-h-tc--1">我們在做什麼</h2>
      <ul>
        <li>
          <span class="strong">備援通訊</span>——建立平常用不到、斷網時救命的備用
          網路：Meshtastic 台灣鏈網、g0mesh。備用系統越多，越不怕斷線。
        </li>
        <li>
          <span class="strong">離線資訊</span>——彙整斷網時上不了 Google 也要查得到
          的資訊：急救、避難、物資清單——也就是本站的<a href="/handbook/">離線手冊</a>。
        </li>
        <li>
          <span class="strong">情境盤點</span>——從海纜中斷到島內機房受損，分級分析
          各種斷網情境的影響與對策。
        </li>
      </ul>

      <h2 class="pixel-h-tc pixel-h-tc--1">怎麼參加</h2>
      <p>
        不會寫程式也幫得上忙——資料彙整、文件、翻譯、實測都缺人。缺乏有用的資料，
        通訊再順也枉然。
      </p>
      <ol>
        <li>
          加入 <a href="https://g0v.hackmd.io/fKrjZ3BlRfWmQ471wcSdBg">g0v Slack</a> 的
          #civil-defense 頻道打聲招呼。
        </li>
        <li>
          翻 <a href="https://g0v.hackmd.io/mGQcbKRDShmvyeGV74w_0w">數位韌性松大全</a>
          找一個想跳的坑。
        </li>
        <li>
          下一場小松公布後到 KKTIX 報名——時間看<a href="/schedule/">時程頁</a>。
        </li>
      </ol>
      <p>
        參加活動即代表同意 <a href="https://g0v.tw/intl/zh-TW/manifesto/zh-TW/">g0v 宣言</a>
        並遵守<a href="https://g0v.hackmd.io/s/COC">行為守則</a>。也可以寫信到
        <a href="mailto:g0v-digiresi@googlegroups.com">g0v-digiresi@googlegroups.com</a>。
      </p>

      <h2 class="pixel-h-tc pixel-h-tc--1">授權</h2>
      <p>
        手冊內容同步自 g0v 社群共筆（CC BY 4.0）；網站原始碼在
        <a href="https://github.com/g0v/digiresi.g0v.tw">GitHub</a>。
      </p>
    </article>
  </div>
</BaseLayout>
<style>
  .page { padding-block: 48px 64px; }
  .prose-mono {
    max-width: 68ch;
    margin-top: 24px;
  }
  .prose-mono p,
  .prose-mono li {
    color: var(--ink-2);
  }
  .prose-mono h1 { margin: 0 0 24px; }
  .prose-mono h2 { margin: 40px 0 12px; }
  .strong {
    color: var(--ink);
    font-weight: 600;
  }
</style>
```

- [ ] **Step 14: Create `src/pages/en/index.astro`**

```astro
---
import BaseLayout from "../../layouts/BaseLayout.astro";
---
<BaseLayout
  title="DigiResiThon — Digital Resilience Hackathon | g0v"
  description="A g0v community hackathon prototyping what still works when Taiwan's internet goes dark: mesh networks, an offline handbook, shutdown scenario mapping."
  lang="en"
>
  <div class="container page">
    <div class="kicker">[ G0V COMMUNITY HACKATHON ]</div>
    <h1 class="pixel-h pixel-h--2">
      WHEN THE NET<br />GOES DOWN,<br />WE STAY <span class="t-accent">UP</span>.
    </h1>
    <p>
      Taiwan's internet rides on submarine cables. Earthquakes, typhoons, dredging
      ships — or a blockade — could cut them, and most services people use daily
      (LINE, Instagram, YouTube) run in data centers outside Taiwan. Satellites
      won't cover everyone: limited bandwidth goes to first responders.
    </p>
    <p>
      <strong>DigiResiThon (數位韌性松)</strong> is a recurring hackathon from the
      <a href="https://g0v.tw/intl/en/">g0v civic-tech community</a>. We prototype
      what still works on the worst day: community mesh networks (Meshtastic),
      offline knowledge — the <a href="/handbook/">handbook on this site</a>
      installs as an app and works with no connection at all — and inventories of
      internet-shutdown scenarios and self-hosted fallbacks. Sixteen rounds and
      counting since 2023.
    </p>
    <ul>
      <li>Join the <a href="https://g0v.hackmd.io/fKrjZ3BlRfWmQ471wcSdBg">g0v Slack</a> — channel #civil-defense.</li>
      <li>Browse the <a href="https://g0v.hackmd.io/mGQcbKRDShmvyeGV74w_0w">master doc</a> on HackMD (mostly zh-TW).</li>
      <li>Come to the next round — see the <a href="/schedule/">schedule</a>.</li>
    </ul>
    <p class="fine">
      Handbook content is CC BY 4.0 from g0v community pads. Site source on
      <a href="https://github.com/g0v/digiresi.g0v.tw">GitHub</a>. Code of Conduct applies.
    </p>
  </div>
</BaseLayout>
<style>
  .page {
    padding-block: 48px 64px;
    max-width: calc(68ch + 2 * var(--gutter));
  }
  .kicker {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-label);
    color: var(--accent);
  }
  h1 { margin: 16px 0 24px; }
  p, li { color: var(--ink-2); }
  strong { color: var(--ink); }
  .fine {
    font-size: var(--text-xs);
    color: var(--ink-3);
  }
</style>
```

- [ ] **Step 15: Verify about + en builds**

```bash
npm run build
grep -F "IG 不能動，還有什麼值得我心痛" dist/about/index.html && echo ABOUT-OK
grep -F "qkj6dwSFS0q8zpZO4-GxOQ" dist/about/index.html && echo MANIFESTO-LINK-OK
grep -F "#civil-defense" dist/about/index.html && echo JOIN-OK
grep -F 'lang="en"' dist/en/index.html && echo ENLANG-OK
grep -F "WE STAY" dist/en/index.html && echo ENHERO-OK
```

Expected: build exits 0; all five markers print.

- [ ] **Step 16: Commit**

```bash
git add src/components/TerminalBlock.astro src/components/SignalBars.astro \
  src/components/Marquee.astro src/components/SectionHeader.astro \
  src/components/NextEvent.astro src/data/events.yaml src/lib/events.ts \
  tests/unit/events.test.ts src/pages/index.astro src/pages/about.astro \
  src/pages/en/index.astro
git commit -m "feat: landing, about, and en pages with events data" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Schedule page + register dialog

**Files:**
- Create: `src/pages/schedule.astro` (includes the inline vanilla-JS day-tab script and the localStorage packing checklist), `src/components/RegisterDialog.astro`
- Modify: `src/components/SiteHeader.astro` (render `<RegisterDialog/>`; its script wires every `[data-open-register]` trigger site-wide)
- Test: no unit-testable logic beyond what Task 7 already covers (`featuredEvent`/`upcomingEvent` are tested there; this task is pre-rendered markup + tiny DOM scripts) — verified by `npm run build` + exact `grep` checks

**Interfaces:**
- Consumes: `src/lib/events.ts` (`loadEvents`, `featuredEvent`, `upcomingEvent`, `EventEntry`) and `src/data/events.yaml` — created COMPLETE in Task 7, no refinements needed here; `TerminalBlock.astro`, `SectionHeader.astro` (Task 7); `BaseLayout.astro`, `SiteHeader.astro`, global classes `.container .tabs .tab .tab-active .badge .dot .dot--online .dot--offline .alert .alert-degraded .alert-title .alert-body .label .check .check-box .card .card-lifted .card-head .card-body .card-foot .card-title .card-meta .btn .btn-primary .btn-sm .pixel-h-tc .pixel-h-tc--1` and the `data-open-register` buttons already present in the header (Task 6), hero, and NextEvent (Task 7).
- Produces: route `/schedule/` (featured-event block + 歷次活動 archive; there is NO `/events/` page); `RegisterDialog.astro` (no props; renders the single `<dialog id="register-dialog">`, wires all `[data-open-register]` openers, close button + ESC + backdrop-click close); localStorage key `"drt-packcheck"` (JSON boolean array for the packing checklist).

Data-state note (2026-07-17): `featuredEvent` resolves to Th15n (2026-06-21, the highest-numbered past round) whose `days` is `null` — so the built page renders the `$ schedule --next` TerminalBlock fallback and no drill alert, and the dialog renders its closed state. The day-tabs/timetable/drill-alert/open-registration branches are still fully implemented below; they activate the moment a dated event with `days`/`registerUrl` lands in `events.yaml` (Th0n–Th2n carry real `days` data in the archive as reference fixtures).

- [ ] **Step 1: Create `src/components/RegisterDialog.astro`**

```astro
---
// Native <dialog>, terminal-ACK style. Open state (an announced next round
// with a registerUrl) shows a kit-Card panel linking out to KKTIX; otherwise
// an honest TerminalBlock. ESC closes natively; backdrop click and the 關閉
// button are wired below. All [data-open-register] buttons site-wide open it.
import TerminalBlock from "./TerminalBlock.astro";
import { loadEvents, upcomingEvent } from "../lib/events";

const events = loadEvents();
const todayISO = new Date().toISOString().slice(0, 10);
const upcoming = upcomingEvent(events, todayISO);
const open = Boolean(upcoming && upcoming.registerUrl);
---
<dialog id="register-dialog" aria-label="報名">
  <div class="reg-inner">
    {open && upcoming ? (
      <div class="card card-lifted">
        <div class="card-head">
          <span class="card-title">REGISTER</span>
          <span class="card-meta">{upcoming.date!.replaceAll("-", ".")}</span>
        </div>
        <div class="card-body reg-body">
          <div class="reg-row"><span class="label">下一場</span><span>{upcoming.name}</span></div>
          <div class="reg-row"><span class="label">時間</span><span>{upcoming.date!.replaceAll("-", ".")}</span></div>
          <div class="reg-row"><span class="label">地點</span><span>{upcoming.venue ?? "T.B.D."}</span></div>
          <div class="reg-row">
            <span class="label">費用</span>
            <span>免費——遵守<a href="https://g0v.hackmd.io/s/COC">行為守則</a></span>
          </div>
          <a class="btn btn-primary" href={upcoming.registerUrl!} target="_blank" rel="noopener">
            前往報名 →
          </a>
        </div>
        <div class="card-foot">
          <span>FREE · COC APPLIES</span>
          <span>G0V SLACK #DIGIRESITHON</span>
        </div>
      </div>
    ) : (
      <TerminalBlock
        title="register"
        lines={[
          { prompt: "$", text: "register --next" },
          { text: "報名尚未開放", tone: "dim" },
          { text: "watch g0v slack", tone: "green" },
        ]}
      />
    )}
    <button class="btn btn-sm reg-close" type="button" data-close-register>關閉</button>
  </div>
</dialog>
<style>
  /* The dialog is an invisible positioning box: the kit floats a bare lifted
     Card / TerminalBlock directly on the dark overlay, so the panel provides
     its own chrome — no outer border or surface (no frame-within-frame). */
  dialog {
    border: none;
    background: transparent;
    color: var(--ink);
    padding: 0;
    width: 460px;
    max-width: calc(100vw - 48px);
  }
  dialog::backdrop {
    background: rgba(0, 0, 0, 0.75);
  }
  .reg-inner {
    padding: 0;
  }
  .reg-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-family: var(--font-mono);
  }
  .reg-row {
    display: flex;
    gap: 12px;
    align-items: baseline;
  }
  .reg-close {
    margin-top: var(--sp-3);
  }
</style>
<script>
  const dialog = document.getElementById("register-dialog") as HTMLDialogElement | null;
  if (dialog) {
    for (const opener of document.querySelectorAll("[data-open-register]")) {
      opener.addEventListener("click", () => dialog.showModal());
    }
    dialog
      .querySelector("[data-close-register]")
      ?.addEventListener("click", () => dialog.close());
    // Backdrop click: .reg-inner spans the dialog's full box (dialog and
    // .reg-inner both have zero padding), so a click whose target is the
    // <dialog> itself can only be on the ::backdrop.
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
  }
</script>
```

- [ ] **Step 2: Render the dialog from `SiteHeader.astro`**

The header is on every page via BaseLayout, so rendering the dialog here makes every `[data-open-register]` button work site-wide. In `src/components/SiteHeader.astro`, make exactly two edits.

Edit 1 — add the import. Before:

```astro
---
import Px from "./Px.astro";
import StatusDot from "./StatusDot.astro";
```

After:

```astro
---
import Px from "./Px.astro";
import RegisterDialog from "./RegisterDialog.astro";
import StatusDot from "./StatusDot.astro";
```

Edit 2 — render it after the header element. Before:

```astro
    <button class="btn btn-primary btn-sm" type="button" data-open-register>報名</button>
  </div>
</header>
<style>
```

After:

```astro
    <button class="btn btn-primary btn-sm" type="button" data-open-register>報名</button>
  </div>
</header>
<RegisterDialog />
<style>
```

- [ ] **Step 3: Create `src/pages/schedule.astro`**

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import SectionHeader from "../components/SectionHeader.astro";
import TerminalBlock from "../components/TerminalBlock.astro";
import { featuredEvent, loadEvents } from "../lib/events";
import type { SessionTag } from "../lib/events";

const events = loadEvents();
const todayISO = new Date().toISOString().slice(0, 10);
const featured = featuredEvent(events, todayISO);
const days = featured?.days ?? null;
const hasDrill = Boolean(
  days?.some((d) => d.sessions.some((s) => s.tag === "DRILL")),
);
const archive = [...events].sort((a, b) => b.number - a.number);

// zh-TW packing list, ported from the kit's OFFLINE SURVIVAL KIT.
const kit = [
  "筆電＋充電器",
  "行動電源（大顆的）",
  "存好 repo 鏡像的 USB",
  "紙本筆記本、筆",
  "無線電、LoRa 板、奇怪的天線——如果你有",
];

const tagDot = (tag: SessionTag) =>
  tag === "DRILL" ? "dot--offline" : tag === "HACK" ? "dot--online" : "";
// Archive rows show "Th15n 第拾伍次" style short names.
const shortName = (name: string) =>
  name.replace(/^DigiResiTh\d+n\s*/, "").replace(/數位韌性松$/, "");
---
<BaseLayout
  title="時程｜數位韌性松 DigiResiThon"
  description="數位韌性松的活動時程與歷次小松紀錄，每場都連到當天的 HackMD 共筆。"
>
  <div class="container page">
    <SectionHeader label="時程" right="ALL TIMES GMT+8" />

    {featured && (
      <div class="featured">
        <div class="featured-head">
          <span class="pixel-h-tc pixel-h-tc--1">{featured.name}</span>
          <span class="featured-meta">
            {featured.date ? featured.date.replaceAll("-", ".") : "T.B.D."}
            {featured.venue && ` · ${featured.venue}`}
            {" · "}
            <a href={featured.url}>共筆</a>
          </span>
        </div>

        {days ? (
          <>
            <div class="tabs" role="tablist" aria-label="活動日">
              {days.map((d, i) => (
                <button
                  class:list={["tab", { "tab-active": i === 0 }]}
                  role="tab"
                  aria-selected={i === 0 ? "true" : "false"}
                  data-day-tab={String(i)}
                  type="button"
                >{d.label}</button>
              ))}
            </div>
            {days.map((d, i) => (
              <section
                class="timetable"
                data-day-panel={String(i)}
                hidden={i !== 0}
                aria-label={d.label}
              >
                {d.sessions.map((s, j) => (
                  <div class:list={["tt-row", { "tt-drill": s.tag === "DRILL" }]}>
                    <span class="tt-time">{s.t}</span>
                    <span class="tt-tree">{j === d.sessions.length - 1 ? "└─" : "├─"}</span>
                    <span class="tt-title">{s.title}</span>
                    <span class="badge"><span class:list={["dot", tagDot(s.tag)]}></span>{s.tag}</span>
                    <span class="tt-loc">{s.loc}</span>
                  </div>
                ))}
              </section>
            ))}
          </>
        ) : (
          <div class="no-days">
            <TerminalBlock
              title="schedule"
              lines={[
                { prompt: "$", text: "schedule --next" },
                { text: "時程尚未公布", tone: "dim" },
                { text: "watch g0v slack #digiresithon", tone: "green" },
              ]}
            />
          </div>
        )}
      </div>
    )}

    <div class="panels">
      {hasDrill && (
        <div class="alert alert-degraded">
          <div class="alert-title">斷網演練 BLACKOUT DRILL</div>
          <div class="alert-body">
            場地骨幹會被「剪斷」——這不是故障，是重點。斷網也能動的專案，
            成果發表加倍加分。
          </div>
        </div>
      )}
      <div class="pack">
        <span class="label pack-label">OFFLINE SURVIVAL KIT — PACK CHECK</span>
        <div class="pack-list">
          {kit.map((item, i) => (
            <label class="check">
              <input type="checkbox" data-pack-idx={String(i)} />
              <span class="check-box"></span>
              {item}
            </label>
          ))}
        </div>
      </div>
    </div>

    <div class="archive-head">
      <SectionHeader label="歷次活動" right={`ARCHIVE · ${archive.length} ROUNDS`} />
    </div>
    <div class="archive" role="list">
      {archive.map((e, i) => (
        <div class="ar-row" role="listitem">
          <span class="ar-tree">{i === archive.length - 1 ? "└─" : "├─"}</span>
          <span class="ar-code">Th{e.number}n</span>
          <span class="ar-name">{shortName(e.name)}</span>
          <span class="ar-meta">
            {e.date ? e.date.replaceAll("-", ".") : "日期未定"}
            {e.venue && ` · ${e.venue}`}
          </span>
          <a class="ar-link" href={e.url}>└ 共筆 →</a>
        </div>
      ))}
    </div>
  </div>
</BaseLayout>
<style>
  .page { padding-block: 48px 64px; }
  .featured { margin-top: 24px; }
  .featured-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }
  .featured-meta {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--ink-2);
  }
  .tabs { margin-bottom: 20px; }
  .timetable {
    border: var(--border);
    background: var(--surface);
  }
  .tt-row {
    display: grid;
    grid-template-columns: 72px 24px 1fr auto 140px;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    border-top: var(--border-soft);
    font-family: var(--font-mono);
  }
  .tt-row:first-child { border-top: none; }
  .tt-time {
    color: var(--accent-2);
    font-weight: 600;
    font-size: var(--text-sm);
  }
  .tt-tree {
    color: var(--ink-3);
    font-size: var(--text-sm);
  }
  .tt-title { font-size: var(--text-base); }
  .tt-drill .tt-title {
    color: var(--accent);
    font-weight: 600;
  }
  .tt-loc {
    font-size: var(--text-xs);
    color: var(--ink-3);
    letter-spacing: var(--tracking-label);
    text-align: right;
  }
  .no-days { max-width: 520px; }
  .panels {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-top: 32px;
    align-items: start;
  }
  .pack {
    border: var(--border);
    background: var(--surface);
    padding: 16px 18px;
  }
  .pack-label {
    display: block;
    margin-bottom: 12px;
  }
  .pack-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .archive-head { margin-top: 64px; }
  .archive {
    margin-top: 24px;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ar-row {
    display: flex;
    gap: 12px;
    align-items: baseline;
    flex-wrap: wrap;
  }
  .ar-tree { color: var(--ink-3); }
  .ar-code {
    color: var(--accent-2);
    font-weight: 600;
  }
  .ar-name { color: var(--ink); }
  .ar-meta {
    color: var(--ink-3);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-label);
  }
  .ar-link { margin-left: auto; }
  @media (max-width: 800px) {
    .panels { grid-template-columns: 1fr; }
    .tt-row { grid-template-columns: 64px 1fr auto; }
    .tt-tree,
    .tt-loc { display: none; }
    .ar-link { margin-left: 0; }
  }
</style>
<script>
  // Day tabs: all panels are pre-rendered; JS only toggles the hidden
  // attribute. No framework, no hydration.
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-day-tab]"));
  const panels = Array.from(document.querySelectorAll<HTMLElement>("[data-day-panel]"));
  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      const id = tab.getAttribute("data-day-tab");
      for (const t of tabs) {
        const active = t === tab;
        t.classList.toggle("tab-active", active);
        t.setAttribute("aria-selected", String(active));
      }
      for (const p of panels) {
        p.hidden = p.getAttribute("data-day-panel") !== id;
      }
    });
  }

  // Packing checklist: persisted as a JSON boolean array under
  // localStorage "drt-packcheck".
  const KEY = "drt-packcheck";
  const boxes = Array.from(document.querySelectorAll<HTMLInputElement>("[data-pack-idx]"));
  try {
    const saved: boolean[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    boxes.forEach((box, i) => {
      box.checked = Boolean(saved[i]);
    });
  } catch {
    /* corrupted or unavailable storage: start unchecked */
  }
  for (const box of boxes) {
    box.addEventListener("change", () => {
      try {
        localStorage.setItem(KEY, JSON.stringify(boxes.map((b) => b.checked)));
      } catch {
        /* storage unavailable: checkbox still works, just not persisted */
      }
    });
  }
</script>
```

- [ ] **Step 4: Verify the schedule build and dialog wiring**

```bash
npm run build
grep -F "時程尚未公布" dist/schedule/index.html && echo FALLBACK-OK
grep -F "watch g0v slack #digiresithon" dist/schedule/index.html && echo WATCH-OK
grep -F "DigiResiTh15n 第拾伍次數位韌性松" dist/schedule/index.html && echo FEATURED-OK
grep -oE "Th[0-9]+n" dist/schedule/index.html | sort -u | wc -l
grep -F "OFFLINE SURVIVAL KIT — PACK CHECK" dist/schedule/index.html && echo PACK-OK
grep -F "無線電、LoRa 板、奇怪的天線——如果你有" dist/schedule/index.html && echo PACKITEM-OK
grep -F "歷次活動" dist/schedule/index.html && echo ARCHIVE-OK
grep -F "II9U3fe8RcqNWqpIfz8qpA" dist/schedule/index.html && echo PADLINK-OK
grep -F 'id="register-dialog"' dist/schedule/index.html && echo DIALOG-OK
grep -F "報名尚未開放" dist/index.html && echo DIALOG-HOME-OK
! grep -q "alert-degraded" dist/schedule/index.html && echo NO-DRILL-OK
! grep -q "g0v-digiresi.kktix.cc" dist/schedule/index.html && echo REG-CLOSED-OK
```

Expected: build exits 0; `FALLBACK-OK`, `WATCH-OK`, `FEATURED-OK` print; the `wc -l` prints `16` (all rounds in the archive — this count and the derived `ARCHIVE · N ROUNDS` header both track `events.yaml` length; `16` is the current data state); `PACK-OK`, `PACKITEM-OK`, `ARCHIVE-OK`, `PADLINK-OK` print; `DIALOG-OK` and `DIALOG-HOME-OK` confirm the dialog (closed state) renders on every page via the header; `NO-DRILL-OK` and `REG-CLOSED-OK` confirm the drill alert and KKTIX link are absent in the current no-upcoming-event data state. (The last four data-state checks invert once a future round with `days`/`registerUrl` is added — that is correct behavior, not a regression.)

- [ ] **Step 5: Manual dialog smoke test (dev server)**

```bash
npm run dev
```

Open `http://localhost:4321/` in a browser: click the header 報名 button → the dialog opens showing `$ register --next` / `報名尚未開放` / `watch g0v slack`; ESC closes it; clicking the dark backdrop closes it; the 關閉 button closes it. On `http://localhost:4321/schedule/`, check two packing boxes, reload — they stay checked (localStorage `drt-packcheck`). Stop the dev server (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
git add src/pages/schedule.astro src/components/RegisterDialog.astro src/components/SiteHeader.astro
git commit -m "feat: schedule page with event archive and register dialog" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 9: Handbook rendering (index + article pages)

**Files:**
- Create: `src/pages/handbook/index.astro`
- Create: `src/pages/handbook/[...slug].astro`
- Modify: `src/styles/global.css` (append handbook-article + attribution + print block)
- Test: build-output verification (static pages — no unit-testable logic; commands below)

**Interfaces:**
- Consumes: `SECTION_NAMES`, `SECTION_ORDER` from `src/lib/sections.ts` (Task 6); the `handbook` content collection — schema `{ title, section, order, sourceUrl, sourceCommit?, syncedAt, description? }` (Task 2) with 20 committed pages (Task 5); `BaseLayout.astro` props `{ title: string, description?: string }` (Task 6); `SectionHeader.astro` props `{ label, right? }` and `SignalBars.astro` props `{ level?, bars?, height?, animated? }` (Task 7); global CSS classes `.card .card-lifted .card-offline .card-head .card-body .card-foot .btn .btn-secondary .btn-sm .label .pixel-h-tc .callout*` (Task 6).
- Produces: routes `/handbook/` and `/handbook/<section>/<page>/`; global CSS classes `.handbook-breadcrumb`, `.handbook-article`, `.article-attribution`, `.article-nav` (used by synced content rendering and print); the two page files that Task 10 (`<Search />`) and Task 11 (`<OfflineStatus />` + `<InstallHint />`) modify. Article pages carry `data-pagefind-body`, which Task 10's Pagefind index depends on.

- [ ] **Step 1: Sanity-check that synced content and section module exist**

Run:

```bash
ls src/content/handbook
```

Expected output (5 section directories, from Task 5):

```
mesh  prepare  respond  scenarios  selfhost
```

Run:

```bash
grep -c "selfhost" src/lib/sections.ts
```

Expected output: a number `>= 2` (the key appears in both `SECTION_NAMES` and `SECTION_ORDER`). If either command fails, stop — Tasks 5/6 must land first.

- [ ] **Step 2: Append handbook article styles + print rules to global.css**

Append the following block verbatim to the **end** of `src/styles/global.css` (do not modify anything above it):

```css
/* ===== handbook (Task 9) ===================================================
   Long-form article typography is the ONE place --font-sans is allowed.
   Everything else (breadcrumb, attribution, prev/next) stays mono. */

.handbook-breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 600;
  letter-spacing: var(--tracking-label);
  color: var(--ink-2);
}
.handbook-breadcrumb a { color: var(--ink-2); text-decoration: none; }
.handbook-breadcrumb a:hover { color: var(--accent); text-decoration: underline; }
.handbook-breadcrumb .glyph { color: var(--ink-3); }

.handbook-article {
  font-family: var(--font-sans);
  font-size: var(--text-prose);
  line-height: var(--leading-body);
  max-width: 72ch;
}
.handbook-article h1 { margin: var(--sp-5) 0 var(--sp-4); }
.handbook-article h2 {
  font-family: var(--font-pixel-tc);
  font-size: var(--tc-1);
  line-height: var(--leading-pixel);
  font-weight: 400;
  -webkit-font-smoothing: none;
  margin: var(--sp-6) 0 var(--sp-3);
}
.handbook-article h3 {
  font-family: var(--font-sans);
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
  margin: var(--sp-5) 0 var(--sp-2);
}
.handbook-article p { margin: 0 0 var(--sp-4); }
.handbook-article ul,
.handbook-article ol { margin: 0 0 var(--sp-4); padding-left: var(--sp-5); }
.handbook-article li { margin-bottom: var(--sp-1); }
.handbook-article a { color: var(--accent); }
.handbook-article img {
  max-width: 100%;
  height: auto;
  border: var(--border-soft);
}
.handbook-article code {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background: var(--surface-sunken);
  padding: 1px 4px;
}
.handbook-article pre {
  background: var(--surface-sunken);
  border: var(--border-soft);
  padding: var(--sp-4);
  overflow-x: auto;
  margin: 0 0 var(--sp-4);
}
.handbook-article pre code { background: none; padding: 0; }
.handbook-article table {
  border-collapse: collapse;
  margin: 0 0 var(--sp-4);
  display: block;
  overflow-x: auto;
}
.handbook-article th,
.handbook-article td {
  border: 1px solid var(--line-soft);
  padding: var(--sp-2) var(--sp-3);
  text-align: left;
}
.handbook-article blockquote {
  border-left: var(--border-w) solid var(--line-soft);
  margin: 0 0 var(--sp-4);
  padding: var(--sp-1) 0 var(--sp-1) var(--sp-4);
  color: var(--ink-2);
}

.article-attribution {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--sp-3);
  border: var(--border);
  padding: var(--sp-4);
  margin-top: var(--sp-6);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--ink-2);
}
.article-attribution a { color: var(--accent); }
.article-attribution .synced {
  color: var(--ink-3);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.article-nav {
  display: flex;
  justify-content: space-between;
  gap: var(--sp-3);
  margin-top: var(--sp-5);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}
.article-nav a { color: var(--ink); text-decoration: none; }
.article-nav a:hover { color: var(--accent); }

@media print {
  /* Task 6 owns the paper-token override + hiding header/nav/footer.
     Here: hide the interactive chrome this zone adds (search is Task 10,
     offline/install UI is Task 11 — selectors are inert until then). */
  .article-nav,
  .drt-search,
  .offline-status,
  .install-hint { display: none !important; }
  .handbook-article { max-width: none; }
  .handbook-article a { color: var(--ink); text-decoration: underline; }
}
```

- [ ] **Step 3: Create src/pages/handbook/index.astro**

Create `src/pages/handbook/index.astro` with exactly this content. Design notes baked in: the 5 section cards recreate the `Projects.jsx` card motif (pixel-TC title, red mono meta `N 頁`, mono blurb, `SYNC` + green SignalBars in the foot); the sixth card is the dashed `.card-offline` empty slot linking to the idea-pool HackMD note; page tree lists use `├─`/`└─` box-drawing (never emoji).

```astro
---
import { getCollection } from "astro:content";
import BaseLayout from "../../layouts/BaseLayout.astro";
import SectionHeader from "../../components/SectionHeader.astro";
import SignalBars from "../../components/SignalBars.astro";
import { SECTION_NAMES, SECTION_ORDER } from "../../lib/sections";

const SECTION_BLURBS: Record<string, string> = {
  prepare: "救難包、常備物資、避難位置——斷網之前就該做完的事。",
  respond: "通訊、交通、保健——災害當下怎麼行動。",
  mesh: "從 Meshtastic 入門到台灣鏈網——不靠基地台也能通訊。",
  scenarios: "海纜斷光會怎樣？用情境分級理解風險。",
  selfhost: "離線替代品與 self-host 指南——自己的服務自己架。",
};

const IDEA_POOL_URL = "https://g0v.hackmd.io/PMiMLc-JT3yFrAs3CL6rzw";

const pages = await getCollection("handbook");
const sections = SECTION_ORDER.map((section) => {
  const items = pages
    .filter((p) => p.data.section === section)
    .sort((a, b) => a.data.order - b.data.order);
  return {
    section,
    name: SECTION_NAMES[section],
    blurb: SECTION_BLURBS[section],
    items,
  };
});
---
<BaseLayout
  title="手冊 HANDBOOK — DigiResiThon"
  description="數位韌性手冊：斷網也能查的準備、應變、通訊網指南。"
>
  <div class="handbook-index">
    <SectionHeader label="手冊" right="OFFLINE-FIRST" />
    <div class="handbook-grid">
      {sections.map(({ section, name, blurb, items }) => (
        <div class="card card-lifted">
          <div class="card-head">
            <span class="pixel-h-tc">{name}</span>
            <span class="card-meta">{items.length} 頁</span>
          </div>
          <div class="card-body">
            <p class="blurb">{blurb}</p>
            <ul class="page-tree">
              {items.map((p, i) => (
                <li>
                  <span class="tree-glyph" aria-hidden="true">
                    {i === items.length - 1 ? "└─" : "├─"}
                  </span>
                  <a href={`/handbook/${p.id}/`}>{p.data.title}</a>
                </li>
              ))}
            </ul>
          </div>
          <div class="card-foot">
            <span>→ <a href={`/handbook/${items[0].id}/`}>開始閱讀</a></span>
            <span class="sync">SYNC <SignalBars level={4} height={14} /></span>
          </div>
        </div>
      ))}
      <div class="card card-offline">
        <div class="card-head">
          <span class="pixel-h-tc">你的主題</span>
          <span class="card-meta">EMPTY SLOT</span>
        </div>
        <div class="card-body">
          <p class="blurb">
            這一格是空的。不要問為什麼沒有人寫——你就是那個「沒有人」。
          </p>
          <a class="btn btn-secondary btn-sm" href={IDEA_POOL_URL} rel="external">
            → 到共筆提案
          </a>
        </div>
        <div class="card-foot">
          <span>0 頁</span>
          <span>→ pitch it</span>
        </div>
      </div>
    </div>
  </div>
</BaseLayout>

<style>
  .handbook-index {
    max-width: var(--container);
    margin: 0 auto;
    padding: 48px var(--gutter) 64px;
  }
  .handbook-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--sp-4);
    margin-top: var(--sp-5);
  }
  @media (max-width: 900px) {
    .handbook-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 600px) {
    .handbook-grid { grid-template-columns: 1fr; }
  }
  .card-head .pixel-h-tc {
    font-size: var(--tc-1);
    line-height: var(--leading-pixel);
  }
  .card-meta {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--accent);
  }
  .card-offline .card-meta { color: var(--ink-3); }
  .blurb { margin: 0 0 var(--sp-3); }
  .page-tree {
    list-style: none;
    margin: 0;
    padding: 0;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
  }
  .page-tree li {
    display: flex;
    gap: var(--sp-2);
    margin-bottom: var(--sp-1);
  }
  .tree-glyph { color: var(--ink-3); flex: none; }
  .page-tree a { color: var(--ink); text-decoration: none; }
  .page-tree a:hover { color: var(--accent); }
  .sync { display: inline-flex; align-items: center; gap: var(--sp-2); }
  .card-foot a { color: var(--ink-2); text-decoration: none; }
  .card-foot a:hover { color: var(--accent); }
</style>
```

- [ ] **Step 4: Create src/pages/handbook/[...slug].astro**

Create `src/pages/handbook/[...slug].astro` with exactly this content. Entry `id` from the Astro 5 glob loader is the extension-less relative path (`prepare/go-bag`), so the rest param yields `/handbook/prepare/go-bag/`. The attribution box sits **outside** `data-pagefind-body` so it never pollutes search excerpts; prev/next stay within the section, ordered by `order`.

```astro
---
import { getCollection, render } from "astro:content";
import BaseLayout from "../../layouts/BaseLayout.astro";
import { SECTION_NAMES } from "../../lib/sections";

export async function getStaticPaths() {
  const pages = await getCollection("handbook");
  return pages.map((page) => ({
    params: { slug: page.id },
    props: { page, pages },
  }));
}

const { page, pages } = Astro.props;
const { Content } = await render(page);

const siblings = pages
  .filter((p) => p.data.section === page.data.section)
  .sort((a, b) => a.data.order - b.data.order);
const idx = siblings.findIndex((p) => p.id === page.id);
const prev = idx > 0 ? siblings[idx - 1] : null;
const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
const sectionName = SECTION_NAMES[page.data.section];
---
<BaseLayout
  title={`${page.data.title} — 數位韌性手冊`}
  description={page.data.description ?? `數位韌性手冊 · ${sectionName}`}
>
  <div class="handbook-page">
    <nav class="handbook-breadcrumb" aria-label="breadcrumb">
      <a href="/handbook/">手冊</a>
      <span class="glyph" aria-hidden="true">├─</span>
      <span>{sectionName}</span>
    </nav>
    <article class="handbook-article" data-pagefind-body>
      <h1 class="pixel-h-tc">{page.data.title}</h1>
      <Content />
    </article>
    <aside class="article-attribution">
      <span>本頁同步自 <a href={page.data.sourceUrl} rel="external">HackMD 共筆</a></span>
      <span class="synced">SYNCED {page.data.syncedAt}</span>
    </aside>
    <nav class="article-nav" aria-label="前後頁">
      <span>
        {prev && <a href={`/handbook/${prev.id}/`}>├─ 上一頁 {prev.data.title}</a>}
      </span>
      <span>
        {next && <a href={`/handbook/${next.id}/`}>└─ 下一頁 {next.data.title}</a>}
      </span>
    </nav>
  </div>
</BaseLayout>

<style>
  .handbook-page {
    max-width: var(--container);
    margin: 0 auto;
    padding: 48px var(--gutter) 64px;
  }
  h1.pixel-h-tc {
    font-size: var(--tc-2);
    line-height: var(--leading-pixel);
  }
</style>
```

- [ ] **Step 5: Build and verify the handbook routes exist**

Run:

```bash
npm run build
```

Expected: the build completes without errors; the `[build]` summary lists the 20 handbook article pages plus `/handbook/index.html` among the built pages (total count also includes the portal pages from Task 8), then the Pagefind step from the build script prints:

```
Running Pagefind v1.x
...
Indexed 20 pages
```

(Only the 20 article pages carry `data-pagefind-body`; once any page has it, Pagefind skips pages without it — the index page and portal pages are correctly excluded.)

Run:

```bash
ls dist/handbook
```

Expected output:

```
index.html  mesh  prepare  respond  scenarios  selfhost
```

- [ ] **Step 6: Verify article page markup (attribution + pagefind body)**

Run:

```bash
grep -o "本頁同步自" dist/handbook/prepare/go-bag/index.html | head -n 1
grep -o "data-pagefind-body" dist/handbook/prepare/go-bag/index.html | head -n 1
grep -o "SYNCED [0-9-]*" dist/handbook/prepare/go-bag/index.html | head -n 1
```

Expected output:

```
本頁同步自
data-pagefind-body
SYNCED 2026-07-17
```

(The `SYNCED` date equals the `syncedAt` frontmatter written by the Task 5 sync run — the day the sync was executed.)

- [ ] **Step 7: Commit**

```bash
git add src/pages/handbook/index.astro "src/pages/handbook/[...slug].astro" src/styles/global.css
git commit -m "feat: handbook index and article pages" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 10: Offline-capable search (Pagefind UI)

**Files:**
- Create: `src/components/Search.astro`, `pagefind.yml`
- Modify: `src/pages/handbook/index.astro` (add `<Search />` below the `SectionHeader`)
- Modify: `src/pages/handbook/[...slug].astro` (add `<Search />` below the breadcrumb)
- Test: build-output + preview verification (Pagefind assets are build-generated; no unit-testable logic)

**Interfaces:**
- Consumes: `data-pagefind-body` on article pages and the two handbook page files (Task 9); the `"build": "astro build && pagefind --site dist"` npm script (Task 1); design tokens from `src/styles/global.css` (Task 6).
- Produces: `src/components/Search.astro` (no props) — renders `<div id="search">` wrapped in the kit Input look and boots `PagefindUI` from `/pagefind/pagefind-ui.js` at runtime. Task 11's precache globs (`pagefind/**/*`) make this work offline; the Playwright e2e task exercises it.

- [ ] **Step 1: Create src/components/Search.astro**

Create `src/components/Search.astro` with exactly this content. Notes: Pagefind ^1.3.0 ships the classic `PagefindUI` bundle at `/pagefind/pagefind-ui.js` — it is an IIFE that defines `window.PagefindUI`, so the dynamic `import()` is used purely to load it, then the global is read. The `/* @vite-ignore */` comment is mandatory: without it Vite tries to resolve `/pagefind/pagefind-ui.js` at bundle time and the build fails (the file only exists post-build). Under `astro dev` the import 404s and the `catch` degrades to a console warning. PagefindUI injects its DOM at runtime, so all style overrides go through `:global()` inside the scoped style block, driving Pagefind's own CSS custom properties plus square-corner/mono overrides.

```astro
---
---
<link rel="stylesheet" href="/pagefind/pagefind-ui.css" />

<div class="drt-search">
  <span class="drt-search-prefix" aria-hidden="true">$</span>
  <div id="search" class="drt-search-ui"></div>
</div>

<script>
  async function initSearch() {
    try {
      // Non-literal specifier: TypeScript resolves string-literal dynamic
      // imports and would fail `npm run check` with TS2307 (/pagefind/ only
      // exists post-build). Vite still needs the @vite-ignore comment to skip
      // bundle-time analysis.
      const PAGEFIND_UI_SRC = "/pagefind/pagefind-ui.js";
      await import(/* @vite-ignore */ PAGEFIND_UI_SRC);
      const PagefindUI = (
        window as unknown as {
          PagefindUI: new (opts: Record<string, unknown>) => unknown;
        }
      ).PagefindUI;
      new PagefindUI({ element: "#search", showSubResults: true });
    } catch {
      console.warn(
        "[search] /pagefind/pagefind-ui.js not found — run `npm run build` to generate the index; search is disabled under `astro dev`.",
      );
    }
  }
  void initSearch();
</script>

<style>
  .drt-search {
    display: flex;
    align-items: flex-start;
    gap: var(--sp-2);
    border: 2px solid var(--line-soft);
    background: var(--surface-sunken);
    padding: var(--sp-2) var(--sp-3);
    margin-top: var(--sp-5);
  }
  .drt-search:focus-within { border-color: var(--line); }
  .drt-search-prefix {
    color: var(--accent-2);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    font-weight: 600;
    padding-top: 14px; /* aligns the $ with the PagefindUI input text line */
  }
  .drt-search-ui { flex: 1; min-width: 0; }

  /* PagefindUI renders its own DOM at runtime — override via :global(). */
  .drt-search :global(.pagefind-ui) {
    --pagefind-ui-scale: 0.9;
    --pagefind-ui-primary: var(--accent-2);
    --pagefind-ui-text: var(--ink);
    --pagefind-ui-background: var(--surface-sunken);
    --pagefind-ui-border: var(--line-soft);
    --pagefind-ui-border-width: 2px;
    --pagefind-ui-border-radius: 0px;
    --pagefind-ui-image-border-radius: 0px;
    --pagefind-ui-font: var(--font-mono);
    font-family: var(--font-mono);
  }
  .drt-search :global(.pagefind-ui__search-input) {
    background: transparent;
    border: none;
    color: var(--ink);
    font-family: var(--font-mono);
    font-weight: 400;
  }
  .drt-search :global(.pagefind-ui__search-input::placeholder) {
    color: var(--ink-3);
    opacity: 1;
  }
  .drt-search :global(.pagefind-ui__search-clear) {
    border-radius: 0;
    background: transparent;
    color: var(--ink-2);
    font-family: var(--font-mono);
  }
  .drt-search :global(.pagefind-ui__result) {
    border-top: 1px solid var(--line-soft);
    padding: var(--sp-3) 0;
  }
  .drt-search :global(.pagefind-ui__result-link) {
    color: var(--accent);
    font-family: var(--font-mono);
  }
  .drt-search :global(.pagefind-ui__result-excerpt) {
    color: var(--ink-2);
    font-family: var(--font-sans);
  }
  .drt-search :global(.pagefind-ui__result-excerpt mark) {
    background: var(--selection-bg);
    color: var(--selection-ink);
  }
  .drt-search :global(.pagefind-ui__message) {
    color: var(--ink-2);
    font-family: var(--font-mono);
  }
  .drt-search :global(.pagefind-ui__button) {
    border-radius: 0;
    border: 2px solid var(--line);
    background: var(--surface);
    color: var(--ink);
    font-family: var(--font-mono);
  }
</style>
```

- [ ] **Step 2: Mount Search on the handbook index**

In `src/pages/handbook/index.astro`, make two edits.

Edit 1 — add the import. Before:

```astro
import { SECTION_NAMES, SECTION_ORDER } from "../../lib/sections";
```

After:

```astro
import { SECTION_NAMES, SECTION_ORDER } from "../../lib/sections";
import Search from "../../components/Search.astro";
```

Edit 2 — render it below the SectionHeader. Before:

```astro
    <SectionHeader label="手冊" right="OFFLINE-FIRST" />
    <div class="handbook-grid">
```

After:

```astro
    <SectionHeader label="手冊" right="OFFLINE-FIRST" />
    <Search />
    <div class="handbook-grid">
```

- [ ] **Step 3: Mount Search on article pages**

In `src/pages/handbook/[...slug].astro`, make two edits.

Edit 1 — add the import. Before:

```astro
import { SECTION_NAMES } from "../../lib/sections";
```

After:

```astro
import { SECTION_NAMES } from "../../lib/sections";
import Search from "../../components/Search.astro";
```

Edit 2 — render it below the breadcrumb. Before:

```astro
      <span>{sectionName}</span>
    </nav>
    <article class="handbook-article" data-pagefind-body>
```

After:

```astro
      <span>{sectionName}</span>
    </nav>
    <Search />
    <article class="handbook-article" data-pagefind-body>
```

- [ ] **Step 4: Create `pagefind.yml` forcing zh language handling**

Spec §6 requires forcing `zh` language handling in the Pagefind config rather than relying on `<html lang>` auto-detection. Create `pagefind.yml` at the repo root with exactly this content:

```yaml
force_language: "zh"
```

The Pagefind CLI reads `pagefind.yml` from the working directory, so this one file applies to BOTH the npm `build` script's trailing `pagefind --site dist` run and Task 11's in-build integration run (`npx pagefind --site …`).

- [ ] **Step 5: Build and confirm the index is generated**

Run:

```bash
npm run build
```

Expected: build completes; the trailing Pagefind step prints (word count varies):

```
Running Pagefind v1.x
...
[Building search indexes]
Total:
  Indexed 1 language
  Indexed 20 pages
  Indexed ~N words
```

(The `Indexed 1 language` line is now guaranteed by `pagefind.yml`'s `force_language` setting rather than by lang-attribute detection.)

- [ ] **Step 6: Verify the Pagefind UI assets are served**

Run:

```bash
npm run preview &
sleep 3
curl -sI http://localhost:4321/pagefind/pagefind-ui.js | head -n 1
curl -sI http://localhost:4321/pagefind/pagefind-ui.css | head -n 1
curl -s http://localhost:4321/handbook/ | grep -c 'id="search"'
pkill -f "astro preview"
```

Expected output:

```
HTTP/1.1 200 OK
HTTP/1.1 200 OK
1
```

- [ ] **Step 7: Commit**

```bash
git add src/components/Search.astro pagefind.yml src/pages/handbook/index.astro "src/pages/handbook/[...slug].astro"
git commit -m "feat: offline-capable pagefind search on handbook pages" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 11: PWA — offline handbook

**Files:**
- Create: `scripts/precache-globs.mjs` (shared with Task 12's `check-budget.mjs`)
- Create: `scripts/make-icons.mjs` (+ run it; commit the 4 generated PNGs in `public/icons/`)
- Create: `src/pages/offline.astro`
- Create: `src/components/OfflineStatus.astro`
- Create: `src/components/InstallHint.astro`
- Modify: `astro.config.mjs` (complete final file below)
- Modify: `src/layouts/BaseLayout.astro` (manifest `<link>` + service-worker registration — required: the `@vite-pwa/astro` integration does NOT inject any registration script into Astro pages; verified against `vite-pwa/astro` `src/index.ts`)
- Modify: `src/pages/handbook/index.astro` (add `<OfflineStatus />` + `<InstallHint />` near the top)
- Test: build-output verification (`dist/sw.js`, `dist/manifest.webmanifest`, precache-entry greps)

**Interfaces:**
- Consumes: `TerminalBlock.astro` props `{ title?, lines: Array<{prompt?, text, tone?}>, cursor? }` (Task 7); `BaseLayout.astro` (Task 6); `.btn .btn-primary .btn-secondary .btn-sm .btn-lg` classes (Task 6); `design/assets/logo/mark-dark.png` (repo asset); npm scripts `icons` and `build` (Task 1); handbook pages (Task 9) and Pagefind output (Task 10).
- Produces: `export const precacheGlobs = [...]` from `scripts/precache-globs.mjs` — imported by `astro.config.mjs` (here) and by `scripts/check-budget.mjs` (Task 12); `public/icons/icon-64.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`; route `/offline/`; `dist/sw.js` + `dist/manifest.webmanifest` at build time; `<OfflineStatus />` and `<InstallHint />` (no props). The Playwright offline e2e task depends on all of this.

Three build-mechanics facts this task is designed around (verified against `@vite-pwa/astro` source and vite-pwa docs):
1. **Registration is manual in Astro** — the integration only configures vite-plugin-pwa; nothing injects `registerSW` into rendered pages. BaseLayout registers `/sw.js` itself (`injectRegister: false` makes that explicit).
2. **`trailingSlash: "always"` is required** — the integration's manifest transform rewrites `foo/index.html` precache URLs to `foo` and appends `/` only when Astro's `trailingSlash` is `"always"`. GitHub Pages navigations are `/handbook/<x>/` (with slash), and workbox's `createHandlerBoundToURL("/offline/")` must resolve against a precached `offline/` key — without `"always"`, offline navigation misses the precache and the SW fallback handler throws `non-precached-url` at startup.
3. **Pagefind must run before the SW is generated** — `@vite-pwa/astro` writes `sw.js` in its `astro:build:done` hook, but the npm `build` script runs `pagefind --site dist` *after* `astro build`, too late for `pagefind/**/*` to be precached. A tiny inline integration listed **before** `AstroPWA` in the integrations array runs Pagefind first (Astro runs same-name hooks in integration order); the trailing CLI run in the npm script then regenerates byte-identical output (content-hashed filenames), so precache revisions stay valid.

- [ ] **Step 1: Create scripts/precache-globs.mjs**

Create `scripts/precache-globs.mjs` with exactly this content (the value is contract-fixed; Task 12's budget check imports the same list):

```js
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
  "_astro/*.css",
  "_astro/*.js",
  "_astro/press-start-2p-latin-400*.woff2",
  "_astro/ibm-plex-mono-latin-400*.woff2",
  "fonts/Cubic_11.woff2",
  "icons/**/*",
  "brand/**/*",
  "offline/index.html",
];
```

Verify it parses and exports:

```bash
node -e "import('./scripts/precache-globs.mjs').then(m => console.log(m.precacheGlobs.length, 'globs'))"
```

Expected output:

```
11 globs
```

- [ ] **Step 2: Create scripts/make-icons.mjs**

Create `scripts/make-icons.mjs` with exactly this content:

```js
/**
 * Generates the PWA icon set from the design-system mark.
 * mark-dark.png (paper-white ink for dark surfaces) is composited centered
 * onto a #0c0c0b square — 70% inset for regular icons, 55% for the maskable
 * icon (safe zone). Output is committed; the script only needs re-running if
 * the logo changes.
 */
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const SRC = "design/assets/logo/mark-dark.png";
const OUT = "public/icons";
const BG = "#0c0c0b";

async function makeIcon(size, scale, outName) {
  const inner = Math.round(size * scale);
  const mark = await sharp(SRC)
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 12, g: 12, b: 11, alpha: 0 },
    })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toFile(`${OUT}/${outName}`);
  console.log(`${OUT}/${outName} (${size}x${size})`);
}

await mkdir(OUT, { recursive: true });
await makeIcon(64, 0.7, "icon-64.png");
await makeIcon(192, 0.7, "icon-192.png");
await makeIcon(512, 0.7, "icon-512.png");
await makeIcon(512, 0.55, "icon-maskable-512.png");
console.log("done: 4 icons written");
```

- [ ] **Step 3: Run the icon script and verify output**

Run:

```bash
npm run icons
```

Expected output:

```
public/icons/icon-64.png (64x64)
public/icons/icon-192.png (192x192)
public/icons/icon-512.png (512x512)
public/icons/icon-maskable-512.png (512x512)
done: 4 icons written
```

Verify dimensions independently:

```bash
node -e "const sharp=require('sharp');(async()=>{for(const f of ['icon-64','icon-192','icon-512','icon-maskable-512']){const m=await sharp('public/icons/'+f+'.png').metadata();console.log(f+':',m.width+'x'+m.height,m.format)}})()"
```

Expected output:

```
icon-64: 64x64 png
icon-192: 192x192 png
icon-512: 512x512 png
icon-maskable-512: 512x512 png
```

- [ ] **Step 4: Create src/pages/offline.astro**

Create `src/pages/offline.astro` with exactly this content — the SW `navigateFallback`/`precacheFallback` target. TerminalBlock voice: EN meta-copy for statuses, zh-TW for the informational lines; no emoji; the one action is a primary button into the precached handbook.

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import TerminalBlock from "../components/TerminalBlock.astro";
---
<BaseLayout title="OFFLINE — DigiResiThon" description="目前離線。手冊仍可離線使用。">
  <div class="offline-page">
    <TerminalBlock
      title="digiresithon@tw:~"
      lines={[
        { prompt: "$", text: "curl https://digiresi.g0v.tw" },
        { text: "connection failed — OFFLINE", tone: "red" },
        { text: "目前離線，這一頁還沒被快取。", tone: "dim" },
        { text: "手冊仍可離線使用：", tone: "green" },
      ]}
      cursor={true}
    />
    <a class="btn btn-primary btn-lg" href="/handbook/">開啟手冊</a>
    <p class="offline-note">回到線上之後，重新整理即可載入原本要看的頁面。</p>
  </div>
</BaseLayout>

<style>
  .offline-page {
    max-width: 640px;
    margin: 0 auto;
    padding: 64px var(--gutter);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--sp-5);
  }
  .offline-note {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--ink-3);
    margin: 0;
  }
</style>
```

- [ ] **Step 5: Replace astro.config.mjs with the final PWA-enabled config**

Replace the entire contents of `astro.config.mjs` with exactly this file (it keeps the site URL and adds `trailingSlash`, the Pagefind-ordering integration, and `AstroPWA` — rationale for each non-obvious line is in the comments):

```js
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import AstroPWA from "@vite-pwa/astro";
import { precacheGlobs } from "./scripts/precache-globs.mjs";

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
        start_url: "/handbook/",
        display: "standalone",
        lang: "zh-Hant-TW",
        theme_color: "#0c0c0b",
        background_color: "#0c0c0b",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: precacheGlobs,
        // Offline fallback for /handbook/** navigations that miss the precache.
        navigateFallback: "/offline/",
        // Keep the precache-fallback NavigationRoute away from portal URLs:
        // workbox registers it BEFORE runtimeCaching routes, so without this
        // denylist "/" and "/schedule/" would serve the precached /offline/
        // page even when online. Portal documents fall through to the
        // NetworkFirst route below instead.
        navigateFallbackDenylist: [/^\/(?!handbook\/)/],
        runtimeCaching: [
          {
            // Portal pages: network-first; when offline and uncached, the
            // precacheFallback plugin serves the precached /offline/ page.
            urlPattern: ({ request, url }) =>
              request.destination === "document" &&
              !url.pathname.startsWith("/handbook/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "portal-pages",
              precacheFallback: { fallbackURL: "/offline/" },
            },
          },
          {
            // Runtime-cached fonts (body TC face etc.). Precached woff2 files
            // (Press Start 2P, Plex Mono 400, Cubic 11) hit the precache route
            // first; this catches the rest, e.g. IBM Plex Sans TC 400/700.
            urlPattern: ({ url }) => url.pathname.endsWith(".woff2"),
            handler: "CacheFirst",
            options: { cacheName: "fonts" },
          },
        ],
      },
    }),
  ],
});
```

- [ ] **Step 6: Register the service worker + manifest link in BaseLayout**

In `src/layouts/BaseLayout.astro`, make exactly one edit against Task 6's final layout (which contains no `<link rel="manifest">` — this adds the only one). The anchor is the end of the blocking theme-init script in `<head>`. Before:

```astro
    </script>
  </head>
  <body>
```

After:

```astro
    </script>
    <link rel="manifest" href="/manifest.webmanifest" />
    <script>
      // Register the offline service worker. Production only — `astro dev`
      // does not generate /sw.js (registering there would just log an error).
      // Processed scripts are deferred modules, so registering immediately is
      // safe (no need to wait for window load).
      if (import.meta.env.PROD && "serviceWorker" in navigator) {
        void navigator.serviceWorker.register("/sw.js");
      }
    </script>
  </head>
  <body>
```

- [ ] **Step 7: Create src/components/OfflineStatus.astro**

Create `src/components/OfflineStatus.astro` with exactly this content. It renders the StatusDot visual (mono caps label + square dot) but with its own markup, because the dot's state must flip client-side (checking → downloading → ok / offline) and Task 7's `StatusDot.astro` renders a fixed server-side state. The cache probe hits a known precached handbook URL; `ignoreSearch: true` is required because workbox stores precache entries under `?__WB_REVISION__=` cache keys.

```astro
---
---
<div class="offline-status" data-offline-status>
  <span
    class="offline-status-dot"
    data-dot
    data-state="checking"
    aria-hidden="true"></span>
  <span class="offline-status-msg" data-msg aria-live="polite">檢查離線快取…</span>
</div>

<script>
  const root = document.querySelector("[data-offline-status]");
  const dot = root?.querySelector("[data-dot]") as HTMLElement | null;
  const msg = root?.querySelector("[data-msg]") as HTMLElement | null;
  // Any precached handbook page works as a probe; go-bag is order 1, section 1.
  const PROBE_URL = "/handbook/prepare/go-bag/";

  function setState(state: string, text: string) {
    if (!dot || !msg) return;
    dot.dataset.state = state;
    msg.textContent = text;
  }

  async function handbookCached(): Promise<boolean> {
    if (!("caches" in window)) return false;
    const hit = await caches.match(PROBE_URL, { ignoreSearch: true });
    return hit !== undefined;
  }

  async function refresh() {
    if (!navigator.onLine) {
      const cached = await handbookCached();
      setState(
        "offline",
        cached ? "OFFLINE — 手冊已下載，離線可用" : "OFFLINE — 手冊尚未下載完成",
      );
      return;
    }
    if (!("serviceWorker" in navigator)) {
      setState("unsupported", "此瀏覽器不支援離線快取");
      return;
    }
    if (await handbookCached()) {
      setState("ok", "✓ 手冊已完整下載，離線可用");
      return;
    }
    // U+2193 DOWNWARDS ARROW (text presentation) — not the emoji-capable
    // U+2B07 variant; the design system bans emoji in UI copy.
    setState("downloading", "↓ 手冊下載中…");
    await navigator.serviceWorker.ready;
    let tries = 0;
    const timer = window.setInterval(async () => {
      tries += 1;
      if (await handbookCached()) {
        window.clearInterval(timer);
        setState("ok", "✓ 手冊已完整下載，離線可用");
      } else if (tries >= 30) {
        window.clearInterval(timer); // give up quietly after ~60s
      }
    }, 2000);
  }

  window.addEventListener("offline", () => void refresh());
  window.addEventListener("online", () => void refresh());
  void refresh();
</script>

<style>
  .offline-status {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: var(--tracking-label);
    color: var(--ink-2);
  }
  .offline-status-dot {
    width: 10px;
    height: 10px;
    flex: none;
    background: var(--ink-3);
  }
  .offline-status-dot[data-state="ok"] { background: var(--status-online); }
  .offline-status-dot[data-state="downloading"] {
    background: var(--status-degraded);
    animation: drt-blink 1.2s steps(1) infinite;
  }
  .offline-status-dot[data-state="offline"] { background: var(--status-offline); }
  @media (prefers-reduced-motion: reduce) {
    .offline-status-dot { animation: none; }
  }
</style>
```

- [ ] **Step 8: Create src/components/InstallHint.astro**

Create `src/components/InstallHint.astro` with exactly this content:

```astro
---
---
<div class="install-hint" data-install-hint hidden>
  <button class="btn btn-secondary btn-sm" type="button" data-install-btn hidden>
    安裝離線手冊
  </button>
  <span class="install-hint-ios" data-ios-hint hidden>
    iOS：用 Safari 的分享選單「加入主畫面」，即可離線使用手冊
  </span>
</div>

<script>
  const root = document.querySelector("[data-install-hint]") as HTMLElement | null;
  const btn = document.querySelector("[data-install-btn]") as HTMLButtonElement | null;
  const ios = document.querySelector("[data-ios-hint]") as HTMLElement | null;

  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
  }

  // Already installed → nothing to hint.
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  let deferred: BeforeInstallPromptEvent | null = null;

  if (!standalone && root) {
    // iOS Safari never fires beforeinstallprompt — show manual instructions.
    if (/iphone|ipad|ipod/i.test(navigator.userAgent) && ios) {
      root.hidden = false;
      ios.hidden = false;
    }
    // Android/desktop Chromium path: capture the prompt, offer a button.
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferred = e as BeforeInstallPromptEvent;
      if (ios) ios.hidden = true;
      if (btn) btn.hidden = false;
      root.hidden = false;
    });
    btn?.addEventListener("click", async () => {
      if (!deferred) return;
      await deferred.prompt();
      deferred = null;
      if (btn) btn.hidden = true;
    });
    window.addEventListener("appinstalled", () => {
      root.hidden = true;
    });
  }
</script>

<style>
  .install-hint {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-3);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--ink-2);
  }
  .install-hint[hidden] { display: none; }
</style>
```

- [ ] **Step 9: Mount OfflineStatus + InstallHint on the handbook index**

In `src/pages/handbook/index.astro`, make three edits.

Edit 1 — add the imports. Before:

```astro
import Search from "../../components/Search.astro";
```

After:

```astro
import Search from "../../components/Search.astro";
import OfflineStatus from "../../components/OfflineStatus.astro";
import InstallHint from "../../components/InstallHint.astro";
```

Edit 2 — render the status row between the SectionHeader and the Search. Before:

```astro
    <SectionHeader label="手冊" right="OFFLINE-FIRST" />
    <Search />
```

After:

```astro
    <SectionHeader label="手冊" right="OFFLINE-FIRST" />
    <div class="handbook-status-row">
      <OfflineStatus />
      <InstallHint />
    </div>
    <Search />
```

Edit 3 — add the row layout to the page's `<style>` block. Before:

```css
  .handbook-index {
    max-width: var(--container);
    margin: 0 auto;
    padding: 48px var(--gutter) 64px;
  }
```

After:

```css
  .handbook-index {
    max-width: var(--container);
    margin: 0 auto;
    padding: 48px var(--gutter) 64px;
  }
  .handbook-status-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sp-4);
    margin-top: var(--sp-4);
  }
```

- [ ] **Step 10: Build and verify the service worker + manifest**

Run:

```bash
npm run build
```

Expected: the Pagefind integration output appears **during** `astro build` (before the PWA lines), then vite-plugin-pwa prints a summary like:

```
PWA v1.x.x
mode      generateSW
precache  N entries (X.XX KiB)
files generated
  dist/sw.js
  dist/workbox-XXXXXXXX.js
```

then the trailing `pagefind --site dist` re-run prints its `Indexed 20 pages` block again.

Verify the artifacts:

```bash
ls -la dist/sw.js dist/manifest.webmanifest
node -e "const fs=require('node:fs');const sw=fs.readFileSync('dist/sw.js','utf8');const checks={handbook:sw.includes('handbook'),Cubic_11:sw.includes('Cubic_11'),pagefind:sw.includes('pagefind'),offline:sw.includes('offline/')};console.log(checks);process.exit(Object.values(checks).every(Boolean)?0:1)"
grep -o '"start_url":"/handbook/"' dist/manifest.webmanifest
```

Expected output:

```
-rw-r--r-- ... dist/sw.js
-rw-r--r-- ... dist/manifest.webmanifest
{ handbook: true, Cubic_11: true, pagefind: true, offline: true }
"start_url":"/handbook/"
```

Also confirm the offline fallback page and the manifest link made it into the HTML:

```bash
ls dist/offline/index.html
grep -o 'rel="manifest"' dist/handbook/index.html | head -n 1
```

Expected output:

```
dist/offline/index.html
rel="manifest"
```

- [ ] **Step 11: Commit (including the generated icons)**

```bash
git add scripts/precache-globs.mjs scripts/make-icons.mjs src/pages/offline.astro src/components/OfflineStatus.astro src/components/InstallHint.astro src/layouts/BaseLayout.astro src/pages/handbook/index.astro astro.config.mjs public/icons/icon-64.png public/icons/icon-192.png public/icons/icon-512.png public/icons/icon-maskable-512.png
git commit -m "feat: PWA offline handbook — precache, offline fallback, install UX" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 12: Precache budget + internal link checks

**Files:**
- Create: `scripts/check-budget.mjs`
- Create: `scripts/check-links.mjs`
- Test: `tests/unit/checks.test.mjs`

**Interfaces:**
- Consumes: `precacheGlobs` (array of glob strings) exported from `scripts/precache-globs.mjs` (Task 11); the `dist/` output of `npm run build` (Tasks 6–11); the package.json scripts `"check:budget": "node scripts/check-budget.mjs"` and `"check:links": "node scripts/check-links.mjs"` (Task 1).
- Produces: `globToRegExp(glob: string) -> RegExp` exported from `scripts/check-budget.mjs`; `resolveHref(href: string) -> string | null` exported from `scripts/check-links.mjs`; two CLI gates (`npm run check:budget`, `npm run check:links`) that exit 0 on pass / 1 on fail — consumed by Task 14's `ci.yml` and final gate.

Both scripts are plain Node ESM with zero new dependencies (recursive `fs.readdirSync` walking, hand-rolled glob compilation). Each script guards its CLI body with a `pathToFileURL(process.argv[1])` check so Vitest can import the exported helpers without triggering the CLI.

- [ ] **Step 1: Write the failing unit test for both helpers**

Create `tests/unit/checks.test.mjs` with exactly this content:

```js
import { describe, it, expect } from "vitest";
import { globToRegExp } from "../../scripts/check-budget.mjs";
import { resolveHref } from "../../scripts/check-links.mjs";

describe("globToRegExp", () => {
  it("matches nested paths with **, including zero directories", () => {
    const re = globToRegExp("handbook/**/*.html");
    expect(re.test("handbook/prepare/go-bag/index.html")).toBe(true);
    expect(re.test("handbook/index.html")).toBe(true);
    expect(re.test("handbook/prepare/style.css")).toBe(false);
    expect(re.test("offline/index.html")).toBe(false);
  });

  it("* does not cross directory boundaries", () => {
    const re = globToRegExp("_astro/*.css");
    expect(re.test("_astro/index.CAbc12.css")).toBe(true);
    expect(re.test("_astro/sub/index.css")).toBe(false);
  });

  it("matches everything under a directory with **/*", () => {
    const re = globToRegExp("pagefind/**/*");
    expect(re.test("pagefind/pagefind.js")).toBe(true);
    expect(re.test("pagefind/index/zh_hant_tw.pf_index")).toBe(true);
    expect(re.test("pagefindx/y")).toBe(false);
  });

  it("escapes regex metacharacters (literal dots)", () => {
    const re = globToRegExp("fonts/Cubic_11.woff2");
    expect(re.test("fonts/Cubic_11.woff2")).toBe(true);
    expect(re.test("fonts/Cubic_11xwoff2")).toBe(false);
  });

  it("supports wildcards inside a filename", () => {
    const re = globToRegExp("_astro/press-start-2p-latin-400*.woff2");
    expect(re.test("_astro/press-start-2p-latin-400-normal.BX1abc.woff2")).toBe(true);
    expect(re.test("_astro/press-start-2p-latin-800-normal.BX1abc.woff2")).toBe(false);
  });
});

describe("resolveHref", () => {
  it("maps trailing-slash pages to index.html", () => {
    expect(resolveHref("/handbook/prepare/go-bag/")).toBe("handbook/prepare/go-bag/index.html");
    expect(resolveHref("/")).toBe("index.html");
  });

  it("keeps file paths as-is", () => {
    expect(resolveHref("/icons/px/zap.svg")).toBe("icons/px/zap.svg");
    expect(resolveHref("/brand/mark-dark.png")).toBe("brand/mark-dark.png");
  });

  it("strips query strings and fragments", () => {
    expect(resolveHref("/handbook/mesh/intro/#firmware")).toBe("handbook/mesh/intro/index.html");
    expect(resolveHref("/handbook/?q=mesh")).toBe("handbook/index.html");
  });

  it("decodes percent-encoded paths", () => {
    expect(resolveHref("/handbook-assets/go-bag/%E5%9C%B0%E5%9C%96-1a2b3c4d.png")).toBe(
      "handbook-assets/go-bag/地圖-1a2b3c4d.png"
    );
  });

  it("returns null for anything that is not an internal absolute path", () => {
    expect(resolveHref("#top")).toBe(null);
    expect(resolveHref("mailto:hello@example.org")).toBe(null);
    expect(resolveHref("https://g0v.hackmd.io/abc")).toBe(null);
    expect(resolveHref("http://example.com/")).toBe(null);
    expect(resolveHref("data:image/png;base64,AAAA")).toBe(null);
    expect(resolveHref("tel:119")).toBe(null);
    expect(resolveHref("//cdn.example.com/x.js")).toBe(null);
    expect(resolveHref("relative/page/")).toBe(null);
  });
});
```

- [ ] **Step 2: Run the test — expect a module-resolution failure**

```bash
npx vitest run tests/unit/checks.test.mjs
```

Expected output (failure — the scripts do not exist yet):

```
 FAIL  tests/unit/checks.test.mjs [ tests/unit/checks.test.mjs ]
Error: Failed to load url ../../scripts/check-budget.mjs (resolved id: ../../scripts/check-budget.mjs) in /workspace/digiresi.g0v.tw/tests/unit/checks.test.mjs. Does the file exist?
 Test Files  1 failed (1)
```

- [ ] **Step 3: Implement scripts/check-budget.mjs (helper + CLI)**

Create `scripts/check-budget.mjs` with exactly this content:

```js
// Precache budget gate (spec section 5): expands the shared precache globs
// against dist/ and fails when the total exceeds the 10 MB offline budget.
// An offline kit that cannot finish caching on disaster-day connectivity
// is not resilient.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { precacheGlobs } from "./precache-globs.mjs";

export const BUDGET_BYTES = 10485760; // 10 MB

export function globToRegExp(glob) {
  let source = "";
  let i = 0;
  while (i < glob.length) {
    const ch = glob[i];
    if (ch === "*") {
      if (glob[i + 1] === "*") {
        if (glob[i + 2] === "/") {
          source += "(?:[^/]+/)*"; // "**/" -> zero or more whole path segments
          i += 3;
        } else {
          source += ".*"; // bare "**" -> anything, "/" included
          i += 2;
        }
      } else {
        source += "[^/]*"; // "*" -> anything except "/"
        i += 1;
      }
    } else if ("\\^$.|?+()[]{}".includes(ch)) {
      source += "\\" + ch;
      i += 1;
    } else {
      source += ch;
      i += 1;
    }
  }
  return new RegExp("^" + source + "$");
}

function walk(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, out);
    else if (entry.isFile()) out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

function kib(n) {
  return `${(n / 1024).toFixed(1)} KiB`;
}

function main() {
  const distDir = path.resolve("dist");
  if (!fs.existsSync(distDir)) {
    console.error("check-budget: dist/ not found — run `npm run build` first.");
    process.exitCode = 1;
    return;
  }
  const regexps = precacheGlobs.map(globToRegExp);
  const files = walk(distDir).filter((f) => regexps.some((re) => re.test(f)));

  const byTopDir = new Map();
  let total = 0;
  for (const file of files) {
    const size = fs.statSync(path.join(distDir, file)).size;
    total += size;
    const top = file.includes("/") ? file.slice(0, file.indexOf("/")) + "/" : "(root)";
    const row = byTopDir.get(top) ?? { files: 0, bytes: 0 };
    row.files += 1;
    row.bytes += size;
    byTopDir.set(top, row);
  }

  console.log("PRECACHE BUDGET (dist/)");
  console.log("------------------------------------------------------");
  for (const [top, row] of [...byTopDir.entries()].sort((a, b) => b[1].bytes - a[1].bytes)) {
    console.log(
      `${top.padEnd(26)} ${String(row.files).padStart(4)} files ${kib(row.bytes).padStart(12)}`
    );
  }
  console.log("------------------------------------------------------");
  console.log(`TOTAL ${files.length} files, ${total} bytes (${kib(total)})`);

  if (total > BUDGET_BYTES) {
    console.error(
      `FAIL: precache total ${total} bytes > ${BUDGET_BYTES} (10 MB budget). ` +
        "Trim vendored images under public/handbook-assets/ or drop pages from sync.config.yaml."
    );
    process.exitCode = 1;
  } else {
    console.log(`PASS: precache total ${total} bytes <= ${BUDGET_BYTES}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
```

- [ ] **Step 4: Run the test — globToRegExp passes, check-links still missing**

```bash
npx vitest run tests/unit/checks.test.mjs
```

Expected output (still failing, but now on the second import):

```
 FAIL  tests/unit/checks.test.mjs [ tests/unit/checks.test.mjs ]
Error: Failed to load url ../../scripts/check-links.mjs (resolved id: ../../scripts/check-links.mjs) in /workspace/digiresi.g0v.tw/tests/unit/checks.test.mjs. Does the file exist?
 Test Files  1 failed (1)
```

- [ ] **Step 5: Implement scripts/check-links.mjs (resolver + CLI)**

Create `scripts/check-links.mjs` with exactly this content:

```js
// Internal link gate: walks dist/**/*.html, extracts href/src attribute
// values with a regex, and verifies every internal link (starts with "/",
// not "//") resolves to a file that exists in dist/. Trailing-slash URLs
// resolve to <path>/index.html.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Returns the dist-relative file path a href should resolve to, or null
// when the ref is not an internal absolute path (external URL, fragment,
// mailto:, data:, tel:, protocol-relative, or relative path).
export function resolveHref(href) {
  if (typeof href !== "string" || !href.startsWith("/") || href.startsWith("//")) return null;
  let p = href.split("#")[0].split("?")[0];
  try {
    p = decodeURIComponent(p);
  } catch {
    // malformed percent-escape: keep the raw path; the existence check will flag it
  }
  if (p.endsWith("/")) p += "index.html";
  return p.replace(/^\//, "");
}

function extractRefs(html) {
  const refs = [];
  const re = /\b(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let m;
  while ((m = re.exec(html)) !== null) refs.push(m[1] ?? m[2]);
  return refs;
}

function walk(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, out);
    else if (entry.isFile()) out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

function targetExists(distDir, target) {
  const full = path.join(distDir, target);
  if (!fs.existsSync(full)) return false;
  if (fs.statSync(full).isFile()) return true;
  // Extensionless link to a directory ("/handbook"): GitHub Pages redirects
  // to the trailing-slash URL, so accept it when <dir>/index.html exists.
  return fs.existsSync(path.join(full, "index.html"));
}

function main() {
  const distDir = path.resolve("dist");
  if (!fs.existsSync(distDir)) {
    console.error("check-links: dist/ not found — run `npm run build` first.");
    process.exitCode = 1;
    return;
  }
  const htmlFiles = walk(distDir).filter((f) => f.endsWith(".html"));
  const broken = [];
  let checked = 0;
  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(distDir, file), "utf8");
    for (const ref of extractRefs(html)) {
      const target = resolveHref(ref);
      if (target === null) continue;
      checked += 1;
      if (!targetExists(distDir, target)) broken.push({ file, ref });
    }
  }
  for (const b of broken) console.error(`BROKEN: ${b.ref} (in dist/${b.file})`);
  if (broken.length > 0) {
    console.error(
      `FAIL: ${broken.length} broken internal links out of ${checked} checked in ${htmlFiles.length} HTML files`
    );
    process.exitCode = 1;
  } else {
    console.log(
      `PASS: 0 broken internal links (${checked} internal refs checked across ${htmlFiles.length} HTML files)`
    );
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
```

- [ ] **Step 6: Run the unit test — expect all 10 tests green**

```bash
npx vitest run tests/unit/checks.test.mjs
```

Expected output:

```
 ✓ tests/unit/checks.test.mjs (10 tests)
 Test Files  1 passed (1)
      Tests  10 passed (10)
```

- [ ] **Step 7: Build the site so the CLIs have a real dist/ to check**

```bash
npm run build
```

Expected output ends with the Astro build summary, the vite-pwa service-worker generation and the Pagefind indexing (exact page/entry counts vary with synced content; versions vary too — the `PWA v...` banner prints vite-plugin-pwa's version, and Pagefind is whatever `^1.3.0` resolved to, e.g. 1.5.x — never treat a different version number as a failure):

```
[build] Complete!
PWA v...
mode      generateSW
precache  ... entries (... KiB)
Running Pagefind v1.x
Indexed ... pages
Finished in ... seconds
```

- [ ] **Step 8: Run the budget gate against the real build**

```bash
npm run check:budget
```

Expected output — a per-top-dir table followed by a PASS line (byte counts vary with content; the invariants are the table shape and the final `PASS:` line with total <= 10485760):

```
PRECACHE BUDGET (dist/)
------------------------------------------------------
handbook-assets/             ... files      ... KiB
pagefind/                    ... files      ... KiB
_astro/                      ... files      ... KiB
handbook/                    ... files      ... KiB
fonts/                         1 files      ... KiB
icons/                       ... files      ... KiB
brand/                         4 files      ... KiB
offline/                       1 files      ... KiB
------------------------------------------------------
TOTAL ... files, ... bytes (... KiB)
PASS: precache total ... bytes <= 10485760
```

Exit code must be 0 (`echo $?` prints `0`). If it prints `FAIL: precache total ... > 10485760`, that is a real content problem — do not raise the budget; shrink `public/handbook-assets/` images or the sync manifest.

- [ ] **Step 9: Run the link gate against the real build**

```bash
npm run check:links
```

Expected output:

```
PASS: 0 broken internal links (... internal refs checked across ... HTML files)
```

If any `BROKEN:` lines appear, fix the offending page/component (they name the href and the dist file it appears in) before proceeding.

- [ ] **Step 10: Commit**

```bash
git add scripts/check-budget.mjs scripts/check-links.mjs tests/unit/checks.test.mjs
git commit -m "feat: precache budget and internal link check gates" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

Expected output: `3 files changed` with two `create mode 100644 scripts/...` lines and one `create mode 100644 tests/unit/checks.test.mjs`.

### Task 13: Playwright offline e2e (the product-promise test)

**Files:**
- Create: `playwright.config.ts`
- Create: `vitest.config.mjs`
- Test: `tests/e2e/offline.spec.ts`

**Interfaces:**
- Consumes: the Task 11 service worker (`@vite-pwa/astro` generateSW, `navigateFallback: "/offline/"`, precache globs including `handbook/**/*.html` and `offline/index.html`); the Task 11 offline page copy — the marker string `目前離線` rendered by `src/pages/offline.astro`; the Task 6/7 blackout default (`body` background `var(--bg)` = `#0c0c0b`, no `data-theme` attribute); the synced page `/handbook/prepare/go-bag/` (Tasks 4–5 content + Task 9 route, article `<h1>` = the page title); package.json scripts `"preview"` and `"test:e2e": "playwright test"` (Task 1).
- Produces: `playwright.config.ts` (chromium-only project, preview webServer) and the passing `npm run test:e2e` gate consumed by Task 14's `ci.yml` and final gate; `vitest.config.mjs` that keeps `npm test` scoped to unit tests.

Note on the cache poll: Workbox stores each precached page under its real file URL plus a `?__WB_REVISION__=<hash>` query param (e.g. `/handbook/prepare/go-bag/index.html?__WB_REVISION__=abc`), and only maps the pretty URL at fetch time. The warm-up poll therefore calls `caches.match` with `{ ignoreSearch: true }` on both the pretty URL and the `index.html` form — either being truthy proves the article is precached.

Note on the marker string: `目前離線` is the offline-fallback marker copy from Task 11's `src/pages/offline.astro`. If Task 11's final copy differs, update the single `getByText("目前離線")` locator to the exact string that file renders — nothing else in this task depends on it.

- [ ] **Step 1: Create playwright.config.ts**

Create `playwright.config.ts` with exactly this content:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4321",
  },
  webServer: {
    command: "npm run preview",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

- [ ] **Step 2: Create the offline e2e spec**

Create `tests/e2e/offline.spec.ts` with exactly this content:

```ts
import { test, expect, type Page } from "@playwright/test";

// Warm the offline cache: visit the handbook shell, wait for the service
// worker to activate, then poll until the go-bag article is precached.
// Workbox keys precache entries by file URL + __WB_REVISION__ query param,
// so we match both the pretty URL and the index.html form, ignoring search.
async function warmPrecache(page: Page): Promise<void> {
  await page.goto("/handbook/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(
    async () => {
      const pretty = await caches.match("/handbook/prepare/go-bag/", { ignoreSearch: true });
      const file = await caches.match("/handbook/prepare/go-bag/index.html", {
        ignoreSearch: true,
      });
      return Boolean(pretty || file);
    },
    undefined,
    { timeout: 30_000 }
  );
}

test("handbook article renders fully offline", async ({ page, context }) => {
  await warmPrecache(page);
  await context.setOffline(true);
  await page.goto("/handbook/prepare/go-bag/");
  const h1 = page.locator("h1").first();
  await expect(h1).toBeVisible();
  expect((await h1.innerText()).trim().length).toBeGreaterThan(0);
});

test("uncached portal route falls back to the offline page", async ({ page, context }) => {
  await warmPrecache(page);
  await context.setOffline(true);
  // /schedule/ is portal zone: network-first, never precached, never visited
  // in this context — the service worker must serve the /offline/ fallback.
  await page.goto("/schedule/");
  await expect(page.getByText("目前離線").first()).toBeVisible();
});

test("blackout theme is the default", async ({ page }) => {
  // Fresh context (Playwright default per test): no stored drt-theme, no
  // data-theme attribute — the body must be blackout near-black #0c0c0b.
  await page.goto("/");
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(12, 12, 11)");
});
```

- [ ] **Step 3: Scope Vitest to unit tests**

Vitest's default include pattern (`**/*.{test,spec}.?(c|m)[jt]s?(x)`) would pick up `tests/e2e/offline.spec.ts` and crash `npm test` (Playwright's `test()` refuses to run under another runner). Create `vitest.config.mjs` with exactly this content:

```js
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
  },
});
```

- [ ] **Step 4: Verify test discovery on both runners**

```bash
npx playwright test --list
```

Expected output:

```
Listing tests:
  [chromium] › tests/e2e/offline.spec.ts:24:5 › handbook article renders fully offline
  [chromium] › tests/e2e/offline.spec.ts:32:5 › uncached portal route falls back to the offline page
  [chromium] › tests/e2e/offline.spec.ts:41:5 › blackout theme is the default
Total: 3 tests in 1 file
```

(Line numbers may differ by a line or two; the invariant is exactly 3 tests, all `[chromium]`.)

```bash
npm test
```

Expected output: all unit-test files pass and `offline.spec` appears nowhere in the output:

```
 Test Files  ... passed (...)
      Tests  ... passed (...)
```

- [ ] **Step 5: Build the site for preview**

```bash
npm run build
```

Expected output ends with (versions vary — `PWA v...` prints vite-plugin-pwa's version, Pagefind whatever `^1.3.0` resolved to):

```
[build] Complete!
PWA v...
mode      generateSW
precache  ... entries (... KiB)
Running Pagefind v1.x
Indexed ... pages
Finished in ... seconds
```

- [ ] **Step 6: Install the Playwright chromium binary**

```bash
npx playwright install chromium
```

Expected output: either download progress ending in `Chromium ... downloaded to /home/claude/.cache/ms-playwright/chromium-...`, or no output at all if the browser is already installed. (In CI this is run with `--with-deps`; locally the container already has the system libraries.)

- [ ] **Step 7: Run the e2e suite**

```bash
npm run test:e2e
```

Expected output:

```
Running 3 tests using 1 worker

  ✓  1 [chromium] › tests/e2e/offline.spec.ts:24:5 › handbook article renders fully offline
  ✓  2 [chromium] › tests/e2e/offline.spec.ts:32:5 › uncached portal route falls back to the offline page
  ✓  3 [chromium] › tests/e2e/offline.spec.ts:41:5 › blackout theme is the default

  3 passed (...)
```

If test 1 times out in `warmPrecache`, inspect the generated `dist/sw.js` precache manifest for the `handbook/prepare/go-bag/index.html` entry (it must be there via the `handbook/**/*.html` glob) before touching the test. If test 2 fails, confirm `dist/offline/index.html` exists and contains the offline body copy (`grep -c "目前離線，這一頁還沒被快取" dist/offline/index.html` prints `1` — grep the full body string: the shorter `目前離線` also appears in the page's meta description, so counting that one prints `2` on a healthy build); if Task 11 shipped different copy, update the locator string to match it.

- [ ] **Step 8: Commit**

```bash
git add playwright.config.ts vitest.config.mjs tests/e2e/offline.spec.ts
git commit -m "test: Playwright offline e2e for the handbook promise" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

Expected output: `3 files changed`, with `create mode 100644` lines for all three files.

### Task 14: CI/CD, CNAME, README

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy.yml`
- Create: `.github/workflows/sync.yml`
- Create: `public/CNAME`
- Create: `README.md`
- Create: `LICENSE`
- Test: none (workflows, CNAME, README, and LICENSE are config/docs — verified by the js-yaml parse commands in Steps 1–3, the grep/`head` checks in Steps 4–5, and the full local gate in Step 6)

**Interfaces:**
- Consumes: all package.json scripts (Task 1); `npm run sync` CLI behavior — writes `src/content/handbook/` + `public/handbook-assets/`, exit 1 on any per-page failure (Task 5); the gates `npm run check:budget` / `npm run check:links` (Task 12) and `npm run test:e2e` (Task 13); `js-yaml` devDependency for local workflow validation; `design/IMPORT-NOTES.md` provenance notes.
- Produces: the complete CI (PR gate), deploy (GitHub Pages) and weekly content-sync (review PR) pipelines; the custom-domain `public/CNAME`; the project `README.md` and MIT `LICENSE`. Nothing downstream — this is the final task.

- [ ] **Step 1: Create the PR gate workflow**

Create `.github/workflows/ci.yml` with exactly this content:

```yaml
name: CI

on:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run check
      - run: npm run build
      - run: npm run check:budget
      - run: npm run check:links
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

(`npm run check` = `astro check`, satisfying spec §8's "astro check + full build on every PR". `astro check` runs `astro sync` internally in Astro 5, so no separate sync step is needed before it.)

Validate it parses:

```bash
node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/ci.yml','utf8')); console.log('ci.yml: valid YAML')"
```

Expected output: `ci.yml: valid YAML` (exit code 0).

- [ ] **Step 2: Create the GitHub Pages deploy workflow**

Create `.github/workflows/deploy.yml` with exactly this content:

```yaml
name: Deploy

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Validate it parses:

```bash
node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/deploy.yml','utf8')); console.log('deploy.yml: valid YAML')"
```

Expected output: `deploy.yml: valid YAML` (exit code 0).

- [ ] **Step 3: Create the weekly content-sync workflow**

Create `.github/workflows/sync.yml` with exactly this content:

```yaml
name: Content sync

on:
  schedule:
    # Friday 21:00 UTC = Saturday 05:00 Asia/Taipei
    - cron: "0 21 * * 5"
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run sync
      - uses: peter-evans/create-pull-request@v7
        with:
          branch: content-sync
          delete-branch: true
          commit-message: |
            content: weekly HackMD sync

            Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
          title: "content: weekly HackMD sync"
          body: |
            每週自動同步：g0v-data/g0v-hackmd-archive → src/content/handbook/。

            **合併前必須人工審核。** HackMD 共筆任何人皆可編輯；
            這個 PR 的 diff 就是安全審核點——請確認內容變更合理、
            沒有惡意連結或被竄改的段落，再行合併。

            同步腳本：scripts/sync-content.mjs（manifest：sync.config.yaml）。
            同步失敗時此 workflow 直接失敗、不會開 PR，也不影響已部署網站。
```

Notes for the implementer: `npm run sync` exits 1 when any page fails, so the PR step never runs on a broken sync (spec section 4 error-handling requirement); `peter-evans/create-pull-request@v7` commits every working-tree change (`src/content/handbook/**` and `public/handbook-assets/**`) and silently creates no PR when the sync produced no diff.

Validate it parses:

```bash
node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/sync.yml','utf8')); console.log('sync.yml: valid YAML')"
```

Expected output: `sync.yml: valid YAML` (exit code 0).

- [ ] **Step 4: Create public/CNAME**

Create `public/CNAME` with exactly this content (single line):

```
digiresi.g0v.tw
```

Verify — Astro copies `public/` verbatim, so after the next build the file must sit at the dist root:

```bash
cat public/CNAME
```

Expected output: `digiresi.g0v.tw`

- [ ] **Step 5: Create README.md and LICENSE**

Create `README.md` with exactly this content:

```markdown
# digiresi.g0v.tw — 數位韌性手冊 × DigiResiThon

g0v 數位韌性松（DigiResiThon）社群網站與離線手冊。

斷網、斷纜、停電的時候，**離線也能查手冊**：手冊區（`/handbook/`）是可安裝的
PWA，第一次造訪就會把全部手冊頁面、圖片與搜尋索引預快取到裝置上（預算上限
10 MB，CI 強制檢查），之後不需要任何網路連線也能閱讀與搜尋。入口網站區
（首頁、時程）維持 online-first；離線時未快取的頁面會導向 `/offline/` 說明頁。

- 線上網址：https://digiresi.g0v.tw
- 社群大全（HackMD 主文件）：https://g0v.hackmd.io/mGQcbKRDShmvyeGV74w_0w
- 內容來源：g0v 社群 HackMD 共筆，經 [g0v-data/g0v-hackmd-archive](https://github.com/g0v-data/g0v-hackmd-archive) 鏡像同步

## 設計系統

視覺設計以 `design/` 目錄裡的 **DigiResiTh0n Design System** 為準——由
Claude Design 專案唯讀匯入（匯入紀錄與缺漏清單見 `design/IMPORT-NOTES.md`）。

- `design/readme.md` — 設計聖經：主題（blackout 深色為預設）、雙強調色紀律、
  像素字級階、動態、語氣、zero rule 等硬性規則
- `design/tokens/*.css` — design token 來源（已移植到 `src/styles/`）
- `design/ui_kits/website/` — 網站版型的重建目標
- `design/` 為唯讀參考，請勿直接修改；網站程式碼一律使用移植後的
  semantic tokens（`--bg`、`--ink`、`--accent`⋯），不得引用原始色票

## 開發指令

需求：Node.js >= 22、npm。

| 指令 | 說明 |
|---|---|
| `npm install` | 安裝相依套件 |
| `npm run dev` | 本機開發伺服器（http://localhost:4321） |
| `npm run build` | 建置靜態網站到 `dist/`，並建立 Pagefind 搜尋索引 |
| `npm run preview` | 預覽 `dist/` 建置結果 |
| `npm run sync` | 從 HackMD 封存庫同步手冊內容（寫入 `src/content/handbook/`） |
| `npm run assets` | 一次性抓取 Cubic 11 字型、pixelarticons 圖示、logo（產物已 commit，平常不需重跑） |
| `npm run icons` | 由 `design/assets/logo/mark-dark.png` 產生 PWA icons（`public/icons/`） |
| `npm test` | Vitest 單元測試（同步管線的轉換函式） |
| `npm run test:e2e` | Playwright 離線 e2e（產品承諾測試：斷網後手冊仍可讀） |
| `npm run check:budget` | 檢查離線預快取總量 <= 10 MB |
| `npm run check:links` | 檢查 `dist/` 內部連結沒有斷鏈 |
| `npm run check` | `astro check` |

## 內容同步機制

手冊內容的編輯主場仍然是 HackMD，本 repo 只保存**審核過的快照**。

- `sync.config.yaml` 是手冊頁面清單（curation manifest）：每頁一筆，
  記錄 HackMD note ID → 站內 slug、section
  （prepare / respond / mesh / scenarios / selfhost）、order、title。
- **新增一頁手冊**：在 `sync.config.yaml` 加一筆 entry，執行
  `npm run sync`，再 commit 產出的 `src/content/handbook/<section>/<page>.md`
  與 `public/handbook-assets/<slug>/` 圖片。
- `scripts/sync-content.mjs` 逐頁執行：抓取 raw markdown → 清除 HackMD
  語法（frontmatter、tags、`:::` 容器轉 callout）→ 改寫站內／站外連結 →
  **圖片全部 vendor 進 repo**（離線頁面不依賴外部圖床）→ 產生 frontmatter。
  任何一頁失敗都會列入摘要並以非零狀態結束；寫入採原子性（temp 目錄 →
  rename），不會留下半更新的頁面。
- **每週自動同步**：`.github/workflows/sync.yml` 於每週五 21:00 UTC
  （台北時間週六 05:00）執行同步並開 PR（branch `content-sync`）。
- **安全考量**：HackMD 共筆任何人都能編輯。所有內容變更必須經過 PR 人工
  審核才會出現在 digiresi.g0v.tw 這個掛在 g0v 網域下的網站上；排程同步
  失敗時不會開 PR，也不影響已部署的網站。

## 部署

- push 到 `main` 後由 `.github/workflows/deploy.yml` 建置並部署到
  GitHub Pages（自訂網域來自 `public/CNAME` = `digiresi.g0v.tw`）。
- 每個 PR 由 `.github/workflows/ci.yml` 執行完整檢查：單元測試、建置、
  預快取預算、內部連結、離線 e2e。
- **一次性 DNS 設定**：向 g0v 網域 repo 開 PR，把 `digiresi.g0v.tw`
  指向 GitHub Pages：https://github.com/g0v/domain

## 授權

- 手冊與網站內容：[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.zh_TW)
  （沿用 g0v 社群慣例；內容源自 HackMD 共筆）
- 程式碼：MIT（見 [LICENSE](LICENSE)）
```

Then create `LICENSE` at the repo root with exactly this content — the README's 授權 section must not claim a license the repo does not carry:

```
MIT License

Copyright (c) 2026 g0v community contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Verify: `head -3 LICENSE` prints `MIT License`, a blank line, then `Copyright (c) 2026 g0v community contributors`.

Verify the key promises landed:

```bash
grep -c "離線也能查手冊" README.md && grep -c "IMPORT-NOTES" README.md && grep -c "github.com/g0v/domain" README.md
```

Expected output:

```
1
1
1
```

- [ ] **Step 6: Run the full local gate**

This is the same sequence CI runs on every PR — everything must be green before the final commit:

```bash
npm test && npm run check && npm run build && npm run check:budget && npm run check:links && npm run test:e2e
```

Expected output, in order:

1. Vitest: `Test Files  ... passed` / `Tests  ... passed` (no failures, no `offline.spec` in the list)
2. astro check: `Result (N files):` with `0 errors`, `0 warnings`, `0 hints`
3. Astro build: `[build] Complete!` then `PWA v... ... precache ... entries` then `Running Pagefind v1.x ... Indexed ... pages`
4. Budget gate: the per-top-dir table ending in `PASS: precache total ... bytes <= 10485760`
5. Link gate: `PASS: 0 broken internal links (...)`
6. Playwright: `3 passed`

Overall exit code 0 (`echo $?` prints `0`). Any red here is a defect in an earlier task — fix it there, do not weaken a gate.

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/ci.yml .github/workflows/deploy.yml .github/workflows/sync.yml public/CNAME README.md LICENSE
git commit -m "chore: CI/CD workflows, CNAME, README and LICENSE" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

Expected output: `6 files changed`, with `create mode 100644` lines for the three workflows, `public/CNAME`, `README.md` and `LICENSE`.

Post-merge operational notes (no code): after the first successful deploy, enable GitHub Pages with source "GitHub Actions" in the repo settings if not already active, then open the one-time DNS PR at https://github.com/g0v/domain pointing `digiresi.g0v.tw` at GitHub Pages (spec section 9 / section 12).
