import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { llmsFullTxt } from "../lib/seo/llms";

export const GET: APIRoute = async () =>
  new Response(llmsFullTxt(await getCollection("handbook")), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
