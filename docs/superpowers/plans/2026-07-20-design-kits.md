# Design-kits Guideline Pages + ui_kits/website Port — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a self-hosted /design-kits/ reference route on digiresi.g0v.tw, add YellowOne CC BY-SA 4.0 attribution for the logo/logotype, and complete the ui_kits/website port (Projects route, theme toggle, Register dialog wiring).

**Architecture:** Astro static routes for /design-kits/** and /projects/, live-composed from the existing src/components/*.astro so specimens render with the same code as production. Design pack (`design/`) stays as read-only reference tree refreshed via DesignSync MCP; rendering moves to Astro so the pack is reusable outside Claude Design. Dark ("blackout") remains default; a persistent theme toggle stamps `data-theme` on <html> with a no-flash inline init.

**Tech Stack:** Astro 5, vite-plugin-pwa, Pagefind, Playwright, Vitest, YAML for sample project data, DesignSync MCP (claude_design) for the source-of-truth refresh.

## Global Constraints

- Node >= 22; existing toolchain unchanged
- Dark ("blackout") is default; light via `data-theme="light"` on `<html>`
- Semantic tokens only in components (`--bg`, `--surface`, `--ink`, `--ink-2`, `--ink-3`, `--accent`, `--accent-2`, `--line`, `--border`, `--border-soft`, `--px-1`, `--px-2`, `--sp-*`, `--text-xs/sm/base`, `--tracking-label`, `--scanlines`) — never raw palette values
- `radius: 0` everywhere; 2px structural borders
- No emoji anywhere in output (use Unicode geometry / box-drawing)
- Logo & logotype attribution: `© YellowOne, CC BY-SA 4.0` (plain text, no URL yet — leave a TODO grep-marker `TODO(yellowone-url)`)
- EN copy on `/design-kits/**`; zh-TW everywhere else (site chrome untouched)
- `/design-kits/**` and `/projects/` MUST be excluded from PWA precache AND from Pagefind index; 10 MB precache budget enforced by `npm run check:budget`
- Codex-primary edit policy: every file write is delegated via `codex:codex-rescue` subagent (fallback: `general-purpose`), NEVER edited by the main agent directly. Executor must follow this per-task.
- Frequent commits: every task ends with `git add <paths>` + `git commit -m "..."` shown verbatim

---

### Task 1: DesignSync refresh from Claude Design

**Files:**
- Modify: `design/ui_kits/website/Website.jsx`
- Modify: `design/ui_kits/website/Landing.jsx`
- Modify: `design/ui_kits/website/Projects.jsx`
- Modify: `design/ui_kits/website/Shared.jsx`
- Modify: `design/IMPORT-NOTES.md`

**Interfaces:**
- Consumes: nothing (reads from DesignSync MCP)
- Produces: up-to-date `design/ui_kits/website/*.jsx` files and a dated entry in `design/IMPORT-NOTES.md` that later tasks reference for audit

- [ ] **Step 1: Invoke DesignSync — get_project**

  In your agent tool call, invoke the `claude_design` MCP tool with:
  ```
  tool: claude_design / get_project
  args: { "project_id": "0fdea157-882d-4628-8b39-a15b29bb8d77" }
  ```
  Expected: project metadata returned (name, file count). If the tool returns an error or is unavailable, STOP and surface the error to the user — do not proceed with stale files.

- [ ] **Step 2: Invoke DesignSync — list_files**

  ```
  tool: claude_design / list_files
  args: { "project_id": "0fdea157-882d-4628-8b39-a15b29bb8d77" }
  ```
  Expected: file listing that includes at minimum `ui_kits/website/Website.jsx`, `ui_kits/website/Landing.jsx`, `ui_kits/website/Projects.jsx`, `ui_kits/website/Shared.jsx`. Note the exact paths returned — use them verbatim in Step 3.

- [ ] **Step 3: Invoke DesignSync — get_file for each website path**

  For each of the four files from Step 2, invoke:
  ```
  tool: claude_design / get_file
  args: { "project_id": "0fdea157-882d-4628-8b39-a15b29bb8d77", "file_path": "<exact path from list_files>" }
  ```
  After each `get_file` response:
  - Check the response is non-empty (> 0 bytes). If any file returns 0 bytes or an error, STOP immediately and surface the issue to the user.
  - Write the returned content to the corresponding local path under `design/` (e.g., `design/ui_kits/website/Website.jsx`). Overwrite in place.

- [ ] **Step 4: Append dated import entry to `design/IMPORT-NOTES.md`**

  The current `design/IMPORT-NOTES.md` ends with the 2026-07-17 section. Append the following block (with a blank line before it):

  ```markdown

  ## Re-import 2026-07-20

  Re-imported from Claude Design project `0fdea157-882d-4628-8b39-a15b29bb8d77`
  via DesignSync MCP. Paths refreshed: `ui_kits/website/Website.jsx`,
  `ui_kits/website/Landing.jsx`, `ui_kits/website/Projects.jsx`,
  `ui_kits/website/Shared.jsx`.

  `design/assets/logo/LICENSE.md` is a locally-added sibling file — NOT part of
  the upstream design pack. DesignSync does not write to `assets/logo/`, so it
  survives re-imports.
  ```

- [ ] **Step 5: Verify no build breakage**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run check
  ```
  Expected: exits 0, `0 errors`.

- [ ] **Step 6: Commit**

  ```bash
  git add design/ui_kits/website/Website.jsx design/ui_kits/website/Landing.jsx design/ui_kits/website/Projects.jsx design/ui_kits/website/Shared.jsx design/IMPORT-NOTES.md
  git commit -m "refactor(design): refresh ui_kits/website from Claude Design"
  ```

---

### Task 2: YellowOne attribution + license split

**Files:**
- Create: `design/assets/logo/LICENSE.md`
- Modify: `README.md`
- Modify: `src/components/SiteFooter.astro`
- Create: `tests/e2e/attribution.spec.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `design/assets/logo/LICENSE.md` — referenced in Task 8's logo page
  - `"LOGO © YELLOWONE"` text in footer — asserted by `attribution.spec.ts`; Task 9 (logo page) also references this wording

- [ ] **Step 1: Create `design/assets/logo/LICENSE.md`**

  Write the file at `/Users/cheng/digiresi.g0v.tw/design/assets/logo/LICENSE.md` with exactly this content:

  ```markdown
  # Logo & Logotype License

  Logo mark, wordmark, and lockup © YellowOne.

  Licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0):
  https://creativecommons.org/licenses/by-sa/4.0/

  Source: DigiResiTh0n Design System (Claude Design project). Locally-added
  sibling to the imported logo assets — not part of the upstream design pack.

  TODO(yellowone-url): link to YellowOne's canonical profile page when available.
  ```

- [ ] **Step 2: Update `README.md` — replace single-bullet licensing with three bullets**

  The current `README.md` (lines 76-79) has:
  ```markdown
  ## 授權

  - 手冊與網站內容：[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.zh_TW)
    （沿用 g0v 社群慣例；內容源自 HackMD 共筆）
  - 程式碼：MIT（見 [LICENSE](LICENSE)）
  ```

  Replace that entire section with:
  ```markdown
  ## 授權

  - **程式碼**：MIT（見 [LICENSE](LICENSE)）
  - **手冊與網站內容**：[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.zh_TW)
    （沿用 g0v 社群慣例；內容源自 HackMD 共筆）
  - **Logo & logotype**：© YellowOne，[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
    （TODO(yellowone-url): 待補 YellowOne 官方頁面連結）
  ```

- [ ] **Step 3: Update `src/components/SiteFooter.astro` — add attribution line**

  In `SiteFooter.astro`, find the `.lines` `<div>` which currently ends with:
  ```html
      NOBODY OWNS THIS. THAT MEANS YOU DO.
    </div>
  ```

  Replace it with (add a `<br />` and the attribution line):
  ```html
      NOBODY OWNS THIS. THAT MEANS YOU DO.<br />
      LOGO &copy; YELLOWONE &middot; CC BY-SA 4.0
    </div>
  ```

- [ ] **Step 4: Write the failing Playwright test**

  Create `tests/e2e/attribution.spec.ts`:
  ```typescript
  import { test, expect } from "@playwright/test";

  test("YellowOne attribution visible in footer on home page", async ({ page }) => {
    await page.goto("");
    const footer = page.locator(".site-footer");
    await expect(footer).toBeVisible();
    await expect(footer.getByText("LOGO © YELLOWONE · CC BY-SA 4.0")).toBeVisible();
  });
  ```

- [ ] **Step 5: Build and run the attribution test**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run build && npx playwright test tests/e2e/attribution.spec.ts
  ```
  Expected: `1 passed`.

- [ ] **Step 6: Commit**

  ```bash
  git add design/assets/logo/LICENSE.md README.md src/components/SiteFooter.astro tests/e2e/attribution.spec.ts
  git commit -m "docs(license): attribute logo/logotype to YellowOne (CC BY-SA 4.0)"
  ```

---

### Task 3: ThemeToggle component + migrate localStorage key

**Files:**
- Create: `src/components/ThemeToggle.astro`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/components/SiteHeader.astro`
- Create: `tests/e2e/theme-toggle.spec.ts`

**Interfaces:**
- Consumes: `src/components/Px.astro` (already exists — takes `name: string`, `size?: number`)
- Produces:
  - `ThemeToggle.astro` component — imported by `SiteHeader.astro` (Task 4 does not touch this)
  - localStorage key `"digiresi:theme"` (replaces old `"drt-theme"`) — BaseLayout reads this key; ThemeToggle writes it

**Note on existing state:** `SiteHeader.astro` currently has the theme toggle button inline (lines 35–38) and a `<script>` using `localStorage.setItem("drt-theme", ...)`. `BaseLayout.astro` has a no-flash `<script is:inline>` using `localStorage.getItem("drt-theme")`. This task extracts the toggle into a component and migrates the key to `"digiresi:theme"` in both places. Old `"drt-theme"` entries in visitors' localStorage will be ignored (dark becomes default on first visit after deploy — one-time acceptable regression).

- [ ] **Step 1: Create `src/components/ThemeToggle.astro`**

  Write the full file:
  ```astro
  ---
  import Px from "./Px.astro";
  ---
  <button id="theme-toggle" type="button" aria-label="Toggle theme" title="blackout / paper">
    <span class="tt-sun"><Px name="sun" size={16} /></span>
    <span class="tt-moon"><Px name="moon" size={16} /></span>
  </button>
  <style>
    button {
      background: transparent;
      border: 2px solid var(--line);
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
      flex: none;
    }
    button:focus-visible {
      outline: var(--focus-ring);
      outline-offset: var(--focus-offset);
    }
    .tt-moon { display: none; }
    :global(html[data-theme="light"]) .tt-sun { display: none; }
    :global(html[data-theme="light"]) .tt-moon { display: flex; }
  </style>
  <script>
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
        localStorage.setItem("digiresi:theme", toLight ? "light" : "dark");
      } catch {
        /* storage unavailable — toggle still works for this page view */
      }
    });
  </script>
  ```

- [ ] **Step 2: Update `BaseLayout.astro` — change localStorage key from `drt-theme` to `digiresi:theme`**

  Find the existing `<script is:inline>` block in `src/layouts/BaseLayout.astro` (currently reads `localStorage.getItem("drt-theme")`). Replace it with:
  ```html
      <script is:inline>
        // Blocking theme init — must run before first paint.
        // Dark ("blackout") is the default (no attribute). Light ONLY when the
        // visitor chose it via the nav toggle. No prefers-color-scheme switch.
        (function () {
          try {
            if (localStorage.getItem("digiresi:theme") === "light") {
              document.documentElement.setAttribute("data-theme", "light");
            }
          } catch (e) {
            /* storage disabled: stay dark */
          }
        })();
      </script>
  ```

- [ ] **Step 3: Update `SiteHeader.astro` — replace inline toggle with `<ThemeToggle />`**

  In `src/components/SiteHeader.astro`, make three edits:

  **3a — frontmatter:** remove `import Px from "./Px.astro";`, add `import ThemeToggle from "./ThemeToggle.astro";`. The top of the frontmatter block becomes:
  ```astro
  ---
  import ThemeToggle from "./ThemeToggle.astro";
  import RegisterDialog from "./RegisterDialog.astro";
  import StatusDot from "./StatusDot.astro";
  import { withBase } from "../lib/base";
  ```

  **3b — template:** replace the inline `<button id="theme-toggle">...</button>` block (which spans four lines with `<span class="only-dark ticon">` children) with a single tag:
  ```astro
    <ThemeToggle />
  ```
  Leave `<StatusDot status="online" label="ONLINE" />` and the Register `<button>` in place.

  **3c — remove the inline `<script>` block entirely.** The entire `<script>` block from SiteHeader (which calls `document.getElementById("theme-toggle")` and reads `drt-theme`) is now in ThemeToggle.astro. Delete it from SiteHeader.astro.

  **3d — remove `#theme-toggle` and `.ticon` from `<style>`.** Delete these two rule blocks:
  ```css
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
  ```
  Keep all `.only-light` / `.only-dark` rules — those are still needed for the brand logo images.

- [ ] **Step 4: Write the failing Playwright test**

  Create `tests/e2e/theme-toggle.spec.ts`:
  ```typescript
  import { test, expect } from "@playwright/test";

  test("theme toggle switches to light and persists across reload", async ({ page }) => {
    await page.goto("");
    // Default is dark — no data-theme attribute
    let theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    expect(theme).toBeNull();

    // Click toggle
    await page.click("#theme-toggle");
    theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    expect(theme).toBe("light");

    // Reload — no-flash init should restore light theme
    await page.reload();
    theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    expect(theme).toBe("light");

    // Click toggle again — back to dark
    await page.click("#theme-toggle");
    theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    expect(theme).toBeNull();
  });
  ```

- [ ] **Step 5: Run type check**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run check
  ```
  Expected: exits 0, `0 errors`.

- [ ] **Step 6: Build and run the theme toggle test**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run build && npx playwright test tests/e2e/theme-toggle.spec.ts
  ```
  Expected: `1 passed`.

