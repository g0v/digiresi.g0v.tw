// SEO helpers shared by SeoHead.astro, the OG image endpoint and the post-build
// check. Pure functions only (no Astro imports) so vitest can cover them.

export const SITE_ORIGIN = "https://digiresi.g0v.tw";
export const SITE_NAME = { zh: "數位韌性松 DigiResiThon", en: "DigiResiThon" } as const;
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
export const OG_DEFAULT = "/og/default.png";
/** <title> width budget; CJK and fullwidth characters count 2 (crcolab.art rule). */
export const TITLE_BUDGET = 60;

export type Lang = "zh" | "en";

export const langOf = (htmlLang: string | undefined): Lang =>
  htmlLang && htmlLang.toLowerCase().startsWith("en") ? "en" : "zh";

export const ogLocale = (lang: Lang) => (lang === "en" ? "en_US" : "zh_TW");
export const hreflangOf = (lang: Lang) => (lang === "en" ? "en-US" : "zh-Hant");

const WIDE =
  /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/u;

export function titleWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += WIDE.test(ch) ? 2 : 1;
  return w;
}

export const TITLE_SUFFIXES = {
  zh: ["｜數位韌性松 DigiResiThon", "｜DigiResiThon"],
  handbook: ["｜數位韌性手冊 DigiResiThon", "｜數位韌性手冊"],
  en: [" | DigiResiThon"],
} as const;

/**
 * Page name + the longest suffix that keeps the title within TITLE_BUDGET;
 * the page name alone when none fits.
 */
export function composeTitle(name: string, kind: keyof typeof TITLE_SUFFIXES): string {
  for (const suffix of TITLE_SUFFIXES[kind]) {
    if (titleWidth(name + suffix) <= TITLE_BUDGET) return name + suffix;
  }
  return name;
}

/** Absolute URL on the canonical origin. `path` is site-absolute ("/about/"). */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_ORIGIN + "/").href;
}

/** "/" -> "/og/index.png", "/handbook/mesh/buying/" -> "/og/handbook/mesh/buying.png". */
export function ogImagePath(pagePath: string): string {
  const slug = pagePath.replace(/^\/+|\/+$/g, "");
  return `/og/${slug || "index"}.png`;
}

/** Inverse of ogImagePath's slug (endpoint param) back to the page path. */
export function pagePathFromOgSlug(slug: string): string {
  return slug === "index" ? "/" : `/${slug}/`;
}

export const DESCRIPTION_MIN = 70;
export const DESCRIPTION_MAX = 160;
export const charLength = (s: string) => [...s].length;

const SKIP_BLOCK = /^(#|[-*+]\s|\d+[.)]\s|\||>|<|```|:::|!\[|\[\]\(|https?:\/\/|@)/;
const SKIP_LINE = /^(作者|source|來源|原文|出處)\s*[:：]/i;

/** Strip inline Markdown/HTML down to plain text. */
export function plainText(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/(\*\*|__|\*|_|~~|`)/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([，。、；：！？）」』])/g, "$1")
    .trim();
}

/** Cut to at most `max` characters, preferring a sentence end. */
export function clampDescription(text: string, max = DESCRIPTION_MAX): string {
  const chars = [...text];
  if (chars.length <= max) return text;
  const head = chars.slice(0, max).join("");
  const cut = Math.max(head.lastIndexOf("。"), head.lastIndexOf("！"), head.lastIndexOf("？"), head.lastIndexOf(". "));
  if (cut >= DESCRIPTION_MIN) return head.slice(0, cut + 1).trim();
  return chars.slice(0, max - 1).join("").trimEnd() + "…";
}

/**
 * Description from a handbook page's Markdown body: the opening prose
 * paragraphs (skipping headings, lists, tables, callouts, bare links and
 * "作者：/source:" bylines) until at least DESCRIPTION_MIN characters.
 * Returns null when the body has too little opening prose; the page then
 * needs an entry in src/data/handbook-seo.yaml.
 */
export function describeMarkdown(body: string): string | null {
  const parts: string[] = [];
  for (const block of body.split(/\n\s*\n/)) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !SKIP_LINE.test(l));
    if (!lines.length) continue;
    if (SKIP_BLOCK.test(lines[0])) {
      if (parts.length) break; // prose ended
      continue;
    }
    const text = plainText(lines.filter((l) => !SKIP_BLOCK.test(l)).join(" "));
    if (text) parts.push(/[。！？.!?：:]$/.test(text) ? text : text + "。");
    if (charLength(parts.join("")) >= DESCRIPTION_MIN) break;
  }
  const joined = parts.join("");
  if (charLength(joined) < DESCRIPTION_MIN) return null;
  return clampDescription(joined);
}
