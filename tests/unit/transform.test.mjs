import { describe, it, expect } from "vitest";
import { stripHackmdMeta } from "../../scripts/lib/transform.mjs";
import { extractTitle } from "../../scripts/lib/transform.mjs";
import { convertContainers } from "../../scripts/lib/transform.mjs";
import { rewriteLinks } from "../../scripts/lib/transform.mjs";
import { buildFrontmatter } from "../../scripts/lib/transform.mjs";

describe("stripHackmdMeta", () => {
  it("removes the YAML frontmatter block at the top of a note", () => {
    const input = [
      "---",
      "tags: civil-defense, 民防, 數位韌性松",
      "---",
      "",
      "# 準備救難包",
      "",
      "內文開始。",
    ].join("\n");
    const out = stripHackmdMeta(input);
    expect(out).not.toContain("tags: civil-defense");
    expect(out.startsWith("# 準備救難包")).toBe(true);
    expect(out).toContain("內文開始。");
  });

  it('removes "###### tags:" lines anywhere in the body', () => {
    const input = [
      "# 災難時的通訊",
      "",
      "###### tags: `數位韌性` `通訊`",
      "",
      "斷網時先確認鄰里通訊點。",
    ].join("\n");
    const out = stripHackmdMeta(input);
    expect(out).not.toContain("###### tags:");
    expect(out).toContain("斷網時先確認鄰里通訊點。");
  });

  it("leaves a note without frontmatter unchanged (a later --- rule is not frontmatter)", () => {
    const input = "# 台灣鏈網\n\n節點分佈地圖如下。\n\n---\n\n以上為分隔線之後的內容。";
    expect(stripHackmdMeta(input)).toBe(input);
  });

  it("removes {%hackmd <id> %} embed directives while keeping surrounding content", () => {
    const input = "# 台灣鏈網\n\n{%hackmd L0dLpQ_zTzGoNxeURzO2kw %}\n\n節點分佈。";
    const out = stripHackmdMeta(input);
    expect(out).not.toContain("{%hackmd");
    expect(out).toContain("節點分佈。");
    expect(out).toContain("# 台灣鏈網");
  });
});

describe("extractTitle", () => {
  it('extracts the first "# " heading and removes it from the body', () => {
    const input = "# 準備救難包\n\n每個家庭都該有一個 72 小時救難包。\n\n## 內容物\n";
    const { title, body } = extractTitle(input);
    expect(title).toBe("準備救難包");
    expect(body.startsWith("每個家庭都該有一個 72 小時救難包。")).toBe(true);
    expect(body).not.toContain("# 準備救難包");
  });

  it("returns title null and the body untouched when there is no level-1 heading", () => {
    const input = "## 只有次標題\n\n內文。";
    expect(extractTitle(input)).toEqual({ title: null, body: input });
  });
});

describe("convertContainers", () => {
  it(":::info and :::warning become callout divs with the markdown body preserved", () => {
    const input = [
      "前文。",
      ":::info",
      "斷網時 **不要恐慌**，先確認家人位置。",
      ":::",
      "",
      ":::warning",
      "注意餘震。",
      ":::",
      "後文。",
    ].join("\n");
    const out = convertContainers(input);
    expect(out).toContain('<div class="callout callout-info">');
    expect(out).toContain('<div class="callout callout-warning">');
    expect(out).toContain("斷網時 **不要恐慌**，先確認家人位置。");
    expect(out).toContain("</div>");
    expect(out).not.toContain(":::");
  });

  it(":::spoiler with a summary becomes a <details> block", () => {
    const input = ":::spoiler 點我展開\n完整的物資清單在此。\n:::";
    const out = convertContainers(input);
    expect(out).toContain("<details><summary>點我展開</summary>");
    expect(out).toContain("完整的物資清單在此。");
    expect(out).toContain("</details>");
  });

  it("an unknown container type falls back to a plain callout div", () => {
    const input = ":::mycustom\n內容照舊。\n:::";
    const out = convertContainers(input);
    expect(out).toContain('<div class="callout">');
    expect(out).toContain("內容照舊。");
    expect(out).toContain("</div>");
  });

  it("auto-closes an unclosed container at end of input", () => {
    const input = ":::info\n未關閉的區塊\n";
    const out = convertContainers(input);
    expect(out).toContain('<div class="callout callout-info">');
    expect(out).toContain("未關閉的區塊");
    expect(out).toContain("</div>");
  });
});

