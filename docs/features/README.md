---
commissioned-by: spacedock@0.26.0
entity-type: feature
entity-label: feature
entity-label-plural: features
id-style: sd-b32
state: .spacedock-state
stages:
  defaults:
    worktree: false
    concurrency: 2
  states:
    - name: backlog
      initial: true
      gate: true
    - name: design
      gate: true
    - name: implementation
      worktree: true
    - name: validation
      worktree: true
      fresh: true
      feedback-to: implementation
      gate: true
    - name: done
      terminal: true
---

# Ship features to digiresi.g0v.tw

This workflow runs shippable changes to the digiresi.g0v.tw Astro site through the loop this repo already practices — brainstorm, spec, bite-sized plan, subagent-driven implementation, independent review, PR, merge — but with durable per-feature state that survives across sessions and branches.

The existing superpowers SDD scaffolding at `.superpowers/sdd/` is the machinery, not the memory: its per-task briefs and `progress.md` are written fresh on each branch and lost when the next branch starts. This workflow keeps superpowers doing the stage work (`brainstorming` at backlog, `writing-plans` at design, `subagent-driven-development` at implementation) and adds the layer superpowers does not have — a feature record that persists from first idea to merged PR.

The site is an Astro build deployed at a custom domain root, with a PWA service worker, a client-side search index, Playwright e2e, and vitest unit tests. Four gotchas have bitten this repo already and are encoded as validation checks below.

## File Naming

Each feature lives as either:

- a flat markdown file `{slug}.md` (default — use this unless the feature produces many artifacts), or
- a folder `{slug}/` containing `index.md` as the canonical feature file, when the feature produces per-stage artifacts (design notes, screenshots, comparison tables) that belong alongside the tracker.

Slugs are lowercase, hyphens, no spaces. Example: `design-kits.md` or `design-kits/index.md`. The status scanner recognizes both forms; `--set` and `--archive` resolve the slug either way, and folder entities archive as a whole folder.

## State Backend

This workflow is **split-root**: `state: .spacedock-state`.

This README — the living spec — is tracked on the code branch. Mutable feature state lives on the orphan branch `spacedock-state/features`, checked out as a linked worktree at `docs/features/.spacedock-state/` (gitignored on the code branch). Routine stage transitions therefore never churn the code branch and never collide with an open feature PR.

On a fresh clone the state worktree is absent. Run `spacedock state init` to fetch the orphan branch and re-add the linked worktree.

## Schema

Every feature file has YAML frontmatter. Fields are documented below; see **Feature Template** for a copy-paste starter.

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier; SD-B32 24-character stored ID |
| `title` | string | Human-readable feature name |
| `status` | enum | One of: backlog, design, implementation, validation, done |
| `source` | string | Where this feature came from (issue, captain note, retrospective, survey) |
| `started` | ISO 8601 | When active work began |
| `completed` | ISO 8601 | When the feature reached terminal status |
| `verdict` | enum | PASSED or REJECTED — set at validation |
| `score` | number | Priority score, 0.0–1.0 (optional) |
| `worktree` | string | Worktree path while a dispatched agent is active, empty otherwise. Set on first dispatch into a `worktree: true` stage, sticky across non-terminal advancements, cleared at terminal merge. |
| `issue` | string | GitHub issue reference (e.g., `#42` or `g0v/digiresi.g0v.tw#42`). Optional cross-reference, set manually. |
| `pr` | string | GitHub PR reference (e.g., `#57`). Set when a PR is opened for this feature's branch; managed by the `pr-merge` mod. |
| `mod-block` | string | Pending mod-declared blocking action, format `{lifecycle_point}:{mod_name}` |

### ID Style

`id-style: sd-b32`. The `id` field stores the full stable 24-character lowercase SD-B32 value returned by `spacedock status --next-id --id-seed <slug>`. SD-B32 is Spacedock Base32: SHA-256 digest material formatted with the human-safe alphabet `0123456789abcdefghjkmnpqrstvwxyz`.

Status tables display the shortest unique prefix (`MIN_PREFIX: 2`), computed across active plus archived features. Display prefixes can lengthen when a new feature collides on a prefix; stored IDs never change. This style is used here because features are created from concurrent worktree branches with a PR/merge ritual — generated IDs reconcile without a shared counter.

Use `spacedock status --validate` before trusting workflow state, and `spacedock status --resolve <ref>` to resolve a slug, stored ID, or address prefix.

