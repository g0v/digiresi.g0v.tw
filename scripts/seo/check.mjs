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
export const NOINDEX_PATHS = ["/offline/"];

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
    if (p.canonical !== self) fail(p, `canonical is ${p.canonical ?? "missing"} (want ${self})`);
    if (!p.robots) fail(p, "missing meta robots");
    const noindex = /noindex/.test(p.robots ?? "");
    if (NOINDEX_PATHS.includes(p.path) !== noindex) fail(p, `robots "${p.robots}" (noindex expected only on ${NOINDEX_PATHS.join(", ")})`);
    for (const key of ["og:title", "og:description", "og:url", "og:image", "og:image:alt", "og:site_name", "og:type", "og:locale"]) {
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
  const problems = [...checkPages(pages, dist, { eventCount: datedEventCount() }), ...checkSiteFiles(pages, dist)];
  if (problems.length) {
    console.error(`check-seo: FAIL — ${problems.length} problem(s) across ${pages.length} pages:`);
    for (const line of problems) console.error(`  ${line}`);
    process.exit(1);
  }
  console.log(
    `check-seo: PASS — ${pages.length} pages have title, description, canonical, robots, og:*, twitter:card, ` +
      "a 1200x630 og:image, one <h1> and valid JSON-LD; titles and descriptions are unique; " +
      "robots.txt, sitemap (with hreflang), llms.txt and llms-full.txt are consistent with the pages.",
  );
}
