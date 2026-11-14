import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import { beforeAll, describe, expect, it } from "vitest";
import rehypeImageDimensions from "../../scripts/rehype-image-dimensions.mjs";

let publicDir;
beforeAll(async () => {
  publicDir = fs.mkdtempSync(path.join(os.tmpdir(), "img-dims-"));
  fs.mkdirSync(path.join(publicDir, "handbook-assets"), { recursive: true });
  const png = (w, h) => sharp({ create: { width: w, height: h, channels: 3, background: "#000" } }).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, "handbook-assets/a.png"), await png(800, 600));
  fs.writeFileSync(path.join(publicDir, "handbook-assets/b.png"), await png(400, 200));
  fs.writeFileSync(path.join(publicDir, "handbook-assets/broken.png"), "not an image");
});

async function run(html, base = "/") {
  const out = await unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeImageDimensions, { base, publicDir })
    .use(rehypeStringify)
    .process(html);
  return String(out);
}

describe("rehype-image-dimensions", () => {
  it("sizes local images, keeps the first eager and lazy-loads the rest", async () => {
    const out = await run('<p><img src="/handbook-assets/a.png" alt="a"><img src="/handbook-assets/b.png" alt="b"></p>');
    expect(out).toContain('<img src="/handbook-assets/a.png" alt="a" width="800" height="600">');
    expect(out).toContain('<img src="/handbook-assets/b.png" alt="b" loading="lazy" decoding="async" width="400" height="200">');
  });

  it("strips the deploy base before reading the file", async () => {
    const out = await run('<img src="/digiresi.g0v.tw/handbook-assets/a.png">', "/digiresi.g0v.tw/");
    expect(out).toContain('width="800" height="600"');
  });

  it("completes a single given dimension from the aspect ratio", async () => {
    const out = await run('<img src="/handbook-assets/a.png" width="400">');
    expect(out).toContain('width="400" height="300"');
  });

  it("leaves remote, missing and unreadable images unsized without failing", async () => {
    const out = await run(
      '<img src="/x.png"><img src="https://example.com/r.png"><img src="/handbook-assets/missing.png"><img src="/handbook-assets/broken.png"><img src="/../etc/passwd">',
    );
    expect(out).not.toMatch(/width=|height=/);
    expect(out.match(/loading="lazy"/g)).toHaveLength(4);
  });
});
