# Import notes (2026-07-17)

Imported from the "DigiResiTh0n Design System" Claude Design project via DesignSync, read-only reference copy.

- NOT imported: guidelines/*.html specimen pages, components/*.d.ts type stubs, components/**/*.prompt.md, *.card.html preview cards, forms/Radio.jsx, forms/Switch.jsx, support.js, ds-runtime-fallback.js, Canvas.dc.html, uploads/ — reference-only material not needed for the Astro port; fetch from the Design project if ever needed.
- assets/logo/lockup.png and lockup-dark.png exceeded the 256 KiB DesignSync read cap and were dropped (truncated/corrupt). Compose mark + wordmark side by side where the kit uses variant="lockup", or re-export the lockups manually from the Design project.
- The kit's fonts.css loads from Google Fonts/jsDelivr CDNs; the production site self-hosts all fonts instead (see spec §13).
