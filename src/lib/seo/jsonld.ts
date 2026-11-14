// schema.org JSON-LD per page type. Only facts the site already has: names,
// URLs, the schedule in src/data/events.yaml and the handbook's sync metadata.
// Nothing invented (no authors, publish dates, ratings, FAQs, prices).
import { loadEvents, type EventEntry } from "../events";
import { SITE_NAME, SITE_ORIGIN, absoluteUrl, ogImagePath, type Lang } from "./index";

type Node = Record<string, unknown>;
const ID = {
  website: `${SITE_ORIGIN}/#website`,
  org: `${SITE_ORIGIN}/#organization`,
  g0v: "https://g0v.tw/#organization",
  series: `${SITE_ORIGIN}/schedule/#series`,
  handbook: `${SITE_ORIGIN}/handbook/#collection`,
};
const inLanguage = (lang: Lang) => (lang === "en" ? "en-US" : "zh-Hant-TW");

export function g0vNode(): Node {
  return {
    "@type": "Organization",
    "@id": ID.g0v,
    name: "g0v 零時政府",
    alternateName: "g0v",
    url: "https://g0v.tw/",
    sameAs: ["https://github.com/g0v"],
  };
}

export function organizationNode(): Node {
  return {
    "@type": "Organization",
    "@id": ID.org,
    name: SITE_NAME.zh,
    alternateName: ["DigiResiThon", "數位韌性松", "Digital Resilience Hackathon"],
    url: `${SITE_ORIGIN}/`,
    logo: absoluteUrl("/icons/icon-512.png"),
    parentOrganization: { "@id": ID.g0v },
    sameAs: ["https://github.com/g0v/digiresi.g0v.tw", "https://g0v-digiresi.kktix.cc/"],
  };
}

export function websiteNode(): Node {
  return {
    "@type": "WebSite",
    "@id": ID.website,
    name: SITE_NAME.zh,
    alternateName: "DigiResiThon",
    url: `${SITE_ORIGIN}/`,
    inLanguage: ["zh-Hant-TW", "en-US"],
    publisher: { "@id": ID.org },
  };
}

export function breadcrumb(items: { name: string; path: string }[]): Node {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

function webPage(type: string, path: string, name: string, description: string, lang: Lang): Node {
  return {
    "@type": type,
    "@id": `${absoluteUrl(path)}#webpage`,
    url: absoluteUrl(path),
    name,
    description,
    inLanguage: inLanguage(lang),
    isPartOf: { "@id": ID.website },
    primaryImageOfPage: absoluteUrl(ogImagePath(path)),
  };
}

export function eventNodes(events: EventEntry[]): Node[] {
  return events
    .filter((e) => e.date && e.venue)
    .map((e) => ({
      "@type": "Event",
      name: e.name,
      startDate: e.date,
      location: { "@type": "Place", name: e.venue },
      ...(e.summary ? { description: e.summary } : {}),
      url: e.url,
      organizer: { "@id": ID.org },
      superEvent: { "@id": ID.series },
    }));
}

const graph = (...nodes: Node[]) => ({ "@context": "https://schema.org", "@graph": nodes });

/** JSON-LD for a page in the static registry (src/lib/seo/pages.ts). */
export function pageJsonLd(path: string, page: { title: string; description: string; lang: Lang; og: { heading: string }; noindex?: boolean }) {
  if (page.noindex) return undefined;
  const home = page.lang === "en" ? { name: "Home", path: "/" } : { name: "首頁", path: "/" };
  if (path === "/" || path === "/en/") {
    return graph(websiteNode(), organizationNode(), g0vNode(), {
      ...webPage("WebPage", path, page.title, page.description, page.lang),
      about: { "@id": ID.org },
    });
  }
  const crumbs = [home];
  if (path.startsWith("/design-kits/") && path !== "/design-kits/") crumbs.push({ name: "Design Kits", path: "/design-kits/" });
  crumbs.push({ name: page.og.heading, path });
  const type = path === "/about/" ? "AboutPage" : path === "/handbook/" ? "CollectionPage" : "WebPage";
  const nodes: Node[] = [webPage(type, path, page.title, page.description, page.lang), breadcrumb(crumbs)];
  if (path === "/handbook/") nodes[0] = { ...nodes[0], "@id": ID.handbook };
  if (path === "/schedule/") {
    nodes.push(
      { "@type": "EventSeries", "@id": ID.series, name: SITE_NAME.zh, url: absoluteUrl("/schedule/"), organizer: { "@id": ID.org } },
      ...eventNodes(loadEvents()),
    );
  }
  return graph(...nodes);
}

/** TechArticle + BreadcrumbList for a synced handbook page. */
export function handbookJsonLd(p: {
  path: string;
  title: string;
  description: string;
  sectionName: string;
  modified: string;
  sourceUrl: string;
}) {
  return graph(
    {
      "@type": "TechArticle",
      "@id": `${absoluteUrl(p.path)}#article`,
      headline: p.title,
      description: p.description,
      url: absoluteUrl(p.path),
      mainEntityOfPage: absoluteUrl(p.path),
      inLanguage: "zh-Hant-TW",
      articleSection: p.sectionName,
      dateModified: p.modified,
      isBasedOn: p.sourceUrl,
      image: absoluteUrl(ogImagePath(p.path)),
      isPartOf: { "@id": ID.handbook },
      publisher: { "@id": ID.org },
    },
    breadcrumb([
      { name: "首頁", path: "/" },
      { name: "數位韌性手冊", path: "/handbook/" },
      { name: p.title, path: p.path },
    ]),
  );
}
