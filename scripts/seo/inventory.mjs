// SEO inventory of the built site: walks dist/ for every .html page and reports
// the head metadata search engines and answer engines read (title, description,
// canonical, og:*, twitter:*, hreflang, JSON-LD @types, robots, <html lang>, H1s).
// Usage: node scripts/seo/inventory.mjs [--json out.json] [--md out.md]
// Run after `npm run build`. Read-only; no dependencies.
import fs from "node:fs";
import path from "node:path";
import { inspectDist } from "./lib.mjs";

const dist = path.resolve("dist");
if (!fs.existsSync(dist)) {
  console.error("seo-inventory: dist/ not found — run `npm run build` first.");
  process.exit(1);
}

const pages = inspectDist(dist);
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