- [ ] **Step 7: Commit**

  ```bash
  git add src/components/ThemeToggle.astro src/layouts/BaseLayout.astro src/components/SiteHeader.astro tests/e2e/theme-toggle.spec.ts
  git commit -m "feat(theme): add persistent dark/light toggle with no-flash init"
  ```

---

### Task 4: Extend SiteHeader nav (PROJECTS, DESIGN)

**Files:**
- Modify: `src/components/SiteHeader.astro`

**Interfaces:**
- Consumes: `withBase` from `../lib/base` (already imported in SiteHeader)
- Produces: nav entries `/projects/` and `/design-kits/` — asserted by Task 6 e2e (PROJECTS link reachable) and Tasks 9–15 (DESIGN link reachable)

- [ ] **Step 1: Add PROJECTS and DESIGN nav entries to `SiteHeader.astro`**

  In `src/components/SiteHeader.astro`, find the `nav` array (currently three entries). Replace it with:
  ```ts
  const nav = [
    { href: withBase("/"), label: "首頁 HOME" },
    { href: withBase("/schedule/"), label: "時程 SCHEDULE" },
    { href: withBase("/handbook/"), label: "手冊 HANDBOOK" },
    { href: withBase("/projects/"), label: "PROJECTS" },
    { href: withBase("/design-kits/"), label: "DESIGN" },
  ];
  ```
  The existing `isActive` function already handles startsWith correctly for all new paths — no change needed there.

- [ ] **Step 2: Type-check**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run check
  ```
  Expected: exits 0, `0 errors`.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/SiteHeader.astro
  git commit -m "feat(nav): add PROJECTS and DESIGN entries to site header"
  ```

---

### Task 5: Tabs.astro component

**Files:**
- Create: `src/components/Tabs.astro`

**Interfaces:**
- Consumes: nothing (self-contained)
- Produces:
  - `Tabs` component with props `active: string`, `items: { id: string; label: string; count?: number }[]`
  - Dispatches `CustomEvent<{ id: string }>` named `"tab:change"` (bubbles: true) from the `.tabs` root element on click
  - Applies `.tab-active` class and `aria-selected="true"` on the active button — asserted by `projects.spec.ts` in Task 6

- [ ] **Step 1: Create `src/components/Tabs.astro`**

  Write the full file:
  ```astro
  ---
  interface Props {
    active: string;
    items: { id: string; label: string; count?: number }[];
  }
  const { active, items } = Astro.props;
  ---
  <div class="tabs" role="tablist">
    {items.map((it, i) => (
      <button
        role="tab"
        aria-selected={active === it.id ? "true" : "false"}
        data-tab-id={it.id}
        class:list={["tab-btn", { "tab-active": active === it.id }]}
        style={`margin-left:${i === 0 ? 0 : -2}px;`}
        type="button"
      >
        {it.label}
        {it.count != null && <span class="tab-count">{it.count}</span>}
      </button>
    ))}
  </div>
  <style>
    .tabs {
      display: flex;
    }
    .tab-btn {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      font-weight: 600;
      letter-spacing: var(--tracking-label);
      text-transform: uppercase;
      padding: 9px 18px;
      cursor: pointer;
      line-height: 1.4;
      border: 2px solid var(--line);
      background: var(--surface);
      color: var(--ink);
      position: relative;
      z-index: 0;
      transition: all var(--dur-1) var(--ease-step-2);
      border-radius: var(--radius);
    }
    .tab-btn:hover {
      background: var(--surface-sunken);
    }
    .tab-active {
      background: var(--ink);
      color: var(--ink-on-ink);
      z-index: 1;
    }
    .tab-active:hover {
      background: var(--ink);
      color: var(--ink-on-ink);
    }
    .tab-count {
      margin-left: var(--sp-2);
      color: var(--accent);
    }
    .tab-active .tab-count {
      color: var(--ink-on-ink);
    }
    .tab-btn:focus-visible {
      outline: var(--focus-ring);
      outline-offset: var(--focus-offset);
    }
  </style>
  <script>
    for (const tablist of document.querySelectorAll<HTMLElement>(".tabs")) {
      tablist.addEventListener("click", (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-tab-id]");
        if (!btn) return;
        const id = btn.dataset.tabId!;
        // Update visual state within this tablist
        for (const b of tablist.querySelectorAll<HTMLElement>("[data-tab-id]")) {
          const isActive = b.dataset.tabId === id;
          b.setAttribute("aria-selected", String(isActive));
          b.classList.toggle("tab-active", isActive);
        }
        // Notify parent components
        tablist.dispatchEvent(
          new CustomEvent<{ id: string }>("tab:change", { bubbles: true, detail: { id } })
        );
      });
    }
  </script>
  ```

- [ ] **Step 2: Type-check**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run check
  ```
  Expected: exits 0, `0 errors`.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/Tabs.astro
  git commit -m "feat(ui): port Tabs component from design canvas"
  ```

---

### Task 6: Projects sample data + Projects.astro + /projects/ route

**Files:**
- Create: `src/data/projects.yaml`
- Create: `src/components/Projects.astro`
- Create: `src/pages/projects.astro`
- Create: `tests/e2e/projects.spec.ts`

**Interfaces:**
- Consumes:
  - `Tabs` component from Task 5 (`active: string`, `items: ...`, emits `tab:change` CustomEvent)
  - `SectionHeader` component (`label: string`, `right?: string`) — already in `src/components/SectionHeader.astro`
  - `SignalBars` component (`level?: number`, `height?: number`) — already in `src/components/SignalBars.astro`
  - `js-yaml` and `@types/js-yaml` — already in `package.json`
  - `BaseLayout` layout (`title: string`, `description?: string`, `lang?: string`)
- Produces:
  - `/projects/` route serving a 200 with `SAMPLE DATA` text visible
  - `Projects.astro` component used by `src/pages/projects.astro` and later by `src/pages/design-kits/website.astro` (Task 15)

- [ ] **Step 1: Create `src/data/projects.yaml`**

  Write the full file at `/Users/cheng/digiresi.g0v.tw/src/data/projects.yaml`:
  ```yaml
  projects:
    - name: MESHBOX
      track: comms
      tag: COMMS
      sync: 4
      people: 12
      desc: "Solar-powered mesh node in a lunchbox. Flooding-resistant firmware, 2km hops."
    - name: PAPERSYNC
      track: civic
      tag: CIVIC
      sync: 3
      people: 7
      desc: "QR-batched forms that reconcile with the database when power returns."
    - name: MIRROR-MIRROR
      track: data
      tag: DATA
      sync: 4
      people: 5
      desc: "One-command community mirrors for critical repos and docs, rsync over anything."
    - name: RUMOR TRIAGE
      track: info
      tag: INFO
      sync: 2
      people: 9
      desc: "Low-bandwidth verification queue for emergency info, SMS-first."
    - name: SHELTERMAP
      track: civic
      tag: CIVIC
      sync: 3
      people: 11
      desc: "Offline-cached shelter map with bluetooth sync between devices."
    - name: HAMBRIDGE
      track: comms
      tag: COMMS
      sync: 1
      people: 4
      desc: "Packet-radio gateway that speaks boring, reliable 1980s protocols."
  ```

- [ ] **Step 2: Create `src/components/Projects.astro`**

  Write the full file:
  ```astro
  ---
  import { readFileSync } from "node:fs";
  import yaml from "js-yaml";
  import SectionHeader from "./SectionHeader.astro";
  import SignalBars from "./SignalBars.astro";
  import Tabs from "./Tabs.astro";

  interface Project {
    name: string;
    track: string;
    tag: string;
    sync: number;
    people: number;
    desc: string;
  }

  const raw = readFileSync(new URL("../data/projects.yaml", import.meta.url), "utf8");
  const { projects } = yaml.load(raw) as { projects: Project[] };

  const tabs = [
    { id: "all", label: "All", count: projects.length },
    { id: "comms", label: "Comms" },
    { id: "data", label: "Data" },
    { id: "info", label: "Info" },
    { id: "civic", label: "Civic" },
  ];
  ---
  <div class="projects-wrap container" data-pagefind-ignore="all">
    <SectionHeader label="PROJECTS" right="SAMPLE DATA · YEAR 0" />
    <div class="projects-toolbar">
      <Tabs active="all" items={tabs} />
      <label class="search-wrap">
        <span class="search-prefix t-dim">$</span>
        <input
          id="projects-search"
          type="search"
          placeholder="grep projects..."
          aria-label="Search projects"
          autocomplete="off"
          class="search-input"
        />
      </label>
    </div>
    <div class="projects-grid" id="projects-grid">
      {projects.map((p) => (
        <div
          class="card card-lifted proj-card"
          data-track={p.track}
          data-name={p.name.toLowerCase()}
        >
          <div class="card-head">
            <span class="card-title">{p.name}</span>
            <span class="badge">{p.tag}</span>
          </div>
          <div class="card-body">{p.desc}</div>
          <div class="card-foot">
            <span>{p.people} people</span>
            <span class="sync-cell">SYNC <SignalBars level={p.sync} height={14} /></span>
          </div>
        </div>
      ))}
      <div
        class="card card-offline proj-card"
        data-track="__always"
        data-name="your idea"
      >
        <div class="card-head">
          <span class="card-title">YOUR IDEA</span>
          <span class="card-meta">EMPTY SLOT</span>
        </div>
        <div class="card-body">
          This slot is intentionally empty. Don't ask why nobody built it yet.
        </div>
        <div class="card-foot">
          <span>0 people</span>
          <span>→ pitch it</span>
        </div>
      </div>
    </div>
  </div>
  <style>
    .projects-wrap {
      padding-block: var(--sp-7) var(--sp-8);
    }
    .projects-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: var(--sp-4);
      margin-top: var(--sp-5);
      flex-wrap: wrap;
    }
    .search-wrap {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
      border: var(--border);
      background: var(--surface);
      padding: 6px 12px;
      width: 260px;
      box-sizing: border-box;
      cursor: text;
    }
    .search-prefix {
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      flex: none;
    }
    .search-input {
      background: transparent;
      border: none;
      outline: none;
      color: var(--ink);
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      flex: 1;
      min-width: 0;
    }
    .search-input::placeholder { color: var(--ink-3); }
    .projects-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--sp-4);
      margin-top: var(--sp-5);
    }
    .proj-card[data-hidden] { display: none; }
    .sync-cell {
      display: inline-flex;
      align-items: center;
      gap: var(--sp-2);
    }
    @media (max-width: 768px) {
      .projects-grid { grid-template-columns: 1fr; }
    }
  </style>
  <script>
    const grid = document.getElementById("projects-grid");
    const searchInput = document.getElementById("projects-search") as HTMLInputElement | null;
    let currentTab = "all";

    function filterProjects(): void {
      if (!grid) return;
      const q = searchInput?.value.toLowerCase() ?? "";
      for (const card of grid.querySelectorAll<HTMLElement>(".proj-card")) {
        const track = card.dataset.track ?? "";
        const name = card.dataset.name ?? "";
        const tabMatch =
          currentTab === "all" || track === currentTab || track === "__always";
        const searchMatch = q === "" || name.includes(q) || track === "__always";
        card.toggleAttribute("data-hidden", !(tabMatch && searchMatch));
      }
    }

    searchInput?.addEventListener("input", filterProjects);

    document.querySelector(".projects-wrap")?.addEventListener("tab:change", (e) => {
      currentTab = (e as CustomEvent<{ id: string }>).detail.id;
      filterProjects();
    });
  </script>
  ```

- [ ] **Step 3: Create `src/pages/projects.astro`**

  Write the full file:
  ```astro
  ---
  import BaseLayout from "../layouts/BaseLayout.astro";
  import Projects from "../components/Projects.astro";
  ---
  <BaseLayout
    title="Projects — DigiResiThon"
    description="Sample projects from DigiResiThon Year 0."
    lang="en"
  >
    <Projects />
  </BaseLayout>
  ```

- [ ] **Step 4: Write the failing Playwright tests**

  Create `tests/e2e/projects.spec.ts`:
  ```typescript
  import { test, expect } from "@playwright/test";

  test("projects page returns 200 and shows SAMPLE DATA badge", async ({ page }) => {
    const response = await page.goto("projects/");
    expect(response?.status()).toBe(200);
    await expect(page.getByText("SAMPLE DATA · YEAR 0")).toBeVisible();
    await expect(page.getByText("MESHBOX")).toBeVisible();
  });

  test("projects tab filter shows only matching track", async ({ page }) => {
    await page.goto("projects/");
    // Click Comms tab
    await page.click("[data-tab-id='comms']");
    // MESHBOX is comms — should be visible
    await expect(page.locator(".proj-card[data-track='comms']").first()).toBeVisible();
    // PAPERSYNC is civic — should be hidden
    await expect(page.locator(".proj-card[data-track='civic']").first()).toBeHidden();
    // YOUR IDEA (__always) should still be visible
    await expect(page.locator(".proj-card[data-track='__always']")).toBeVisible();
  });

  test("projects search filters by name", async ({ page }) => {
    await page.goto("projects/");
    await page.fill("#projects-search", "mesh");
    // MESHBOX name contains "mesh"
    await expect(page.locator("[data-name='meshbox']")).toBeVisible();
    // PAPERSYNC name doesn't contain "mesh"
    await expect(page.locator("[data-name='papersync']")).toBeHidden();
  });
  ```

- [ ] **Step 5: Type-check**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run check
  ```
  Expected: exits 0, `0 errors`.

- [ ] **Step 6: Build and run tests**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run build && npx playwright test tests/e2e/projects.spec.ts
  ```
  Expected: `3 passed`.

- [ ] **Step 7: Commit**

  ```bash
  git add src/data/projects.yaml src/components/Projects.astro src/pages/projects.astro tests/e2e/projects.spec.ts
  git commit -m "feat(projects): add public /projects/ route with sample data"
  ```

---

### Task 7: Register CTA wiring on index.astro

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/components/RegisterDialog.astro`
- Create: `tests/e2e/register-dialog.spec.ts`

**Interfaces:**
- Consumes:
  - `data-open-register` attribute convention — already consumed by `RegisterDialog.astro`'s `<script>` (the script queries `[data-open-register]` on `DOMContentLoaded`)
  - `#register-dialog` — the native `<dialog>` id
