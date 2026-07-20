# Custom Domain Migration Design

**Date:** 2026-07-20

## Goal

Serve the GitHub Pages site canonically from `https://digiresi.g0v.tw/`
after the DNS record has been configured. Generated links, static assets,
Pagefind, the web app manifest, and the service worker must all use the domain
root rather than the former `/digiresi.g0v.tw/` project subpath.

## Scope

- Change the single Astro deployment base from `/digiresi.g0v.tw/` to `/`.
- Change the build-script fallback base to `/`.
- Add `public/CNAME` containing exactly `digiresi.g0v.tw`.
- Update tests and test-server defaults that intentionally assert the deployed
  base path.
- Keep page content, routes, styling, and external links unchanged.

Environment-specific production modes are out of scope. The custom domain is
the sole canonical deployment target.

## Deployment Behavior

Astro continues to use `https://digiresi.g0v.tw` as its `site` URL, while its
`base` becomes `/`. Existing helpers remain the source of internal URLs, so the
base change propagates to navigation, images, manifest URLs, Pagefind, offline
fallbacks, precache entries, and service-worker routing without introducing a
second URL-construction path.

GitHub Pages receives `CNAME` in the uploaded `dist` artifact because Astro
copies files from `public/` during the build.

## Verification

The migration is complete when:

1. Unit tests expect root-relative deployed URLs.
2. The production build succeeds and includes `dist/CNAME` with the exact
   custom domain.
3. Generated HTML and PWA assets do not contain the obsolete
   `/digiresi.g0v.tw/` prefix.
4. Internal-link, asset-budget, and offline end-to-end checks pass using `/` as
   the deployed base.

## Rollback

If the custom domain must be withdrawn, restore the prior base constants and
base-path test expectations, then remove `public/CNAME`. No content migration
or persisted data is involved.
