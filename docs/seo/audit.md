# 數位韌性松網站 SEO 與 AI 搜尋（AEO／GEO）稽核

- 稽核日期：2026-11-14
- 稽核對象：`seo-aieo` 分支，起點為上游 g0v/digiresi.g0v.tw `4baa8a70369c8949abddde8b0c01a8ef0f6c947b`
- 依據：coreyhaines31/marketingskills 的 `seo-audit`（v2.2.5）與 `ai-seo`（v2.12.3）兩個 skill，及其參考文件 `title-tags`、`international-seo`、`agent-readiness`、`content-patterns`、`multilingual-and-commerce`、`platform-ranking-factors`
- 標竿：https://crcolab.art（公開 repo crcolab/crccolab.github.io）
- 方法：`npm ci && npm run build` 後以 `node scripts/seo/inventory.mjs` 掃描 `dist/` 全部 34 個 HTML 頁面；另以 curl 檢查正式站 https://digiresi.g0v.tw 的探索檔案。本輪只做稽核與規劃，不改網站行為。

## 一、摘要

網站內容本身扎實：全部頁面都是靜態 HTML，不靠 JavaScript 也讀得到正文（符合 AgentReady 的 AR-READ-01），每頁都有 `<title>` 與 meta description，152 張圖片都有 `alt` 屬性。問題集中在「讓搜尋引擎與 AI 找到、理解、引用」的那一層，幾乎是全空：

1. **沒有 robots.txt、沒有 sitemap**：正式站 `/robots.txt`、`/sitemap.xml` 都回 404。
2. **34 頁全部沒有 canonical、robots meta、og:\*、twitter:\*、hreflang、JSON-LD**：分享到 LINE、Facebook、Threads、X 時沒有標題卡與圖片；`/` 與 `/en/` 互為翻譯卻沒有宣告。
3. **手冊 20 頁的 description 只有 5 種**，例如「數位韌性手冊 · 通訊網」（11–13 字），彼此重複，搜尋結果摘要會被 Google 自行改寫。
4. **沒有 llms.txt／llms-full.txt**：手冊正是 AI 代理最常讀、最常引用的「文件型」內容（Ora 2026 年 9 月研究：被引用頁面 47% 是文件頁），目前沒有給 AI 的入口。
5. **`/offline/` 可被索引**：這是 Service Worker 的離線備援頁，內容只有「目前離線」，應加 `noindex`。

快速見效（turn 2）：統一的 `<head>` 元件（canonical、robots、OG、Twitter、hreflang）＋每頁 1200×630 OG 圖；手冊 description 改由內文首段在建置時推導。

## 二、標竿：crcolab.art 做了什麼

crcolab.art 是 Jekyll 靜態站，所有 SEO 標記集中在一個 partial（`_includes/head-seo.html`，286 行），由內容 frontmatter 驅動。實際渲染的 `<head>`（2026-11-14 以 curl 取得）與 repo 檔案顯示：