- Produces:
  - `register-dialog.spec.ts` asserting dialog open/close behavior and focus return

**Context on current state:**
- `index.astro` hero "報名" button (line 100–103) already has `data-open-register`. It is already wired.
- `index.astro` alert section (line 182) has `<a class="btn btn-primary btn-sm" href={upcoming.registerUrl!} target="_blank">前往報名</a>` — this is a direct external link that bypasses the dialog. This task changes it to `<button data-open-register>`.
- `RegisterDialog.astro` handles ESC (native `<dialog>`) and backdrop click. It does NOT yet return focus to the opener on close. This task adds focus return.

- [ ] **Step 1: Update `index.astro` alert CTA — replace direct link with dialog trigger**

  In `src/pages/index.astro`, find line 182:
  ```astro
              <a class="btn btn-primary btn-sm" href={upcoming.registerUrl!} target="_blank" rel="noopener">前往報名</a>
  ```
  Replace with:
  ```astro
              <button class="btn btn-primary btn-sm" type="button" data-open-register>前往報名</button>
  ```

- [ ] **Step 2: Update `RegisterDialog.astro` — add focus return on close**

  In `src/components/RegisterDialog.astro`, replace the entire `<script>` block with the version below that tracks the opener and restores focus on close:
  ```astro
  <script>
    const dialog = document.getElementById("register-dialog") as HTMLDialogElement | null;
    if (dialog) {
      let lastOpener: HTMLElement | null = null;

      for (const opener of document.querySelectorAll<HTMLElement>("[data-open-register]")) {
        opener.addEventListener("click", () => {
          lastOpener = opener;
          dialog.showModal();
        });
      }

      dialog
        .querySelector("[data-close-register]")
        ?.addEventListener("click", () => dialog.close());

      // Backdrop click: the <dialog> element covers the full viewport; a click
      // whose target is the <dialog> itself (not .reg-inner) is on the backdrop.
      dialog.addEventListener("click", (e) => {
        if (e.target === dialog) dialog.close();
      });

      // Return focus to the opener whenever the dialog closes (ESC, backdrop,
      // or the close button all fire the "close" event).
      dialog.addEventListener("close", () => {
        lastOpener?.focus();
        lastOpener = null;
      });
    }
  </script>
  ```

- [ ] **Step 3: Write the failing Playwright tests**

  Create `tests/e2e/register-dialog.spec.ts`:
  ```typescript
  import { test, expect } from "@playwright/test";

  test("register dialog opens on hero button click", async ({ page }) => {
    await page.goto("");
    const opener = page.locator("[data-open-register]").first();
    await opener.click();
    const dialog = page.locator("#register-dialog");
    await expect(dialog).toBeVisible();
  });

  test("register dialog closes on ESC and returns focus to opener", async ({ page }) => {
    await page.goto("");
    const opener = page.locator("[data-open-register]").first();
    await opener.click();
    await expect(page.locator("#register-dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#register-dialog")).not.toBeVisible();
    await expect(opener).toBeFocused();
  });

  test("register dialog closes on backdrop click", async ({ page }) => {
    await page.goto("");
    await page.locator("[data-open-register]").first().click();
    const dialog = page.locator("#register-dialog");
    await expect(dialog).toBeVisible();
    // The dialog panel is 460px wide, centered in a 1280px viewport
    // (panel left edge ~410px). Click at x=10,y=10 — well outside the panel.
    await page.mouse.click(10, 10);
    await expect(dialog).not.toBeVisible();
  });
  ```

- [ ] **Step 4: Type-check**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run check
  ```
  Expected: exits 0, `0 errors`.

- [ ] **Step 5: Build and run tests**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run build && npx playwright test tests/e2e/register-dialog.spec.ts
  ```
  Expected: `3 passed`.

- [ ] **Step 6: Commit**

  ```bash
  git add src/pages/index.astro src/components/RegisterDialog.astro tests/e2e/register-dialog.spec.ts
  git commit -m "feat(register): wire hero Register CTA to shared dialog"
  ```

---

### Task 8: DesignSpecimen + DesignKitsNav scaffolds

**Files:**
- Create: `src/components/DesignSpecimen.astro`
- Create: `src/components/DesignKitsNav.astro`

**Interfaces:**
- Consumes: `withBase` from `../lib/base` (in DesignKitsNav); `Astro.url.pathname` (runtime, available in all Astro components)
- Produces:
  - `DesignSpecimen` component: props `label?: string`, `viewport?: string` (default `"AUTO"`). Wraps `<slot />` in a framed specimen box with a viewport pill header.
  - `DesignKitsNav` component: no props. Renders a 7-link top rail for `/design-kits/**` pages, with active state derived from `Astro.url.pathname`. Used by Tasks 9–15.

- [ ] **Step 1: Create `src/components/DesignSpecimen.astro`**

  Write the full file:
  ```astro
  ---
  interface Props {
    label?: string;
    viewport?: string;
  }
  const { label, viewport = "AUTO" } = Astro.props;
  ---
  <div class="specimen">
    <div class="specimen-head">
      {label
        ? <span class="specimen-label">{label}</span>
        : <span></span>
      }
      <span class="specimen-viewport">[ VIEWPORT: {viewport} ]</span>
    </div>
    <div class="specimen-body">
      <slot />
    </div>
  </div>
  <style>
    .specimen {
      border: var(--border);
      background: var(--bg);
    }
    .specimen-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--sp-2) var(--sp-4);
      border-bottom: var(--border);
      background: var(--surface);
      gap: var(--sp-4);
    }
    .specimen-label {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      letter-spacing: var(--tracking-label);
      color: var(--ink-2);
      text-transform: uppercase;
    }
    .specimen-viewport {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      letter-spacing: var(--tracking-label);
      color: var(--ink-3);
      text-transform: uppercase;
      flex: none;
    }
    .specimen-body {
      padding: var(--sp-4);
    }
  </style>
  ```

- [ ] **Step 2: Create `src/components/DesignKitsNav.astro`**

  Write the full file:
  ```astro
  ---
  import { withBase } from "../lib/base";

  const pathname = Astro.url.pathname;
  const overviewHref = withBase("/design-kits/");

  const links = [
    { href: overviewHref, label: "Overview" },
    { href: withBase("/design-kits/logo/"), label: "Logo" },
    { href: withBase("/design-kits/colors/"), label: "Colors" },
    { href: withBase("/design-kits/typography/"), label: "Typography" },
    { href: withBase("/design-kits/components/"), label: "Components" },
    { href: withBase("/design-kits/patterns/"), label: "Patterns" },
    { href: withBase("/design-kits/website/"), label: "Website" },
  ];

  const isActive = (href: string) =>
    href === overviewHref
      ? pathname === overviewHref
      : pathname.startsWith(href.replace(/\/$/, ""));
  ---
  <nav class="dkn" aria-label="Design Kits navigation">
    {links.map((l) => (
      <a
        href={l.href}
        class:list={["dkn-link", { "dkn-active": isActive(l.href) }]}
        aria-current={isActive(l.href) ? "page" : undefined}
      >{l.label}</a>
    ))}
  </nav>
  <style>
    .dkn {
      display: flex;
      border-bottom: var(--border);
      background: var(--bg);
      overflow-x: auto;
      scrollbar-width: none;
    }
    .dkn::-webkit-scrollbar { display: none; }
    .dkn-link {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      font-weight: 600;
      letter-spacing: var(--tracking-label);
      text-transform: uppercase;
      color: var(--ink);
      text-decoration: none;
      padding: var(--sp-3) var(--sp-4);
      white-space: nowrap;
      flex: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
    }
    .dkn-link:hover {
      background: var(--surface);
      color: var(--ink);
      text-decoration: none;
    }
    .dkn-active {
      border-bottom-color: var(--accent);
    }
    .dkn-active:hover {
      background: transparent;
    }
  </style>
  ```

- [ ] **Step 3: Type-check**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run check
  ```
  Expected: exits 0, `0 errors`.

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/DesignSpecimen.astro src/components/DesignKitsNav.astro
  git commit -m "feat(design-kits): scaffold specimen wrapper and sub-nav"
  ```

---

### Task 9: `/design-kits/index.astro` — overview

**Files:**
- Create: `src/pages/design-kits/index.astro`
- Create: `tests/e2e/design-kits.spec.ts`

**Interfaces:**
- Consumes: `BaseLayout` (title, description, lang), `DesignKitsNav` (Task 8), `withBase` from `../lib/base`, global `.card`, `.card-head`, `.card-title`, `.card-body`, `.label`, `.pixel-h`, `.pixel-h--2`, `.t-accent`, `.t-dim` CSS classes (all confirmed present in `src/styles/global.css` lines 250–420)
- Produces: `/design-kits/` route returning 200 with text "RULES OF THE WORLD"; `tests/e2e/design-kits.spec.ts` spec file extended by Tasks 10–15

- [ ] **Step 1: Create `src/pages/design-kits/index.astro`**

  Write the full file:
  ```astro
  ---
  import BaseLayout from "../../layouts/BaseLayout.astro";
  import DesignKitsNav from "../../components/DesignKitsNav.astro";
  import { withBase } from "../../lib/base";
  ---
  <BaseLayout
    title="Design Kits — DigiResiThon"
    description="Self-hosted design-system reference: tokens, components, and patterns."
    lang="en"
  >
    <DesignKitsNav />
    <div class="container dk-overview" data-pagefind-ignore="all">
      <h1 class="pixel-h pixel-h--2" style="margin-top: var(--sp-7);">DESIGN KITS</h1>
      <p class="t-dim" style="margin-top: var(--sp-3); font-size: var(--text-sm);">
        Self-hosted reference for the DigiResiThon design system.
        Source of truth:
        <a href="https://github.com/g0v/digiresi.g0v.tw/blob/main/design/readme.md">design/readme.md</a>
      </p>

      <h2 class="label" style="margin-top: var(--sp-7);">RULES OF THE WORLD</h2>
      <ul class="rules-list">
        <li>
          <span class="t-accent">radius: 0</span> —
          no rounding anywhere (<code>--radius: 0px</code>)
        </li>
        <li>
          <span class="t-accent">2px borders</span> —
          structural borders via <code>--border</code>; dashed <code>--border-offline</code> means pending/placeholder
        </li>
        <li>
          <span class="t-accent">hard shadows</span> —
          pixel offsets only: <code>--shadow-1</code> (3px), <code>--shadow-2</code> (6px), <code>--shadow-accent</code> (red); no blur, no spread
        </li>
        <li>
          <span class="t-accent">stepped motion</span> —
          <code>steps(2..4)</code>, 100–200ms via <code>--ease-step-*</code> + <code>--dur-*</code>; elements snap like sprites, never ease
        </li>
        <li>
          <span class="t-accent">no emoji</span> —
          Unicode geometry (<code>▲ ■ ● → ░ █</code>) and box-drawing (<code>┌ ─ │</code>) do that job
        </li>
        <li>
          <span class="t-accent">red is a signal</span> —
          <code>--accent</code> for actions, alerts, LIVE only; &gt;5% of a screen in red is shouting
        </li>
        <li>
          <span class="t-accent">dark default</span> —
          "blackout" is the default (no attribute on <code>&lt;html&gt;</code>); light only via <code>data-theme="light"</code> on <code>&lt;html&gt;</code> or any subtree
        </li>
      </ul>

      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-5);">SECTIONS</h2>
      <div class="dk-grid">
        <a class="card dk-card" href={withBase("/design-kits/logo/")}>
          <div class="card-head"><span class="card-title">LOGO</span></div>
          <div class="card-body">Mark, wordmark, lockup. YellowOne CC BY-SA 4.0 attribution. Download links.</div>
        </a>
        <a class="card dk-card" href={withBase("/design-kits/colors/")}>
          <div class="card-head"><span class="card-title">COLORS</span></div>
          <div class="card-body">Base palette + semantic tokens. Dark/light side-by-side. Two-accent rule.</div>
        </a>
        <a class="card dk-card" href={withBase("/design-kits/typography/")}>
          <div class="card-head"><span class="card-title">TYPOGRAPHY</span></div>
          <div class="card-body">Press Start 2P pixel grid. IBM Plex Mono body/label. TC fallback note.</div>
        </a>
        <a class="card dk-card" href={withBase("/design-kits/components/")}>
          <div class="card-head"><span class="card-title">COMPONENTS</span></div>
          <div class="card-body">Button, Card, Badge, Alert, Input, Select, Checkbox, SignalBars, StatusDot, TerminalBlock, Marquee, Tabs.</div>
        </a>
        <a class="card dk-card" href={withBase("/design-kits/patterns/")}>
          <div class="card-head"><span class="card-title">PATTERNS</span></div>
          <div class="card-body">Scanlines, box-drawing headers, the 45° slash, motion tokens, stripe-caution, checker.</div>
        </a>
        <a class="card dk-card" href={withBase("/design-kits/website/")}>
          <div class="card-head"><span class="card-title">WEBSITE</span></div>
          <div class="card-body">Full ui_kits/website specimen — header, landing, schedule, projects, register dialog.</div>
        </a>
      </div>
    </div>
  </BaseLayout>
  <style>
    .dk-overview {
      padding-block: var(--sp-7) var(--sp-9);
    }
    .rules-list {
      list-style: none;
      padding: 0;
      margin: var(--sp-4) 0 0;
      display: flex;
      flex-direction: column;
      gap: var(--sp-3);
      font-size: var(--text-sm);
    }
    .rules-list li {
      border-left: 2px solid var(--line-soft);
      padding-left: var(--sp-4);
      line-height: var(--leading-body);
    }
    .dk-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--sp-4);
    }
    .dk-card {
      text-decoration: none;
      color: var(--ink);
      transition: box-shadow var(--dur-1) var(--ease-step-2),
                  transform var(--dur-1) var(--ease-step-2);
    }
    .dk-card:hover {
      box-shadow: var(--shadow-2);
      transform: translate(-2px, -2px);
      background: var(--surface);
      color: var(--ink);
      text-decoration: none;
    }
    @media (max-width: 768px) {
      .dk-grid { grid-template-columns: 1fr; }
    }
  </style>
  ```

