---
id: vv9vj3vvdr6642r62xpt4n9c
title: Design-kits reference route and ui_kits/website port
status: done
source: "commission seed (survey: PR #3)"
started: 2026-07-20T09:38:40Z
completed: 2026-07-21T00:21:59Z
verdict: PASSED
score: 0.8
worktree:
issue:
pr: "#3"
mod-block:
---

## Problem

The project had design assets and a `ui_kits/website` canvas with no browsable reference on the live site, so contributors had no way to see the design system in context. The logo and logotype also needed proper CC BY-SA 4.0 attribution to YellowOne, which nothing on the live site provided.

## Outcome

A `/design-kits/` route was added with overview, logo, colors, typography, components, patterns, and website-specimen pages, along with a specimen wrapper and sub-nav for browsing them. The Tabs component was ported into the site's component set. A persistent dark/light theme toggle was added with no-flash initialization, plus a public `/projects/` route and PROJECTS and DESIGN nav entries. A shared Register dialog was wired to the hero CTA.

The design-kits and projects routes were excluded from PWA precache and the search index, and the vitest glob was updated to exclude `.worktrees` so concurrent feature worktrees can't pollute a test run. The work was executed as 17 tasks via subagent-driven development.

This feature is the origin of site invariants 2 and 3: reference/specimen routes must be deliberately included or excluded from precache and the search index, and the vitest glob must exclude `.worktrees`.

Merged as PR #3.
