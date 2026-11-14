import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { getBase } from "../../scripts/lib/deploy-base.mjs";

// Built output of src/pages/404.astro. GitHub Pages serves dist/404.html for any
// missing URL, so the page must stay noindex, carry no canonical or og:url, and
// use site-absolute links (base-aware via getBase()). Skipped until a build exists.
const PAGE = "dist/404.html";
const hasBuild = fs.existsSync(PAGE);

describe.skipIf(!hasBuild)("404 page", () => {
  const base = getBase();
  const html = () => fs.readFileSync(PAGE, "utf8");

  it("is noindex, follow", () => {
    expect(html()).toContain('<meta name="robots" content="noindex, follow">');
  });

  it("has no canonical link and no og:url", () => {
    expect(html()).not.toContain('rel="canonical"');
    expect(html()).not.toContain("og:url");
  });

  it("links home, the handbook and the schedule with site-absolute hrefs", () => {
    expect(html()).toContain(`href="${base}"`);
    expect(html()).toContain(`href="${base}handbook/"`);
    expect(html()).toContain(`href="${base}schedule/"`);
  });

  it("has exactly one <h1>", () => {
    expect(html().match(/<h1[\s>]/g) ?? []).toHaveLength(1);
  });

  it("is kept out of the sitemap and llms.txt", () => {
    expect(fs.readFileSync("dist/sitemap-0.xml", "utf8")).not.toContain("404");
    expect(fs.readFileSync("dist/llms.txt", "utf8")).not.toContain("404");
  });
});

it.skipIf(hasBuild)("404 page needs a build", () => {
  console.warn("not-found: dist/404.html not found — run `npm run build` first.");
});