- [ ] **Step 2: Create `tests/e2e/design-kits.spec.ts`**

  Write the file (Tasks 10–15 append to it):
  ```typescript
  import { test, expect } from "@playwright/test";

  test("/design-kits/ returns 200 and shows rules heading", async ({ page }) => {
    const response = await page.goto("design-kits/");
    expect(response?.status()).toBe(200);
    await expect(page.getByText("RULES OF THE WORLD")).toBeVisible();
  });
  ```

- [ ] **Step 3: Type-check**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run check
  ```
  Expected: exits 0, `0 errors`.

- [ ] **Step 4: Build and run test**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run build && npx playwright test tests/e2e/design-kits.spec.ts
  ```
  Expected: `1 passed`.

- [ ] **Step 5: Commit**

  ```bash
  git add src/pages/design-kits/index.astro tests/e2e/design-kits.spec.ts
  git commit -m "feat(design-kits): add overview page"
  ```

---

### Task 10: `/design-kits/logo.astro`

**Files:**
- Create: `src/pages/design-kits/logo.astro`
- Modify: `tests/e2e/design-kits.spec.ts`

**Interfaces:**
- Consumes: `BaseLayout`, `DesignKitsNav`, `DesignSpecimen` (Task 8), logo PNGs from `design/assets/logo/` (verified: `mark-dark.png`, `mark.png`, `wordmark-dark.png`, `wordmark.png`); `withBase` from `../../lib/base`
- Produces: `/design-kits/logo/` route; prominent attribution text "© YellowOne" + "CC BY-SA 4.0"; download `<a>` elements pointing to `public/design/assets/logo/*.png`

**Note on asset paths:** The four logo PNGs live in `design/assets/logo/` (outside `public/`) and are not served by Astro automatically. Step 1 copies them to `public/design/assets/logo/` so the download links resolve at `/design/assets/logo/*.png`.

- [ ] **Step 1: Copy logo PNGs to `public/design/assets/logo/`**

  Run:
  ```bash
  mkdir -p /Users/cheng/digiresi.g0v.tw/public/design/assets/logo
  cp /Users/cheng/digiresi.g0v.tw/design/assets/logo/*.png /Users/cheng/digiresi.g0v.tw/public/design/assets/logo/
  ```
  Expected: four files copied — `mark-dark.png`, `mark.png`, `wordmark-dark.png`, `wordmark.png`.

- [ ] **Step 2: Create `src/pages/design-kits/logo.astro`**

  Write the full file:
  ```astro
  ---
  import BaseLayout from "../../layouts/BaseLayout.astro";
  import DesignKitsNav from "../../components/DesignKitsNav.astro";
  import DesignSpecimen from "../../components/DesignSpecimen.astro";
  import { withBase } from "../../lib/base";

  const base = withBase("/design/assets/logo");
  ---
  <BaseLayout
    title="Logo — Design Kits — DigiResiThon"
    description="Logo mark, wordmark, and lockup — dark and light previews, downloads, and YellowOne CC BY-SA 4.0 attribution."
    lang="en"
  >
    <DesignKitsNav />
    <div class="container dk-logo" data-pagefind-ignore="all">
      <h1 class="pixel-h pixel-h--2" style="margin-top: var(--sp-7);">LOGO</h1>

      <!-- TODO(yellowone-url): link to YellowOne canonical profile -->
      <div class="attribution-block">
        <p class="attr-line">
          Logo mark, wordmark, and lockup &copy; YellowOne &mdash;
          Licensed <strong>CC BY-SA 4.0</strong>.
          Derivative works must be released under the same license.
        </p>
        <p class="attr-line t-dim">
          Source: DigiResiTh0n Design System (Claude Design project).
          See <code>design/assets/logo/LICENSE.md</code>.
        </p>
      </div>

      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-5);">MARK</h2>
      <DesignSpecimen label="mark" viewport="AUTO">
        <div class="logo-row">
          <div class="theme-panel" aria-label="dark theme">
            <img src={`${base}/mark-dark.png`} alt="DigiResiThon mark — dark theme" height="64" />
          </div>
          <div class="theme-panel theme-panel--light" data-theme="light" aria-label="light theme">
            <img src={`${base}/mark.png`} alt="DigiResiThon mark — light theme" height="64" />
          </div>
        </div>
      </DesignSpecimen>
      <div class="dl-row">
        <a class="btn btn-sm" href={`${base}/mark-dark.png`} download="mark-dark.png">DOWNLOAD DARK</a>
        <a class="btn btn-sm" href={`${base}/mark.png`} download="mark.png">DOWNLOAD LIGHT</a>
      </div>

      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-5);">WORDMARK</h2>
      <DesignSpecimen label="wordmark" viewport="AUTO">
        <div class="logo-row">
          <div class="theme-panel" aria-label="dark theme">
            <img src={`${base}/wordmark-dark.png`} alt="DigiResiThon wordmark — dark theme" height="40" />
          </div>
          <div class="theme-panel theme-panel--light" data-theme="light" aria-label="light theme">
            <img src={`${base}/wordmark.png`} alt="DigiResiThon wordmark — light theme" height="40" />
          </div>
        </div>
      </DesignSpecimen>
      <div class="dl-row">
        <a class="btn btn-sm" href={`${base}/wordmark-dark.png`} download="wordmark-dark.png">DOWNLOAD DARK</a>
        <a class="btn btn-sm" href={`${base}/wordmark.png`} download="wordmark.png">DOWNLOAD LIGHT</a>
      </div>

      <div class="usage-notes">
        <h2 class="label" style="margin-bottom: var(--sp-3);">USAGE RULES</h2>
        <ul class="rules-list">
          <li>Clear space = height of the "0" on all sides.</li>
          <li>Use <code>-dark</code> variants on dark surfaces (the default theme); red stays red in both.</li>
          <li>Do not recolor, skew, round, or add effects to the mark.</li>
          <li>Raster only — ask the community for vector originals.</li>
          <li>Min height: mark 48px, wordmark 32px.</li>
        </ul>
      </div>
    </div>
  </BaseLayout>
  <style>
    .dk-logo { padding-block: var(--sp-7) var(--sp-9); }
    .attribution-block {
      margin-top: var(--sp-5);
      border-left: 4px solid var(--accent);
      padding: var(--sp-4) var(--sp-5);
      background: var(--surface);
    }
    .attr-line {
      margin: 0 0 var(--sp-2);
      font-size: var(--text-sm);
      line-height: var(--leading-body);
    }
    .attr-line:last-child { margin-bottom: 0; }
    .logo-row {
      display: flex;
      gap: var(--sp-4);
      flex-wrap: wrap;
    }
    .theme-panel {
      flex: 1;
      min-width: 200px;
      background: var(--bg);
      border: var(--border);
      padding: var(--sp-6);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .theme-panel--light {
      background: var(--paper);
    }
    .dl-row {
      display: flex;
      gap: var(--sp-3);
      margin-top: var(--sp-3);
      flex-wrap: wrap;
    }
    .usage-notes { margin-top: var(--sp-7); }
    .rules-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: var(--sp-2);
      font-size: var(--text-sm);
    }
    .rules-list li {
      border-left: 2px solid var(--line-soft);
      padding-left: var(--sp-4);
      line-height: var(--leading-body);
    }
  </style>
  ```

  Note: `var(--paper)` is `#fafaf8` (the light-theme background) — it is a base palette token present in `:root` in `src/styles/global.css` line 17.

- [ ] **Step 3: Extend `tests/e2e/design-kits.spec.ts` — append logo assertions**

  Append to the existing `tests/e2e/design-kits.spec.ts`:
  ```typescript

  test("/design-kits/logo/ shows YellowOne attribution and CC BY-SA 4.0", async ({ page }) => {
    const response = await page.goto("design-kits/logo/");
    expect(response?.status()).toBe(200);
    await expect(page.getByText(/© YellowOne/)).toBeVisible();
    await expect(page.getByText(/CC BY-SA 4\.0/)).toBeVisible();
  });
  ```

- [ ] **Step 4: Type-check**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run check
  ```
  Expected: exits 0, `0 errors`.

- [ ] **Step 5: Build and run tests**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run build && npx playwright test tests/e2e/design-kits.spec.ts
  ```
  Expected: `2 passed`.

- [ ] **Step 6: Commit**

  ```bash
  git add public/design/assets/logo/ src/pages/design-kits/logo.astro tests/e2e/design-kits.spec.ts
  git commit -m "feat(design-kits): add logo page with YellowOne attribution"
  ```

---

### Task 11: `/design-kits/colors.astro`

**Files:**
- Create: `src/pages/design-kits/colors.astro`
- Modify: `tests/e2e/design-kits.spec.ts`

**Interfaces:**
- Consumes: `BaseLayout`, `DesignKitsNav`, `DesignSpecimen` (Task 8); global `.label`, `.t-dim`, `.t-accent` CSS classes; color token names verified from `src/styles/global.css` lines 11–74
- Produces: `/design-kits/colors/` route with heading text "SEMANTIC TOKENS"

- [ ] **Step 1: Create `src/pages/design-kits/colors.astro`**

  Write the full file:
  ```astro
  ---
  import BaseLayout from "../../layouts/BaseLayout.astro";
  import DesignKitsNav from "../../components/DesignKitsNav.astro";
  import DesignSpecimen from "../../components/DesignSpecimen.astro";

  const baseTokens = [
    "--black", "--paper", "--white",
    "--gray-900", "--gray-700", "--gray-500", "--gray-300", "--gray-150", "--gray-100",
    "--red", "--red-deep", "--red-bright",
    "--green", "--green-bright",
    "--amber", "--amber-bright",
  ];

  const semanticTokens = [
    { token: "--bg",              desc: "Page background" },
    { token: "--surface",         desc: "Card / panel background" },
    { token: "--ink",             desc: "Primary text" },
    { token: "--ink-2",           desc: "Secondary text / labels" },
    { token: "--ink-3",           desc: "Disabled / placeholder" },
    { token: "--line",            desc: "Border color (structural)" },
    { token: "--accent",          desc: "Signal red — actions, alerts, LIVE" },
    { token: "--accent-2",        desc: "Terminal green — prompts, ok-states" },
    { token: "--status-degraded", desc: "Amber — degraded / warning status" },
    { token: "--status-offline",  desc: "Red — offline / error status" },
  ];
  ---
  <BaseLayout
    title="Colors — Design Kits — DigiResiThon"
    description="Base palette and semantic tokens, dark and light side-by-side."
    lang="en"
  >
    <DesignKitsNav />
    <div class="container dk-colors" data-pagefind-ignore="all">
      <h1 class="pixel-h pixel-h--2" style="margin-top: var(--sp-7);">COLORS</h1>

      <div class="callout" style="margin-top: var(--sp-5);">
        <strong>Two-accent rule:</strong> signal red (<code>--accent</code>) for actions/alerts/LIVE;
        terminal green (<code>--accent-2</code>) for prompts/ok-states. That is all. No third accent.
        Red &gt;5% of a screen is shouting. Amber (<code>--status-degraded</code>) exists only as a status.
      </div>

      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">BASE PALETTE</h2>
      <DesignSpecimen label="base-palette" viewport="AUTO">
        <div class="swatch-grid" id="base-swatches">
          {baseTokens.map((t) => (
            <div class="swatch-cell" data-token={t}>
              <div class="swatch-color" style={`background: var(${t});`}></div>
              <div class="swatch-name">{t}</div>
              <div class="swatch-hex t-dim">—</div>
            </div>
          ))}
        </div>
      </DesignSpecimen>

      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">SEMANTIC TOKENS</h2>
      <DesignSpecimen label="semantic-tokens" viewport="AUTO">
        <table class="token-table">
          <thead>
            <tr>
              <th>Token</th>
              <th>Dark value</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody id="semantic-tbody">
            {semanticTokens.map((row) => (
              <tr data-token={row.token}>
                <td><code>{row.token}</code></td>
                <td>
                  <span class="swatch-inline" style={`background: var(${row.token});`}></span>
                  <span class="swatch-hex-inline t-dim">—</span>
                </td>
                <td class="t-dim">{row.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DesignSpecimen>

      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">DARK / LIGHT SIDE-BY-SIDE</h2>
      <DesignSpecimen label="theme-comparison" viewport="AUTO">
        <div class="compare-row">
          <div class="compare-panel" aria-label="dark theme">
            <div class="compare-label t-dim">BLACKOUT (default)</div>
            <div class="swatch-mini-grid" id="dark-swatches">
              {semanticTokens.map((row) => (
                <div class="swatch-mini-cell">
                  <div class="swatch-mini-color" style={`background: var(${row.token});`}></div>
                  <div class="swatch-mini-name">{row.token}</div>
                </div>
              ))}
            </div>
          </div>
          <div class="compare-panel" data-theme="light" aria-label="light theme">
            <div class="compare-label t-dim">PAPER (data-theme="light")</div>
            <div class="swatch-mini-grid">
              {semanticTokens.map((row) => (
                <div class="swatch-mini-cell">
                  <div class="swatch-mini-color" style={`background: var(${row.token});`}></div>
                  <div class="swatch-mini-name">{row.token}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DesignSpecimen>
    </div>
  </BaseLayout>
  <style>
    .dk-colors { padding-block: var(--sp-7) var(--sp-9); }
    .callout {
      background: var(--surface);
      border: var(--border);
      border-left: 4px solid var(--accent);
      padding: var(--sp-3) var(--sp-4);
      font-size: var(--text-sm);
      line-height: var(--leading-body);
    }
    .swatch-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: var(--sp-3);
    }
    .swatch-cell { display: flex; flex-direction: column; gap: var(--sp-1); }
    .swatch-color {
      height: 48px;
      border: var(--border-soft);
    }
    .swatch-name {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      letter-spacing: var(--tracking-label);
      word-break: break-all;
    }
    .swatch-hex { font-size: var(--text-xs); }
    .token-table {
      width: 100%;
      border-collapse: collapse;
      font-family: var(--font-mono);
      font-size: var(--text-sm);
    }
    .token-table th, .token-table td {
      border: var(--border-soft);
      padding: var(--sp-2) var(--sp-3);
      text-align: left;
      vertical-align: middle;
    }
    .token-table th {
      font-size: var(--text-xs);
      letter-spacing: var(--tracking-label);
      text-transform: uppercase;
      color: var(--ink-2);
      background: var(--surface);
    }
    .swatch-inline {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: var(--border-soft);
      vertical-align: middle;
      margin-right: var(--sp-2);
    }
    .swatch-hex-inline { font-size: var(--text-xs); }
    .compare-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--sp-4);
    }
    .compare-panel {
      padding: var(--sp-4);
      border: var(--border);
      background: var(--bg);
    }
    .compare-label {
      font-size: var(--text-xs);
      letter-spacing: var(--tracking-label);
      margin-bottom: var(--sp-3);
      font-family: var(--font-mono);
      text-transform: uppercase;
    }
    .swatch-mini-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: var(--sp-2);
    }
    .swatch-mini-cell { display: flex; flex-direction: column; gap: 2px; }
    .swatch-mini-color {
      height: 28px;
      border: var(--border-soft);
    }
    .swatch-mini-name {
      font-family: var(--font-mono);
      font-size: 9px;
      color: var(--ink-3);
      word-break: break-all;
      line-height: 1.3;
    }
    @media (max-width: 640px) {
      .compare-row { grid-template-columns: 1fr; }
      .swatch-mini-grid { grid-template-columns: repeat(3, 1fr); }
    }
  </style>
  <script>
    // Read computed hex values from getComputedStyle and populate the swatch cells.
    const style = getComputedStyle(document.documentElement);

    for (const cell of document.querySelectorAll<HTMLElement>("#base-swatches .swatch-cell")) {
      const token = cell.dataset.token;
      if (!token) continue;
      const hex = style.getPropertyValue(token).trim();
      const hexEl = cell.querySelector(".swatch-hex");
      if (hexEl && hex) hexEl.textContent = hex;
    }

    for (const row of document.querySelectorAll<HTMLElement>("#semantic-tbody tr")) {
      const token = row.dataset.token;
      if (!token) continue;
      const hex = style.getPropertyValue(token).trim();
      const hexEl = row.querySelector(".swatch-hex-inline");
      if (hexEl && hex) hexEl.textContent = hex;
    }
  </script>
  ```

