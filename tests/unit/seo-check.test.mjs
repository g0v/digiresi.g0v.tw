import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkPages, checkSiteFiles, pngSize } from "../../scripts/seo/check.mjs";
import { validateJsonLd } from "../../scripts/seo/jsonld.mjs";
import { inspectDist } from "../../scripts/seo/lib.mjs";

const ORIGIN = "https://digiresi.g0v.tw";

function png(width, height) {
  const b = Buffer.alloc(33);
  b.writeUInt32BE(0x89504e47, 0);
  b.writeUInt32BE(width, 16);
  b.writeUInt32BE(height, 20);
  return b;
}

function ldFor(p) {
  const url = `${ORIGIN}${p}`;
  const crumbs = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首頁", item: `${ORIGIN}/` },
      { "@type": "ListItem", position: 2, name: "p", item: url },
    ],
  };
  const webPage = (type) => ({ "@type": type, name: "n", url, inLanguage: "zh-Hant-TW" });
  const graph =
    p === "/" || p === "/en/"
      ? [{ "@type": "WebSite", name: "s", url }, { "@type": "Organization", name: "o", url }, webPage("WebPage")]
      : [webPage(p === "/about/" ? "AboutPage" : "WebPage"), crumbs];
  return [{ "@context": "https://schema.org", "@graph": graph }];
}

function page(p, overrides = {}) {
  return {
    jsonld: [],
    jsonldData: ldFor(p),
    path: p,
    title: `title ${p}`,
    description: `${"一段足夠長的描述文字".repeat(8)}${p}`,
    canonical: `${ORIGIN}${p}`,
    robots: "index, follow",
    og: {
      "og:title": "t",
      "og:description": "d",
      "og:url": `${ORIGIN}${p}`,
      "og:image": `${ORIGIN}/og/a.png`,
      "og:image:alt": "alt",
      "og:image:width": "1200",
      "og:image:height": "630",
      "og:site_name": "s",
      "og:type": "website",
      "og:locale": "zh_TW",
    },
    twitter: { "twitter:card": "summary_large_image" },
    hreflang: [],
    h1: 1,
    ...overrides,
  };
}

function tmpDist(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "seo-check-"));
  for (const [rel, data] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    if (data !== undefined) fs.writeFileSync(path.join(dir, rel), data);
  }
  return dir;
}

describe("post-build SEO check", () => {
  const dist = tmpDist({ "og/a.png": png(1200, 630), "og/small.png": png(600, 315) });

  it("passes a complete, unique page set", () => {
    expect(checkPages([page("/"), page("/about/")], dist)).toEqual([]);
  });

  it("reads PNG dimensions", () => {
    expect(pngSize(png(1200, 630))).toEqual({ width: 1200, height: 630 });
    expect(pngSize(Buffer.from("not a png at all, really not one"))).toBeNull();
  });

  it("flags missing tags, wrong canonical and a missing or wrong-sized og:image", () => {
    const problems = checkPages(
      [
        page("/a/", { title: null, canonical: null }),
        page("/b/", { og: { ...page("/b/").og, "og:image": `${ORIGIN}/og/missing.png` } }),
        page("/c/", { og: { ...page("/c/").og, "og:image": `${ORIGIN}/og/small.png` } }),
        page("/d/", { og: { ...page("/d/").og, "og:image": "/og/a.png" }, twitter: {} }),
      ],
      dist,
    ).join("\n");
    expect(problems).toMatch(/\/a\/: missing <title>/);
    expect(problems).toMatch(/\/a\/: canonical is missing/);
    expect(problems).toMatch(/\/b\/: og:image file og\/missing.png not found/);
    expect(problems).toMatch(/\/c\/: og:image is 600x315/);
    expect(problems).toMatch(/\/d\/: og:image \/og\/a.png is not an absolute/);
    expect(problems).toMatch(/\/d\/: twitter:card/);
  });

  it("flags duplicate titles and descriptions site-wide", () => {
    const a = page("/a/", { title: "same", description: "相同".repeat(40) });
    const b = page("/b/", { title: "same", description: "相同".repeat(40) });
    const problems = checkPages([a, b], dist).join("\n");
    expect(problems).toMatch(/duplicate <title> "same": \/a\/, \/b\//);
    expect(problems).toMatch(/duplicate description/);
  });

  it("requires noindex on /offline/ only, and one <h1>", () => {
    const problems = checkPages([page("/offline/"), page("/x/", { robots: "noindex", h1: 2 })], dist).join("\n");
    expect(problems).toMatch(/\/offline\/: robots/);
    expect(problems).toMatch(/\/x\/: robots/);
    expect(problems).toMatch(/\/x\/: 2 <h1>/);
  });

  it("requires reciprocal, self-referencing hreflang with x-default", () => {
    const zh = page("/", { hreflang: [`zh-Hant=${ORIGIN}/`, `en-US=${ORIGIN}/en/`] });
    const en = page("/en/", { hreflang: [`en-US=${ORIGIN}/en/`] });
    const problems = checkPages([zh, en], dist).join("\n");
    expect(problems).toMatch(/\/: hreflang set has no x-default/);
    expect(problems).toMatch(/\/: hreflang en-US → .*\/en\/ has no return link/);
  });
});

describe("JSON-LD validation", () => {
  it("accepts a well-formed handbook article", () => {
    const p = page("/handbook/x/", {
      jsonldData: [
        {
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "TechArticle", headline: "h", url: `${ORIGIN}/handbook/x/`, inLanguage: "zh-Hant-TW", dateModified: "2026-07-17", isBasedOn: "https://g0v.hackmd.io/x" },
            { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "首頁", item: `${ORIGIN}/` }, { "@type": "ListItem", position: 2, name: "x", item: `${ORIGIN}/handbook/x/` }] },
          ],
        },
      ],
    });
    expect(validateJsonLd(p, { expect: ["TechArticle", "BreadcrumbList"] })).toEqual([]);
  });

  it("flags unparsable blocks, missing types and properties, bad dates and event counts", () => {
    const p = page("/schedule/", {
      jsonld: ["INVALID-JSON"],
      jsonldData: [
        {
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "Event", name: "e", startDate: "11/29", url: "https://g0v.hackmd.io/e" },
            { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 2, name: "x", item: "/x/" }] },
          ],
        },
      ],
    });
    const problems = validateJsonLd(p, { expect: ["EventSeries"], eventCount: 3 }).join("\n");
    expect(problems).toMatch(/does not parse/);
    expect(problems).toMatch(/Event "e" lacks location/);
    expect(problems).toMatch(/startDate "11\/29" is not an ISO date/);
    expect(problems).toMatch(/BreadcrumbList position 2 at index 0/);
    expect(problems).toMatch(/has no EventSeries/);
    expect(problems).toMatch(/has 1 Event nodes; events.yaml has 3/);
  });
});