describe("rewriteLinks", () => {
  const idToSlug = new Map([["abc123XYZ", "prepare/go-bag"]]);
  const hackmdBase = "https://g0v.hackmd.io";

  it("rewrites ../notes/<id>.md links to the local handbook slug when mapped", () => {
    const input = "見 [救難包指南](../notes/abc123XYZ.md) 一文。";
    expect(rewriteLinks(input, { idToSlug, hackmdBase })).toBe(
      "見 [救難包指南](/handbook/prepare/go-bag/) 一文。"
    );
  });

  it("rewrites /<id> links to the local handbook slug when mapped", () => {
    const input = "另見 [救難包](/abc123XYZ)。";
    expect(rewriteLinks(input, { idToSlug, hackmdBase })).toBe(
      "另見 [救難包](/handbook/prepare/go-bag/)。"
    );
  });

  it("falls back to the public HackMD URL for unmapped ../notes/ links", () => {
    const input = "參考 [其他共筆](../notes/unmapped00.md)。";
    expect(rewriteLinks(input, { idToSlug, hackmdBase })).toBe(
      "參考 [其他共筆](https://g0v.hackmd.io/unmapped00)。"
    );
  });

  it("leaves ordinary short absolute links untouched", () => {
    const input = "回到 [關於](/about) 或 [手冊](/handbook/prepare/go-bag/)。";
    expect(rewriteLinks(input, { idToSlug, hackmdBase })).toBe(input);
  });

  it("strips stray leading slash before protocol in external links", () => {
    const input =
      "買物指南 [民防物資哪裡買](/https://example.com/x) 見 [救難包指南](/handbook/prepare/go-bag/) 參考。";
    const out = rewriteLinks(input, { idToSlug, hackmdBase });
    expect(out).toContain("](https://example.com/x)");
    expect(out).toContain("](/handbook/prepare/go-bag/)");
  });
});

describe("buildFrontmatter", () => {
  it("emits every field as a YAML block when all fields are present", () => {
    const fm = buildFrontmatter({
      title: "準備救難包",
      section: "prepare",
      order: 1,
      sourceUrl: "https://g0v.hackmd.io/Ojw57urwQ1O8Bs9NJH_NfA",
      sourceCommit: "0123abcd0123abcd0123abcd0123abcd0123abcd",
      syncedAt: "2026-07-17",
      description: "72 小時救難包打包清單",
    });
    expect(fm).toBe(
      [
        "---",
        'title: "準備救難包"',
        "section: prepare",
        "order: 1",
        'sourceUrl: "https://g0v.hackmd.io/Ojw57urwQ1O8Bs9NJH_NfA"',
        'sourceCommit: "0123abcd0123abcd0123abcd0123abcd0123abcd"',
        'syncedAt: "2026-07-17"',
        'description: "72 小時救難包打包清單"',
        "---",
        "",
      ].join("\n")
    );
  });

  it("omits sourceCommit and description when they are undefined", () => {
    const fm = buildFrontmatter({
      title: "災難時的通訊",
      section: "respond",
      order: 1,
      sourceUrl: "https://g0v.hackmd.io/dxFHfKK-Rj2BXd_J1gx1aQ",
      syncedAt: "2026-07-17",
    });
    expect(fm).not.toContain("sourceCommit");
    expect(fm).not.toContain("description");
    expect(fm).toContain('title: "災難時的通訊"');
    expect(fm.endsWith("---\n")).toBe(true);
  });
});
