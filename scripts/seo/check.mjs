// Post-build SEO gate (runs at the end of `npm run build`; also `npm run
// check:seo`). Fails when any built page is missing the tags search engines,
// social cards and answer engines rely on. See docs/seo/audit.md.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
export function checkPages(pages, dist) {
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

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const dist = path.resolve("dist");
  if (!fs.existsSync(dist)) {
    console.error("check-seo: dist/ not found — run `npm run build` first.");
    process.exit(1);
  }
  const pages = inspectDist(dist);
  const problems = checkPages(pages, dist);
  if (problems.length) {
    console.error(`check-seo: FAIL — ${problems.length} problem(s) across ${pages.length} pages:`);
    for (const line of problems) console.error(`  ${line}`);
    process.exit(1);
  }
  console.log(`check-seo: PASS — ${pages.length} pages have title, description, canonical, robots, og:*, twitter:card, a 1200x630 og:image and one <h1>; titles and descriptions are unique.`);
}
