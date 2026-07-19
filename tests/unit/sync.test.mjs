import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { syncAll } from "../../scripts/sync-content.mjs";

const GOOD_ID = "goodnote000000000000gA";
const MISSING_ID = "missingnote000000000gB";
const IMG_URL = "https://i.imgur.com/kit0001.png";

const CONFIG_YAML = `archiveBase: https://raw.example.test/notes
hackmdBase: https://hackmd.example.test
pages:
  - id: ${GOOD_ID}
    slug: prepare/go-bag
    section: prepare
    order: 1
    title: 準備救難包
  - id: ${MISSING_ID}
    slug: respond/health
    section: respond
    order: 3
    title: 災害時保健
`;

const GOOD_NOTE = `---
tags: 民防, 數位韌性松
---

# 準備救難包

###### tags: \`民防\`

每人準備一個 72 小時救難包。

:::info
清單每季檢查一次。
:::

延伸閱讀：[災害時保健](../notes/${MISSING_ID}.md) 與 [其他共筆](../notes/unmapped00.md)。

![救難包](${IMG_URL})
`;

function stubFetch(url) {
  if (url === `https://raw.example.test/notes/${GOOD_ID}.md`) {
    return { ok: true, status: 200, text: async () => GOOD_NOTE };
  }
  if (url === `https://raw.example.test/notes/${MISSING_ID}.md`) {
    return { ok: false, status: 404, text: async () => "404: Not Found" };
  }
  if (url === "https://api.github.com/repos/g0v-data/g0v-hackmd-archive/commits/main") {
    return { ok: true, status: 200, json: async () => ({ sha: "fedcba9876543210feed" }) };
  }
  if (url === IMG_URL) {
    return {
      ok: true,
      status: 200,
      headers: { get: (n) => (n.toLowerCase() === "content-type" ? "image/png" : null) },
      arrayBuffer: async () => new TextEncoder().encode("png!").buffer,
    };
  }
  throw new Error(`unexpected fetch: ${url}`);
}
const fetchImpl = async (url) => stubFetch(String(url));

describe("syncAll", () => {
  let root;
  let contentDir;
  let publicDir;
  let result;

  beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "digiresi-sync-"));
    contentDir = path.join(root, "content", "handbook");
    publicDir = path.join(root, "public");
    const configPath = path.join(root, "sync.config.yaml");
    fs.writeFileSync(configPath, CONFIG_YAML);
    result = await syncAll({ configPath, fetchImpl, contentDir, publicDir });
  });

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("reports the reachable page in ok and the 404 page in failed", () => {
    expect(result.ok).toEqual([{ slug: "prepare/go-bag" }]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].slug).toBe("respond/health");
    expect(result.failed[0].error).toContain("404");
  });

  it("writes the successful page with full frontmatter and a transformed body", () => {
    const text = fs.readFileSync(path.join(contentDir, "prepare", "go-bag.md"), "utf8");
    expect(text.startsWith("---\n")).toBe(true);
    expect(text).toContain('title: "準備救難包"');
    expect(text).toContain("section: prepare");
    expect(text).toContain("order: 1");
    expect(text).toContain(`sourceUrl: "https://hackmd.example.test/${GOOD_ID}"`);
    expect(text).toContain('sourceCommit: "fedcba9876543210feed"');
    expect(text).toMatch(/syncedAt: "\d{4}-\d{2}-\d{2}"/);
    expect(text).not.toContain("tags: 民防, 數位韌性松");
    expect(text).not.toContain("###### tags:");
    expect(text).not.toMatch(/^# 準備救難包$/m);
    expect(text).toContain('<div class="callout callout-info">');
    expect(text).toContain("](/handbook/respond/health/)");
    expect(text).toContain("](https://hackmd.example.test/unmapped00)");
    expect(text).toContain("![救難包](/handbook-assets/prepare/go-bag/kit0001-");
  });

  it("vendors the note's image into publicDir", () => {
    const dir = path.join(publicDir, "handbook-assets", "prepare", "go-bag");
    const files = fs.readdirSync(dir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^kit0001-[0-9a-f]{8}\.png$/);
  });

  it("writes nothing at all for the failed page", () => {
    expect(fs.existsSync(path.join(contentDir, "respond", "health.md"))).toBe(false);
    expect(fs.existsSync(path.join(contentDir, "respond"))).toBe(false);
  });

  it("cleans up the .sync-tmp staging directory", () => {
    expect(fs.existsSync(path.join(root, "content", ".sync-tmp"))).toBe(false);
  });
});
