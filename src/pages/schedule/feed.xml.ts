import type { APIRoute } from "astro";
import { loadEvents } from "../../lib/events";
import { scheduleFeed } from "../../lib/seo/feed";

export const GET: APIRoute = () =>
  new Response(scheduleFeed(loadEvents()), {
    headers: { "Content-Type": "application/atom+xml; charset=utf-8" },
  });