- [ ] **Step 2: Extend `tests/e2e/design-kits.spec.ts` — append colors assertion**

  Append to `tests/e2e/design-kits.spec.ts`:
  ```typescript

  test("/design-kits/colors/ returns 200 and shows SEMANTIC TOKENS heading", async ({ page }) => {
    const response = await page.goto("design-kits/colors/");
    expect(response?.status()).toBe(200);
    await expect(page.getByText("SEMANTIC TOKENS")).toBeVisible();
  });
  ```

- [ ] **Step 3: Type-check**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run check
  ```
  Expected: exits 0, `0 errors`.

- [ ] **Step 4: Build and run tests**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run build && npx playwright test tests/e2e/design-kits.spec.ts
  ```
  Expected: `3 passed`.

- [ ] **Step 5: Commit**

  ```bash
  git add src/pages/design-kits/colors.astro tests/e2e/design-kits.spec.ts
  git commit -m "feat(design-kits): add colors page"
  ```

---

### Task 12: `/design-kits/typography.astro`

**Files:**
- Create: `src/pages/design-kits/typography.astro`
- Modify: `tests/e2e/design-kits.spec.ts`

**Interfaces:**
- Consumes: `BaseLayout`, `DesignKitsNav`, `DesignSpecimen` (Task 8); global `.label`, `.pixel-h`, `.pixel-h--*`, `.pixel-h-tc`, `.t-dim` CSS classes; pixel size tokens `--px-1` through `--px-5` confirmed in `src/styles/global.css` lines 93–97; `--tracking-label` at line 108
- Produces: `/design-kits/typography/` route with text "PRESS START 2P"

- [ ] **Step 1: Create `src/pages/design-kits/typography.astro`**

  Write the full file:
  ```astro
  ---
  import BaseLayout from "../../layouts/BaseLayout.astro";
  import DesignKitsNav from "../../components/DesignKitsNav.astro";
  import DesignSpecimen from "../../components/DesignSpecimen.astro";

  const pixelSizes = [
    { step: "--px-1", px: 16, label: "px-1 / 16px — body pixel heading, buttons, nav" },
    { step: "--px-2", px: 24, label: "px-2 / 24px — section heading" },
    { step: "--px-3", px: 32, label: "px-3 / 32px — page heading" },
    { step: "--px-4", px: 48, label: "px-4 / 48px — hero display" },
    { step: "--px-5", px: 64, label: "px-5 / 64px — max display" },
  ];
  ---
  <BaseLayout
    title="Typography — Design Kits — DigiResiThon"
    description="Press Start 2P pixel grid and IBM Plex Mono type specimens."
    lang="en"
  >
    <DesignKitsNav />
    <div class="container dk-type" data-pagefind-ignore="all">
      <h1 class="pixel-h pixel-h--2" style="margin-top: var(--sp-7);">TYPOGRAPHY</h1>

      <div class="callout" style="margin-top: var(--sp-5);">
        <strong>Pixel grid rule:</strong> Press Start 2P must NEVER be rendered below 16px
        (<code>--px-1</code>). Sizes are fixed to the 8px grid: 16 / 24 / 32 / 48 / 64.
        Use <code>-webkit-font-smoothing: none</code> on all pixel text.
        IBM Plex Mono handles everything else: body, labels, tables, buttons, logs.
      </div>

      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">PRESS START 2P</h2>
      <DesignSpecimen label="press-start-2p — pixel sizes" viewport="AUTO">
        <div class="type-stack">
          {pixelSizes.map(({ step, px, label }) => (
            <div class="type-row">
              <div class="type-meta t-dim">{label}</div>
              <div
                class="type-sample"
                style={`font-family: var(--font-pixel); font-size: var(${step}); -webkit-font-smoothing: none; line-height: var(--leading-pixel); text-transform: uppercase;`}
              >
                DIGIRESITHON
              </div>
            </div>
          ))}
        </div>
      </DesignSpecimen>

      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">IBM PLEX MONO</h2>
      <DesignSpecimen label="ibm-plex-mono — roles" viewport="AUTO">
        <div class="type-stack">
          <div class="type-row">
            <div class="type-meta t-dim">body — 15px / 1.7</div>
            <div style="font-family: var(--font-mono); font-size: var(--text-base); line-height: var(--leading-body);">
              When digital infrastructure fails — cut sea cables, downed towers, blackouts —
              the community keeps moving. Seriously. You are the nobody.
            </div>
          </div>
          <div class="type-row">
            <div class="type-meta t-dim">label caps — text-xs / tracking-label / uppercase</div>
            <div style="font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: var(--tracking-label); text-transform: uppercase; font-weight: 600; color: var(--ink-2);">
              STATUS &nbsp;&middot;&nbsp; ONLINE &nbsp;&middot;&nbsp; [ DAY 0 ] &nbsp;&middot;&nbsp; T-42 DAYS &nbsp;&middot;&nbsp; 2026.10.24 SAT
            </div>
          </div>
          <div class="type-row">
            <div class="type-meta t-dim">table row — text-sm / tracking-label / uppercase</div>
            <div style="font-family: var(--font-mono); font-size: var(--text-sm); border: var(--border); display: flex; gap: var(--sp-4); padding: 8px 12px; letter-spacing: var(--tracking-label); text-transform: uppercase;">
              <span>MESHBOX</span>
              <span class="t-dim">COMMS</span>
              <span style="color: var(--accent-2);">SYNC 4/4</span>
              <span class="t-dim">12 PEOPLE</span>
            </div>
          </div>
        </div>
      </DesignSpecimen>

      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">TC FALLBACK</h2>
      <DesignSpecimen label="pixel-tc — cubic-11" viewport="AUTO">
        <div class="type-stack">
          <div class="type-row">
            <div class="type-meta t-dim">--font-pixel-tc (Cubic 11) — TC pixel display, tc-2 / 33px</div>
            <div style="font-family: var(--font-pixel-tc); font-size: var(--tc-2); -webkit-font-smoothing: none; line-height: var(--leading-pixel);">
              數位韌性松 DIGIRESITHON
            </div>
          </div>
          <div class="type-row t-dim" style="font-size: var(--text-xs); line-height: var(--leading-body);">
            <strong>Note:</strong> <code>--font-pixel-tc</code> = "Cubic 11", "Press Start 2P", monospace.
            Self-hosted via <code>public/fonts/Cubic_11.woff2</code> (vendored by <code>npm run assets</code>).
            Sizes: <code>--tc-1</code> (22px) &middot; <code>--tc-2</code> (33px) &middot; <code>--tc-3</code> (44px) &middot; <code>--tc-4</code> (66px).
            Use for pixel-set TC strings only; all system copy is EN.
          </div>
        </div>
      </DesignSpecimen>
    </div>
  </BaseLayout>
  <style>
    .dk-type { padding-block: var(--sp-7) var(--sp-9); }
    .callout {
      background: var(--surface);
      border: var(--border);
      border-left: 4px solid var(--line-soft);
      padding: var(--sp-3) var(--sp-4);
      font-size: var(--text-sm);
      line-height: var(--leading-body);
    }
    .type-stack {
      display: flex;
      flex-direction: column;
      gap: var(--sp-6);
    }
    .type-row {
      display: flex;
      flex-direction: column;
      gap: var(--sp-2);
    }
    .type-meta {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      letter-spacing: var(--tracking-label);
      text-transform: uppercase;
    }
  </style>
  ```

- [ ] **Step 2: Extend `tests/e2e/design-kits.spec.ts` — append typography assertion**

  Append to `tests/e2e/design-kits.spec.ts`:
  ```typescript

  test("/design-kits/typography/ returns 200 and shows PRESS START 2P heading", async ({ page }) => {
    const response = await page.goto("design-kits/typography/");
    expect(response?.status()).toBe(200);
    await expect(page.getByText("PRESS START 2P")).toBeVisible();
  });
  ```

- [ ] **Step 3: Type-check**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run check
  ```
  Expected: exits 0, `0 errors`.

- [ ] **Step 4: Build and run tests**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run build && npx playwright test tests/e2e/design-kits.spec.ts
  ```
  Expected: `4 passed`.

- [ ] **Step 5: Commit**

  ```bash
  git add src/pages/design-kits/typography.astro tests/e2e/design-kits.spec.ts
  git commit -m "feat(design-kits): add typography page"
  ```

---

### Task 13: `/design-kits/components.astro` + minimal Astro ports

**Files:**
- Create: `src/components/Alert.astro`
- Create: `src/components/Badge.astro`
- Create: `src/components/Button.astro`
- Create: `src/components/Card.astro`
- Create: `src/components/Input.astro`
- Create: `src/components/Select.astro`
- Create: `src/components/Checkbox.astro`
- Create: `src/pages/design-kits/components.astro`
- Modify: `tests/e2e/design-kits.spec.ts`

**Interfaces:**
- Consumes:
  - `BaseLayout`, `DesignKitsNav`, `DesignSpecimen` (Task 8)
  - `Tabs.astro` from Task 5 (active, items props; emits `tab:change`)
  - `SignalBars.astro` (level, height props — confirmed in `src/components/SignalBars.astro`)
  - `StatusDot.astro` (status, label props — confirmed in `src/components/StatusDot.astro`)
  - `TerminalBlock.astro` (title, lines, cursor props — confirmed in `src/components/TerminalBlock.astro`)
  - `Marquee.astro` (items, speed props — confirmed in `src/components/Marquee.astro`)
  - Global CSS: `.alert`, `.alert-title`, `.alert-body`, `.alert-info`, `.alert-online`, `.alert-degraded`, `.alert-offline` (confirmed lines 453–497); `.badge`, `.dot`, `.dot--online`, `.dot--degraded`, `.dot--offline` (lines 421–450); `.card`, `.card-lifted`, `.card-offline`, `.card-head`, `.card-title`, `.card-body`, `.card-foot` (lines 357–419); `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-sm` (lines 289–355)
- Produces:
  - `Alert.astro` (tone, title, children via slot), `Badge.astro` (status, blink, children), `Button.astro` (variant, size, disabled, type, href), `Card.astro` (title, meta, footer, lifted, offline), `Input.astro` (label, id, type, placeholder, prefix, hint, name), `Select.astro` (label, id, options, name), `Checkbox.astro` (label, name, value, checked, disabled)
  - `/design-kits/components/` route; `tests/e2e/design-kits.spec.ts` assertions for each group label

**Note on port philosophy:** These minimal Astro components mirror the JSX interfaces using global CSS class tokens already in `src/styles/global.css`. They do NOT reproduce all interactive hover/press states (those are CSS `a:hover` / `.btn:hover` from global.css). Do NOT bulk-port the JSX render logic — only create what the specimen page needs.

- [ ] **Step 1: Create `src/components/Alert.astro`**

  Write the full file:
  ```astro
  ---
  interface Props {
    tone?: "info" | "online" | "degraded" | "offline";
    title?: string;
  }
  const { tone = "info", title } = Astro.props;
  ---
  <div role="alert" class:list={["alert", tone !== "info" ? `alert-${tone}` : ""]}>
    {title && <div class="alert-title">{title}</div>}
    <div class="alert-body"><slot /></div>
  </div>
  ```

- [ ] **Step 2: Create `src/components/Badge.astro`**

  Write the full file:
  ```astro
  ---
  interface Props {
    status?: "online" | "degraded" | "offline" | "live" | "neutral";
    blink?: boolean;
  }
  const { status = "neutral", blink } = Astro.props;
  const doBlink = blink != null ? blink : status === "live";
  const dotClass = status !== "neutral" ? `dot--${status}` : "";
  ---
  <span class="badge">
    <span class:list={["dot", dotClass, doBlink ? "dot--live" : ""]}></span>
    <slot />
  </span>
  ```

