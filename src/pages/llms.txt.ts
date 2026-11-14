import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { loadEvents, upcomingEvent } from "../lib/events";
import { llmsTxt } from "../lib/seo/llms";

export const GET: APIRoute = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const body = llmsTxt(await getCollection("handbook"), upcomingEvent(loadEvents(), today));
  return new Response(body, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
};
