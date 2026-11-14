// Shared parser for the built site's SEO tags (used by inventory.mjs and
// check.mjs). Regex-based on purpose: Astro's output is regular and this
// keeps the scripts dependency-free.
import fs from "node:fs";
import path from "node:path";
import { walk } from "../lib/walk.mjs";

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

export function inspect(dist, file) {
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
    jsonldData: [],
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
      page.jsonldData.push(data);
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


/** Every built HTML page under dist/, parsed. */
export function inspectDist(dist) {
  return walk(dist)
    .filter((f) => f.endsWith(".html"))
    .sort()
    .map((f) => inspect(dist, f));
}
