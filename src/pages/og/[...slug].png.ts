// One 1200x630 OG card per page, generated at build time into dist/og/.
// /og/** is outside the PWA precache globs (scripts/precache-globs.mjs).
import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { renderOgPng, type OgCardInput } from "../../lib/og/render";
import { ogImagePath } from "../../lib/seo";
import { handbookSeo } from "../../lib/seo/handbook";
import { PAGES } from "../../lib/seo/pages";

const slugOf = (pagePath: string) => ogImagePath(pagePath).replace(/^\/og\//, "").replace(/\.png$/, "");

export const getStaticPaths = (async () => {
  const cards: { slug: string; card: OgCardInput }[] = Object.entries(PAGES).map(([path, s]) => ({
    slug: slugOf(path),
    card: { ...s.og, path },
  }));
  for (const page of await getCollection("handbook")) {
    const path = `/handbook/${page.id}/`;
    cards.push({ slug: slugOf(path), card: { ...handbookSeo(page).og, path } });
  }
  // Fallback for any page without its own card (SeoHead's default).
  cards.push({ slug: "default", card: { heading: "數位韌性松 DigiResiThon", kicker: "g0v 公民黑客松", path: "/" } });
  return cards.map(({ slug, card }) => ({ params: { slug }, props: { card } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOgPng((props as { card: OgCardInput }).card);
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
