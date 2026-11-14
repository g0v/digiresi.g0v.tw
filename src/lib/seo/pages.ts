// Search/social metadata for every non-handbook page, keyed by route path.
// Pages read their props from here and the OG image endpoint renders one card
// per entry, so the two can never drift. Copy: zh-TW (Taiwan usage); pages
// whose <html lang> is English (/en/, /projects/, /design-kits/*) use English.
import { composeTitle, ogImagePath, type Lang } from "./index";
import { pageJsonLd } from "./jsonld";

export interface OgCard {
  /** Large pixel-font line on the card. */
  heading: string;
  /** Small red label above the heading (section). */
  kicker: string;
}

export interface PageSeo {
  title: string;
  description: string;
  lang: Lang;
  og: OgCard;
  alternates?: { lang: Lang; path: string }[];
  noindex?: boolean;
}

const dk = (name: string, description: string): PageSeo => ({
  title: composeTitle(`${name} — Design Kits`, "en"),
  description,
  lang: "en",
  og: { heading: name, kicker: "DESIGN KITS" },
});

export const PAGES: Record<string, PageSeo> = {
  "/": {
    title: "數位韌性松 DigiResiThon｜斷網情境的 g0v 公民黑客松",
    description:
      "數位韌性松是 g0v 社群的公民黑客松：假設台灣網路斷光光，一起實作備援通訊、Meshtastic 鏈網、離線手冊與斷網情境盤點。這裡有下一場活動的時間地點、報名連結與歷次共筆。",
    lang: "zh",
    og: { heading: "數位韌性松", kicker: "g0v 公民黑客松" },
    alternates: [{ lang: "en", path: "/en/" }],
  },
  "/en/": {
    title: "DigiResiThon — Digital Resilience Hackathon | g0v",
    description:
      "A g0v community hackathon prototyping what still works when Taiwan's internet goes dark: mesh networks, an offline handbook, shutdown scenario mapping.",
    lang: "en",
    og: { heading: "DigiResiThon", kicker: "DIGITAL RESILIENCE HACKATHON" },
    alternates: [{ lang: "zh", path: "/" }],
  },
  "/about/": {
    title: composeTitle("關於我們：為什麼辦斷網黑客松", "zh"),
    description:
      "數位韌性松為什麼要辦「假設網路斷光光」的黑客松？從馬祖海纜被切斷談起，說明活動緣起、我們正在做的備援通訊與離線手冊、第一次參加怎麼加入，以及網站內容的授權方式。",
    lang: "zh",
    og: { heading: "為什麼辦斷網黑客松", kicker: "關於 ABOUT" },
  },
  "/schedule/": {
    title: composeTitle("活動時程與歷次小松紀錄", "zh"),
    description:
      "數位韌性松下一場活動的日期、場地與報名連結，以及歷次小松的日期、場地與當天的 HackMD 共筆。想知道過去討論過什麼、下一次在哪裡見面，看這一頁就好。",
    lang: "zh",
    og: { heading: "活動時程", kicker: "時程 SCHEDULE" },
  },
  "/projects/": {
    title: composeTitle("Projects: Sample Hackathon Prototypes", "en"),
    description:
      "Sample project board from DigiResiThon Year 0: comms, data, info and civic prototypes to filter by track or search, each with its sync status and team size.",
    lang: "en",
    og: { heading: "Projects", kicker: "SAMPLE DATA · YEAR 0" },
  },
  "/offline/": {
    title: composeTitle("目前離線", "zh"),
    description:
      "你目前沒有網路連線。數位韌性松網站已經存在這台裝置上，首頁、關於、時程、專案、英文版與手冊全文都能離線閱讀，只有設計元件庫需要連線才看得到。",
    lang: "zh",
    og: { heading: "目前離線", kicker: "OFFLINE" },
    noindex: true,
  },
  "/handbook/": {
    title: composeTitle("數位韌性手冊：斷網也能查的防災與通訊指南", "zh"),
    description:
      "數位韌性手冊收錄 g0v 數位韌性松整理的斷網準備、災害應變、Meshtastic 通訊網、斷網情境分級與自架服務指南，可以安裝成 App，離線時也能搜尋與閱讀全文。",
    lang: "zh",
    og: { heading: "數位韌性手冊", kicker: "手冊 HANDBOOK" },
  },
  "/design-kits/": {
    title: composeTitle("Design Kits: the DigiResiThon Design System", "en"),
    description:
      "DigiResiThon's design-system reference: color tokens, pixel type, logo files, patterns, live components and a full website specimen, in dark and light themes.",
    lang: "en",
    og: { heading: "Design Kits", kicker: "DESIGN SYSTEM" },
  },
  "/design-kits/colors/": dk(
    "Colors",
    "DigiResiThon's base palette and semantic color tokens, side by side in the dark blackout theme and the light paper theme, so each token can be checked in both.",
  ),
  "/design-kits/components/": dk(
    "Components",
    "Live component specimens: Button, Card, Badge, Alert, form fields, SignalBars, StatusDot, TerminalBlock, Marquee and Tabs, in DigiResiThon's real styles.",
  ),
  "/design-kits/logo/": dk(
    "Logo",
    "The DigiResiThon logo lockup and mark with dark and light previews, PNG downloads, and the attribution for YellowOne's design under the CC BY-SA 4.0 license.",
  ),
  "/design-kits/patterns/": dk(
    "Patterns",
    "DigiResiThon's visual patterns with live specimens: CRT scanlines, box-drawing frames, the logo slash, caution stripes, checkerboards and the motion tokens.",
  ),
  "/design-kits/typography/": dk(
    "Typography",
    "DigiResiThon type specimens: Press Start 2P set on its pixel grid for Latin headings, Cubic 11 for Traditional Chinese, and IBM Plex Mono for body text.",
  ),
  "/design-kits/website/": dk(
    "Website",
    "The DigiResiThon website UI kit in one specimen: header, landing hero, schedule timetable, project board and registration dialog, built from the design tokens.",
  ),
};

export function pageSeo(path: string): PageSeo {
  const entry = PAGES[path];
  if (!entry) throw new Error(`No SEO entry for ${path} in src/lib/seo/pages.ts`);
  return entry;
}

export function ogAlt(card: OgCard, lang: Lang): string {
  return lang === "en"
    ? `DigiResiThon share card: black scanlined background, red label "${card.kicker}", white pixel-font heading "${card.heading}", a green terminal prompt and the DigiResiThon logo.`
    : `數位韌性松分享圖：黑底掃描線背景，紅色標籤「${card.kicker}」，白色像素字標題「${card.heading}」，綠色終端提示字與數位韌性松標誌。`;
}

/** BaseLayout props for a registered page: `<BaseLayout {...seoProps("/about/")}>`. */
export function seoProps(path: string) {
  const s = pageSeo(path);
  return {
    title: s.title,
    description: s.description,
    lang: s.lang === "en" ? "en" : "zh-Hant-TW",
    path,
    ogImage: ogImagePath(path),
    ogImageAlt: ogAlt(s.og, s.lang),
    alternates: s.alternates,
    noindex: s.noindex,
    jsonLd: pageJsonLd(path, s),
  };
}
