// Image vendoring for the sync pipeline: find remote image references,
// download them into public/handbook-assets/<slug>/, rewrite the markdown.

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MD_IMAGE_RE = /!\[[^\]]*\]\(\s*<?(https?:\/\/[^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
const HTML_IMG_RE = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;

const KNOWN_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif"]);
const EXT_BY_CONTENT_TYPE = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/gif", ".gif"],
  ["image/webp", ".webp"],
  ["image/svg+xml", ".svg"],
  ["image/avif", ".avif"],
]);

export function findImageUrls(markdown) {
  const urls = new Set();
  for (const m of markdown.matchAll(MD_IMAGE_RE)) urls.add(m[1]);
  for (const m of markdown.matchAll(HTML_IMG_RE)) {
    if (/^https?:\/\//i.test(m[1])) urls.add(m[1]);
  }
  return [...urls];
}

function localFileName(url, contentType) {
  const pathname = new URL(url).pathname;
  const rawBase = path.posix.basename(decodeURIComponent(pathname));
  const urlExt = path.posix.extname(rawBase).toLowerCase();
  const known = KNOWN_EXTS.has(urlExt);
  const ext = known
    ? urlExt
    : EXT_BY_CONTENT_TYPE.get((contentType || "").split(";")[0].trim().toLowerCase()) || ".png";
  const stemSource = known ? rawBase.slice(0, -urlExt.length) : rawBase;
  const stem =
    stemSource.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[-.]+|[-.]+$/g, "") || "image";
  // Hash the URL (not the bytes): the filename is deterministic across
  // re-syncs and collision-proof for same-basename images from different hosts.
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 8);
  return `${stem}-${hash}${ext}`;
}

export async function vendorImages(markdown, { slug, fetchImpl, publicDir }) {
  // Longest URL first so no URL that is a prefix of another gets half-replaced.
  const urls = findImageUrls(markdown).sort((a, b) => b.length - a.length);
  const dir = path.join(publicDir, "handbook-assets", slug);
  const downloaded = [];
  let out = markdown;
  for (const url of urls) {
    let res;
    try {
      res = await fetchImpl(url);
    } catch (cause) {
      throw new Error(`image download failed: ${url} (${cause.message})`);
    }
    if (!res.ok) {
      throw new Error(`image download failed: ${url} (HTTP ${res.status})`);
    }
    const contentType =
      res.headers && typeof res.headers.get === "function"
        ? res.headers.get("content-type")
        : "";
    const fileName = localFileName(url, contentType);
    const bytes = Buffer.from(await res.arrayBuffer());
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, fileName), bytes);
    const localPath = `/handbook-assets/${slug}/${fileName}`;
    out = out.split(url).join(localPath);
    downloaded.push({ url, localPath });
  }
  return { markdown: out, downloaded };
}
