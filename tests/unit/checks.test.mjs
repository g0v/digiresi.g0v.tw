import { describe, it, expect } from "vitest";
import { globToRegExp } from "../../scripts/check-budget.mjs";
import { resolveHref } from "../../scripts/check-links.mjs";

describe("globToRegExp", () => {
  it("matches nested paths with **, including zero directories", () => {
    const re = globToRegExp("handbook/**/*.html");
    expect(re.test("handbook/prepare/go-bag/index.html")).toBe(true);
    expect(re.test("handbook/index.html")).toBe(true);
    expect(re.test("handbook/prepare/style.css")).toBe(false);
    expect(re.test("offline/index.html")).toBe(false);
  });

  it("* does not cross directory boundaries", () => {
    const re = globToRegExp("_astro/*.css");
    expect(re.test("_astro/index.CAbc12.css")).toBe(true);
    expect(re.test("_astro/sub/index.css")).toBe(false);
  });

  it("matches everything under a directory with **/*", () => {
    const re = globToRegExp("pagefind/**/*");
    expect(re.test("pagefind/pagefind.js")).toBe(true);
    expect(re.test("pagefind/index/zh_hant_tw.pf_index")).toBe(true);
    expect(re.test("pagefindx/y")).toBe(false);
  });

  it("escapes regex metacharacters (literal dots)", () => {
    const re = globToRegExp("fonts/Cubic_11.woff2");
    expect(re.test("fonts/Cubic_11.woff2")).toBe(true);
    expect(re.test("fonts/Cubic_11xwoff2")).toBe(false);
  });

  it("supports wildcards inside a filename", () => {
    const re = globToRegExp("_astro/press-start-2p-latin-400*.woff2");
    expect(re.test("_astro/press-start-2p-latin-400-normal.BX1abc.woff2")).toBe(true);
    expect(re.test("_astro/press-start-2p-latin-800-normal.BX1abc.woff2")).toBe(false);
  });
});

describe("resolveHref", () => {
  it("maps trailing-slash pages to index.html", () => {
    expect(resolveHref("/handbook/prepare/go-bag/")).toBe("handbook/prepare/go-bag/index.html");
    expect(resolveHref("/")).toBe("index.html");
  });

  it("keeps file paths as-is", () => {
    expect(resolveHref("/icons/px/zap.svg")).toBe("icons/px/zap.svg");
    expect(resolveHref("/brand/mark-dark.png")).toBe("brand/mark-dark.png");
  });

  it("strips query strings and fragments", () => {
    expect(resolveHref("/handbook/mesh/intro/#firmware")).toBe("handbook/mesh/intro/index.html");
    expect(resolveHref("/handbook/?q=mesh")).toBe("handbook/index.html");
  });

  it("decodes percent-encoded paths", () => {
    expect(resolveHref("/handbook-assets/go-bag/%E5%9C%B0%E5%9C%96-1a2b3c4d.png")).toBe(
      "handbook-assets/go-bag/地圖-1a2b3c4d.png"
    );
  });

  it("returns null for anything that is not an internal absolute path", () => {
    expect(resolveHref("#top")).toBe(null);
    expect(resolveHref("mailto:hello@example.org")).toBe(null);
    expect(resolveHref("https://g0v.hackmd.io/abc")).toBe(null);
    expect(resolveHref("http://example.com/")).toBe(null);
    expect(resolveHref("data:image/png;base64,AAAA")).toBe(null);
    expect(resolveHref("tel:119")).toBe(null);
    expect(resolveHref("//cdn.example.com/x.js")).toBe(null);
    expect(resolveHref("relative/page/")).toBe(null);
  });
});