## Stages

### `backlog`

A feature enters backlog when it is first proposed — a seed description of what should change and why, with no design work done. Captain-curated holding stage: the gate decides which features advance to design.

- **Inputs:** the captain's proposal, a GitHub issue, a survey finding, or a retrospective note. Whatever prompted "this site should do X."
- **Outputs:**
  - A `## Problem` section naming what is broken or missing on the live site and why it matters now — not a restatement of the desired solution.
  - A one-paragraph sketch of the user-visible change, concrete enough that the captain can judge whether it is worth designing.
  - No spec, no plan, no code. If you find yourself deciding *how*, you are in the wrong stage.
- **Good:** the problem is stated from the site visitor's or contributor's point of view, and would still read as a problem if someone proposed a different solution.
- **Bad:** a solution wearing a problem's clothes ("we need a Tabs component"); a proposal so vague the captain cannot gate it ("improve the design system"); starting the spec here because the idea felt clear.

### `design`

The captain has greenlit the feature. This stage produces both the spec and the bite-sized implementation plan, using the superpowers `brainstorming` and `writing-plans` disciplines. The gate at the end of this stage is where scope is settled on the record — the question "how does this land on the live site?" belongs here, not mid-implementation.

- **Inputs:** the backlog entry, the current site structure (`src/pages/`, `src/components/`, `src/layouts/`), any relevant design canvas or `ui_kits/` source material, and the four site invariants listed under Workflow-specific rules.
- **Outputs:**
  - A spec at `docs/superpowers/specs/{date}-{slug}.md` describing the user-visible end state — what a visitor sees, at which routes.
  - A bite-sized implementation plan at `docs/superpowers/plans/{date}-{slug}.md`, decomposed into tasks each of which one dispatched agent can complete and one reviewer can check.
  - Acceptance criteria written as **end-state properties of the shipped site**, each with a `Verified by:` clause naming something outside this feature body — a test name, a command's exit code, a file the change produces, resulting on-disk state.
  - Each AC labelled **offline** (a fresh agent reproduces it via test or command) or **interactive** (needs a human or a live browser drive to judge — visual design, layout feel, copy tone). Declare the split here. An interactive AC is validated by a live drive or the captain; a plan that would build automation to judge an interactive AC is visible at this gate, before the automation is built.
  - An explicit `## Out of scope` section. This is the artifact of the scope decision.
- **Good:** the plan's task boundaries match what one agent can hold in context; every AC names the falsifying change ("this fails if the built HTML at `/design-kits/colors/` no longer contains a swatch for `--color-accent`"); the out-of-scope section names at least one tempting adjacent thing you are deliberately not doing.
- **Bad:** acceptance criteria whose only proof is re-reading the spec; a plan with a task that says "implement the feature"; deferring the scope question to implementation because it felt easier to decide with code in front of you; writing the plan without reading the existing components you are about to port or extend.

### `implementation`

The plan is approved. The feature is built on its own branch in a dedicated worktree, dispatching one agent per plan task via the superpowers `subagent-driven-development` discipline, with a review round after each task. The main checkout stays clean throughout. The dedicated branch is structural here — it is not a decision to re-make per feature.

- **Inputs:** the approved plan, the per-task briefs, the worktree at `.worktrees/{slug}/`, and the site invariants.
- **Outputs:**
  - Working code on the feature branch, committed per task with conventional-commit subjects, satisfying the plan's tasks in order.
  - Unit tests (vitest) and, where the feature touches routing or PWA behavior, e2e coverage (Playwright) — written before the code they cover, watched fail for the right reason, then made to pass.
  - A progress record so a resumed session knows which tasks landed. The `.superpowers/sdd/progress.md` file remains the in-branch scratchpad; the durable record is this feature file's body.
  - When consuming a review round's findings, triage before fixing:
    - **Material** — breaks an acceptance criterion, or violates one of the four site invariants (base-path, service-worker precache, vitest glob, Playwright base-prefix) on a path a visitor can reach. Fix it.
    - **Correct-but-disproportionate** — substantively right, but no AC breaks and the trigger is outside the supported path. Record a decline naming the finding, its class, why no AC is at risk, and the condition that would promote it to material. Do not fix it.
    - **Needs decision** — a genuine product or compatibility fork. Escalate to the first officer; do not resolve it privately.

    Record the disposition in this feature's `### Feedback Cycles` section so the validation gate can see it. A finding you neither fix nor record is not triaged. **Narrowing an acceptance criterion so a finding passes is not a licensed disposition** — declining a disproportionate finding leaves the product unchanged and is yours to make; weakening the AC changes what the feature promised and requires the captain's sign-off, recorded here.