- [ ] **Step 3: Create `src/components/Button.astro`**

  Write the full file:
  ```astro
  ---
  interface Props {
    variant?: "primary" | "secondary" | "ghost";
    size?: "sm" | "md" | "lg";
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
    href?: string;
  }
  const { variant = "secondary", size = "md", disabled = false, type = "button", href } = Astro.props;
  const variantClass = variant === "primary" ? "btn-primary"
    : variant === "ghost" ? "btn-ghost"
    : "btn-secondary";
  const sizeClass = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";
  ---
  {href ? (
    <a href={href} class:list={["btn", variantClass, sizeClass]}><slot /></a>
  ) : (
    <button type={type} disabled={disabled} class:list={["btn", variantClass, sizeClass]}><slot /></button>
  )}
  ```

- [ ] **Step 4: Create `src/components/Card.astro`**

  Write the full file:
  ```astro
  ---
  interface Props {
    title?: string;
    meta?: string;
    footer?: string;
    lifted?: boolean;
    offline?: boolean;
  }
  const { title, meta, footer, lifted = false, offline = false } = Astro.props;
  ---
  <div class:list={["card", lifted && "card-lifted", offline && "card-offline"]}>
    {(title || meta) && (
      <div class="card-head">
        {title && <span class="card-title">{title}</span>}
        {meta && <span class="card-meta">{meta}</span>}
      </div>
    )}
    <div class="card-body"><slot /></div>
    {footer && <div class="card-foot">{footer}</div>}
  </div>
  ```

- [ ] **Step 5: Create `src/components/Input.astro`**

  Write the full file:
  ```astro
  ---
  interface Props {
    label?: string;
    id?: string;
    type?: string;
    placeholder?: string;
    prefix?: string;
    hint?: string;
    name?: string;
  }
  const { label, id, type = "text", placeholder, prefix, hint, name } = Astro.props;
  ---
  <div class="field">
    {label && <label class="field-label" for={id}>{label}</label>}
    <div class="field-input-wrap">
      {prefix && <span class="field-prefix">{prefix}</span>}
      <input class="field-input" id={id} name={name} type={type} placeholder={placeholder} />
    </div>
    {hint && <div class="field-hint">{hint}</div>}
  </div>
  <style>
    .field { display: flex; flex-direction: column; gap: 6px; font-family: var(--font-mono); }
    .field-label {
      font-size: var(--text-xs);
      font-weight: 600;
      letter-spacing: var(--tracking-label);
      text-transform: uppercase;
      color: var(--ink-2);
    }
    .field-input-wrap {
      display: flex;
      align-items: center;
      background: var(--surface-sunken);
      border: 2px solid var(--line-soft);
    }
    .field-input-wrap:focus-within { border-color: var(--line); outline: var(--focus-ring); outline-offset: var(--focus-offset); }
    .field-prefix { padding: 0 0 0 12px; color: var(--accent-2); font-size: var(--text-sm); font-weight: 600; }
    .field-input {
      flex: 1;
      min-width: 0;
      background: transparent;
      border: none;
      outline: none;
      color: var(--ink);
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      padding: 10px 12px;
    }
    .field-hint { font-size: var(--text-xs); color: var(--ink-3); }
  </style>
  ```

- [ ] **Step 6: Create `src/components/Select.astro`**

  Write the full file:
  ```astro
  ---
  interface Option { value: string; label: string; }
  interface Props {
    label?: string;
    id?: string;
    name?: string;
    options?: Option[];
  }
  const { label, id, name, options = [] } = Astro.props;
  ---
  <div class="field">
    {label && <label class="field-label" for={id}>{label}</label>}
    <div class="select-wrap">
      <select class="field-select" id={id} name={name}>
        {options.map((o) => <option value={o.value}>{o.label}</option>)}
      </select>
      <span class="select-arrow" aria-hidden="true">▼</span>
    </div>
  </div>
  <style>
    .field { display: flex; flex-direction: column; gap: 6px; font-family: var(--font-mono); }
    .field-label {
      font-size: var(--text-xs);
      font-weight: 600;
      letter-spacing: var(--tracking-label);
      text-transform: uppercase;
      color: var(--ink-2);
    }
    .select-wrap {
      position: relative;
      display: flex;
      background: var(--surface-sunken);
      border: 2px solid var(--line-soft);
    }
    .select-wrap:focus-within { border-color: var(--line); outline: var(--focus-ring); outline-offset: var(--focus-offset); }
    .field-select {
      appearance: none;
      -webkit-appearance: none;
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--ink);
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      padding: 10px 36px 10px 12px;
      cursor: pointer;
    }
    .field-select option { background: var(--surface); color: var(--ink); }
    .select-arrow {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      font-size: 10px;
      color: var(--ink-2);
    }
  </style>
  ```

- [ ] **Step 7: Create `src/components/Checkbox.astro`**

  Write the full file:
  ```astro
  ---
  interface Props {
    label?: string;
    name?: string;
    value?: string;
    checked?: boolean;
    disabled?: boolean;
  }
  const { label, name, value, checked = false, disabled = false } = Astro.props;
  ---
  <label class:list={["cb-wrap", disabled && "cb-disabled"]}>
    <input
      class="cb-input"
      type="checkbox"
      name={name}
      value={value}
      checked={checked}
      disabled={disabled}
    />
    <span class="cb-box" aria-hidden="true">{checked ? "X" : ""}</span>
    {label && <span class="cb-label">{label}</span>}
  </label>
  <style>
    .cb-wrap {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      color: var(--ink);
      user-select: none;
    }
    .cb-disabled { cursor: not-allowed; color: var(--ink-3); }
    .cb-input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }
    .cb-box {
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
    .cb-disabled .cb-box { border: var(--border-offline); }
    .cb-input:focus-visible + .cb-box { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  </style>
  ```

- [ ] **Step 8: Create `src/pages/design-kits/components.astro`**

  Write the full file:
  ```astro
  ---
  import BaseLayout from "../../layouts/BaseLayout.astro";
  import DesignKitsNav from "../../components/DesignKitsNav.astro";
  import DesignSpecimen from "../../components/DesignSpecimen.astro";
  import Alert from "../../components/Alert.astro";
  import Badge from "../../components/Badge.astro";
  import Button from "../../components/Button.astro";
  import Card from "../../components/Card.astro";
  import Input from "../../components/Input.astro";
  import Select from "../../components/Select.astro";
  import Checkbox from "../../components/Checkbox.astro";
  import SignalBars from "../../components/SignalBars.astro";
  import StatusDot from "../../components/StatusDot.astro";
  import TerminalBlock from "../../components/TerminalBlock.astro";
  import Marquee from "../../components/Marquee.astro";
  import Tabs from "../../components/Tabs.astro";
  ---
  <BaseLayout
    title="Components — Design Kits — DigiResiThon"
    description="Live component specimens: Button, Card, Badge, Alert, forms, SignalBars, StatusDot, TerminalBlock, Marquee, Tabs."
    lang="en"
  >
    <DesignKitsNav />
    <div class="container dk-components" data-pagefind-ignore="all">
      <h1 class="pixel-h pixel-h--2" style="margin-top: var(--sp-7);">COMPONENTS</h1>

      <!-- BUTTON -->
      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">BUTTON</h2>
      <DesignSpecimen label="Button — variants × sizes" viewport="AUTO">
        <div class="spec-row">
          <Button variant="primary" size="sm">PRIMARY SM</Button>
          <Button variant="primary" size="md">PRIMARY MD</Button>
          <Button variant="secondary" size="sm">SECONDARY SM</Button>
          <Button variant="secondary" size="md">SECONDARY MD</Button>
          <Button variant="ghost" size="sm">GHOST SM</Button>
          <Button variant="ghost" size="md">GHOST MD</Button>
          <Button variant="primary" size="md" disabled>DISABLED</Button>
        </div>
      </DesignSpecimen>

      <!-- CARD -->
      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">CARD</h2>
      <DesignSpecimen label="Card — default / lifted / offline" viewport="AUTO">
        <div class="spec-grid-3">
          <Card title="DEFAULT" meta="ACTIVE">Default card — standard border, no shadow.</Card>
          <Card title="LIFTED" meta="ACTIVE" lifted>Lifted card — shadow-2 offset, used for project cards.</Card>
          <Card title="OFFLINE" meta="PENDING" offline>Offline card — dashed border, dimmed text.</Card>
        </div>
      </DesignSpecimen>

      <!-- BADGE -->
      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">BADGE</h2>
      <DesignSpecimen label="Badge — all statuses" viewport="AUTO">
        <div class="spec-row">
          <Badge status="online">ONLINE</Badge>
          <Badge status="degraded">DEGRADED</Badge>
          <Badge status="offline">OFFLINE</Badge>
          <Badge status="live">LIVE</Badge>
          <Badge status="neutral">NEUTRAL</Badge>
        </div>
      </DesignSpecimen>

      <!-- ALERT -->
      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">ALERT</h2>
      <DesignSpecimen label="Alert — all tones" viewport="AUTO">
        <div class="spec-stack">
          <Alert tone="info" title="INFO">Informational alert — left band uses --ink. General notices.</Alert>
          <Alert tone="online" title="ONLINE">Online alert — left band uses --status-online.</Alert>
          <Alert tone="degraded" title="DEGRADED">Degraded alert — caution stripe, --status-degraded.</Alert>
          <Alert tone="offline" title="OFFLINE">Offline alert — stripe, --status-offline. Use for errors.</Alert>
        </div>
      </DesignSpecimen>

      <!-- FORMS -->
      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">FORMS</h2>
      <DesignSpecimen label="Input / Select / Checkbox" viewport="AUTO">
        <div class="spec-form">
          <Input label="Callsign" id="sp-callsign" placeholder="n0body" prefix="$" hint="Shown on your badge" />
          <Select
            label="Track"
            id="sp-track"
            options={[
              { value: "comms", label: "Comms without internet" },
              { value: "data", label: "Data backup" },
              { value: "info", label: "Information integrity" },
              { value: "civic", label: "Civic coordination" },
            ]}
          />
          <Checkbox label="I'll bring a battery pack" name="batt" checked />
          <Checkbox label="Disabled option" name="nope" disabled />
        </div>
      </DesignSpecimen>

      <!-- BRAND: SIGNAL BARS -->
      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">SIGNAL BARS</h2>
      <DesignSpecimen label="SignalBars — levels 1–4 + animated" viewport="AUTO">
        <div class="spec-row spec-row--center">
          <div class="spec-signal-cell">
            <SignalBars level={1} height={32} />
            <span class="t-dim">1/4</span>
          </div>
          <div class="spec-signal-cell">
            <SignalBars level={2} height={32} />
            <span class="t-dim">2/4</span>
          </div>
          <div class="spec-signal-cell">
            <SignalBars level={3} height={32} />
            <span class="t-dim">3/4</span>
          </div>
          <div class="spec-signal-cell">
            <SignalBars level={4} height={32} />
            <span class="t-dim">4/4</span>
          </div>
          <div class="spec-signal-cell">
            <SignalBars animated height={32} />
            <span class="t-dim">animated</span>
          </div>
        </div>
      </DesignSpecimen>

      <!-- BRAND: STATUS DOT -->
      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">STATUS DOT</h2>
      <DesignSpecimen label="StatusDot — online / degraded / offline" viewport="AUTO">
        <div class="spec-row">
          <StatusDot status="online" label="ONLINE" />
          <StatusDot status="degraded" label="DEGRADED" />
          <StatusDot status="offline" label="OFFLINE" />
        </div>
      </DesignSpecimen>

      <!-- BRAND: TERMINAL BLOCK -->
      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">TERMINAL BLOCK</h2>
      <DesignSpecimen label="TerminalBlock" viewport="AUTO">
        <TerminalBlock
          title="digiresithon@tw:~"
          lines={[
            { prompt: "$", text: "join --track comms" },
            { text: "Connecting to mesh…", tone: "green" },
            { text: "# 2km hop established", tone: "dim" },
            { text: "ERROR: no backbone route", tone: "red" },
          ]}
        />
      </DesignSpecimen>

      <!-- BRAND: MARQUEE -->
      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">MARQUEE</h2>
      <DesignSpecimen label="Marquee" viewport="AUTO">
        <Marquee items={["RESILIENCE", "COMMS", "DATA", "INFO", "CIVIC", "DIGIRESITHON YEAR 0"]} />
      </DesignSpecimen>

      <!-- TABS -->
      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">TABS</h2>
      <DesignSpecimen label="Tabs — interactive (emits tab:change)" viewport="AUTO">
        <Tabs
          active="all"
          items={[
            { id: "all", label: "All", count: 6 },
            { id: "comms", label: "Comms" },
            { id: "data", label: "Data" },
            { id: "info", label: "Info" },
            { id: "civic", label: "Civic" },
          ]}
        />
        <p class="t-dim" style="font-size: var(--text-xs); margin-top: var(--sp-3);">
          Click a tab above — it dispatches <code>tab:change</code> CustomEvent (bubbles: true) with <code>detail.id</code>.
        </p>
      </DesignSpecimen>
    </div>
  </BaseLayout>
  <style>
    .dk-components { padding-block: var(--sp-7) var(--sp-9); }
    .spec-row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sp-3);
      align-items: flex-start;
    }
    .spec-row--center { align-items: center; }
    .spec-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--sp-4);
    }
    .spec-stack {
      display: flex;
      flex-direction: column;
      gap: var(--sp-3);
    }
    .spec-form {
      display: flex;
      flex-direction: column;
      gap: var(--sp-5);
      max-width: 400px;
    }
    .spec-signal-cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--sp-2);
      font-size: var(--text-xs);
      font-family: var(--font-mono);
      letter-spacing: var(--tracking-label);
    }
    @media (max-width: 640px) {
      .spec-grid-3 { grid-template-columns: 1fr; }
    }
  </style>
  ```

- [ ] **Step 9: Extend `tests/e2e/design-kits.spec.ts` — append components assertions**

  Append to `tests/e2e/design-kits.spec.ts`:
  ```typescript

  test("/design-kits/components/ returns 200 and shows group labels", async ({ page }) => {
    const response = await page.goto("design-kits/components/");
    expect(response?.status()).toBe(200);
    await expect(page.getByText("BUTTON")).toBeVisible();
    await expect(page.getByText("BADGE")).toBeVisible();
    await expect(page.getByText("ALERT")).toBeVisible();
    await expect(page.getByText("FORMS")).toBeVisible();
    await expect(page.getByText("SIGNAL BARS")).toBeVisible();
    await expect(page.getByText("TERMINAL BLOCK")).toBeVisible();
    await expect(page.getByText("MARQUEE")).toBeVisible();
    await expect(page.getByText("TABS")).toBeVisible();
  });
  ```

