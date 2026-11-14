// robots.txt, modelled on crcolab.art's: everything allowed, Content Signals
// (https://contentsignals.org/) declared, AI crawlers named by purpose.
// Tokens come from each operator's own crawler documentation (Cloudflare
// Radar's bot directory where none is published). Not precached.
import type { APIRoute } from "astro";
import { SITE_ORIGIN } from "../lib/seo";

export const SIGNAL = "Content-Signal: search=yes, ai-input=yes, ai-train=yes";

export const CRAWLER_GROUPS: { comment: string; agents: string[] }[] = [
  {
    comment: "Search discovery: builds the index an AI answer cites from",
    agents: [
      "Googlebot", "bingbot", "OAI-SearchBot", "Claude-SearchBot", "PerplexityBot", "Applebot",
      "Amzn-SearchBot", "MistralAI-Index", "meta-webindexer", "PetalBot", "Baiduspider",
    ],
  },
  {
    comment: "User-triggered retrieval: fetches a page when someone asks an assistant about it,\n# shares a link, or points an agent at it",
    agents: [
      "ChatGPT-User", "Claude-User", "Perplexity-User", "MistralAI-User", "DuckAssistBot",
      "Amzn-User", "meta-externalfetcher", "facebookexternalhit",
    ],
  },
  {
    comment: "Model training and grounding (Google-Extended and Applebot-Extended are control\n# tokens with no crawler of their own)",
    agents: [
      "GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "Amazonbot", "MistralAI-Training",
      "meta-externalagent", "CCBot", "Google-CloudVertexBot", "Bytespider",
    ],
  },
  {
    comment: "Web archives: preserve snapshots of the site",
    agents: ["archive.org_bot", "Arquivo-web-crawler"],
  },
];

export function robotsTxt(): string {
  const lines = [
    "# Content Signals (https://contentsignals.org/): search = search index and results",
    "# with links and excerpts; ai-input = retrieval, grounding and other real-time use",
    "# in AI answers; ai-train = training or fine-tuning AI models. All three are",
    "# welcome. The line is repeated in every group, because a crawler obeys only the",
    "# most specific group that names it (RFC 9309).",
    "User-agent: *",
    SIGNAL,
    "Allow: /",
    "",
    "# AI / LLM crawlers, search engines and archivers: explicitly welcome, grouped by",
    "# what each one does. The rule above already allows them; these groups record the",
    "# decision.",
  ];
  for (const g of CRAWLER_GROUPS) {
    lines.push("", `# ${g.comment}`, ...g.agents.map((a) => `User-agent: ${a}`), SIGNAL, "Allow: /");
  }
  lines.push("", `Sitemap: ${SITE_ORIGIN}/sitemap-index.xml`, "");
  return lines.join("\n");
}

export const GET: APIRoute = () =>
  new Response(robotsTxt(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
