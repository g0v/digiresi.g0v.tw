// JSON-LD validation for the post-build check: every block must parse (the
// parser records INVALID-JSON otherwise), declare the schema.org context, and
// give each node the properties its type needs. Per-page expectations follow
// docs/seo/audit.md: WebSite + Organization on the home pages, one Event per
// dated schedule entry, TechArticle + BreadcrumbList on handbook pages.
export const ORIGIN = "https://digiresi.g0v.tw";

export const REQUIRED = {
  WebSite: ["name", "url"],
  Organization: ["name", "url"],
  WebPage: ["name", "url", "inLanguage"],
  AboutPage: ["name", "url", "inLanguage"],
  CollectionPage: ["name", "url", "inLanguage"],
  Event: ["name", "startDate", "location", "url"],
  EventSeries: ["name"],
  Place: ["name"],
  TechArticle: ["headline", "url", "inLanguage", "dateModified", "isBasedOn"],
  BreadcrumbList: ["itemListElement"],
  ListItem: ["position", "name"],
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2})?)?$/;

/** All typed nodes in a block (top level, @graph members and nested objects). */
export function nodesOf(block) {
  const out = [];
  const visit = (n) => {
    if (Array.isArray(n)) n.forEach(visit);
    else if (n && typeof n === "object") {
      if (n["@type"]) out.push(n);
      Object.values(n).forEach(visit);
    }
  };
  visit(block);
  return out;
}

/**
 * Problems in one page's JSON-LD. `expect` lists @types that must appear;
 * `eventCount` (schedule page) is the number of dated events in events.yaml.
 */
export function validateJsonLd(page, { expect = [], eventCount } = {}) {
  const problems = [];
  const fail = (msg) => problems.push(`${page.path}: JSON-LD ${msg}`);
  if (page.jsonld.includes("INVALID-JSON")) fail("block does not parse");
  const nodes = [];
  for (const block of page.jsonldData ?? []) {
    if (block["@context"] !== "https://schema.org") fail(`block @context is ${block["@context"]}`);
    nodes.push(...nodesOf(block));
  }
  for (const n of nodes) {
    const type = [].concat(n["@type"])[0];
    for (const prop of REQUIRED[type] ?? []) {
      if (n[prop] === undefined || n[prop] === null || n[prop] === "") fail(`${type} "${n.name ?? n.headline ?? ""}" lacks ${prop}`);
    }
    for (const prop of ["startDate", "dateModified"]) {
      if (n[prop] !== undefined && !ISO_DATE.test(String(n[prop]))) fail(`${type} ${prop} "${n[prop]}" is not an ISO date`);
    }
    if (typeof n.url === "string" && !/^https:\/\//.test(n.url)) fail(`${type} url ${n.url} is not absolute`);
    if (type === "BreadcrumbList") {
      const items = n.itemListElement ?? [];
      items.forEach((it, i) => {
        if (it.position !== i + 1) fail(`BreadcrumbList position ${it.position} at index ${i}`);
        if (!String(it.item ?? "").startsWith(`${ORIGIN}/`)) fail(`BreadcrumbList item "${it.name}" has no ${ORIGIN} URL`);
      });
      if (items.length && items.at(-1).item !== `${ORIGIN}${page.path}`) fail("BreadcrumbList does not end at this page");
    }
  }
  const types = new Set(nodes.map((n) => [].concat(n["@type"])[0]));
  for (const t of expect) if (!types.has(t)) fail(`has no ${t}`);
  if (eventCount !== undefined) {
    const events = nodes.filter((n) => n["@type"] === "Event").length;
    if (events !== eventCount) fail(`has ${events} Event nodes; events.yaml has ${eventCount} dated events with a venue`);
  }
  return problems;
}

/** The @types a page must carry, by path. */
export function expectedTypes(path) {
  if (path === "/" || path === "/en/") return ["WebSite", "Organization", "WebPage"];
  if (path === "/schedule/") return ["WebPage", "BreadcrumbList", "EventSeries", "Event"];
  if (path === "/handbook/") return ["CollectionPage", "BreadcrumbList"];
  if (path.startsWith("/handbook/")) return ["TechArticle", "BreadcrumbList"];
  if (path === "/about/") return ["AboutPage", "BreadcrumbList"];
  return ["WebPage", "BreadcrumbList"];
}