- [ ] **Step 10: Type-check**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run check
  ```
  Expected: exits 0, `0 errors`.

- [ ] **Step 11: Build and run tests**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run build && npx playwright test tests/e2e/design-kits.spec.ts
  ```
  Expected: `5 passed`.

- [ ] **Step 12: Commit**

  ```bash
  git add src/components/Alert.astro src/components/Badge.astro src/components/Button.astro src/components/Card.astro src/components/Input.astro src/components/Select.astro src/components/Checkbox.astro src/pages/design-kits/components.astro tests/e2e/design-kits.spec.ts
  git commit -m "feat(design-kits): add components specimen page (+ minimal Astro ports)"
  ```

---

### Task 14: `/design-kits/patterns.astro`

**Files:**
- Create: `src/pages/design-kits/patterns.astro`
- Modify: `tests/e2e/design-kits.spec.ts`

**Interfaces:**
- Consumes: `BaseLayout`, `DesignKitsNav`, `DesignSpecimen` (Task 8), `SectionHeader.astro` (label, right props — confirmed in `src/components/SectionHeader.astro`); CSS tokens: `--scanlines`, `--stripe-caution`, `--checker`, `--dur-1`, `--dur-2`, `--ease-step-2`, `--ease-step-4` all confirmed in `src/styles/global.css` lines 141–153; `@keyframes drt-blink` confirmed at line 219
- Produces: `/design-kits/patterns/` route with text "SCANLINES"

- [ ] **Step 1: Create `src/pages/design-kits/patterns.astro`**

  Write the full file:
  ```astro
  ---
  import BaseLayout from "../../layouts/BaseLayout.astro";
  import DesignKitsNav from "../../components/DesignKitsNav.astro";
  import DesignSpecimen from "../../components/DesignSpecimen.astro";
  import SectionHeader from "../../components/SectionHeader.astro";
  ---
  <BaseLayout
    title="Patterns — Design Kits — DigiResiThon"
    description="Scanlines, box-drawing, slash, motion tokens, stripe-caution, and checker patterns."
    lang="en"
  >
    <DesignKitsNav />
    <div class="container dk-patterns" data-pagefind-ignore="all">
      <h1 class="pixel-h pixel-h--2" style="margin-top: var(--sp-7);">PATTERNS</h1>

      <!-- SCANLINES -->
      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">SCANLINES</h2>
      <DesignSpecimen label="--scanlines over dark panel" viewport="AUTO">
        <div class="scanlines-demo">
          <div class="scanlines-overlay" aria-hidden="true"></div>
          <p class="scanlines-text t-dim">CRT TEXTURE &middot; repeating-linear-gradient &middot; 6% alpha</p>
          <p class="scanlines-text t-dim">Applied to hero sections and terminal panels. Never over long body text.</p>
        </div>
      </DesignSpecimen>

      <!-- BOX-DRAWING -->
      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">BOX-DRAWING HEADERS</h2>
      <DesignSpecimen label="SectionHeader component — box-drawing + mono ornament" viewport="AUTO">
        <div class="spec-stack">
          <SectionHeader label="PROJECTS" right="SAMPLE DATA · YEAR 0" />
          <SectionHeader label="SCHEDULE" right="2026.10.24–25" />
          <SectionHeader label="HANDBOOK" />
        </div>
        <p class="t-dim" style="font-size: var(--text-xs); margin-top: var(--sp-4);">
          Characters: <code>┌─ SECTION ─────┐</code> — set in <code>--font-mono</code>, never <code>--font-pixel</code>.
          Dividers: <code>── // ──</code>. Tree lists: <code>├─</code> <code>└─</code>.
        </p>
      </DesignSpecimen>

      <!-- SLASH -->
      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">SLASH</h2>
      <DesignSpecimen label="45° red divider — one per view" viewport="AUTO">
        <div class="slash-demo">
          <div class="slash-band" aria-hidden="true"></div>
          <p class="slash-text t-dim">
            The 45° red slash echoes the logo mark. At most <strong>one</strong> per screen.
            Implemented with <code>transform: rotate(45deg)</code> on a positioned element.
          </p>
        </div>
      </DesignSpecimen>

      <!-- MOTION -->
      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">MOTION TOKENS</h2>
      <DesignSpecimen label="--dur-* + --ease-step-* — stepped blink" viewport="AUTO">
        <div class="spec-row" style="align-items: center; gap: var(--sp-6);">
          <div class="motion-demo-cell">
            <div class="motion-blink motion-blink--1"></div>
            <span class="t-dim">drt-blink &middot; steps(1) &middot; 1s</span>
          </div>
          <div class="motion-demo-cell">
            <div class="motion-blink motion-blink--step2"></div>
            <span class="t-dim">steps(2) &middot; dur-1 (100ms)</span>
          </div>
          <div class="motion-demo-cell">
            <div class="motion-blink motion-blink--step4"></div>
            <span class="t-dim">steps(4) &middot; dur-2 (200ms)</span>
          </div>
        </div>
        <p class="t-dim" style="font-size: var(--text-xs); margin-top: var(--sp-4);">
          Motion rules: <code>--dur-1</code> (100ms) &middot; <code>--dur-2</code> (200ms) &middot;
          <code>--ease-step-2</code> (steps(2, end)) &middot; <code>--ease-step-4</code> (steps(4, end)).
          No parallax, no soft fades, no bounce.
        </p>
      </DesignSpecimen>

      <!-- STRIPE-CAUTION -->
      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">STRIPE-CAUTION</h2>
      <DesignSpecimen label="--stripe-caution — hazard band" viewport="AUTO">
        <div class="stripe-demo" aria-label="stripe-caution pattern">
          <span class="t-dim" style="position: relative; z-index: 1;">--stripe-caution: repeating-linear-gradient(-45deg, --ink 0 10px, transparent 10px 20px)</span>
        </div>
      </DesignSpecimen>

      <!-- CHECKER -->
      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">CHECKER</h2>
      <DesignSpecimen label="--checker — image placeholder" viewport="AUTO">
        <div class="checker-demo" aria-label="checker placeholder pattern">
          <span class="checker-caption t-dim">IMAGE PLACEHOLDER · 8px CHECKER</span>
        </div>
      </DesignSpecimen>
    </div>
  </BaseLayout>
  <style>
    .dk-patterns { padding-block: var(--sp-7) var(--sp-9); }
    .spec-stack { display: flex; flex-direction: column; gap: var(--sp-3); }
    .spec-row { display: flex; flex-wrap: wrap; gap: var(--sp-3); align-items: flex-start; }

    /* Scanlines demo */
    .scanlines-demo {
      position: relative;
      background: var(--surface-sunken);
      min-height: 120px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: var(--sp-5);
      gap: var(--sp-2);
    }
    .scanlines-overlay {
      position: absolute;
      inset: 0;
      background: var(--scanlines);
      pointer-events: none;
    }
    .scanlines-text {
      position: relative;
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      margin: 0;
      z-index: 1;
    }

    /* Slash demo */
    .slash-demo {
      position: relative;
      overflow: hidden;
      background: var(--surface-sunken);
      min-height: 100px;
      display: flex;
      align-items: center;
      padding: var(--sp-5);
    }
    .slash-band {
      position: absolute;
      left: 52%;
      top: -40px;
      width: 6px;
      height: calc(100% + 80px);
      background: var(--accent);
      transform: rotate(45deg);
      transform-origin: center center;
    }
    .slash-text {
      position: relative;
      z-index: 1;
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      margin: 0;
      max-width: 50%;
    }

    /* Motion demo */
    .motion-demo-cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--sp-3);
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      letter-spacing: var(--tracking-label);
    }
    .motion-blink {
      width: 24px;
      height: 24px;
      background: var(--accent-2);
    }
    .motion-blink--1 { animation: drt-blink 1s steps(1) infinite; }
    .motion-blink--step2 { animation: drt-blink var(--dur-1) var(--ease-step-2) infinite alternate; }
    .motion-blink--step4 { animation: drt-blink var(--dur-2) var(--ease-step-4) infinite alternate; }
    @media (prefers-reduced-motion: reduce) {
      .motion-blink { animation: none; opacity: 0.6; }
    }

    /* Stripe demo */
    .stripe-demo {
      background: var(--stripe-caution);
      min-height: 60px;
      display: flex;
      align-items: center;
      padding: var(--sp-4);
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      letter-spacing: var(--tracking-label);
      opacity: 0.5;
    }

    /* Checker demo */
    .checker-demo {
      background: var(--checker);
      background-size: 16px 16px;
      min-height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .checker-caption {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      letter-spacing: var(--tracking-label);
      text-transform: uppercase;
      background: var(--surface);
      padding: 4px 8px;
      border: var(--border-soft);
    }
  </style>
  ```

- [ ] **Step 2: Extend `tests/e2e/design-kits.spec.ts` — append patterns assertion**

  Append to `tests/e2e/design-kits.spec.ts`:
  ```typescript

  test("/design-kits/patterns/ returns 200 and shows SCANLINES heading", async ({ page }) => {
    const response = await page.goto("design-kits/patterns/");
    expect(response?.status()).toBe(200);
    await expect(page.getByText("SCANLINES")).toBeVisible();
  });
  ```

- [ ] **Step 3: Type-check**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run check
  ```
  Expected: exits 0, `0 errors`.

- [ ] **Step 4: Build and run tests**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run build && npx playwright test tests/e2e/design-kits.spec.ts
  ```
  Expected: `6 passed`.

- [ ] **Step 5: Commit**

  ```bash
  git add src/pages/design-kits/patterns.astro tests/e2e/design-kits.spec.ts
  git commit -m "feat(design-kits): add patterns page"
  ```

---

### Task 15: `/design-kits/website.astro` — full ui_kits/website specimen

**Files:**
- Create: `src/pages/design-kits/website.astro`
- Modify: `tests/e2e/design-kits.spec.ts`

**Interfaces:**
- Consumes:
  - `BaseLayout`, `DesignKitsNav`, `DesignSpecimen` (Task 8)
  - `Projects.astro` from Task 6 (no props; self-contained component with YAML data)
  - `SectionHeader.astro` (label, right props)
  - `Marquee.astro` (items, speed props)
  - `StatusDot.astro` (status, label props)
  - `Button.astro` from Task 13 (variant, size, type props)
  - `RegisterDialog.astro` (existing component; uses `data-open-register` convention wired in Task 7)
  - Global `.card`, `.card-head`, `.card-title`, `.card-body` classes
- Produces: `/design-kits/website/` route with text "ui_kits/website"; a self-contained website specimen

**Note:** The real `SiteHeader` is not imported here to avoid a second navigation bar inside the page. Instead, a stripped header replica is rendered inside the specimen box using raw HTML with global button/badge classes, demonstrating the header chrome without DOM conflicts.

