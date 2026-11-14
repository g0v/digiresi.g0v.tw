// llms.txt (https://llmstxt.org/) and llms-full.txt, built at build time from
// the page registry, the schedule data and the synced handbook. Both files
// live at the site root, outside the PWA precache globs.
import { SECTION_NAMES, SECTION_ORDER } from "../sections";
import type { EventEntry } from "../events";
import { SITE_ORIGIN, absoluteUrl } from "./index";
import { handbookSeo, type HandbookEntryLike } from "./handbook";
import { PAGES } from "./pages";

const link = (title: string, path: string, note?: string) =>
  `- [${title}](${absoluteUrl(path)})${note ? `: ${note}` : ""}`;

const byOrder = (a: HandbookEntryLike & { data: { order: number } }, b: HandbookEntryLike & { data: { order: number } }) =>
  a.data.order - b.data.order;

type HandbookPage = HandbookEntryLike & { data: { order: number; sourceUrl: string } };

export function llmsTxt(handbook: HandbookPage[], next: EventEntry | null): string {
  const out = [
    "# 數位韌性松 DigiResiThon",
    "",
    "> g0v 社群的公民黑客松：假設台灣網路斷光光，我們還能怎麼傳遞資訊？大家一起實作備援通訊、Meshtastic 鏈網、離線也能讀的數位韌性手冊，並盤點各種斷網情境。",
    "> DigiResiThon (Digital Resilience Hackathon) is a g0v community hackathon in Taiwan prototyping what still works when the internet goes dark.",
    "",
    "主要語言是台灣正體中文（zh-Hant），另有英文首頁。所有頁面都是靜態 HTML，不需要 JavaScript 就能閱讀；網站可以安裝成 PWA，手冊在離線時也能搜尋與閱讀。網站內容採 CC BY 4.0 授權。",
    "",
    "## 網站",
    "",
    link("首頁", "/", "活動介紹、下一場活動與報名連結"),
    link("關於", "/about/", "為什麼辦「假設網路斷光光」的黑客松、正在做的事、怎麼參加、授權"),
    link("時程", "/schedule/", "下一場活動的時程，以及歷次小松的日期、場地與當天的 HackMD 共筆"),
    link("專案", "/projects/", "黑客松專案看板（Year 0 範例資料，英文）"),
    link("English", "/en/", "English overview of DigiResiThon"),
  ];
  if (next) {
    out.push("", "## 下一場活動", "");
    const facts = [next.date, next.venue].filter(Boolean).join("，");
    out.push(`- ${next.name}${facts ? `（${facts}）` : ""}${next.summary ? `：${next.summary}` : ""}`);
    if (next.registerUrl) out.push(`- [報名（KKTIX）](${next.registerUrl})`);
    out.push(`- [活動共筆（HackMD）](${next.url})`);
  }
  out.push(
    "",
    "## 數位韌性手冊",
    "",
    link("手冊首頁", "/handbook/", PAGES["/handbook/"].description),
    link("手冊全文 llms-full.txt", "/llms-full.txt", "全部手冊頁面的 Markdown 全文，每篇附網址、原始共筆與最後同步日期"),
  );
  for (const section of SECTION_ORDER) {
    const pages = handbook.filter((p) => p.data.section === section).sort(byOrder);
    if (!pages.length) continue;
    out.push("", `## 手冊：${SECTION_NAMES[section]}`, "");
    for (const p of pages) out.push(link(p.data.title, `/handbook/${p.id}/`, handbookSeo(p).description));
  }
  out.push(
    "",
    "## 社群與原始碼",
    "",
    "- [數位韌性松大全（歷次活動與共筆總表）](https://g0v.hackmd.io/mGQcbKRDShmvyeGV74w_0w)",
    "- [g0v Slack #digiresithon 加入說明](https://g0v.hackmd.io/fKrjZ3BlRfWmQ471wcSdBg)",
    "- [g0v 行為準則](https://g0v.hackmd.io/s/COC)",
    "- [網站原始碼（GitHub）](https://github.com/g0v/digiresi.g0v.tw)",
    "",
    "## Optional",
    "",
    link("設計元件庫 Design Kits", "/design-kits/", "網站設計系統的色彩、字體、標誌、圖樣與元件範例（英文）"),
    `- [Sitemap](${SITE_ORIGIN}/sitemap-index.xml)`,
    "",
  );
  return out.join("\n");
}

/** Shift Markdown ATX headings down `by` levels (max h6), outside code fences. */
export function demoteMarkdownHeadings(md: string, by: number): string {
  let fenced = false;
  return md
    .split("\n")
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
      if (fenced) return line;
      return line.replace(/^(#{1,6})(?=\s)/, (h) => "#".repeat(Math.min(6, h.length + by)));
    })
    .join("\n");
}

/** Root-relative Markdown links/images become absolute on the canonical origin. */
export function absolutizeLinks(md: string): string {
  return md.replace(/\]\(\/(?!\/)/g, `](${SITE_ORIGIN}/`).replace(/(src|href)="\/(?!\/)/g, `$1="${SITE_ORIGIN}/`);
}

export function llmsFullTxt(handbook: HandbookPage[]): string {
  const out = [
    "# 數位韌性手冊全文｜數位韌性松 DigiResiThon",
    "",
    "> g0v 數位韌性松整理的「數位韌性手冊」全部頁面的 Markdown 全文：斷網之前的準備、災害當下的應變、Meshtastic 通訊網、斷網情境分級與自架服務。",
    "",
    `每篇內容同步自 g0v 的 HackMD 共筆（\`npm run sync\`），標題下列出正式網址、原始共筆與最後同步日期；共筆內的標題已下移三級，以配合本檔的層級。網站版：${absoluteUrl("/handbook/")}。網站內容採 CC BY 4.0 授權。`,
  ];
  for (const section of SECTION_ORDER) {
    const pages = handbook.filter((p) => p.data.section === section).sort(byOrder);
    if (!pages.length) continue;
    out.push("", `## ${SECTION_NAMES[section]}`);
    for (const p of pages) {
      out.push(
        "",
        `### ${p.data.title}`,
        "",
        `- 網址：${absoluteUrl(`/handbook/${p.id}/`)}`,
        `- 原始共筆：${p.data.sourceUrl}`,
        `- 最後同步：${p.data.syncedAt}`,
        "",
        absolutizeLinks(demoteMarkdownHeadings((p.body ?? "").trim(), 3)) || "（這一頁目前還沒有正文。）",
      );
    }
  }
  out.push("");
  return out.join("\n");
}
