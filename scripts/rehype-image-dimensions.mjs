import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { visit } from "unist-util-visit";

/**
 * Handbook images (G17 in docs/seo/audit.md): give every <img> its intrinsic
 * width/height so the browser reserves its box (no layout shift), and
 * loading="lazy" decoding="async" so off-screen images don't compete with the
 * page. The first image of each document stays eager (it can be the LCP
 * image). Dimensions come from the file under public/ via sharp at build time;
 * remote, missing or unreadable images get no width/height and never fail the
 * build. Only the rendered HTML changes — src/content/handbook/ is untouched.
 *
 * Options: `base` (deploy base path, stripped from src before the lookup) and
 * `publicDir` (default "public").
 */
export default function rehypeImageDimensions({ base = "/", publicDir = "public" } = {}) {
  const cache = new Map();
  const sizeOf = (file) => {
    if (!cache.has(file)) {
      cache.set(
        file,
        sharp(file)
          .metadata()
          .then((m) => (m.width && m.height ? { width: m.width, height: m.height } : null))
          .catch(() => null),
      );
    }
    return cache.get(file);
  };

  const localFile = (src) => {
    if (typeof src !== "string" || !src.startsWith("/") || src.startsWith("//")) return null;
    let rel = decodeURI(src.split(/[?#]/)[0]);
    const prefix = base.replace(/\/$/, "");
    if (prefix && rel.startsWith(`${prefix}/`)) rel = rel.slice(prefix.length);
    const file = path.join(publicDir, rel);
    const root = path.resolve(publicDir);
    return path.resolve(file).startsWith(root + path.sep) && fs.existsSync(file) ? file : null;
  };

  return async (tree) => {
    const images = [];
    visit(tree, "element", (node) => {
      if (node.tagName === "img") images.push(node);
    });
    await Promise.all(
      images.map(async (node, i) => {
        const props = (node.properties ??= {});
        if (i > 0) {
          props.loading ??= "lazy";
          props.decoding ??= "async";
        }
        const file = localFile(props.src);
        const size = file ? await sizeOf(file) : null;
        if (!size) return;
        const w = props.width != null ? Number(props.width) : null;
        const h = props.height != null ? Number(props.height) : null;
        if (w == null && h == null) {
          props.width = size.width;
          props.height = size.height;
        } else if (w != null && h == null && w > 0) {
          props.height = Math.round((w * size.height) / size.width);
        } else if (h != null && w == null && h > 0) {
          props.width = Math.round((h * size.width) / size.height);
        }
      }),
    );
  };
}