- [ ] **Step 1: Create `src/pages/design-kits/website.astro`**

  Write the full file:
  ```astro
  ---
  import BaseLayout from "../../layouts/BaseLayout.astro";
  import DesignKitsNav from "../../components/DesignKitsNav.astro";
  import DesignSpecimen from "../../components/DesignSpecimen.astro";
  import Projects from "../../components/Projects.astro";
  import SectionHeader from "../../components/SectionHeader.astro";
  import Marquee from "../../components/Marquee.astro";
  import StatusDot from "../../components/StatusDot.astro";
  import Button from "../../components/Button.astro";
  import RegisterDialog from "../../components/RegisterDialog.astro";
  ---
  <BaseLayout
    title="Website — Design Kits — DigiResiThon"
    description="Full ui_kits/website specimen: header, landing, schedule, projects, register dialog."
    lang="en"
  >
    <DesignKitsNav />
    <div class="container dk-website" data-pagefind-ignore="all">
      <h1 class="pixel-h pixel-h--2" style="margin-top: var(--sp-7);">WEBSITE</h1>
      <p class="t-dim" style="margin-top: var(--sp-3); font-size: var(--text-sm);">
        This specimen composes the same Astro components /schedule/ and /projects/ use in production.
        Source canvas: <code>design/ui_kits/website/Website.jsx</code>.
      </p>

      <!-- HEADER SPECIMEN -->
      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">HEADER</h2>
      <DesignSpecimen label="ui_kits/website — SiteHeader" viewport="1440">
        <div class="ws-header-demo">
          <nav class="ws-nav" aria-label="Website specimen navigation">
            <span class="ws-wordmark t-dim">DigiResiThon</span>
            <div class="ws-nav-links">
              <a class="ws-nav-link ws-nav-active">HOME</a>
              <a class="ws-nav-link">SCHEDULE</a>
              <a class="ws-nav-link">PROJECTS</a>
            </div>
            <div class="ws-nav-actions">
              <StatusDot status="online" label="ONLINE" />
              <Button variant="primary" size="sm" type="button">Register</Button>
            </div>
          </nav>
        </div>
      </DesignSpecimen>

      <!-- LANDING MARQUEE -->
      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">LANDING — MARQUEE</h2>
      <DesignSpecimen label="ui_kits/website — Marquee ticker" viewport="1440">
        <Marquee items={["KEEP COMMS ALIVE", "SYNC OFFLINE", "DATA SURVIVES", "DIGIRESITHON YEAR 0", "2026.10.24-25"]} />
      </DesignSpecimen>

      <!-- LANDING TRACKS GRID -->
      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">LANDING — TRACKS</h2>
      <DesignSpecimen label="ui_kits/website — track cards" viewport="1440">
        <SectionHeader label="TRACKS" right="YEAR 0 · 4 ACTIVE" />
        <div class="ws-tracks-grid" style="margin-top: var(--sp-5);">
          <div class="card">
            <div class="card-head"><span class="card-title">COMMS</span><span class="card-meta">8 PROJECTS</span></div>
            <div class="card-body">Mesh networks, LoRa, ham radio bridges, sneakernet protocols. Talk when the backbone can't.</div>
          </div>
          <div class="card">
            <div class="card-head"><span class="card-title">DATA</span><span class="card-meta">6 PROJECTS</span></div>
            <div class="card-body">Mirrors, offline caches, distributed archives. The data survives even when the datacenter doesn't.</div>
          </div>
          <div class="card">
            <div class="card-head"><span class="card-title">INFO</span><span class="card-meta">5 PROJECTS</span></div>
            <div class="card-body">Verified emergency info, rumor triage, low-bandwidth broadcast. Truth at 300 baud.</div>
          </div>
          <div class="card">
            <div class="card-head"><span class="card-title">CIVIC</span><span class="card-meta">4 PROJECTS</span></div>
            <div class="card-body">Shelter maps, mutual-aid boards, paper-compatible workflows. Neighbors as infrastructure.</div>
          </div>
        </div>
      </DesignSpecimen>

      <!-- PROJECTS SPECIMEN -->
      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">PROJECTS</h2>
      <DesignSpecimen label="ui_kits/website — Projects (live component, same as /projects/)" viewport="1440">
        <Projects />
      </DesignSpecimen>

      <!-- REGISTER DIALOG DEMO -->
      <h2 class="label" style="margin-top: var(--sp-7); margin-bottom: var(--sp-4);">REGISTER DIALOG</h2>
      <DesignSpecimen label="ui_kits/website — RegisterDialog (click to preview)" viewport="AUTO">
        <div class="ws-reg-demo">
          <Button variant="primary" type="button" data-open-register>Open Register Dialog</Button>
          <p class="t-dim" style="font-size: var(--text-xs); margin-top: var(--sp-3);">
            Opens the shared <code>RegisterDialog.astro</code>. ESC and backdrop click dismiss.
            Focus returns to this button on close.
          </p>
        </div>
      </DesignSpecimen>
    </div>
    <RegisterDialog />
  </BaseLayout>
  <style>
    .dk-website { padding-block: var(--sp-7) var(--sp-9); }
    .ws-header-demo {
      border: var(--border);
      background: var(--bg);
    }
    .ws-nav {
      display: flex;
      align-items: center;
      gap: var(--sp-6);
      height: 64px;
      padding: 0 var(--gutter);
      border-bottom: var(--border);
    }
    .ws-wordmark {
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      font-weight: 700;
      letter-spacing: var(--tracking-label);
      text-transform: uppercase;
      flex: none;
    }
    .ws-nav-links {
      display: flex;
      gap: var(--sp-1);
      margin-right: auto;
    }
    .ws-nav-link {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      font-weight: 600;
      letter-spacing: var(--tracking-label);
      text-transform: uppercase;
      color: var(--ink);
      text-decoration: none;
      padding: 8px 12px;
      cursor: pointer;
    }
    .ws-nav-active {
      background: var(--ink);
      color: var(--ink-on-ink);
    }
    .ws-nav-actions {
      display: flex;
      align-items: center;
      gap: var(--sp-4);
    }
    .ws-tracks-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--sp-4);
    }
    .ws-reg-demo {
      padding: var(--sp-5);
      background: var(--surface-sunken);
      border: var(--border-offline);
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--sp-3);
    }
    @media (max-width: 768px) {
      .ws-tracks-grid { grid-template-columns: 1fr; }
    }
  </style>
  ```

- [ ] **Step 2: Extend `tests/e2e/design-kits.spec.ts` — append website assertion**

  Append to `tests/e2e/design-kits.spec.ts`:
  ```typescript

  test("/design-kits/website/ returns 200 and shows specimen label", async ({ page }) => {
    const response = await page.goto("design-kits/website/");
    expect(response?.status()).toBe(200);
    await expect(page.getByText("ui_kits/website")).toBeVisible();
  });
  ```

- [ ] **Step 3: Type-check**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run check
  ```
  Expected: exits 0, `0 errors`.

- [ ] **Step 4: Build and run tests**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run build && npx playwright test tests/e2e/design-kits.spec.ts
  ```
  Expected: `7 passed`.

- [ ] **Step 5: Commit**

  ```bash
  git add src/pages/design-kits/website.astro tests/e2e/design-kits.spec.ts
  git commit -m "feat(design-kits): add website specimen page"
  ```

---

### Task 16: PWA + Pagefind exclusions

**Files:**
- Modify: `pagefind.yml`
- Modify: `src/pages/projects.astro`
- Modify: `src/pages/design-kits/index.astro`
- Modify: `src/pages/design-kits/logo.astro`
- Modify: `src/pages/design-kits/colors.astro`
- Modify: `src/pages/design-kits/typography.astro`
- Modify: `src/pages/design-kits/components.astro`
- Modify: `src/pages/design-kits/patterns.astro`
- Modify: `src/pages/design-kits/website.astro`

**Interfaces:**
- Consumes:
  - `scripts/precache-globs.mjs` — the current globs list (verified: only `handbook/**/*.html` is in the HTML globs; `design-kits/**` and `projects/**` are already absent, so no HTML for those routes enters the precache manifest)
  - `astro.config.mjs` — `workbox.navigateFallbackDenylist` already denies everything except `handbook/`; no change needed to denylist
  - `pagefind.yml` — currently only `force_language: "zh"` (one line)
  - `data-pagefind-ignore="all"` attribute already added to each page's content wrapper in Tasks 9–15 (belt 1); this task adds pagefind config exclusion (belt 2) and verifies precache budget
- Produces: verified build where `grep -r "design-kits\|projects" dist/sw.js` returns no route entries for those paths

**Note on precache:** `scripts/precache-globs.mjs` does not include `design-kits/**/*.html` or `projects/**/*.html` — only `handbook/**/*.html`. So those routes are already excluded from the precache manifest. `astro.config.mjs` workbox config does not need changes. The task verifies this explicitly.

- [ ] **Step 1: Verify precache globs exclude design-kits and projects**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run build && grep -E "(design-kits|\/projects)" dist/sw.js | head -20
  ```
  Expected: no output (zero matches) — confirming neither route appears in the service-worker precache manifest.

- [ ] **Step 2: Update `pagefind.yml` — add path exclusion via exclude_glob**

  The current `pagefind.yml` contains only:
  ```yaml
  force_language: "zh"
  ```

  Replace with:
  ```yaml
  force_language: "zh"
  exclude_glob:
    - "design-kits/**"
    - "projects/**"
  ```

  This prevents pagefind from indexing any HTML under `dist/design-kits/` or `dist/projects/` even if the `data-pagefind-ignore` attribute is missing.

- [ ] **Step 3: Add `data-pagefind-ignore="all"` to `src/pages/projects.astro`**

  The current `src/pages/projects.astro` wraps content in `<Projects />` which already has `data-pagefind-ignore="all"` on its outermost div (see Task 6, Step 2). No additional change is needed, but verify by reading the file and confirming the attribute is present on the `.projects-wrap` div.

  Run:
  ```bash
  grep -n "pagefind-ignore" /Users/cheng/digiresi.g0v.tw/src/components/Projects.astro
  ```
  Expected: one line like `<div class="projects-wrap container" data-pagefind-ignore="all">`.

- [ ] **Step 4: Confirm `data-pagefind-ignore` on all design-kits pages**

  Run:
  ```bash
  grep -l "pagefind-ignore" /Users/cheng/digiresi.g0v.tw/src/pages/design-kits/*.astro | wc -l
  ```
  Expected: `7` (all seven design-kits pages created in Tasks 9–15 contain the attribute on their content wrapper).

- [ ] **Step 5: Build and verify precache budget**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run build && npm run check:budget
  ```
  Expected output ends with `PASS: precache total <N> bytes <= 10485760`.

- [ ] **Step 6: Verify no design-kits or projects HTML in precache**

  Run:
  ```bash
  grep -E '"(design-kits|projects)/' /Users/cheng/digiresi.g0v.tw/dist/sw.js | head -5
  ```
  Expected: no output (zero matches).

- [ ] **Step 7: Commit**

  ```bash
  git add pagefind.yml
  git commit -m "chore(pwa,search): exclude design-kits and projects from precache + index"
  ```

---

### Task 17: Final verification

**Files:**
- No new files created. If any formatter produces a diff, one final cosmetic commit is made.

**Interfaces:**
- Consumes: all files created/modified in Tasks 1–16
- Produces: green CI across all check commands; a final cosmetic commit if formatters produce a diff

- [ ] **Step 1: Astro type check**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run check
  ```
  Expected: exits 0, `0 errors, 0 warnings`.
  If this fails: STOP. Open a follow-up task for the specific type error — do not auto-fix here.

- [ ] **Step 2: Vitest unit tests**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run test
  ```
  Expected: all Vitest specs pass, exit code 0.
  If this fails: STOP. Open a follow-up task.

- [ ] **Step 3: Link check**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run build && npm run check:links
  ```
  Expected: exits 0, no broken links reported.
  If this fails: STOP. Open a follow-up task.

- [ ] **Step 4: Budget check**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npm run check:budget
  ```
  Expected: `PASS: precache total <N> bytes <= 10485760`.
  If this fails: STOP. The likely cause is a vendored image under `public/handbook-assets/` exceeding the budget — do not auto-fix.

- [ ] **Step 5: Full Playwright E2E suite**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && npx playwright test
  ```
  Expected: all specs pass, including:
  - `tests/e2e/attribution.spec.ts` — `1 passed`
  - `tests/e2e/theme-toggle.spec.ts` — `1 passed`
  - `tests/e2e/projects.spec.ts` — `3 passed`
  - `tests/e2e/register-dialog.spec.ts` — `3 passed`
  - `tests/e2e/design-kits.spec.ts` — `7 passed`
  - All existing specs (handbook offline, etc.) — still pass (regression check: `/handbook/**` routes remain in the precache)

  If any spec fails: STOP. Open a follow-up task scoped to the failing spec file — do not auto-fix in this task.

- [ ] **Step 6: Cosmetic commit (only if formatters produce a diff)**

  Run:
  ```bash
  cd /Users/cheng/digiresi.g0v.tw && git status
  ```
  If `git status` shows modified files after running formatters as part of the above commands, commit them:
  ```bash
  git add -p
  git commit -m "chore: run formatters after implementation"
  ```
  If `git status` is clean, skip this step.

---

## Plan Self-Review

**Spec coverage check** — each spec section mapped to a task:

- Spec §1 Overview (three deliverables) — Tasks 1 (DesignSync refresh), 9–15 (design-kits route), 3+4+5+6+7 (ui_kits/website port)
- Spec §2 Non-goals — enforced by task boundaries: no backend, no zh-TW translation of design-kits pages, no edits to `design/*.jsx` sources, `design/ui_kits/website/index.html` left intact
- Spec §3 Attribution — Task 2 (LICENSE.md, README.md, SiteFooter); Task 10 (logo page attribution block + `TODO(yellowone-url)` grep-marker)
- Spec §4 /design-kits/ route (7 pages) — Tasks 9 (index), 10 (logo), 11 (colors), 12 (typography), 13 (components), 14 (patterns), 15 (website)
- Spec §5 ui_kits/website port — Tasks 3 (ThemeToggle), 4 (nav extension), 5 (Tabs), 6 (Projects), 7 (RegisterDialog wiring), 15 (website specimen)
- Spec §6 File layout — every `src/pages/design-kits/*.astro`, `src/components/*.astro`, `src/data/projects.yaml`, `design/assets/logo/LICENSE.md`, `public/design/assets/logo/*.png` path is accounted for across Tasks 1–16
- Spec §7 Testing — E2E specs per feature: attribution (Task 2), theme toggle (Task 3), projects (Task 6), register dialog (Task 7), design-kits pages (Tasks 9–15 each append to `design-kits.spec.ts`), precache budget (Tasks 16–17); regression: handbook offline spec in Task 17 Step 5
- Spec §8 Rollout order — task numbering matches spec rollout order: DesignSync (1) → attribution (2) → ThemeToggle (3) → nav (4) → Tabs (5) → Projects (6) → Register (7) → scaffolds (8) → design-kits pages (9–15) → exclusions (16) → verification (17)

**Placeholder scan** — grep for TBD / TODO / "implement later" / "add appropriate" across the plan: none found except the intentional `TODO(yellowone-url)` grep-marker in Tasks 2 and 10, which is required by the spec.

**Type/name consistency** — verified across tasks:
- `Tabs.astro` dispatches `"tab:change"` CustomEvent (Task 5, Step 1) and is consumed via `document.querySelector(".projects-wrap")?.addEventListener("tab:change", …)` in `Projects.astro` (Task 6, Step 2). Same event name in both.
- `ThemeToggle.astro` writes `localStorage.setItem("digiresi:theme", …)` (Task 3, Step 1) and `BaseLayout.astro` reads `localStorage.getItem("digiresi:theme")` (Task 3, Step 2). Same key in both; old `"drt-theme"` key is removed from both.
- `DesignSpecimen` props `label` and `viewport` (Task 8, Step 1) are used with those exact names in Tasks 13 (Step 8), 14 (Step 1), and 15 (Step 1).
- `DesignKitsNav` 7-link contract (Task 8, Step 2): `overviewHref` + 6 sub-paths — each sub-path corresponds to exactly one page created in Tasks 9–15.
- `data-open-register` convention: set on openers in `index.astro` (Task 7, Step 1) and `design-kits/website.astro` (Task 15, Step 1); consumed by `RegisterDialog.astro` script's `querySelectorAll("[data-open-register]")` (Task 7, Step 2).
- `data-pagefind-ignore="all"` attribute: present on the outermost content wrapper in all seven `src/pages/design-kits/*.astro` files (Tasks 9–15, each Step 1) and on `.projects-wrap` in `Projects.astro` (Task 6, Step 2); validated by Task 16 Steps 3–4.
- Logo PNG filenames: `mark-dark.png`, `mark.png`, `wordmark-dark.png`, `wordmark.png` — verified to exist in `design/assets/logo/` (bash `ls` check during planning); copied to `public/design/assets/logo/` in Task 10 Step 1 before being referenced in Task 10 Step 2.