| 面向 | crcolab.art 的做法 | 本站可借鏡處 |
| --- | --- | --- |
| 標題 | `_includes/page-title.html` 依寬度規則加後綴：頁名＋`｜Cyborg Resilience Co-lab` 寬度 ≤ 60（CJK 算 2）才加，否則改加 `｜CRC`，再不行就只留頁名；`og:title`／`twitter:title` 一律帶完整後綴；有 fixture 測試釘住門檻 | 採同樣的「寬度預算」規則，並寫單元測試 |
| 描述 | 每頁獨立 description；`og_description` 可另外覆寫 | 手冊從首段推導，覆寫放獨立資料檔 |
| canonical／robots | 每頁自我 canonical；草稿或排除 sitemap 的頁面 `noindex, nofollow`，其他 `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1` | 照用；`/offline/` 設 `noindex` |
| hreflang | `zh-Hant` ↔ `en-US` 成對，`x-default` 指向中文頁；只放在 HTML `<head>`，sitemap 沒有 `xhtml:link` | 本站只有首頁有英文版，只在 `/`、`/en/` 宣告；sitemap 也加 `xhtml:link`（兩處一致） |
| Open Graph／Twitter | `og:site_name/type/url/title/description/locale/locale:alternate/image(+width/height/alt)`，文章加 `article:*`；`twitter:card=summary_large_image`、`twitter:image:alt`、`twitter:label1/data1`（作者） | 照用；本站沒有作者欄位，不加 label |
| OG 圖 | 首頁共用封面，各區段有專屬 1200×630 圖（如 `og-section-events.jpg`），alt 文字逐字描述圖面 | 本站改為建置時逐頁產生，alt 同樣描述圖面內容 |
| JSON-LD | 首頁 `Organization`；區段索引 `BreadcrumbList`（＋`CollectionPage`）；活動頁 `Event`（含 `Place`、`PostalAddress`、`superEvent`，沒有地點就改發 `Article`）；成員頁 `Person`；文章 `about`／`mentions`／`citations`／`isBasedOn` | 首頁 `WebSite`＋`Organization`；時程頁從 `events.yaml` 產生 `Event`；手冊 `TechArticle`＋`BreadcrumbList`，`isBasedOn` 指回 HackMD 共筆 |
| robots.txt | `User-agent: *` 全開，加 Content Signals（`search=yes, ai-input=yes, ai-train=yes`，每個群組重複一次，因為爬蟲只遵守最具體的群組，RFC 9309）；再依用途分組列出 AI 爬蟲：搜尋索引、使用者觸發抓取、模型訓練、網頁封存；最後一行 `Sitemap:`；有建置後測試釘住名單 | 照這個結構寫，並加測試 |
| llms.txt | H1＋引言（中英）、主要語言說明、「全部頁面是靜態 HTML」、Sections／Featured／Feeds／Other 四段，每條連結附一句說明 | 依 llmstxt.org 格式寫本站版本；另加 llms-full.txt（手冊全文） |
| sitemap | jekyll-sitemap，每個 URL 有 `lastmod` | `@astrojs/sitemap`，`lastmod` 用手冊 `syncedAt` |
| 其他 | 各區段 Atom feed（`<link rel="alternate" type="application/atom+xml">`）；`.well-known/api-catalog`（RFC 9727，指向 `api/latest.json` 與 OpenAPI）；根目錄 IndexNow 金鑰檔與部署後自動提交；頁面裝飾性文字加 `data-nosnippet`；`dcterms.language` | 本站沒有 API，不做 api-catalog；IndexNow 與站長驗證屬於 g0v 的部署，列為 owner 後續事項；feed 與 `data-nosnippet` 列為可選 |

## 三、現況盤點

產生方式：`npm run build && node scripts/seo/inventory.mjs --json docs/seo/inventory.json --md docs/seo/inventory-table.md`。完整欄位在 `docs/seo/inventory.json`。

統計（34 頁）：

| 項目 | 有 | 缺 |
| --- | --- | --- |
| `<title>` | 34（全部不重複） | 0 |
| meta description | 34 | 0；但 70 字以下 25 頁，重複 20 頁（手冊 5 組） |
| canonical | 0 | 34 |
| robots meta | 0 | 34 |
| og:\* | 0 | 34 |
| twitter:\* | 0 | 34 |
| hreflang | 0 | 34（應有：`/`、`/en/`） |
| JSON-LD | 0 | 34 |
| 剛好一個 H1 | 25 | 4 頁沒有 H1（`/handbook/`、`/schedule/`、`/projects/`、`/offline/`）；5 頁手冊因 HackMD 內文用 `#` 而有多個 H1（`g0mesh-quickstart` 12、`g0mesh` 7、`submarine-cables` 4、`taiwan-mesh` 2、`alternatives` 2） |
| `<html lang>` | 34（`zh-Hant-TW` 25 頁、`en` 9 頁：`/en/`、`/projects/`、`/design-kits/*`） | 0 |

正式站探索檔案（curl，2026-11-14）：`/robots.txt` 404、`/sitemap.xml` 404、`/sitemap-index.xml` 404、`/llms.txt` 404；不存在的路徑正確回 404（GitHub Pages 預設頁，站內沒有自訂 `404.html`）。

其他觀察：

- 圖片 152 張全部有 `alt`，其中 9 張是 `alt=""`；沒有任何一張帶 `width`／`height` 或 `loading="lazy"`（手冊圖片集中在 `handbook-assets/scenarios/`，5.5 MB）。
- PWA 預快取目前 7871.6 KiB／10240 KiB，剩約 2.3 MB；`precacheGlobs` 只列具體路徑，根目錄新檔（`robots.txt`、`sitemap*.xml`、`llms*.txt`）與新目錄 `/og/` 都不會被比對到。
- Cubic 11（`public/fonts/Cubic_11.woff2`，cmap 10268 字）涵蓋目前所有頁面標題與區段名稱用到的字，0 缺字。
- 標題分隔與品牌寫法不一致：`｜數位韌性松 DigiResiThon`、`— DigiResiThon`、`— 數位韌性手冊`、`— Design Kits — DigiResiThon`、`手冊 HANDBOOK — DigiResiThon`。

### 逐頁盤點表

