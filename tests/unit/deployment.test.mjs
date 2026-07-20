import fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getBase } from "../../scripts/lib/deploy-base.mjs";

describe("custom-domain deployment", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the domain root in Node build scripts", () => {
    vi.stubEnv("SITE_BASE", "");
    expect(getBase()).toBe("/");
  });

  it("keeps Astro's browser base at the domain root", () => {
    const config = fs.readFileSync("astro.config.mjs", "utf8");
    expect(config).toContain('const BASE = "/";');
  });

  it("pins Astro's canonical site URL to the custom domain root", () => {
    const config = fs.readFileSync("astro.config.mjs", "utf8");
    expect(config).toContain('site: "https://digiresi.g0v.tw/",');
  });

  it("publishes the GitHub Pages custom domain", () => {
    expect(fs.readFileSync("public/CNAME", "utf8")).toBe("digiresi.g0v.tw\n");
  });
});
