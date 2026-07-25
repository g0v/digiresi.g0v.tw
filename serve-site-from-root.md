---
id: jyx931798m7m2zve0zj9nsm3
title: Serve site from root path
status: done
source: "commission seed (survey: PR #1)"
started: 2026-07-19T07:36:50Z
completed: 2026-07-20T05:22:32Z
verdict: PASSED
score: 0.9
worktree:
issue:
pr: "#1"
mod-block:
---

## Problem

The site was being served from a path-prefixed GitHub Pages URL (`https://g0v.github.io/digiresi.g0v.tw/`), but routes, asset references, and links throughout the codebase used hardcoded leading slashes as if the site were served from the domain root. As a result, pages and assets 404'd whenever they were reached through the actual deployed path — the built HTML did not agree with where the site actually lived.

## Outcome

A shared `BASE` constant was introduced and threaded through everywhere a URL gets constructed: the base layout, header, and footer; the search index; the PWA manifest and service worker; page templates; a rehype plugin that rewrites links in handbook content; the link checker script; and the Playwright e2e configuration. This closed the gap between the site's actual serving path and the URLs it emitted, and gave the codebase a single point of truth for path-prefixed deployment going forward.

This feature is the origin of site invariant 1 (base path): every route and asset URL must resolve through the shared `BASE` constant rather than a hardcoded leading slash, checked against the emitted HTML and the service worker, not just the source.

Merged as PR #1.