| path | lang | title (chars) | description (chars) | canonical | og:* | twitter:* | hreflang | JSON-LD | robots | H1s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| /about/ | zh-Hant-TW | 關於｜數位韌性松 DigiResiThon (21) | 為什麼要辦「假設網路斷光光」的黑客松：數位韌性松的緣起、正在做的事、參加方式。 (39) | — | — | — | — | — | — | 1 |
| /design-kits/colors/ | en | Colors — Design Kits — DigiResiThon (35) | Base palette and semantic tokens, dark and light side-by-side. (62) | — | — | — | — | — | — | 1 |
| /design-kits/components/ | en | Components — Design Kits — DigiResiThon (39) | Live component specimens: Button, Card, Badge, Alert, forms, SignalBars, StatusDot, TerminalBlock, Marquee, Tabs. (113) | — | — | — | — | — | — | 1 |
| /design-kits/ | en | Design Kits — DigiResiThon (26) | Self-hosted design-system reference: tokens, components, and patterns. (70) | — | — | — | — | — | — | 1 |
| /design-kits/logo/ | en | Logo — Design Kits — DigiResiThon (33) | Logo lockup and mark — dark and light previews, downloads, and YellowOne CC BY-SA 4.0 attribution. (98) | — | — | — | — | — | — | 1 |
| /design-kits/patterns/ | en | Patterns — Design Kits — DigiResiThon (37) | Scanlines, box-drawing, slash, motion tokens, stripe-caution, and checker patterns. (83) | — | — | — | — | — | — | 1 |
| /design-kits/typography/ | en | Typography — Design Kits — DigiResiThon (39) | Press Start 2P pixel grid and IBM Plex Mono type specimens. (59) | — | — | — | — | — | — | 1 |
| /design-kits/website/ | en | Website — Design Kits — DigiResiThon (36) | Full ui_kits/website specimen: header, landing, schedule, projects, register dialog. (84) | — | — | — | — | — | — | 1 |
| /en/ | en | DigiResiThon — Digital Resilience Hackathon \| g0v (49) | A g0v community hackathon prototyping what still works when Taiwan's internet goes dark: mesh networks, an offline handbook, shutdown scenario mapping. (151) | — | — | — | — | — | — | 1 |
| /handbook/ | zh-Hant-TW | 手冊 HANDBOOK — DigiResiThon (26) | 數位韌性手冊：斷網也能查的準備、應變、通訊網指南。 (25) | — | — | — | — | — | — | 0 |
| /handbook/mesh/buying/ | zh-Hant-TW | 如何購買 Meshtastic 裝置 — 數位韌性手冊 (27) | 數位韌性手冊 · 通訊網 (12, DUP) | — | — | — | — | — | — | 1 |
| /handbook/mesh/firmware/ | zh-Hant-TW | 購買後如何設定與刷韌體 — 數位韌性手冊 (20) | 數位韌性手冊 · 通訊網 (12, DUP) | — | — | — | — | — | — | 1 |
| /handbook/mesh/g0mesh-quickstart/ | zh-Hant-TW | g0mesh 快速上手 — 數位韌性手冊 (20) | 數位韌性手冊 · 通訊網 (12, DUP) | — | — | — | — | — | — | 12 |
| /handbook/mesh/g0mesh/ | zh-Hant-TW | g0mesh 介紹 — 數位韌性手冊 (18) | 數位韌性手冊 · 通訊網 (12, DUP) | — | — | — | — | — | — | 7 |
| /handbook/mesh/intro/ | zh-Hant-TW | 寫給還不熟悉 Meshtastic 的朋友 — 數位韌性手冊 (30) | 數位韌性手冊 · 通訊網 (12, DUP) | — | — | — | — | — | — | 1 |
| /handbook/mesh/taiwan-mesh/ | zh-Hant-TW | 台灣鏈網 — 數位韌性手冊 (13) | 數位韌性手冊 · 通訊網 (12, DUP) | — | — | — | — | — | — | 2 |
| /handbook/prepare/certifications/ | zh-Hant-TW | 民防/防災相關證照 — 數位韌性手冊 (18) | 數位韌性手冊 · 準備 (11, DUP) | — | — | — | — | — | — | 1 |
| /handbook/prepare/comms-backup/ | zh-Hant-TW | 預防通訊中斷 — 數位韌性手冊 (15) | 數位韌性手冊 · 準備 (11, DUP) | — | — | — | — | — | — | 1 |
| /handbook/prepare/first-aid/ | zh-Hant-TW | 學習急救資訊 — 數位韌性手冊 (15) | 數位韌性手冊 · 準備 (11, DUP) | — | — | — | — | — | — | 1 |
| /handbook/prepare/go-bag/ | zh-Hant-TW | 準備救難包 — 數位韌性手冊 (14) | 數位韌性手冊 · 準備 (11, DUP) | — | — | — | — | — | — | 1 |
| /handbook/prepare/household-supplies/ | zh-Hant-TW | 家庭常備物資清單 — 數位韌性手冊 (17) | 數位韌性手冊 · 準備 (11, DUP) | — | — | — | — | — | — | 1 |
| /handbook/prepare/shelter-locations/ | zh-Hant-TW | 了解避難位置 — 數位韌性手冊 (15) | 數位韌性手冊 · 準備 (11, DUP) | — | — | — | — | — | — | 1 |
| /handbook/respond/communication/ | zh-Hant-TW | 災難時的通訊 — 數位韌性手冊 (15) | 數位韌性手冊 · 應變 (11, DUP) | — | — | — | — | — | — | 1 |
| /handbook/respond/health/ | zh-Hant-TW | 災害時保健 — 數位韌性手冊 (14) | 數位韌性手冊 · 應變 (11, DUP) | — | — | — | — | — | — | 1 |
| /handbook/respond/transport/ | zh-Hant-TW | 災害時的交通 — 數位韌性手冊 (15) | 數位韌性手冊 · 應變 (11, DUP) | — | — | — | — | — | — | 1 |
| /handbook/scenarios/levels/ | zh-Hant-TW | 數位韌性情境分級 — 數位韌性手冊 (17) | 數位韌性手冊 · 情境 (11, DUP) | — | — | — | — | — | — | 1 |
| /handbook/scenarios/outage-risks/ | zh-Hant-TW | 台灣全國性斷網災害風險 — 數位韌性手冊 (20) | 數位韌性手冊 · 情境 (11, DUP) | — | — | — | — | — | — | 1 |
| /handbook/scenarios/submarine-cables/ | zh-Hant-TW | 海纜斷光會怎樣？ — 數位韌性手冊 (17) | 數位韌性手冊 · 情境 (11, DUP) | — | — | — | — | — | — | 4 |
| /handbook/selfhost/alternatives/ | zh-Hant-TW | 數位服務離線替代品 — 數位韌性手冊 (18) | 數位韌性手冊 · 自架服務 (13, DUP) | — | — | — | — | — | — | 2 |
| /handbook/selfhost/saas-guide/ | zh-Hant-TW | SaaS 韌性產品 self-host 指南 — 數位韌性手冊 (31) | 數位韌性手冊 · 自架服務 (13, DUP) | — | — | — | — | — | — | 1 |
| / | zh-Hant-TW | 數位韌性松 DigiResiThon｜g0v (22) | g0v 數位韌性松：假設網路斷光光，我們還能怎麼傳遞資訊？備援通訊、離線手冊、斷網情境盤點。 (46) | — | — | — | — | — | — | 1 |
| /offline/ | zh-Hant-TW | OFFLINE — DigiResiThon (22) | 目前離線。網站已存在裝置上，只有設計元件庫需要連線。 (26) | — | — | — | — | — | — | 0 |
| /projects/ | en | Projects — DigiResiThon (23) | Sample projects from DigiResiThon Year 0. (41) | — | — | — | — | — | — | 0 |
| /schedule/ | zh-Hant-TW | 時程｜數位韌性松 DigiResiThon (21) | 數位韌性松的活動時程與歷次小松紀錄，每場都連到當天的 HackMD 共筆。 (37) | — | — | — | — | — | — | 0 |

