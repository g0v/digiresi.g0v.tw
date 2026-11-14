import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  charLength,
  clampDescription,
  composeTitle,
  describeMarkdown,
  ogImagePath,
  pagePathFromOgSlug,
  titleWidth,
} from "../../src/lib/seo";
import { PAGES } from "../../src/lib/seo/pages";
import { cmapCodePoints, loadCubic11, missingInCubic11, notoFallbackFor } from "../../src/lib/og/fonts";

describe("title width budget", () => {
  it("counts CJK and fullwidth characters as 2", () => {
    expect(titleWidth("abc")).toBe(3);
    expect(titleWidth("數位")).toBe(4);
    expect(titleWidth("｜")).toBe(2);
  });

  it("uses the longest suffix that fits in 60, else a shorter one, else none", () => {
    expect(composeTitle("關於", "zh")).toBe("關於｜數位韌性松 DigiResiThon");
    const long = "數位韌性手冊：斷網也能查的防災與通訊指南"; // width 40
    expect(composeTitle(long, "zh")).toBe(`${long}｜DigiResiThon`);
    const tooLong = "一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十"; // width 60
    expect(composeTitle(tooLong, "zh")).toBe(tooLong);
    for (const t of [composeTitle(long, "zh"), composeTitle("如何購買 Meshtastic 裝置", "handbook")]) {
      expect(titleWidth(t)).toBeLessThanOrEqual(60);
    }
  });
});

describe("OG image paths", () => {
  it("maps page paths to /og/<slug>.png and back", () => {
    expect(ogImagePath("/")).toBe("/og/index.png");
    expect(ogImagePath("/handbook/mesh/buying/")).toBe("/og/handbook/mesh/buying.png");
    expect(pagePathFromOgSlug("index")).toBe("/");
    expect(pagePathFromOgSlug("handbook/mesh/buying")).toBe("/handbook/mesh/buying/");
  });
});

describe("handbook description derivation", () => {
  it("skips bylines, source lines, headings and lists, and keeps opening prose", () => {
    const body = [
      "作者：@someone（g0v slack）",
      "source: https://example.org/post",
      "",
      "這是一段開頭的說明文字，介紹這一頁要談的主題，內容足夠長，可以拿來當作搜尋結果的摘要使用。第二句繼續補充細節，讓長度超過七十個字的門檻，也說明為什麼值得閱讀。",
      "",
      "## 標題",
      "- 清單",
    ].join("\n");
    const d = describeMarkdown(body)!;
    expect(d.startsWith("這是一段開頭的說明文字")).toBe(true);
    expect(d).not.toMatch(/作者|source|https?:/);
    expect(charLength(d)).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
    expect(charLength(d)).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it("returns null when there is too little opening prose", () => {
    expect(describeMarkdown("## 只有標題\n- 清單")).toBeNull();
  });

  it("clamps at a sentence end within the limit", () => {
    const s = "甲".repeat(100) + "。" + "乙".repeat(100) + "。";
    expect(clampDescription(s)).toBe("甲".repeat(100) + "。");
  });
});

describe("page registry copy", () => {
  it("gives every page a unique title and a 70–160 character description", () => {
    const titles = new Set<string>();
    for (const [path, s] of Object.entries(PAGES)) {
      expect(titles.has(s.title), path).toBe(false);
      titles.add(s.title);
      expect(charLength(s.description), path).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
      expect(charLength(s.description), path).toBeLessThanOrEqual(DESCRIPTION_MAX);
    }
  });
});

describe("Cubic 11 coverage for OG cards", () => {
  it("parses the font's cmap", async () => {
    const { data, codePoints } = await loadCubic11();
    expect(cmapCodePoints(new Uint8Array(data)).size).toBe(codePoints.size);
    expect(codePoints.has("數".codePointAt(0)!)).toBe(true);
    expect(codePoints.has("A".codePointAt(0)!)).toBe(true);
  });

  it("covers every heading and label used on the static-page cards", async () => {
    const text = Object.values(PAGES)
      .map((s) => s.og.heading + s.og.kicker)
      .join("");
    expect(await missingInCubic11(text)).toEqual([]);
  });

  it("covers every synced handbook title and section label", async () => {
    const files = fs.readdirSync("src/content/handbook", { recursive: true }) as string[];
    const titles = files
      .filter((f) => f.endsWith(".md"))
      .map((f) => /^title:\s*"?(.*?)"?\s*$/m.exec(fs.readFileSync(`src/content/handbook/${f}`, "utf8"))?.[1] ?? "")
      .join("");
    expect(await missingInCubic11(titles + "手冊 · 準備應變通訊網情境自架服務")).toEqual([]);
  });

  it("falls back to a Noto Sans TC subset for a glyph Cubic 11 lacks", async () => {
    const missing = await missingInCubic11("丄"); // rare CJK ideograph, not in Cubic 11
    expect(missing).toEqual(["丄"]);
    const { fonts, uncovered } = notoFallbackFor(missing);
    expect(fonts.length).toBe(1);
    expect(uncovered).toEqual([]);
  });

  it("reports glyphs no font can draw instead of rendering tofu", async () => {
    // 丂 is in Noto Sans TC's unicode-range for a subset but not in its glyphs.
    expect(notoFallbackFor(await missingInCubic11("丂")).uncovered).toEqual(["丂"]);
  });
});
