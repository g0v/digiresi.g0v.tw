// Internal link gate: walks dist/**/*.html, extracts href/src attribute
// values with a regex, and verifies every internal link (starts with "/",
// not "//") resolves to a file that exists in dist/. Trailing-slash URLs
// resolve to <path>/index.html.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { walk } from "./lib/walk.mjs";
import { getBase } from "./lib/deploy-base.mjs";

// Returns the dist-relative file path a href should resolve to, or null
// when the ref is not an internal absolute path (external URL, fragment,
// mailto:, data:, tel:, protocol-relative, or relative path), or when it
// doesn't fall under the given base.
export function resolveHref(href, base = "/") {
  if (typeof href !== "string" || !href.startsWith("/") || href.startsWith("//")) return null;
  let p = href.split("#")[0].split("?")[0];
  try {
    p = decodeURIComponent(p);
  } catch {
    // malformed percent-escape: keep the raw path; the existence check will flag it
  }
  if (base !== "/" && p.startsWith(base)) p = "/" + p.slice(base.length);
  else if (base !== "/") return null; // in-scope base mismatch: not one of ours
  if (p.endsWith("/")) p += "index.html";
  return p.replace(/^\//, "");
}

function extractRefs(html) {
  const refs = [];
  const re = /\b(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let m;
  while ((m = re.exec(html)) !== null) refs.push(m[1] ?? m[2]);
  return refs;
}

function targetExists(distDir, target) {
  const full = path.join(distDir, target);
  if (!fs.existsSync(full)) return false;
  if (fs.statSync(full).isFile()) return true;
  // Extensionless link to a directory ("/handbook"): GitHub Pages redirects
  // to the trailing-slash URL, so accept it when <dir>/index.html exists.
  return fs.existsSync(path.join(full, "index.html"));
}

function main() {
  const distDir = path.resolve("dist");
  if (!fs.existsSync(distDir)) {
    console.error("check-links: dist/ not found — run `npm run build` first.");
    process.exitCode = 1;
    return;
  }
  const base = getBase();
  const htmlFiles = walk(distDir).filter((f) => f.endsWith(".html"));
  const broken = [];
  let checked = 0;
  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(distDir, file), "utf8");
    for (const ref of extractRefs(html)) {
      const target = resolveHref(ref, base);
      if (target === null) continue;
      checked += 1;
      if (!targetExists(distDir, target)) broken.push({ file, ref });
    }
  }
  for (const b of broken) console.error(`BROKEN: ${b.ref} (in dist/${b.file})`);
  if (broken.length > 0) {
    console.error(
      `FAIL: ${broken.length} broken internal links out of ${checked} checked in ${htmlFiles.length} HTML files`
    );
    process.exitCode = 1;
  } else {
    console.log(
      `PASS: 0 broken internal links (${checked} internal refs checked across ${htmlFiles.length} HTML files)`
    );
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
