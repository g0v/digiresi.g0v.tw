// Post-build SEO gate (runs at the end of `npm run build`; also `npm run
// check:seo`). Fails when any built page is missing the tags search engines,
// social cards and answer engines rely on. See docs/seo/audit.md.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { expectedTypes, validateJsonLd } from "./jsonld.mjs";
import { inspectDist } from "./lib.mjs";

export const ORIGIN = "https://digiresi.g0v.tw";
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_MAX_BYTES = 150 * 1024;
export const DESCRIPTION_RANGE = [70, 160];
export const NOINDEX_PATHS = ["/offline/", "/404.html"];
/** Pages with no URL of their own (GitHub Pages' 404.html): no canonical, no og:url. */
export const NO_CANONICAL_PATHS = ["/404.html"];

/** Width/height from a PNG's IHDR chunk, or null if not a PNG. */
export function pngSize(buf) {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** Problems found in the parsed pages; [] means every page passes. */
export function checkPages(pages, dist, { eventCount } = {}) {
  const problems = [];
  const fail = (p, msg) => problems.push(`${p.path}: ${msg}`);
  const byTitle = new Map();
  const byDesc = new Map();
  const byUrl = new Map(pages.map((p) => [`${ORIGIN}${p.path}`, p]));

  for (const p of pages) {
    const self = `${ORIGIN}${p.path}`;
    if (!p.title) fail(p, "missing <title>");
    else byTitle.set(p.title, [...(byTitle.get(p.title) ?? []), p.path]);
    if (!p.description) fail(p, "missing meta description");
    else {
      byDesc.set(p.description, [...(byDesc.get(p.description) ?? []), p.path]);
      const n = [...p.description].length;
      if (n < DESCRIPTION_RANGE[0] || n > DESCRIPTION_RANGE[1]) fail(p, `description is ${n} characters (want 70–160)`);
    }
    const noCanonical = NO_CANONICAL_PATHS.includes(p.path);
    if (noCanonical) {
      if (p.canonical) fail(p, `has canonical ${p.canonical} (want none)`);
      if (p.og["og:url"]) fail(p, `has og:url ${p.og["og:url"]} (want none)`);
    } else if (p.canonical !== self) fail(p, `canonical is ${p.canonical ?? "missing"} (want ${self})`);
    if (!p.robots) fail(p, "missing meta robots");
    const noindex = /noindex/.test(p.robots ?? "");
    if (NOINDEX_PATHS.includes(p.path) !== noindex) fail(p, `robots "${p.robots}" (noindex expected only on ${NOINDEX_PATHS.join(", ")})`);
    for (const key of ["og:title", "og:description", "og:url", "og:image", "og:image:alt", "og:site_name", "og:type", "og:locale"]) {
      if (key === "og:url" && noCanonical) continue;
      if (!p.og[key]) fail(p, `missing ${key}`);
    }
    if (p.og["og:url"] && p.og["og:url"] !== self) fail(p, `og:url ${p.og["og:url"]} differs from the canonical`);
    if (p.twitter["twitter:card"] !== "summary_large_image") fail(p, "twitter:card is not summary_large_image");
    if (p.og["og:image:width"] !== String(OG_SIZE.width) || p.og["og:image:height"] !== String(OG_SIZE.height)) {
      fail(p, "og:image:width/height are not 1200/630");
    }
    const image = p.og["og:image"];
    if (image) {
      if (!image.startsWith(`${ORIGIN}/`)) fail(p, `og:image ${image} is not an absolute ${ORIGIN} URL`);
      else {
        const file = path.join(dist, decodeURIComponent(new URL(image).pathname));
        if (!fs.existsSync(file)) fail(p, `og:image file ${path.relative(dist, file)} not found in dist/`);
        else {
          const buf = fs.readFileSync(file);
          const size = pngSize(buf);
          if (!size || size.width !== OG_SIZE.width || size.height !== OG_SIZE.height) {
            fail(p, `og:image is ${size ? `${size.width}x${size.height}` : "not a PNG"} (want 1200x630 PNG)`);
          }
          if (buf.length > OG_MAX_BYTES) fail(p, `og:image is ${buf.length} bytes (max ${OG_MAX_BYTES})`);
        }
      }
    }
    if (p.h1 !== 1) fail(p, `${p.h1} <h1> elements (want exactly 1)`);
    if (!noindex) {
      problems.push(
        ...validateJsonLd(p, { expect: expectedTypes(p.path), eventCount: p.path === "/schedule/" ? eventCount : undefined }),
      );
    }
    // hreflang: self-referencing, reciprocal, x-default present.
    if (p.hreflang.length) {
      const links = new Map(p.hreflang.map((h) => h.split(/=(.*)/s).slice(0, 2)));
      if (![...links.values()].includes(self)) fail(p, "hreflang set does not include the page itself");
      if (!links.has("x-default")) fail(p, "hreflang set has no x-default");
      for (const [lang, href] of links) {
        if (lang === "x-default" || href === self) continue;
        const other = byUrl.get(href);
        if (!other) fail(p, `hreflang ${lang} points to ${href}, which is not a built page`);
        else if (!other.hreflang.some((h) => h.endsWith(`=${self}`))) fail(p, `hreflang ${lang} → ${href} has no return link`);
      }
    }
  }
  for (const [title, paths] of byTitle) if (paths.length > 1) problems.push(`duplicate <title> "${title}": ${paths.join(", ")}`);
  for (const [d, paths] of byDesc) if (paths.length > 1) problems.push(`duplicate description "${d}": ${paths.join(", ")}`);
  return problems;
}

const read = (dist, rel) => {
  const file = path.join(dist, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
};
/** dist/ file a same-origin URL resolves to (directory URLs -> index.html). */
const distFileFor = (dist, url) => {
  const p = decodeURIComponent(new URL(url).pathname);
  return path.join(dist, p.endsWith("/") ? `${p}index.html` : p);
};

/** robots.txt, sitemap, llms.txt and llms-full.txt. */
export function checkSiteFiles(pages, dist) {
  const problems = [];
  const fail = (msg) => problems.push(msg);

  const robots = read(dist, "robots.txt");
  if (!robots) fail("robots.txt: missing");
  else {
    if (!/^User-agent: \*$/m.test(robots)) fail("robots.txt: no `User-agent: *` group");
    if (/^Disallow: \/\s*$/m.test(robots)) fail("robots.txt: a group disallows the whole site");
    const groups = robots.split(/\n\s*\n/).filter((g) => /^User-agent:/m.test(g));
    for (const g of groups) if (!/^Content-Signal: /m.test(g)) fail(`robots.txt: group without Content-Signal: ${g.split("\n")[0]}`);
    for (const ua of robots.matchAll(/^User-agent: (.*)$/gm)) if (/\s/.test(ua[1].trim())) fail(`robots.txt: token with a space: ${ua[1]}`);
    const sm = /^Sitemap: (\S+)$/m.exec(robots)?.[1];
    if (!sm || !sm.startsWith(`${ORIGIN}/`)) fail("robots.txt: no absolute Sitemap line");
    else if (!fs.existsSync(distFileFor(dist, sm))) fail(`robots.txt: Sitemap ${sm} not in dist/`);
  }

  const index = read(dist, "sitemap-index.xml");
  if (!index) fail("sitemap-index.xml: missing");
  else {
    const urlset = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const locs = new Map();
    for (const sm of urlset) {
      const xml = fs.existsSync(distFileFor(dist, sm)) ? fs.readFileSync(distFileFor(dist, sm), "utf8") : null;
      if (!xml) { fail(`sitemap: ${sm} not in dist/`); continue; }
      for (const u of xml.split("<url>").slice(1)) {
        const loc = /<loc>([^<]+)<\/loc>/.exec(u)?.[1];
        const links = [...u.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => `${m[1]}=${m[2]}`);
        if (loc) locs.set(loc, links);
      }
    }
    for (const p of pages) {
      const url = `${ORIGIN}${p.path}`;
      const indexable = !/noindex/.test(p.robots ?? "");
      if (indexable && !locs.has(url)) fail(`sitemap: ${p.path} missing`);
      if (!indexable && locs.has(url)) fail(`sitemap: noindex page ${p.path} listed`);
      if (locs.has(url)) {
        const html = [...p.hreflang].sort().join(" ");
        const xml = [...locs.get(url)].sort().join(" ");
        if (html !== xml) fail(`sitemap: ${p.path} hreflang (${xml || "none"}) differs from the HTML (${html || "none"})`);
      }
    }
    for (const loc of locs.keys()) if (!pages.some((p) => `${ORIGIN}${p.path}` === loc)) fail(`sitemap: ${loc} is not a built page`);
  }

  const llms = read(dist, "llms.txt");
  if (!llms) fail("llms.txt: missing");
  else {
    if (!/^# \S/.test(llms)) fail("llms.txt: does not start with an H1");
    if (!/^> \S/m.test(llms)) fail("llms.txt: no blockquote summary");
    for (const m of llms.matchAll(/\]\((https:\/\/digiresi\.g0v\.tw\/[^)]*)\)/g)) {
      if (!fs.existsSync(distFileFor(dist, m[1]))) fail(`llms.txt: link ${m[1]} not in dist/`);
    }
    for (const p of pages.filter((x) => x.path.startsWith("/handbook/") && x.path !== "/handbook/")) {
      if (!llms.includes(`${ORIGIN}${p.path}`)) fail(`llms.txt: handbook page ${p.path} not listed`);
    }
  }
  const full = read(dist, "llms-full.txt");
  if (!full) fail("llms-full.txt: missing");
  else {
    for (const p of pages.filter((x) => x.path.startsWith("/handbook/") && x.path !== "/handbook/")) {
      if (!full.includes(`${ORIGIN}${p.path}`)) fail(`llms-full.txt: handbook page ${p.path} missing`);
    }
  }
  return problems;
}

/** Public URL of the Atom feed; every indexable page links it (see SeoHead.astro). */
export const FEED_URL = `${ORIGIN}/schedule/feed.xml`;

const XML_TAG = /<(\/?)([A-Za-z_][\w.:-]*)((?:\s+[A-Za-z_:][\w.:-]*\s*=\s*(?:"[^"<]*"|'[^'<]*'))*)\s*(\/?)>/g;
const XML_BARE_AMP = /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/;

/**
 * Well-formedness for the XML subset the feed uses: one root, every open tag
 * closed in order, no bare `&`, no stray `<`. Returns null when it passes,
 * else the first problem found.
 */
export function xmlWellFormed(xml) {
  const body = xml
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")
    .replace(/<\?[\s\S]*?\?>/g, "");
  if (XML_BARE_AMP.test(body)) return "a bare & (must be &amp;)";
  const open = [];
  let roots = 0;
  let last = 0;
  for (const m of body.matchAll(XML_TAG)) {
    const text = body.slice(last, m.index);
    if (text.includes("<")) return "a stray < in text";
    if (!open.length && text.trim()) return "text outside the root element";
    last = m.index + m[0].length;
    const [, closing, name, , selfClosing] = m;
    if (closing) {
      if (!open.length) return `</${name}> without an open element`;
      const top = open.pop();
      if (top !== name) return `</${name}> closes <${top}>`;
    } else {
      if (!open.length) {
        roots += 1;
        if (roots > 1) return "more than one root element";
      }
      if (!selfClosing) open.push(name);
    }
  }
  const tail = body.slice(last);
  if (tail.includes("<")) return "a stray < in text";
  if (open.length) return `<${open.at(-1)}> is never closed`;
  if (tail.trim()) return "text outside the root element";
  if (roots !== 1) return "no root element";
  return null;
}

const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const XML_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const unescapeXml = (s) =>
  s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (_, e) =>
    e[0] === "#" ? String.fromCodePoint(e[1] === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : XML_ENTITIES[e],
  );
/** Unescaped inner text of every <name> element in `xml`. */
const elementTexts = (xml, name) =>
  [...xml.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "g"))].map((m) => unescapeXml(m[1]));
/** Attributes of every <link> element in `xml`. */
const linksIn = (xml) =>
  [...xml.matchAll(/<link\b([^>]*?)\/?>/g)].map((m) =>
    Object.fromEntries([...m[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map((a) => [a[1], unescapeXml(a[2])])),
  );

/**
 * The Atom feed at /schedule/feed.xml: well-formed, complete, one entry per
 * dated event in events.yaml, each entry pointing at its anchor on /schedule/,
 * and linked from every indexable page.
 */
export function checkFeed(pages, dist, events) {
  const problems = [];
  const fail = (msg) => problems.push(msg);
  const xml = read(dist, "schedule/feed.xml");
  const schedule = read(dist, "schedule/index.html");
  const datedEvents = (events ?? []).filter((e) => e.date);
  if (schedule === null) fail("schedule/index.html: missing");

  if (xml === null) fail("schedule/feed.xml: missing");
  else {
    const err = xmlWellFormed(xml);
    if (err) fail(`schedule/feed.xml: not well-formed XML (${err})`);
    const body = xml.replace(/^﻿/, "").replace(/^\s*<\?xml[^>]*\?>\s*/, "");
    if (!body.startsWith('<feed xmlns="http://www.w3.org/2005/Atom"')) {
      fail('schedule/feed.xml: root is not <feed xmlns="http://www.w3.org/2005/Atom">');
    }
    const head = body.split("<entry")[0];
    for (const name of ["id", "title", "updated"]) {
      if (!elementTexts(head, name).length) fail(`schedule/feed.xml: feed lacks <${name}>`);
    }
    if (!linksIn(head).some((l) => l.rel === "self")) fail('schedule/feed.xml: feed lacks <link rel="self">');
    for (const u of elementTexts(head, "updated")) {
      if (!RFC3339.test(u)) fail(`schedule/feed.xml: feed <updated> "${u}" is not an RFC 3339 date-time`);
    }

    const entries = [...body.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
    const titles = [];
    const prefix = `${ORIGIN}/schedule/#`;
    entries.forEach((entry, i) => {
      const label = `schedule/feed.xml entry ${i + 1}`;
      for (const name of ["id", "title", "updated", "summary"]) {
        if (!elementTexts(entry, name).length) fail(`${label}: lacks <${name}>`);
      }
      const links = linksIn(entry);
      if (!links.length) fail(`${label}: lacks <link>`);
      for (const d of [...elementTexts(entry, "updated"), ...elementTexts(entry, "published")]) {
        if (!RFC3339.test(d)) fail(`${label}: date "${d}" is not an RFC 3339 date-time`);
      }
      titles.push(elementTexts(entry, "title")[0]);
      const alt = links.find((l) => l.rel === "alternate")?.href ?? "";
      const anchor = alt.startsWith(prefix) ? alt.slice(prefix.length) : "";
      if (!/^[A-Za-z0-9-]+$/.test(anchor)) fail(`${label}: alternate link "${alt}" is not ${prefix}<anchor>`);
      else if (schedule !== null && !schedule.includes(`id="${anchor}"`)) {
        fail(`${label}: no id="${anchor}" in dist/schedule/index.html`);
      }
    });
    for (const e of datedEvents) {
      if (!titles.includes(e.name)) fail(`schedule/feed.xml: no entry titled "${e.name}" (events.yaml, ${e.date})`);
    }
    if (entries.length !== datedEvents.length) {
      fail(`schedule/feed.xml: ${entries.length} entries, events.yaml has ${datedEvents.length} dated events`);
    }
  }

  for (const p of pages) {
    const indexable = !/noindex/.test(p.robots ?? "");
    if (indexable && !(p.feeds ?? []).includes(FEED_URL)) {
      fail(`${p.path}: no link to the Atom feed ${FEED_URL} (rel="alternate" type="application/atom+xml")`);
    }
  }
  return problems;
}

/** Dated events with a venue in src/data/events.yaml (one Event node each). */
export function datedEventCount(file = "src/data/events.yaml") {
  return (yaml.load(fs.readFileSync(file, "utf8")) ?? []).filter((e) => e.date && e.venue).length;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const dist = path.resolve("dist");
  if (!fs.existsSync(dist)) {
    console.error("check-seo: dist/ not found — run `npm run build` first.");
    process.exit(1);
  }
  const pages = inspectDist(dist);
  const events = yaml.load(fs.readFileSync("src/data/events.yaml", "utf8")) ?? [];
  const problems = [
    ...checkPages(pages, dist, { eventCount: datedEventCount() }),
    ...checkSiteFiles(pages, dist),
    ...checkFeed(pages, dist, events),
  ];
  if (problems.length) {
    console.error(`check-seo: FAIL — ${problems.length} problem(s) across ${pages.length} pages:`);
    for (const line of problems) console.error(`  ${line}`);
    process.exit(1);
  }
  console.log(
    `check-seo: PASS — ${pages.length} pages have title, description, canonical, robots, og:*, twitter:card, ` +
      "a 1200x630 og:image, one <h1> and valid JSON-LD; titles and descriptions are unique; " +
      "robots.txt, sitemap (with hreflang), llms.txt and llms-full.txt are consistent with the pages; " +
      "the Atom feed (schedule/feed.xml) is well-formed, matches events.yaml and is linked from every indexable page.",
  );
}
