import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { getBase } from "../../scripts/lib/deploy-base.mjs";

const hasBuild = fs.existsSync("dist/manifest.webmanifest");

describe.skipIf(!hasBuild)("shipped web app manifest", () => {
  // Guards a deliberate NON-change. Making the whole site work offline is an
  // argument for launching installed users at "/", and the design considered
  // and rejected it: the handbook is the disaster-day payload, the installed
  // app is named 數位韌性手冊, and moving start_url would relocate existing
  // installs inconsistently (Chromium re-reads the manifest, iOS bakes the
  // value at add-to-home-screen time). This test fails if someone "tidies"
  // start_url without the captain's sign-off.
  it("still launches installed users into the handbook", () => {
    const manifest = JSON.parse(fs.readFileSync("dist/manifest.webmanifest", "utf8"));
    expect(manifest.start_url).toBe(`${getBase()}handbook/`);
  });
});

describe.skipIf(!fs.existsSync("dist/projects/index.html"))("precached /projects/", () => {
  // Precaching /projects/ makes its sample data durable on visitors' devices.
  // The page carrying its own SAMPLE DATA label on its face is the mitigation,
  // so removing the label while the sample YAML remains — the exact combination
  // that would make durable offline caching misleading — must break a test.
  it("declares itself sample data in the built HTML", () => {
    expect(fs.readFileSync("dist/projects/index.html", "utf8")).toContain("SAMPLE DATA");
  });
});
