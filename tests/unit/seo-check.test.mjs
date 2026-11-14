import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import yaml from "js-yaml";
import { checkFeed, checkPages, checkSiteFiles, pngSize, xmlWellFormed } from "../../scripts/seo/check.mjs";
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
    feeds: [`${ORIGIN}/schedule/feed.xml`],
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

describe("404 page", () => {
  const dist = tmpDist({ "og/a.png": png(1200, 630) });
  // GitHub Pages' 404.html has no URL of its own: noindex, no canonical, no og:url.
  const ogWithoutUrl = { ...page("/404.html").og };
  delete ogWithoutUrl["og:url"];
  const notFound = (overrides = {}) =>
    page("/404.html", { robots: "noindex, follow", canonical: null, og: ogWithoutUrl, jsonldData: [], ...overrides });

  it("passes a noindex 404 page without canonical or og:url", () => {
    expect(checkPages([notFound()], dist)).toEqual([]);
  });

  it("flags a canonical on the 404 page", () => {
    const problems = checkPages([notFound({ canonical: `${ORIGIN}/404.html` })], dist).join("\n");
    expect(problems).toMatch(/\/404\.html: has canonical/);
  });

  it("requires noindex on the 404 page", () => {
    const problems = checkPages([notFound({ robots: "index, follow" })], dist).join("\n");
    expect(problems).toMatch(/\/404\.html: robots .*noindex expected/);
  });
});

describe("Atom feed check", () => {
  const FEED = `${ORIGIN}/schedule/feed.xml`;
  const events = [{ number: 1, name: "E1", date: "2026-01-18" }];
  const feedPages = [page("/schedule/"), page("/offline/", { robots: "noindex, follow" })];
  const goodFeed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="zh-Hant-TW">
  <id>${FEED}</id>
  <title>數位韌性松活動時程</title>
  <link rel="self" type="application/atom+xml" href="${FEED}"/>
  <updated>2026-01-18T00:00:00+08:00</updated>
  <entry>
    <id>${ORIGIN}/schedule/#th1n</id>
    <title>E1</title>
    <link rel="alternate" type="text/html" href="${ORIGIN}/schedule/#th1n"/>
    <published>2026-01-18T00:00:00+08:00</published>
    <updated>2026-01-18T00:00:00+08:00</updated>
    <summary type="text">2026-01-18。活動共筆：https://g0v.hackmd.io/x</summary>
  </entry>
</feed>
`;
  const buildWith = (files = {}) =>
    tmpDist({ "schedule/index.html": '<div id="th1n"></div>', "schedule/feed.xml": goodFeed, ...files });

  it("passes a valid minimal feed", () => {
    expect(checkFeed(feedPages, buildWith(), events)).toEqual([]);
  });

  it("flags a dated event that has no feed entry", () => {
    const more = [...events, { number: 2, name: "E2", date: "2026-02-01" }];
    const problems = checkFeed(feedPages, buildWith(), more).join("\n");
    expect(problems).toMatch(/1 entries, events.yaml has 2 dated events/);
    expect(problems).toMatch(/no entry titled "E2"/);
  });

  it("flags malformed XML", () => {
    const problems = checkFeed(feedPages, buildWith({ "schedule/feed.xml": goodFeed.replace("</entry>", "</feed>") }), events).join("\n");
    expect(problems).toMatch(/not well-formed XML/);
  });

  it("flags an entry whose anchor is not on the schedule page", () => {
    const problems = checkFeed(feedPages, buildWith({ "schedule/index.html": "<div></div>" }), events).join("\n");
    expect(problems).toMatch(/no id="th1n" in dist\/schedule\/index.html/);
  });

  it("flags a page without the feed link", () => {
    const problems = checkFeed([page("/about/", { feeds: [] })], buildWith(), events).join("\n");
    expect(problems).toMatch(/\/about\/: no link to the Atom feed/);
  });

  it("flags a missing feed file", () => {
    const problems = checkFeed(feedPages, tmpDist({ "schedule/index.html": "" }), events).join("\n");
    expect(problems).toMatch(/schedule\/feed.xml: missing/);
  });
});

describe("xmlWellFormed", () => {
  it("accepts a declaration, comments, CDATA, self-closing tags and entities", () => {
    expect(
      xmlWellFormed('<?xml version="1.0" encoding="utf-8"?><a x="1"><!-- c --><b/><c><![CDATA[<&>]]></c>&amp;&#39;&#x41;</a>'),
    ).toBeNull();
  });

  it("rejects bare ampersands, mismatched tags, a second root, stray text and unclosed tags", () => {
    expect(xmlWellFormed("<a>&</a>")).toMatch(/bare &/);
    expect(xmlWellFormed("<a><b></a></b>")).toMatch(/closes/);
    expect(xmlWellFormed("<a/><b/>")).toMatch(/more than one root/);
    expect(xmlWellFormed("<a/>tail")).toMatch(/outside the root/);
    expect(xmlWellFormed("<a>")).toMatch(/never closed/);
  });
});

const hasBuild = fs.existsSync("dist/index.html");
describe.skipIf(!hasBuild)("built site", () => {
  it("passes the SEO check", () => {
    const pages = inspectDist(path.resolve("dist"));
    expect(pages.length).toBeGreaterThan(30);
    expect(checkPages(pages, path.resolve("dist"))).toEqual([]);
    expect(checkSiteFiles(pages, path.resolve("dist"))).toEqual([]);
    const events = yaml.load(fs.readFileSync("src/data/events.yaml", "utf8"));
    expect(checkFeed(pages, path.resolve("dist"), events)).toEqual([]);
  });
});