## 四、缺口（依優先序）

排序依 `seo-audit` 的優先順序（可爬取與索引 → 技術基礎 → 頁面優化 → 內容品質 → 權威），AI 搜尋部分依 `ai-seo` 的 Access／Discovery／Parseability 三問，並標上 AgentReady 編號。每項格式：問題／影響／證據／修正。

### P0 關鍵：可爬取與索引

| # | 問題 | 影響 | 證據 | 修正（turn） |
| --- | --- | --- | --- | --- |
| G1 | 沒有 robots.txt | 高：沒有 `Sitemap:` 指引，AI 爬蟲政策沒有明說（AR-FIND-01 的「明確立場」） | 正式站 `/robots.txt` 404 | 仿 crcolab：`*` 全開＋Content Signals，依用途分組列 AI 爬蟲，最後 `Sitemap:`（3） |
| G2 | 沒有 XML sitemap | 高：新頁面與手冊更新只能靠連結被發現；沒有 `lastmod` | `/sitemap.xml` 404 | `@astrojs/sitemap`，排除 `/offline/`，`lastmod` 用手冊 `syncedAt`，`/`↔`/en/` 加 `xhtml:link`（3） |
| G3 | 34 頁都沒有 canonical | 高：`index.html`、大小寫、追蹤參數等變體沒有收斂訊號；hreflang 也需要 canonical 在同一組內才有效 | 盤點表 canonical 欄全空 | 每頁自我 canonical，絕對網址、結尾斜線，與 sitemap、hreflang 一致（2） |
| G4 | `/offline/` 可被索引 | 中：薄頁、軟 404 風險 | 無 robots meta | `noindex, follow`，並排除於 sitemap（2、3） |

