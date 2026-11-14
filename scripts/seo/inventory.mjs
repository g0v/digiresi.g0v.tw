// SEO inventory of the built site: walks dist/ for every .html page and reports
// the head metadata search engines and answer engines read (title, description,
// canonical, og:*, twitter:*, hreflang, JSON-LD @types, robots, <html lang>, H1s).
// Usage: node scripts/seo/inventory.mjs [--json out.json] [--md out.md]
// Run after `npm run build`. Read-only; no dependencies.
import fs from "node:fs";
import path from "node:path";
import { walk } from "../lib/walk.mjs";

const dist = path.resolve("dist");
if (!fs.existsSync(dist)) {
  console.error("seo-inventory: dist/ not found — run `npm run build` first.");
  process.exit(1);
}

const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'");

function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    out[m[1].toLowerCase()] = decode(m[3] ?? m[4] ?? m[5] ?? "");
  }
  return out;
}

function inspect(file) {
  const html = fs.readFileSync(path.join(dist, file), "utf8");
  const head = html.split(/<\/head>/i)[0];
  const page = {
    path: "/" + file.replace(/index\.html$/, ""),
    lang: attrs((html.match(/<html[^>]*>/i) || [""])[0]).lang ?? null,
    title: decode((head.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, null])[1] ?? "") || null,
    description: null,
    canonical: null,
    robots: null,
    og: {},
    twitter: {},
    hreflang: [],
    jsonld: [],
    h1: (html.match(/<h1[\s>]/gi) || []).length,
  };
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    const key = a.property ?? a.name;
    if (!key) continue;
    if (key === "description") page.description = a.content;
    else if (key === "robots") page.robots = a.content;
    else if (key.startsWith("og:")) page.og[key] = a.content;
    else if (key.startsWith("twitter:")) page.twitter[key] = a.content;
  }
  for (const m of head.matchAll(/<link\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    if (a.rel === "canonical") page.canonical = a.href;
    if (a.rel === "alternate" && a.hreflang) page.hreflang.push(`${a.hreflang}=${a.href}`);
  }
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1]);
      const types = [];
      const visit = (n) => {
        if (Array.isArray(n)) n.forEach(visit);
        else if (n && typeof n === "object") {
          if (n["@type"]) types.push([].concat(n["@type"]).join("/"));
          Object.values(n).forEach(visit);
        }
      };
      visit(data);
      page.jsonld.push(...types);
    } catch {
      page.jsonld.push("INVALID-JSON");
    }
  }
  return page;
}

const pages = walk(dist)
  .filter((f) => f.endsWith(".html"))
  .sort()
  .map(inspect);

// Duplicate titles/descriptions across pages.
const count = (k) => pages.reduce((m, p) => (p[k] && m.set(p[k], (m.get(p[k]) || 0) + 1), m), new Map());
const titleCounts = count("title");
const descCounts = count("description");

const cell = (v) => (v == null || v === "" ? "—" : String(v).replace(/\|/g, "\\|").replace(/\n/g, " "));
const len = (s) => (s ? [...s].length : 0);
const rows = pages.map((p) => [
  p.path,
  p.lang,
  `${p.title ?? "—"} (${len(p.title)}${titleCounts.get(p.title) > 1 ? ", DUP" : ""})`,
  p.description ? `${p.description} (${len(p.description)}${descCounts.get(p.description) > 1 ? ", DUP" : ""})` : null,
  p.canonical,
  Object.keys(p.og).join(" ") || null,
  Object.keys(p.twitter).join(" ") || null,
  p.hreflang.join(" ") || null,
  p.jsonld.join(", ") || null,
  p.robots,
  p.h1,
]);

const header = ["path", "lang", "title (chars)", "description (chars)", "canonical", "og:*", "twitter:*", "hreflang", "JSON-LD", "robots", "H1s"];
const md = [
  `| ${header.join(" | ")} |`,
  `| ${header.map(() => "---").join(" | ")} |`,
  ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`),
].join("\n");

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
if (opt("--json")) fs.writeFileSync(opt("--json"), JSON.stringify(pages, null, 2) + "\n");
if (opt("--md")) fs.writeFileSync(opt("--md"), md + "\n");
if (!opt("--json") && !opt("--md")) console.log(md);
console.error(`seo-inventory: ${pages.length} pages`);
