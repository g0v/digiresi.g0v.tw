#!/usr/bin/env node
// One-time asset vendoring for digiresi.g0v.tw. Outputs are COMMITTED —
// neither the build nor the runtime ever touches the network for these.
// Idempotent: the Cubic 11 download is skipped when the file already exists;
// icon/brand copies are cheap and always re-run.
import { access, copyFile, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const CUBIC11_URLS = [
  // URL as pinned by the design spec (upstream layout when the DS was authored):
  "https://cdn.jsdelivr.net/gh/ACh-K/Cubic-11@main/fonts/Cubic_11.woff2",
  // Current upstream layout — fonts moved into fonts/web/ (verified 2026-07-17):
  "https://cdn.jsdelivr.net/gh/ACh-K/Cubic-11@main/fonts/web/Cubic_11.woff2",
];

// The 17 pixelarticons used by the site (contract list, all verified to exist
// in pixelarticons@1.8.1 svg/).
const ICONS = [
  "radio-signal", "server", "alert", "users", "map", "calendar-month",
  "clock", "download", "external-link", "arrow-right", "zap", "moon",
  "sun", "cellular-signal-off", "battery-1", "chat", "code",
];

const BRAND = ["mark.png", "mark-dark.png", "lockup.png", "lockup-dark.png"];

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function fetchCubic11() {
  const dest = path.join("public", "fonts", "Cubic_11.woff2");
  if (await exists(dest)) {
    console.log(`skip  ${dest} (already present)`);
    return;
  }
  await mkdir(path.dirname(dest), { recursive: true });
  let lastError = null;
  for (const url of CUBIC11_URLS) {
    const res = await fetch(url);
    if (!res.ok) {
      lastError = new Error(`HTTP ${res.status} for ${url}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(dest, buf);
    console.log(`font  ${dest} (${buf.length} bytes) <- ${url}`);
    return;
  }
  throw lastError ?? new Error("no Cubic 11 URL responded");
}

async function copyIcons() {
  const destDir = path.join("public", "icons", "px");
  await mkdir(destDir, { recursive: true });
  for (const name of ICONS) {
    const src = path.join("node_modules", "pixelarticons", "svg", `${name}.svg`);
    await copyFile(src, path.join(destDir, `${name}.svg`));
  }
  console.log(`icons ${ICONS.length} pixelarticons -> ${destDir}/`);
}

async function copyBrand() {
  const destDir = path.join("public", "brand");
  await mkdir(destDir, { recursive: true });
  for (const file of BRAND) {
    await copyFile(path.join("design", "assets", "logo", file), path.join(destDir, file));
  }
  console.log(`brand ${BRAND.length} logo PNGs -> ${destDir}/`);
}

await fetchCubic11();
await copyIcons();
await copyBrand();
console.log("assets OK");
