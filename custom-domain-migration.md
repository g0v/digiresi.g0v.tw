---
id: 9xrcmwbwyqr5pm98d2mdvqy2
title: Deploy site at custom domain root
status: done
source: "commission seed (survey: PR #2)"
started: 2026-07-20T08:40:00Z
completed: 2026-07-20T09:27:06Z
verdict: PASSED
score: 0.9
worktree:
issue:
pr: "#2"
mod-block:
---

## Problem

DNS was pointed at the custom domain `digiresi.g0v.tw`, so the base-path prefix that had just been introduced for GitHub Pages serving was now wrong — the site needed to serve from the domain root instead of a subpath, and everything built on the assumption of a path prefix needed to be re-checked against the new reality.

## Outcome

The base configuration was migrated to root serving, and service-worker and search-index behavior were re-verified against the new root to confirm nothing regressed from the prefix-to-root switch.

Merged as PR #2.
