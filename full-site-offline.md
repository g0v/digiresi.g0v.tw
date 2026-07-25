---
id: ctgh94xpjy379xeehs4p1kac
title: Full-site offline PWA
status: backlog
source: "captain request"
started:
completed:
verdict:
score: 0.8
worktree:
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