### P1 高影響：頁面與分享

| # | 問題 | 影響 | 證據 | 修正（turn） |
| --- | --- | --- | --- | --- |
| G5 | 34 頁沒有任何 og:\*／twitter:\* | 高：連結在 LINE、Facebook、Threads、X、Slack 分享時沒有卡片；也是 owner 的硬性要求 | 盤點表 | 統一 `SeoHead` 元件輸出 `og:title/description/image(+width/height/alt)/url/type/locale/site_name`、`twitter:card=summary_large_image`（2） |
| G6 | 沒有 OG 圖 | 高：同上 | `public/` 沒有任何分享圖 | 建置時逐頁產生 1200×630 PNG（blackout 深色、Cubic 11、紅綠兩個 accent），每張 < 150 KB（2） |
| G7 | 手冊 description 重複且過短 | 高：20 頁只有 5 種（11–13 字），Google 會改寫摘要，AI 也拿不到頁面重點 | `數位韌性手冊 · 通訊網` 等 | 建置時從內文第一段推導（跳過「作者：」「source:」等行），截到 70–160 字；需要時用 `src/data/seo-overrides.yaml` 覆寫；不動 `src/content/handbook/`（2） |
| G8 | 其他頁 description 偏短 | 中：首頁 46、關於 39、時程 37、手冊首頁 25、離線 26、專案 41、design-kits 59–113 字 | 盤點表 | 重寫為 70–160 字台灣用語（英文頁用英文），不改社群內容原意（2） |
| G9 | 沒有 hreflang | 中：`/` 與 `/en/` 互為翻譯卻沒有宣告；英文查詢可能落到中文首頁 | 盤點表 | 兩頁互指 `zh-Hant`、`en-US`，`x-default` → `/`；`og:locale` `zh_TW`／`en_US` 與 `og:locale:alternate`（2） |
| G10 | 標題規則不一致 | 中：品牌寫法有 5 種，分隔符號混用「｜」「—」 | 盤點表 | 定一條規則（寬度預算，CJK 算 2，上限 60）並寫測試；手冊頁名來自 HackMD，不改（2） |
| G11 | H1 結構 | 中：4 頁沒有 H1；5 頁手冊多個 H1 | 盤點表 H1 欄 | 4 頁補視覺上不變的 H1；手冊多 H1 源自 HackMD 內文，可在渲染時把內文 H1 降一級（rehype 外掛，不改同步檔），影響版面，列為 owner 決定 |

### P2 AI 搜尋：Discovery 與 Parseability

| # | 問題 | 影響 | 證據 | 修正（turn） |
| --- | --- | --- | --- | --- |
| G12 | 沒有 llms.txt | 中高：AI 代理讀到 llms.txt 的比例約 14%（Ora，2026-09，廠商研究）；本站最有價值的是手冊，需要一頁導覽 | `/llms.txt` 404 | 依 llmstxt.org：H1、摘要、區段連結附一句說明，台灣正體中文為主（3） |
| G13 | 沒有 llms-full.txt | 中：讓代理一次取得整本手冊（約 52 KB Markdown），每篇附 HackMD 來源與同步日期 | — | 建置時由 handbook collection 產生；不得進預快取（3） |
| G14 | 沒有 JSON-LD | 中：搜尋引擎與 AI 無法確認「誰辦的、何時何地、這篇是什麼」 | 盤點表 | 首頁 `WebSite`＋`Organization`（g0v／DigiResiThon）；時程頁從 `events.yaml` 產生 `Event`（只用實際有的欄位：名稱、日期、場地名稱、共筆網址）；手冊 `TechArticle`＋`BreadcrumbList`（`dateModified`＝`syncedAt`、`isBasedOn`＝HackMD 共筆）；不編造日期、評分、FAQ（3） |
| G15 | 新鮮度訊號不可見 | 中：手冊有 `syncedAt`，但沒有出現在 HTML 或結構化資料 | frontmatter | turn 3 以 `dateModified`／`article:modified_time` 輸出；頁面上顯示「最後同步」屬內容改動，列為 owner 決定 |
| G16 | 探索檔案沒有被連到 | 低中：llms.txt 等檔案 86–100% 的造訪來自連結（agent-readiness） | — | `<head>` 加 `<link rel="sitemap">`；頁尾是否加 llms.txt 文字連結由 owner 決定（3） |

