import { describe, it, expect, vi } from "vitest";

vi.stubEnv("BASE_URL", "/digiresi.g0v.tw/");

const { withBase } = await import("../../src/lib/base.ts");

describe("withBase", () => {
  it("prefixes root-absolute paths", () => {
    expect(withBase("/handbook/")).toBe("/digiresi.g0v.tw/handbook/");
    expect(withBase("/icons/icon-64.png")).toBe("/digiresi.g0v.tw/icons/icon-64.png");
    expect(withBase("/")).toBe("/digiresi.g0v.tw/");
  });
  it("prefixes bare paths without a leading slash", () => {
    expect(withBase("handbook/")).toBe("/digiresi.g0v.tw/handbook/");
  });
  it("passes through external and non-path refs unchanged", () => {
    expect(withBase("https://example.com/x")).toBe("https://example.com/x");
    expect(withBase("//cdn.example.com/x")).toBe("//cdn.example.com/x");
    expect(withBase("mailto:a@b")).toBe("mailto:a@b");
    expect(withBase("data:image/png;base64,AAA")).toBe("data:image/png;base64,AAA");
    expect(withBase("tel:+1")).toBe("tel:+1");
    expect(withBase("#anchor")).toBe("#anchor");
  });
  it("never produces double slashes", () => {
    expect(withBase("//handbook/")).toBe("//handbook/"); // treated as protocol-relative
    expect(withBase("/")).not.toContain("//");
  });
});
