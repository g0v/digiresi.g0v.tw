# Import notes (2026-07-17)

Imported from the "DigiResiTh0n Design System" Claude Design project via DesignSync, read-only reference copy.

- NOT imported: guidelines/*.html specimen pages, components/*.d.ts type stubs, components/**/*.prompt.md, *.card.html preview cards, forms/Radio.jsx, forms/Switch.jsx, support.js, ds-runtime-fallback.js, Canvas.dc.html, uploads/ — reference-only material not needed for the Astro port; fetch from the Design project if ever needed.
- assets/logo/lockup.png and lockup-dark.png exceeded the 256 KiB DesignSync read cap and were dropped (truncated/corrupt). Compose mark + wordmark side by side where the kit uses variant="lockup", or re-export the lockups manually from the Design project.
- The kit's fonts.css loads from Google Fonts/jsDelivr CDNs; the production site self-hosts all fonts instead (see spec §13).

## Re-import 2026-07-20

Re-imported from Claude Design project `0fdea157-882d-4628-8b39-a15b29bb8d77`
via DesignSync MCP. Paths refreshed: `ui_kits/website/Website.jsx`,
`ui_kits/website/Landing.jsx`, `ui_kits/website/Projects.jsx`,
`ui_kits/website/Shared.jsx`.

`design/assets/logo/LICENSE.md` is a locally-added sibling file — NOT part of
the upstream design pack. DesignSync does not write to `assets/logo/`, so it
survives re-imports.

## Lockup rebuilt, standalone wordmark removed (2026-11-14)

Supersedes the "compose mark + wordmark side by side" advice above: side by
side, the mark's "R" and the wordmark's "ESITHON" don't line up, so the logo
read as "0 R" + "DIGI ESITHON".

`assets/logo/lockup.png` / `lockup-dark.png` (1505×636, transparent) are
rebuilt from the imported mark + wordmark at native scale — the mark's R and
the wordmark's ESITHON are both 132 px tall there. Wordmark placed at offset
(+747, +89) on a 1527×658 canvas (R glyph x631–745 / y411–543; ESITHON starts
x12 / y322; 14 px letter gap), then trimmed. Same copies in `public/brand/`
and `public/design/assets/logo/`.

`wordmark.png` / `wordmark-dark.png` were removed: they are a crop missing the
R, not a real logotype. Use the lockup.