### P3 技術基礎與長期

| # | 問題 | 影響 | 修正 |
| --- | --- | --- | --- |
| G17 | 圖片沒有 `width`／`height`、沒有 lazy loading | CLS 與 LCP；手冊圖片 5.5 MB | 後續：在渲染手冊時補尺寸與 `loading="lazy"`（不屬本次範圍） |
| G18 | 沒有自訂 404 | 低：狀態碼正確，但使用者與代理沒有導回路徑 | 後續：加 `404.astro` |
| G19 | 沒有搜尋引擎驗證、IndexNow、Bing Webmaster、Brave 提交 | 中：Copilot 只看 Bing 索引，Claude 走 Brave | owner 後續事項（部署屬於 g0v） |
| G20 | 沒有 feed | 低：活動與手冊更新沒有訂閱管道 | 可選：時程 Atom feed |

## 五、Top 10（依優先序）

1. G1 沒有 robots.txt（正式站 404），AI 爬蟲政策與 `Sitemap:` 都沒有。
2. G2 沒有 XML sitemap（404），也沒有 `lastmod`。
3. G3 34 頁沒有 canonical。
4. G5 34 頁沒有任何 og:\*／twitter:\*，分享沒有卡片。
5. G6 沒有 OG 圖。
6. G7 手冊 20 頁 description 只有 5 種、11–13 字。
7. G14 沒有任何 JSON-LD（WebSite、Organization、Event、TechArticle、BreadcrumbList）。
8. G12／G13 沒有 llms.txt 與 llms-full.txt。
9. G9 `/`↔`/en/` 沒有 hreflang；G4 `/offline/` 可被索引。
10. G8／G10／G11 描述偏短、標題規則不一致、4 頁沒有 H1 與 5 頁多 H1。

## 六、實作計畫

共同原則：所有中繼資料只從一個地方產生；`src/content/handbook/` 不手改；`design/` 只讀，顏色用 `src/styles/` 的語意 token；新產物都不進預快取，預算檢查照常通過；不出現 owner 的 email。

### Turn 2：head 中繼資料、OG 圖、標籤檢查

1. **`src/lib/seo.ts`**：常數（`SITE = https://digiresi.g0v.tw`、站名 `數位韌性松 DigiResiThon`）、`absoluteUrl()`、`pageTitle()`（寬度預算規則，CJK 與全形算 2，上限 60）、`describe()`（從 Markdown 首段推導手冊描述：去掉標題、圖片、連結語法、「作者：」「source:」行，切在句號，限 70–160 字）、`ogImagePath(pathname)`（`/og/<slug>.png`，首頁 `/og/index.png`）。單元測試涵蓋規則門檻與推導。
2. **`src/data/seo.yaml`**：各靜態頁的描述（我寫，台灣用語）、OG 區段標籤、手冊描述覆寫（預設空）、`noindex` 名單（`/offline/`）、翻譯配對（`/` ↔ `/en/`）。
3. **`src/components/SeoHead.astro`**：輸出 canonical、robots（`index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1`；`/offline/` 為 `noindex, follow`）、`og:site_name/type/url/title/description/locale/locale:alternate/image/image:width/image:height/image:alt`、`twitter:card/title/description/image/image:alt`、hreflang 三行（只在有翻譯的頁）、手冊頁的 `article:section`／`article:modified_time`。`BaseLayout.astro` 新增 props（`ogType`、`section`、`noindex`、`modified`），所有頁面改傳正確的 title／description。
4. **OG 圖**：Astro 靜態 endpoint `src/pages/og/[...slug].png.ts`，以 satori（排版）＋ @resvg/resvg-js（轉 PNG）在建置時產生；satori 不吃 woff2，建置時用 `wawoff2` 把 `public/fonts/Cubic_11.woff2` 解成 TTF 放記憶體（不提交大檔）。版型：`#0C0C0B` 底、掃描線、左上 lockup、`--accent` 紅色斜線、`--accent-2` 綠色終端提示字「digiresithon@tw:~$」、頁名大字、區段名小字。每張 < 150 KB（調色盤 PNG 壓縮）。缺字處理：先比對 Cubic 11 cmap，缺字時改用 Noto Sans TC 子集繪製，建置時印出警告並在測試中斷言 0 缺字。alt 文字逐字描述圖面。
5. **標籤檢查 `npm run check:seo`**（`scripts/seo/check.mjs`，重用 inventory）：每頁必須有唯一 title、70–160 字 description（英文頁計字元）、自我 canonical（絕對網址）、robots、og 全套、twitter 全套；og:image 檔案存在、1200×630、< 150 KB；hreflang 互指且含自己；`/offline/` 為 noindex；`dist/og/**` 不在 `precacheGlobs` 比對範圍內。另補 vitest 單元測試。
6. 檢查：`npm run build`、`npm test`、`npm run check:budget`、`npm run check`、`npm run check:seo`；之後重跑 inventory 更新 `docs/seo/inventory.*`。