describe("site files check", () => {
  const pages = [page("/"), page("/about/"), page("/offline/", { robots: "noindex, follow" })];
  const good = {
    "robots.txt": `User-agent: *\nContent-Signal: search=yes\nAllow: /\n\nUser-agent: GPTBot\nContent-Signal: search=yes\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap-index.xml\n`,
    "sitemap-index.xml": `<sitemapindex><sitemap><loc>${ORIGIN}/sitemap-0.xml</loc></sitemap></sitemapindex>`,
    "sitemap-0.xml": `<urlset><url><loc>${ORIGIN}/</loc></url><url><loc>${ORIGIN}/about/</loc></url></urlset>`,
    "llms.txt": `# Site\n\n> summary\n\n- [About](${ORIGIN}/about/)\n`,
    "llms-full.txt": "# Full\n",
    "index.html": "",
    "about/index.html": "",
  };

  it("passes consistent files", () => {
    expect(checkSiteFiles(pages, tmpDist(good))).toEqual([]);
  });

  it("flags missing files, a robots group without Content-Signal, sitemap drift and dead llms links", () => {
    const dist = tmpDist({
      ...good,
      "robots.txt": "User-agent: *\nAllow: /\n",
      "sitemap-0.xml": `<urlset><url><loc>${ORIGIN}/</loc></url><url><loc>${ORIGIN}/offline/</loc></url></urlset>`,
      "llms.txt": `# Site\n\n> s\n\n- [Gone](${ORIGIN}/gone/)\n`,
      "llms-full.txt": undefined,
    });
    fs.rmSync(path.join(dist, "llms-full.txt"), { force: true });
    const problems = checkSiteFiles(pages, dist).join("\n");
    expect(problems).toMatch(/robots.txt: group without Content-Signal/);
    expect(problems).toMatch(/robots.txt: no absolute Sitemap line/);
    expect(problems).toMatch(/sitemap: \/about\/ missing/);
    expect(problems).toMatch(/sitemap: noindex page \/offline\/ listed/);
    expect(problems).toMatch(/llms.txt: link .*\/gone\/ not in dist/);
    expect(problems).toMatch(/llms-full.txt: missing/);
  });
});

const hasBuild = fs.existsSync("dist/index.html");
describe.skipIf(!hasBuild)("built site", () => {
  it("passes the SEO check", () => {
    const pages = inspectDist(path.resolve("dist"));
    expect(pages.length).toBeGreaterThan(30);
    expect(checkPages(pages, path.resolve("dist"))).toEqual([]);
    expect(checkSiteFiles(pages, path.resolve("dist"))).toEqual([]);
  });
});
