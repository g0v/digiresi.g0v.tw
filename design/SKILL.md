---
name: digiresithon-design
description: Use this skill to generate well-branded interfaces and assets for DigiResiThon (the g0v digital resilience hackathon), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

Quick facts: dark ("blackout") theme is default; pixel headings (Press Start 2P, `--px-*` steps) + mono everything else (IBM Plex Mono); two accents (signal red `--accent`, terminal green `--accent-2`); square corners, 2px borders, hard offset shadows, stepped motion; motifs = signal bars, scanlines, box-drawing, one red slash per view; EN-US copy, playful hacker voice; the "0" appears only in the logo assets (`assets/logo/`), text spells DigiResiThon; no emoji; icons = Pixelarticons via CSS mask.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view — link `styles.css` for tokens or copy `tokens/` wholesale. React components live under `components/` (core / forms / brand); full screens under `ui_kits/website/`. If working on production code, copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.
