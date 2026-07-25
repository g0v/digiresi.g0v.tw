import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { describe, expect, it } from "vitest";

// Deliberate asymmetry with the precache: portal pages are IN the precache and
// OUT of the search index. Search on this site answers "what do I do about X"
// and the handbook holds the answers; indexing portal chrome dilutes results.
// This guard exists so a future reader does not read the asymmetry as an
// oversight and "fix" it by adding data-pagefind-body to a portal page.
const FRAGMENT_DIR = "dist/pagefind/fragment";
const hasBuild = fs.existsSync(FRAGMENT_DIR);

function indexedUrls() {
  return fs.readdirSync(FRAGMENT_DIR).map((name) => {
    const raw = fs.readFileSync(path.join(FRAGMENT_DIR, name));
    // Pagefind gzips each fragment and prefixes the JSON with a format tag.
    const text = zlib.gunzipSync(raw).toString("utf8");
    return JSON.parse(text.slice(text.indexOf("{"))).url;
  });
}

describe.skipIf(!hasBuild)("pagefind index scope", () => {
  it("indexes handbook pages only", () => {
    const urls = indexedUrls();
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.filter((u) => !u.startsWith("/handbook/"))).toEqual([]);
  });
});

it.skipIf(hasBuild)("search scope needs a build", () => {
  console.warn("search-scope: dist/pagefind/ not found — run `npm run build` first.");
});
