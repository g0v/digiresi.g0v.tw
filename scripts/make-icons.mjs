/**
 * Generates the PWA icon set from the design-system mark.
 * mark-dark.png (paper-white ink for dark surfaces) is composited centered
 * onto a #0c0c0b square — 70% inset for regular icons, 55% for the maskable
 * icon (safe zone). Output is committed; the script only needs re-running if
 * the logo changes.
 */
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const SRC = "design/assets/logo/mark-dark.png";
const OUT = "public/icons";
const BG = "#0c0c0b";

async function makeIcon(size, scale, outName) {
  const inner = Math.round(size * scale);
  const mark = await sharp(SRC)
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 12, g: 12, b: 11, alpha: 0 },
    })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toFile(`${OUT}/${outName}`);
  console.log(`${OUT}/${outName} (${size}x${size})`);
}

await mkdir(OUT, { recursive: true });
await makeIcon(64, 0.7, "icon-64.png");
await makeIcon(192, 0.7, "icon-192.png");
await makeIcon(512, 0.7, "icon-512.png");
await makeIcon(512, 0.55, "icon-maskable-512.png");
console.log("done: 4 icons written");
