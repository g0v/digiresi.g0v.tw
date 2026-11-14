// Build-time 1200x630 OG card in the DigiResiTh0n look: blackout background
// with scanlines, Cubic 11 pixel type, signal-red label and terminal-green
// prompt (the two accents in design/readme.md), the lockup bottom-left.
// satori lays it out as SVG, resvg rasterises it, sharp palette-compresses
// the PNG so each card stays well under 150 KB.
import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import sharp from "sharp";
import { OG_HEIGHT, OG_WIDTH, titleWidth } from "../seo";
import { loadCubic11, missingInCubic11, notoFallbackFor } from "./fonts";

// Dark ("blackout") semantic tokens from src/styles/global.css.
const C = {
  bg: "#0c0c0b",
  ink: "#f2f1ea",
  ink2: "#b4b3a8",
  lineSoft: "#3a3934",
  accent: "#ff4633", // --accent (--red-bright)
  accent2: "#2bd576", // --accent-2 (--green-bright)
};

const PAD_X = 64;
const PAD_Y = 52;
const BORDER = 6;

export interface OgCardInput {
  heading: string;
  kicker: string;
  /** Page path shown in the terminal prompt, e.g. "/handbook/mesh/buying/". */
  path: string;
}

let lockup: Promise<string> | undefined;
function lockupDataUri() {
  lockup ??= sharp(path.join(process.cwd(), "public/brand/lockup-dark.png"))
    .resize({ height: 84 })
    .png()
    .toBuffer()
    .then((b) => `data:image/png;base64,${b.toString("base64")}`);
  return lockup;
}

/** Heading size on the Cubic 11 pixel grid (multiples of 12px). */
export function headingSize(heading: string): number {
  const w = titleWidth(heading);
  if (w <= 14) return 96;
  if (w <= 22) return 72;
  if (w <= 34) return 60;
  return 48;
}

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}): Node => ({
  type,
  props: { style, children, ...extra },
});

export async function renderOgPng(card: OgCardInput): Promise<Buffer> {
  const cubic = await loadCubic11();
  const text = card.heading + card.kicker + card.path + "digiresithon@tw:~$ open digiresi.g0v.tw";
  const missing = await missingInCubic11(text);
  const fallback = notoFallbackFor(missing);
  if (fallback.uncovered.length) {
    // Neither font can draw these: fail the build rather than ship tofu.
    throw new Error(
      `[og] no font has a glyph for ${fallback.uncovered.join("")} on ${card.path}; ` +
        "set a different OG heading/label for this page",
    );
  }
  if (missing.length) {
    console.warn(`[og] Cubic 11 lacks ${missing.join("")} on ${card.path}; using Noto Sans TC for those glyphs`);
  }
  const fonts = [
    { name: "Cubic 11", data: cubic.data, weight: 400 as const, style: "normal" as const },
    ...fallback.fonts.map((data) => ({ name: "Noto Sans TC", data, weight: 400 as const, style: "normal" as const })),
  ];

  const size = headingSize(card.heading);
  const tree = h(
    "div",
    {
      // satori boxes are content-box: subtract padding and border so the
      // card is exactly OG_WIDTH x OG_HEIGHT and nothing is clipped.
      width: OG_WIDTH - 2 * (PAD_X + BORDER),
      height: OG_HEIGHT - 2 * (PAD_Y + BORDER),
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: `${PAD_Y}px ${PAD_X}px`,
      backgroundColor: C.bg,
      backgroundImage: `repeating-linear-gradient(0deg, rgba(242,241,234,0.045) 0px, rgba(242,241,234,0.045) 2px, transparent 2px, transparent 6px)`,
      fontFamily: '"Cubic 11", "Noto Sans TC"',
      color: C.ink,
      border: `${BORDER}px solid ${C.lineSoft}`,
    },
    [
      h("div", { display: "flex", fontSize: 24, color: C.accent2, whiteSpace: "nowrap", overflow: "hidden" }, [
        h("span", {}, "digiresithon@tw:~$"),
        h("span", { marginLeft: 16, color: C.ink2 }, `open ${card.path}`),
      ]),
      h("div", { display: "flex", flexDirection: "column" }, [
        h("div", { display: "flex", alignItems: "center", marginBottom: 28 }, [
          h("div", { width: 18, height: 36, backgroundColor: C.accent, transform: "skewX(-20deg)", marginRight: 18 }, ""),
          h("div", { display: "flex", fontSize: 24, color: C.bg, backgroundColor: C.accent, padding: "6px 14px" }, card.kicker),
        ]),
        h(
          "div",
          { display: "flex", fontSize: size, lineHeight: 1.25, maxWidth: 1060, color: C.ink, textShadow: `4px 4px 0 ${C.lineSoft}` },
          card.heading,
        ),
      ]),
      h("div", { display: "flex", alignItems: "flex-end", justifyContent: "space-between" }, [
        h("img", { width: 199, height: 84 }, undefined, { src: await lockupDataUri(), width: 199, height: 84 }),
        h("div", { display: "flex", fontSize: 24, color: C.accent2 }, "digiresi.g0v.tw"),
      ]),
    ],
  );

  const svg = await satori(tree as never, { width: OG_WIDTH, height: OG_HEIGHT, fonts });
  const raw = new Resvg(svg, { fitTo: { mode: "width", value: OG_WIDTH } }).render().asPng();
  return sharp(raw).png({ palette: true, colors: 64, compressionLevel: 9, effort: 10 }).toBuffer();
}