### Turn 3：robots、sitemap、llms、JSON-LD、最終把關、PR

1. **`public/robots.txt`**（或 endpoint 以 `site` 產生）：仿 crcolab 的 Content Signals 與四個分組（搜尋索引、使用者觸發、模型訓練、封存），預設 `search=yes, ai-input=yes, ai-train=yes`（boss's default，owner 可改訓練政策），`Sitemap: https://digiresi.g0v.tw/sitemap-index.xml`；建置後測試釘住名單與格式（RFC 9309 token 不含空白）。
2. **sitemap**：`@astrojs/sitemap`，`filter` 排除 `/offline/`；`i18n` 只配對 `/` 與 `/en/`（`xhtml:link` 與 HTML hreflang 一致）；`serialize` 為手冊頁填 `lastmod`＝`syncedAt`。`<head>` 加 `<link rel="sitemap" href="/sitemap-index.xml">`。
3. **`/llms.txt`**（endpoint）：H1「數位韌性松 DigiResiThon」、摘要、語言與「全部為靜態 HTML，離線可讀」說明；區段：關於、時程（最近一場與報名連結，由 `events.yaml` 產生）、手冊（依五個區段列出每篇並附一句描述）、English、設計元件庫、其他（sitemap、llms-full.txt、GitHub repo、g0v 行為準則）。
4. **`/llms-full.txt`**（endpoint）：手冊全文依區段與順序串接，每篇前置標題、正式網址、HackMD 來源、同步日期。
5. **JSON-LD**（`src/components/JsonLd.astro`）：首頁 `WebSite`＋`Organization`（g0v 為主辦組織、DigiResiThon 為其專案）；`/en/` 同結構英文版；`/schedule/` 由 `events.yaml` 逐場輸出 `Event`（`name`、`startDate`、`location: Place{name}`、`url`；查不到的欄位不輸出）；手冊頁 `TechArticle`（`headline`、`description`、`inLanguage: zh-Hant-TW`、`dateModified`、`isBasedOn`、`isPartOf`）＋`BreadcrumbList`（首頁 → 手冊 → 本篇）；`/handbook/` 為 `CollectionPage`。測試驗證 JSON 可解析、必要欄位存在。
6. **預快取排除**：測試斷言 `robots.txt`、`sitemap*.xml`、`llms*.txt`、`og/**` 都不在 `precacheGlobs` 範圍，`check:budget` 通過。
7. **最終把關**：`npm ci`、`npm run build`、`npm test`、`npm run check`、`npm run check:budget`、`npm run check:seo`、`timeout 900 npm run test:e2e`（單一瀏覽器）；更新 inventory；開 PR `seo-aieo` → `main`，內文含 `Closes #1`、boss's defaults 清單、owner 後續事項，不合併。

## 七、Owner 後續事項（本次不做）

- IndexNow 金鑰檔與部署後提交（crcolab 的做法），需要 g0v 部署權限。
- Google Search Console 與 Bing Webmaster Tools 驗證、提交 sitemap；Brave Search 提交網址（Claude 的搜尋來源）。
- 決定 robots.txt 的模型訓練政策（預設全開，同 crcolab）。
- 決定手冊內文多個 H1 是否在渲染時降級、是否在頁面顯示「最後同步日期」、頁尾是否加 llms.txt 連結。
- 圖片尺寸與 lazy loading、自訂 404 頁、活動 Atom feed。

## 八、本輪決定（供 owner 檢視）

- 稽核文件以台灣正體中文撰寫；盤點表欄位保留英文技術名稱。
- OG 圖放 `/og/`，靠「預快取 glob 只列具體路徑」自然排除，另加測試防止日後誤加。
- sitemap 用 `@astrojs/sitemap`（產生 `sitemap-index.xml`），不另寫 `sitemap.xml`。
- 字型轉換在建置時進行（`wawoff2`），不把 Cubic 11 TTF 提交進 repo。
- Event JSON-LD 只用 `events.yaml` 已有的欄位；場地沒有地址資料，就只輸出場地名稱。

## 九、完成狀況與 owner 後續事項（2026-11-14，turn 3）

### 已完成

