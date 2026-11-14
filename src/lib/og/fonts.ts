// Fonts for the build-time OG cards. Cubic 11 (the site's TC pixel face) is
// vendored only as woff2, which satori cannot read, so it is decompressed to
// TTF in memory. Any character Cubic 11 lacks falls back to the matching
// Noto Sans TC subset from @fontsource (woff), chosen by its unicode-range.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import wawoff2 from "wawoff2";

const ROOT = process.cwd();
const CUBIC = path.join(ROOT, "public/fonts/Cubic_11.woff2");
const NOTO_DIR = path.join(ROOT, "node_modules/@fontsource/noto-sans-tc");

/**
 * Code points mapped by a font's cmap (format 12 or 4). Accepts TrueType/
 * OpenType and WOFF 1.0 (zlib-compressed tables) data.
 */
export function cmapCodePoints(font: Uint8Array): Set<number> {
  let view = new DataView(font.buffer, font.byteOffset, font.byteLength);
  const woff = view.getUint32(0) === 0x774f4646; // "wOFF"
  const numTables = view.getUint16(woff ? 12 : 4);
  let cmapOffset = -1;
  for (let i = 0; i < numTables; i++) {
    const rec = woff ? 44 + i * 20 : 12 + i * 16;
    const tag = String.fromCharCode(...font.subarray(rec, rec + 4));
    if (tag !== "cmap") continue;
    if (!woff) {
      cmapOffset = view.getUint32(rec + 8);
    } else {
      const offset = view.getUint32(rec + 4);
      const compLength = view.getUint32(rec + 8);
      const origLength = view.getUint32(rec + 12);
      const raw = font.subarray(offset, offset + compLength);
      const table = compLength < origLength ? zlib.inflateSync(raw) : raw;
      view = new DataView(table.buffer, table.byteOffset, table.byteLength);
      cmapOffset = 0;
    }
  }
  if (cmapOffset < 0) throw new Error("font has no cmap table");
  const n = view.getUint16(cmapOffset + 2);
  const subtables: { platform: number; encoding: number; offset: number; format: number }[] = [];
  for (let i = 0; i < n; i++) {
    const rec = cmapOffset + 4 + i * 8;
    const offset = cmapOffset + view.getUint32(rec + 4);
    subtables.push({ platform: view.getUint16(rec), encoding: view.getUint16(rec + 2), offset, format: view.getUint16(offset) });
  }
  const out = new Set<number>();
  const f12 = subtables.find((s) => s.format === 12);
  if (f12) {
    const groups = view.getUint32(f12.offset + 12);
    for (let g = 0; g < groups; g++) {
      const p = f12.offset + 16 + g * 12;
      const start = view.getUint32(p);
      const end = view.getUint32(p + 4);
      const glyph = view.getUint32(p + 8);
      for (let c = start; c <= end; c++) if (glyph + (c - start) !== 0) out.add(c);
    }
    return out;
  }
  const f4 = subtables.find((s) => s.format === 4);
  if (!f4) throw new Error("font has no cmap format 12 or 4 subtable");
  const segX2 = view.getUint16(f4.offset + 6);
  const ends = f4.offset + 14;
  const starts = ends + segX2 + 2;
  const deltas = starts + segX2;
  const ranges = deltas + segX2;
  for (let s = 0; s < segX2 / 2; s++) {
    const end = view.getUint16(ends + s * 2);
    const start = view.getUint16(starts + s * 2);
    const delta = view.getInt16(deltas + s * 2);
    const rangeOffset = view.getUint16(ranges + s * 2);
    for (let c = start; c <= end && c !== 0xffff; c++) {
      let glyph: number;
      if (rangeOffset === 0) glyph = (c + delta) & 0xffff;
      else {
        const gi = view.getUint16(ranges + s * 2 + rangeOffset + (c - start) * 2);
        glyph = gi === 0 ? 0 : (gi + delta) & 0xffff;
      }
      if (glyph !== 0) out.add(c);
    }
  }
  return out;
}

let cubic: Promise<{ data: Buffer; codePoints: Set<number> }> | undefined;

export function loadCubic11() {
  cubic ??= (async () => {
    const ttf = Buffer.from(await wawoff2.decompress(fs.readFileSync(CUBIC)));
    return { data: ttf, codePoints: cmapCodePoints(ttf) };
  })();
  return cubic;
}

/** Characters in `text` (ignoring whitespace) that Cubic 11 has no glyph for. */
export async function missingInCubic11(text: string): Promise<string[]> {
  const { codePoints } = await loadCubic11();
  return [...new Set([...text])].filter((ch) => !/\s/.test(ch) && !codePoints.has(ch.codePointAt(0)!));
}

interface Subset {
  file: string;
  ranges: [number, number][];
}
let notoSubsets: Subset[] | undefined;

function loadNotoSubsets(): Subset[] {
  if (notoSubsets) return notoSubsets;
  const css = fs.readFileSync(path.join(NOTO_DIR, "700.css"), "utf8");
  notoSubsets = [];
  for (const face of css.split("@font-face").slice(1)) {
    const file = /url\(\.\/files\/([^)]+\.woff)\)\s*format\(['"]woff['"]\)/.exec(face)?.[1];
    const range = /unicode-range:\s*([^;]+);/.exec(face)?.[1];
    if (!file || !range) continue;
    const ranges = range.split(",").map((r): [number, number] => {
      const [a, b] = r.trim().replace(/^U\+/i, "").split("-");
      return [parseInt(a, 16), parseInt(b ?? a, 16)];
    });
    notoSubsets.push({ file, ranges });
  }
  return notoSubsets;
}

/**
 * Noto Sans TC subset files (woff buffers) for the given characters, plus the
 * characters no subset actually has a glyph for (a unicode-range only says
 * which file to try).
 */
export function notoFallbackFor(chars: string[]): { fonts: Buffer[]; uncovered: string[] } {
  const files = new Map<string, Buffer>();
  const uncovered: string[] = [];
  for (const ch of chars) {
    const cp = ch.codePointAt(0)!;
    const subset = loadNotoSubsets().find((s) => s.ranges.some(([a, b]) => cp >= a && cp <= b));
    const data = subset && (files.get(subset.file) ?? fs.readFileSync(path.join(NOTO_DIR, "files", subset.file)));
    if (subset && data && cmapCodePoints(data).has(cp)) files.set(subset.file, data);
    else uncovered.push(ch);
  }
  return { fonts: [...files.values()], uncovered };
}
