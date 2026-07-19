import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { findImageUrls } from "../../scripts/lib/images.mjs";

const hash8 = (url) => createHash("sha256").update(url).digest("hex").slice(0, 8);

describe("findImageUrls", () => {
  it("finds http(s) URLs in markdown image syntax", () => {
    const md = "說明圖：\n\n![救難包內容物](https://i.imgur.com/AbCd123.png)\n";
    expect(findImageUrls(md)).toEqual(["https://i.imgur.com/AbCd123.png"]);
  });

  it("finds http(s) URLs in raw <img> tags", () => {
    const md = '節點照片 <img src="https://hackmd.io/_uploads/r1node.jpg" alt="node"> 如上。';
    expect(findImageUrls(md)).toEqual(["https://hackmd.io/_uploads/r1node.jpg"]);
  });

  it("skips data: URIs and local paths", () => {
    const md = [
      "![inline](data:image/png;base64,iVBORw0KGgo=)",
      "![local](./diagram.png)",
      '<img src="/handbook-assets/mesh/intro/x.png">',
      "![remote](https://example.com/ok.png)",
    ].join("\n");
    expect(findImageUrls(md)).toEqual(["https://example.com/ok.png"]);
  });
});

import { vendorImages } from "../../scripts/lib/images.mjs";

describe("vendorImages", () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "digiresi-images-"));
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const pngBytes = new TextEncoder().encode("fake-png-bytes");
  const okFetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: (name) => (name.toLowerCase() === "content-type" ? "image/png" : null) },
    arrayBuffer: async () => pngBytes.buffer,
  });

  it("downloads each image, names it <stem>-<8char-sha256>.<ext>, and rewrites the reference", async () => {
    const url = "https://i.imgur.com/AbCd123.png";
    const md = `開箱照：\n\n![救難包](${url})\n`;
    const { markdown, downloaded } = await vendorImages(md, {
      slug: "prepare/go-bag",
      fetchImpl: okFetch,
      publicDir: tmpDir,
    });
    const expectedFile = `AbCd123-${hash8(url)}.png`;
    const expectedLocal = `/handbook-assets/prepare/go-bag/${expectedFile}`;
    expect(markdown).toBe(`開箱照：\n\n![救難包](${expectedLocal})\n`);
    expect(downloaded).toEqual([{ url, localPath: expectedLocal }]);
    const onDisk = fs.readFileSync(
      path.join(tmpDir, "handbook-assets", "prepare", "go-bag", expectedFile)
    );
    expect(onDisk.toString()).toBe("fake-png-bytes");
  });

  it("rewrites <img src> too and derives the extension from content-type when the URL has none", async () => {
    const url = "https://hackmd.io/_uploads/SkQ9nodePhoto";
    const md = `<img src="${url}" alt="node">`;
    const { markdown } = await vendorImages(md, {
      slug: "mesh/intro",
      fetchImpl: okFetch,
      publicDir: tmpDir,
    });
    const expectedFile = `SkQ9nodePhoto-${hash8(url)}.png`;
    expect(markdown).toBe(`<img src="/handbook-assets/mesh/intro/${expectedFile}" alt="node">`);
    expect(
      fs.existsSync(path.join(tmpDir, "handbook-assets", "mesh", "intro", expectedFile))
    ).toBe(true);
  });

  it("throws an Error whose message includes the URL when the response is not ok", async () => {
    const url = "https://i.imgur.com/gone404.png";
    const failFetch = async () => ({
      ok: false,
      status: 404,
      headers: { get: () => null },
      arrayBuffer: async () => new ArrayBuffer(0),
    });
    await expect(
      vendorImages(`![x](${url})`, { slug: "prepare/go-bag", fetchImpl: failFetch, publicDir: tmpDir })
    ).rejects.toThrow(url);
  });
});