| 缺口 | 狀態 | 實作 |
| --- | --- | --- |
| G1 robots.txt | 完成 | `src/pages/robots.txt.ts`：仿 crcolab.art，`User-agent: *` 全開，Content Signals（`search=yes, ai-input=yes, ai-train=yes`，每個群組重複），依用途分組列出 AI 爬蟲（搜尋索引、使用者觸發、模型訓練、網頁封存），最後是 `Sitemap:` |
| G2 sitemap | 完成 | `@astrojs/sitemap` 產生 `/sitemap-index.xml`；排除 `/offline/`；`/`↔`/en/` 有 `xhtml:link`（zh-Hant、en-US、x-default），與 HTML hreflang 一致；手冊 `lastmod` 為 HackMD 同步日期；`<head>` 有 `<link rel="sitemap">` |
| G3 canonical | 完成 | `SeoHead.astro` 每頁輸出自我 canonical（絕對網址） |
| G4 `/offline/` | 完成 | `noindex, follow`，不在 sitemap |
| G5 og／twitter | 完成 | 每頁 `og:site_name/type/url/title/description/locale(+alternate)/image(+type/width/height/alt)`、`twitter:card=summary_large_image` 等 |
| G6 OG 圖 | 完成 | 建置時每頁產生 1200×630 PNG（最大約 7.5 KB），blackout 深色、Cubic 11、紅綠雙 accent；缺字改用 Noto Sans TC，兩者都缺就讓建置失敗 |
| G7／G8 描述 | 完成 | 靜態頁描述重寫（70–160 字）；手冊頁依序取 `src/data/handbook-seo.yaml`、frontmatter、內文首段；全站唯一 |
| G9 hreflang | 完成 | `/`↔`/en/`，含自己與 x-default |
| G10 標題規則 | 完成 | 寬度預算（CJK 算 2，上限 60），有單元測試 |
| G11 H1 | 完成 | 每頁剛好一個 H1：HackMD 內文 H1 在渲染時下移一級；4 頁補上 H1 |
| G12／G13 llms | 完成 | `/llms.txt`（網站摘要、各區段、下一場活動、每篇手冊與描述）、`/llms-full.txt`（手冊全文，附網址、原始共筆、同步日期）；頁尾有 llms.txt 連結 |
| G14 JSON-LD | 完成 | 首頁與 `/en/`：WebSite＋Organization（數位韌性松，上層組織 g0v）＋WebPage；`/schedule/`：EventSeries＋每場有日期與場地的活動各一個 Event；手冊頁：TechArticle＋BreadcrumbList；`/handbook/`：CollectionPage；`/about/`：AboutPage；其他頁 WebPage＋BreadcrumbList |
| G15 新鮮度 | 完成 | 手冊頁顯示「最後同步：YYYY-MM-DD」，同一個值用在 `article:modified_time`、JSON-LD `dateModified`、sitemap `lastmod` |
| G16 探索檔案連結 | 完成 | 頁尾 llms.txt 連結、`<link rel="sitemap">`、robots.txt `Sitemap:` |

把關：`scripts/seo/check.mjs`（`check-seo`）在 `npm run build` 最後執行，任一頁缺標籤、標題或描述重複、OG 圖不存在或尺寸不對、H1 數量不對、JSON-LD 無法解析或缺必要欄位，或 robots.txt、sitemap、llms 檔與頁面不一致，建置就失敗。新產物（`/og/**`、`robots.txt`、`sitemap-*.xml`、`llms*.txt`）都在預快取之外，預算檢查照常通過。

### Owner 後續事項

1. **IndexNow**：仿 crcolab 在根目錄放金鑰檔，部署後提交新增或 `lastmod` 有變的網址（Bing、Yandex 等）。需要 g0v 的部署權限，本 PR 沒有加金鑰。
2. **Search Console 與 Bing Webmaster Tools**：驗證網域、提交 `https://digiresi.g0v.tw/sitemap-index.xml`；Bing 的 AI Performance 報表可看 Copilot 引用。另可到 Brave Search 提交網址（Claude 的搜尋來源）。
3. **CI**：`.github/workflows/ci.yml` 會跑 `npm run build`，因此 PR 的 CI 會自動跑到 `check-seo`。
4. **robots.txt 的訓練政策**：目前預設 `ai-train=yes` 並允許訓練爬蟲（同 crcolab），如果社群決定不開放訓練，改 `src/pages/robots.txt.ts` 的訊號與訓練群組即可。
5. 仍未處理（範圍外）：手冊圖片尺寸與 lazy loading（G17）、自訂 404 頁（G18）、活動 Atom feed（G20）、`go-bag` 與 `transport` 兩頁在 HackMD 上還沒有正文。