- **Good:** each commit is one plan task and passes its own tests; the diff contains nothing the plan did not ask for; declines are recorded with the promotion condition named.
- **Bad:** batching several plan tasks into one commit so review cannot isolate a regression; adding a dependency, CI lane, or lint rule the plan did not call for; fixing a review finding by loosening the test that caught it; leaving `progress.md` as the only record of what happened.

### `validation`

An agent that did not build the feature independently verifies it against the design-stage acceptance criteria, reproducing each `Verified by:` clause rather than trusting the implementation's self-report — plus a whole-branch senior review of the diff against the plan. The validator checks what was produced; it does not produce it. Outcome is either gate-approval toward `done` or rejection back to `implementation` with concrete fixes.

- **Inputs:** the approved spec and plan, the feature branch diff, the recorded feedback cycles and declines, and the four site invariants.
- **Outputs:**
  - Each offline AC reproduced independently — run the named test or command, record the actual output or exit code, not a claim that it passes.
  - Each interactive AC judged by an actual live drive against the preview server (or escalated to the captain), never by an offline proxy.
  - Site-invariant checks, all four, every time a feature touches the relevant surface:
    - **Base path** — routes and asset URLs resolve through the shared `BASE` constant, not hardcoded leading slashes. Build and confirm the emitted HTML and the service worker reference correct URLs at the deployed root.
    - **Service-worker precache** — new routes and generated artifacts are deliberately included or excluded from precache and the search index. An unbounded precache is a regression even when every test passes.
    - **Vitest glob** — the test glob still excludes `.worktrees`, so a concurrent feature's worktree cannot pollute this run.
    - **Playwright** — e2e resolves against the preview server as actually served, not against an assumed path prefix.
  - A `npm run build` from clean, plus the full vitest and Playwright suites, with real output recorded.
  - A verdict — PASSED with the evidence, or REJECTED with concrete, actionable fixes naming the AC each fix serves.
  - Triage review findings before routing them, using the same material / correct-but-disproportionate / needs-decision classes as implementation.
  - **Small-change fast path.** Scale checks to the diff's blast radius. A one-line doc fix, a rename, or a gitignore entry does not need the full suite or an adversarial pass — run the invariant checks its diff actually touches. A trivial diff over-validated is its own waste.
- **Good:** the report contains actual command output someone can diff against a re-run; a rejection names which AC each fix serves; the validator says "refuted nothing material" when that is the honest result.
- **Bad:** approving on the implementer's summary without re-running anything; grepping the built output for a string as a stand-in for loading the page when the claim is about what a visitor sees; marking an interactive AC passed from a screenshot the implementer supplied; letting a green test suite substitute for the four invariant checks.

### `done`

Terminal state: the feature's PR is merged into `main` on `g0v/digiresi.g0v.tw`, `completed` is set, `verdict: PASSED`, and the feature is archived. Reached via a real merge tracked on the `pr` field by the `pr-merge` mod — never by flipping a flag by hand.

- **Inputs:** the approved validation report and the open PR.
- **Outputs:** merged PR, `pr` field populated, `completed` timestamp, `verdict: PASSED`, worktree removed, feature archived.
- **Good:** the merge commit references the PR; the deployed site reflects the change.
- **Bad:** setting `status: done` before the PR merges; leaving the worktree behind; merging with the validation report's rejections unaddressed.

## Workflow-specific rules

The first-officer / ensign operating contract already governs generic stage semantics and proof discipline: prefer the cheapest check that can fail — a shipped guard's run, an existing mechanical check, a one-off falsifiable exercise recorded in the report, then the captain's judgment — with new standing enforcement as a last resort rather than a default; prove by exercising rather than re-reading; and reject any acceptance criterion whose only proof is a review of its own prose. Features in this workflow inherit those rules from the contract the first officer loads at boot. The rules below add the specifics for this repo.

- **Repo-mutation worktree layer.** `implementation` and `validation` run in a worktree against the codebase, and `validation` is `fresh` so an independent agent checks the acceptance criteria. PR state lives on the `pr` field, managed by the `pr-merge` mod — there is no `branch`, `pr-open`, or `awaiting-merge` stage. The dedicated branch is a property of the stage, not a per-feature decision.

