// Pure string transforms for the HackMD-archive -> handbook sync pipeline.
// No imports: every function here is deterministic string -> string work.

export function stripHackmdMeta(markdown) {
  // Remove a YAML frontmatter block only when it opens on the very first line.
  let out = markdown.replace(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n/, "");
  // Remove HackMD "###### tags:" lines and "{%hackmd <id> %}" embed directives wherever they appear.
  out = out
    .split("\n")
    .filter((line) => !/^######\s*tags:/i.test(line.trim()))
    .filter((line) => !/^\{%hackmd\s+[^%]*%\}$/i.test(line.trim()))
    .join("\n");
  // Trim whitespace-only lines left dangling at the top of the note.
  return out.replace(/^\s*\n+/, "");
}

export function extractTitle(markdown) {
  const lines = markdown.split("\n");
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^(```|~~~)/.test(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue; // a "# comment" inside a code block is not a title
    const m = lines[i].match(/^#[ \t]+(.+?)\s*$/);
    if (m) {
      const body = [...lines.slice(0, i), ...lines.slice(i + 1)]
        .join("\n")
        .replace(/^\s*\n+/, "");
      return { title: m[1], body };
    }
  }
  return { title: null, body: markdown };
}

const CALLOUT_TYPES = new Set(["info", "warning", "success", "danger"]);

export function convertContainers(markdown) {
  // Blank lines around the injected HTML keep the inner markdown rendering
  // as markdown (CommonMark closes an HTML block at a blank line).
  const lines = markdown.split("\n");
  const out = [];
  const stack = [];
  for (const line of lines) {
    if (line.trim() === ":::" && stack.length > 0) {
      out.push("", stack.pop() === "details" ? "</details>" : "</div>");
      continue;
    }
    const open = line.match(/^:::\s*([A-Za-z][\w-]*)\s*(.*)$/);
    if (open) {
      const type = open[1].toLowerCase();
      if (type === "spoiler") {
        const summary = open[2].trim() || "展開";
        out.push(`<details><summary>${summary}</summary>`, "");
        stack.push("details");
      } else if (CALLOUT_TYPES.has(type)) {
        out.push(`<div class="callout callout-${type}">`, "");
        stack.push("div");
      } else {
        out.push('<div class="callout">', "");
        stack.push("div");
      }
      continue;
    }
    out.push(line);
  }
  // Auto-close any containers the upstream note left open.
  while (stack.length > 0) {
    out.push("", stack.pop() === "details" ? "</details>" : "</div>");
  }
  return out.join("\n");
}

export function rewriteLinks(markdown, { idToSlug, hackmdBase }) {
  const base = hackmdBase.replace(/\/+$/, "");
  // Normalize malformed external links with a stray leading slash: ](/https://...) → ](https://...)
  let out = markdown.replace(/\]\(\/(https?:\/\/)/g, "]($1");
  // Archive-relative note links: ](../notes/<id>.md)
  out = out.replace(
    /\]\((?:\.\.\/)+notes\/([A-Za-z0-9_-]+)\.md\)/g,
    (_match, id) =>
      idToSlug.has(id) ? `](/handbook/${idToSlug.get(id)}/)` : `](${base}/${id})`
  );
  // Root-absolute note links: ](/<id>). Only mapped ids, or unmapped strings
  // long enough to be real HackMD note ids (>= 20 chars), are rewritten —
  // short site-local links such as ](/about) pass through unchanged.
  out = out.replace(/\]\(\/([A-Za-z0-9_-]+)\)/g, (match, id) => {
    if (idToSlug.has(id)) return `](/handbook/${idToSlug.get(id)}/)`;
    if (/^[A-Za-z0-9_-]{20,}$/.test(id)) return `](${base}/${id})`;
    return match;
  });
  return out;
}

export function buildFrontmatter({
  title,
  section,
  order,
  sourceUrl,
  sourceCommit,
  syncedAt,
  description,
}) {
  // JSON.stringify produces a valid YAML double-quoted scalar (quotes and
  // backslashes escaped, CJK preserved verbatim).
  const lines = ["---"];
  lines.push(`title: ${JSON.stringify(title)}`);
  lines.push(`section: ${section}`);
  lines.push(`order: ${order}`);
  lines.push(`sourceUrl: ${JSON.stringify(sourceUrl)}`);
  if (sourceCommit !== undefined) lines.push(`sourceCommit: ${JSON.stringify(sourceCommit)}`);
  lines.push(`syncedAt: ${JSON.stringify(syncedAt)}`);
  if (description !== undefined) lines.push(`description: ${JSON.stringify(description)}`);
  lines.push("---", "");
  return lines.join("\n");
}
