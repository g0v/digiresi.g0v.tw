// HackMD-archive -> src/content/handbook sync orchestrator.
//
//   npm run sync          (== node scripts/sync-content.mjs, from the repo root)
//
// Per page: fetch <archiveBase>/<id>.md -> stripHackmdMeta -> extractTitle
// -> convertContainers -> rewriteLinks -> vendorImages -> frontmatter + body.
// Writes are atomic: each page is staged in <contentDir>/../.sync-tmp/ and
// renamed into place only when the whole pipeline succeeded, so a page is
// never half-updated. Any per-page failure is loud: it lands in the summary
// table and flips the exit code to 1.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import {
  stripHackmdMeta,
  extractTitle,
  convertContainers,
  rewriteLinks,
  buildFrontmatter,
} from "./lib/transform.mjs";
import { vendorImages } from "./lib/images.mjs";

const COMMITS_API = "https://api.github.com/repos/g0v-data/g0v-hackmd-archive/commits/main";

export async function syncAll({ configPath, fetchImpl, contentDir, publicDir }) {
  const config = yaml.load(fs.readFileSync(configPath, "utf8"));
  const { archiveBase, hackmdBase, pages } = config;
  const archive = archiveBase.replace(/\/+$/, "");
  const hackmd = hackmdBase.replace(/\/+$/, "");
  const idToSlug = new Map(pages.map((p) => [p.id, p.slug]));

  let sourceCommit;
  try {
    const res = await fetchImpl(COMMITS_API, {
      headers: { accept: "application/vnd.github+json" },
    });
    if (res.ok) sourceCommit = (await res.json()).sha;
  } catch {
    // Offline or rate-limited: sourceCommit stays undefined and is omitted.
  }

  const syncedAt = new Date().toISOString().slice(0, 10);
  const tmpDir = path.join(path.dirname(contentDir), ".sync-tmp");
  const ok = [];
  const failed = [];
  try {
    for (const page of pages) {
      const noteUrl = `${archive}/${page.id}.md`;
      try {
        const res = await fetchImpl(noteUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${noteUrl}`);
        const raw = await res.text();
        const stripped = stripHackmdMeta(raw);
        const { title: extractedTitle, body } = extractTitle(stripped);
        let md = convertContainers(body);
        md = rewriteLinks(md, { idToSlug, hackmdBase: hackmd });
        const vendored = await vendorImages(md, {
          slug: page.slug,
          fetchImpl,
          publicDir,
        });
        const frontmatter = buildFrontmatter({
          title: page.title ?? extractedTitle ?? page.slug,
          section: page.section,
          order: page.order,
          sourceUrl: `${hackmd}/${page.id}`,
          sourceCommit,
          syncedAt,
        });
        fs.mkdirSync(tmpDir, { recursive: true });
        const tmpFile = path.join(tmpDir, `${page.slug.replace(/\//g, "__")}.md`);
        fs.writeFileSync(tmpFile, `${frontmatter}\n${vendored.markdown.trim()}\n`);
        const finalFile = path.join(contentDir, `${page.slug}.md`);
        fs.mkdirSync(path.dirname(finalFile), { recursive: true });
        fs.renameSync(tmpFile, finalFile);
        ok.push({ slug: page.slug });
      } catch (err) {
        failed.push({ slug: page.slug, error: err.message });
      }
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  return { ok, failed };
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const { ok, failed } = await syncAll({
    configPath: "sync.config.yaml",
    fetchImpl: fetch,
    contentDir: "src/content/handbook",
    publicDir: "public",
  });
  for (const { slug } of ok) {
    console.log(`  OK    ${slug.padEnd(28)}`);
  }
  for (const { slug, error } of failed) {
    console.log(`  FAIL  ${slug.padEnd(28)} ${error}`);
  }
  console.log(`\n${ok.length} synced, ${failed.length} failed`);
  if (failed.length > 0) process.exitCode = 1;
}
