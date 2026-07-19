// Precache budget gate (spec section 5): expands the shared precache globs
// against dist/ and fails when the total exceeds the 10 MB offline budget.
// An offline kit that cannot finish caching on disaster-day connectivity
// is not resilient.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { precacheGlobs } from "./precache-globs.mjs";
import { walk } from "./lib/walk.mjs";

export const BUDGET_BYTES = 10485760; // 10 MB

export function globToRegExp(glob) {
  let source = "";
  let i = 0;
  while (i < glob.length) {
    const ch = glob[i];
    if (ch === "*") {
      if (glob[i + 1] === "*") {
        if (glob[i + 2] === "/") {
          source += "(?:[^/]+/)*"; // "**/" -> zero or more whole path segments
          i += 3;
        } else {
          source += ".*"; // bare "**" -> anything, "/" included
          i += 2;
        }
      } else {
        source += "[^/]*"; // "*" -> anything except "/"
        i += 1;
      }
    } else if ("\\^$.|?+()[]{}".includes(ch)) {
      source += "\\" + ch;
      i += 1;
    } else {
      source += ch;
      i += 1;
    }
  }
  return new RegExp("^" + source + "$");
}

function kib(n) {
  return `${(n / 1024).toFixed(1)} KiB`;
}

function main() {
  const distDir = path.resolve("dist");
  if (!fs.existsSync(distDir)) {
    console.error("check-budget: dist/ not found — run `npm run build` first.");
    process.exitCode = 1;
    return;
  }
  const regexps = precacheGlobs.map(globToRegExp);
  const files = walk(distDir).filter((f) => regexps.some((re) => re.test(f)));

  const byTopDir = new Map();
  let total = 0;
  for (const file of files) {
    const size = fs.statSync(path.join(distDir, file)).size;
    total += size;
    const top = file.includes("/") ? file.slice(0, file.indexOf("/")) + "/" : "(root)";
    const row = byTopDir.get(top) ?? { files: 0, bytes: 0 };
    row.files += 1;
    row.bytes += size;
    byTopDir.set(top, row);
  }

  console.log("PRECACHE BUDGET (dist/)");
  console.log("------------------------------------------------------");
  for (const [top, row] of [...byTopDir.entries()].sort((a, b) => b[1].bytes - a[1].bytes)) {
    console.log(
      `${top.padEnd(26)} ${String(row.files).padStart(4)} files ${kib(row.bytes).padStart(12)}`
    );
  }
  console.log("------------------------------------------------------");
  console.log(`TOTAL ${files.length} files, ${total} bytes (${kib(total)})`);

  if (total > BUDGET_BYTES) {
    console.error(
      `FAIL: precache total ${total} bytes > ${BUDGET_BYTES} (10 MB budget). ` +
        "Trim vendored images under public/handbook-assets/ or drop pages from sync.config.yaml."
    );
    process.exitCode = 1;
  } else {
    console.log(`PASS: precache total ${total} bytes <= ${BUDGET_BYTES}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
