import { describe, it, expect } from "vitest";
import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import rehypeBaseUrl from "../../scripts/rehype-base-url.mjs";

async function process(html) {
  const out = await unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeBaseUrl, { base: "/digiresi.g0v.tw/" })
    .use(rehypeStringify)
    .process(html);
  return String(out);
}

async function processApex(html) {
  const out = await unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeBaseUrl, { base: "/" })
    .use(rehypeStringify)
    .process(html);
  return String(out);
}

describe("rehype-base-url", () => {
  it("prefixes root-absolute src", async () => {
    const out = await process('<img src="/handbook-assets/x.png">');
    expect(out).toBe('<img src="/digiresi.g0v.tw/handbook-assets/x.png">');
  });
  it("prefixes root-absolute href", async () => {
    const out = await process('<a href="/handbook/">go</a>');
    expect(out).toBe('<a href="/digiresi.g0v.tw/handbook/">go</a>');
  });
  it("leaves external URLs alone", async () => {
    const out = await process('<a href="https://example.com/x">x</a>');
    expect(out).toBe('<a href="https://example.com/x">x</a>');
  });
  it("leaves protocol-relative URLs alone", async () => {
    const out = await process('<img src="//cdn.example.com/x.png">');
    expect(out).toBe('<img src="//cdn.example.com/x.png">');
  });
  it("leaves relative and hash paths alone", async () => {
    const out = await process('<a href="foo/bar">x</a><a href="#anchor">y</a>');
    expect(out).toBe('<a href="foo/bar">x</a><a href="#anchor">y</a>');
  });
  it("rewrites srcset entries", async () => {
    const out = await process('<img srcset="/a.png 1x, /b.png 2x">');
    expect(out).toBe('<img srcset="/digiresi.g0v.tw/a.png 1x, /digiresi.g0v.tw/b.png 2x">');
  });
  it("is a no-op when base is '/'", async () => {
    const out = await processApex(
      '<img src="/handbook-assets/x.png"><a href="/handbook/">go</a>',
    );
    expect(out).toBe('<img src="/handbook-assets/x.png"><a href="/handbook/">go</a>');
  });
});