- **The four site invariants.** Each has already caused a regression in this repo. Any feature touching the relevant surface checks them at validation:
  1. **Base path** — every route and asset URL goes through the shared `BASE` constant. Hardcoded leading slashes break the deployed root. Check the emitted HTML and the service worker, not just the source.
  2. **Service-worker precache and search index** — new routes are deliberately included or excluded. Reference and specimen routes (`/design-kits/`, `/projects/`) are excluded; the exclusion is part of the feature, not a follow-up.
  3. **Vitest glob excludes `.worktrees`** — concurrent features run in sibling worktrees, and an unscoped glob makes one feature's tests fail because of another's.
  4. **Playwright against the served preview** — e2e path resolution follows the preview server as actually configured, not an assumed prefix.

- **Superpowers is the machinery, this workflow is the memory.** Stage work uses the superpowers disciplines — `brainstorming` at backlog, `writing-plans` at design, `subagent-driven-development` at implementation. Those disciplines write `.superpowers/sdd/` briefs and `progress.md`, which are per-branch scratch and are expected to be lost. Anything a future session needs — decisions, declines, AC dispositions, why scope was drawn where it was — is recorded in the feature file, which lives on the state branch and survives.

- **Stages assume dispatch, not inline work.** This repo runs heavily orchestrated (87 subagents across 4 parent sessions in one week). Stage work is dispatched to ensigns; the first officer reads state and dispatches, and does not do stage work itself.

- **No prose-grep over instruction files.** A string, substring, or regex match over an instruction file the model reads (the contract, this README, a skill) never proves a behavioral claim — the matched text was written by the same implementer the check polices, a valid paraphrase fails it, and an inverted clause passes it. To settle a case, ask whether the expected value comes from outside the file under test; if it does not, the check is a tautology. A check binding two independent values that can diverge is legitimate and is not prose-grep. A grep pasted into a validation report as one-off evidence is fine; the same grep committed as a test is banned. Presence or absence is an existence fact and a grep establishes it soundly when that fact is the claim — but when the claim is about what a program or a page actually does, express it in a form that can be exercised.

- **Evidence must be able to fail.** Each acceptance criterion names the concrete change that would flip its evidence — the falsifying edit. An author who cannot name what would make the evidence fail has not shown it can fail, and the criterion does not count.

- **Test-first for code and fixtures.** Write the failing test first, watch it fail for the right reason, then write the minimum code to pass. The test is what the validation gate judges.

- **Interactive acceptance criteria are drive-verified.** This is a design-heavy site: some criteria are about how a page looks and reads. Those are judged by a live drive against the preview server or by the captain — not by building automation to approximate visual judgment. The offline/interactive split is declared at design, so an over-ambitious harness is visible at the gate before it is built.

## Workflow State

View the workflow overview:

```bash
spacedock status --workflow-dir docs/features
```

Output columns: ID, SLUG, STATUS, TITLE, SCORE, SOURCE.

Find features ready for their next stage:

```bash
spacedock status --workflow-dir docs/features --next
```

Run the workflow — the first officer reads state and dispatches:

```bash
spacedock claude
```

## Feature Template

```yaml
---
id:
title: Feature name here
status: backlog
source:
started:
completed:
verdict:
score:
worktree:
issue:
pr:
mod-block:
---

## Problem

What is broken or missing on the live site, and why it matters now.

## Proposed approach

How the implementation will address it. Concrete enough that a worker can start.

## Acceptance criteria

Each AC names a property of the finished feature (not a stage action), how it is verified,
and whether that verification is offline or interactive.

**AC-1 — {End-state property of the shipped site.}**
Verified by: {offline|interactive} — {test name / command output or exit code / file the change
produces / resulting on-disk state / live drive against the preview server. Something outside
this feature body that a future reader can reproduce and that can fail. Name the concrete change
that would make it fail.}

## Test plan

What tests verify the implementation, estimated cost, whether e2e is needed, and which of the
four site invariants this feature touches.

## Out of scope

What this feature deliberately does not address.
```

## Commit Discipline

- Commit status changes at dispatch and merge boundaries.
- Commit feature body updates when substantive — decisions, declines, feedback cycles.
- Implementation commits land on the worktree branch; the merge to `main` happens via the `pr-merge` mod after PR review.
- State commits land on the `spacedock-state/features` orphan branch and never touch the code branch.
