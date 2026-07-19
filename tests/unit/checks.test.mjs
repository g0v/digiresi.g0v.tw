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
  const BASE = "/digiresi.g0v.tw/";

  it("resolves handbook path", () => {
    expect(resolveHref("/digiresi.g0v.tw/handbook/prepare/go-bag/", BASE))
      .toBe("handbook/prepare/go-bag/index.html");
    expect(resolveHref("/digiresi.g0v.tw/", BASE)).toBe("index.html");
  });

  it("resolves asset paths", () => {
    expect(resolveHref("/digiresi.g0v.tw/icons/px/zap.svg", BASE)).toBe("icons/px/zap.svg");
    expect(resolveHref("/digiresi.g0v.tw/brand/mark-dark.png", BASE)).toBe("brand/mark-dark.png");
  });

  it("strips hash and query", () => {
    expect(resolveHref("/digiresi.g0v.tw/handbook/mesh/intro/#firmware", BASE))
      .toBe("handbook/mesh/intro/index.html");
    expect(resolveHref("/digiresi.g0v.tw/handbook/?q=mesh", BASE)).toBe("handbook/index.html");
  });

  it("decodes percent-escapes", () => {
    expect(resolveHref("/digiresi.g0v.tw/handbook-assets/go-bag/%E5%9C%B0%E5%9C%96-1a2b3c4d.png", BASE))
      .toBe("handbook-assets/go-bag/地圖-1a2b3c4d.png");
  });

  it("returns null for out-of-scope, protocol-relative, and non-string values", () => {
    expect(resolveHref("//cdn.example.com/x.js", BASE)).toBe(null);
    expect(resolveHref("/some-other-app/x", BASE)).toBe(null); // base mismatch
    expect(resolveHref("relative/path", BASE)).toBe(null);
    expect(resolveHref(undefined, BASE)).toBe(null);
  });

  it("apex base still works", () => {
    expect(resolveHref("/handbook/", "/")).toBe("handbook/index.html");
  });
});
