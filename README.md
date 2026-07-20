# digiresi.g0v.tw — 數位韌性手冊 × DigiResiThon

g0v 數位韌性松（DigiResiThon）社群網站與離線手冊。

斷網、斷纜、停電的時候，**離線也能查手冊**：手冊區（`/handbook/`）是可安裝的
PWA，第一次造訪就會把全部手冊頁面、圖片與搜尋索引預快取到裝置上（預算上限
10 MB，CI 強制檢查），之後不需要任何網路連線也能閱讀與搜尋。入口網站區
（首頁、時程）維持 online-first；離線時未快取的頁面會導向 `/offline/` 說明頁。

- 線上網址：https://digiresi.g0v.tw
- 社群大全（HackMD 主文件）：https://g0v.hackmd.io/mGQcbKRDShmvyeGV74w_0w
- 內容來源：g0v 社群 HackMD 共筆，經 [g0v-data/g0v-hackmd-archive](https://github.com/g0v-data/g0v-hackmd-archive) 鏡像同步

## 設計系統

視覺設計以 `design/` 目錄裡的 **DigiResiTh0n Design System** 為準——由
Claude Design 專案唯讀匯入（匯入紀錄與缺漏清單見 `design/IMPORT-NOTES.md`）。

- `design/readme.md` — 設計聖經：主題（blackout 深色為預設）、雙強調色紀律、
  像素字級階、動態、語氣、zero rule 等硬性規則
- `design/tokens/*.css` — design token 來源（已移植到 `src/styles/`）
- `design/ui_kits/website/` — 網站版型的重建目標
- `design/` 為唯讀參考，請勿直接修改；網站程式碼一律使用移植後的
  semantic tokens（`--bg`、`--ink`、`--accent`⋯），不得引用原始色票

## 開發指令

需求：Node.js >= 22、npm。

| 指令 | 說明 |
|---|---|
| `npm install` | 安裝相依套件 |
| `npm run dev` | 本機開發伺服器（http://localhost:4321） |
| `npm run build` | 建置靜態網站到 `dist/`，並建立 Pagefind 搜尋索引 |
| `npm run preview` | 預覽 `dist/` 建置結果 |
| `npm run sync` | 從 HackMD 封存庫同步手冊內容（寫入 `src/content/handbook/`） |
| `npm run assets` | 一次性抓取 Cubic 11 字型、pixelarticons 圖示、logo（產物已 commit，平常不需重跑） |
| `npm run icons` | 由 `design/assets/logo/mark-dark.png` 產生 PWA icons（`public/icons/`） |
| `npm test` | Vitest 單元測試（同步管線的轉換函式） |
| `npm run test:e2e` | Playwright 離線 e2e（產品承諾測試：斷網後手冊仍可讀） |
| `npm run check:budget` | 檢查離線預快取總量 <= 10 MB |
| `npm run check:links` | 檢查 `dist/` 內部連結沒有斷鏈 |
| `npm run check` | `astro check` |

## 內容同步機制

手冊內容的編輯主場仍然是 HackMD，本 repo 只保存**審核過的快照**。

- `sync.config.yaml` 是手冊頁面清單（curation manifest）：每頁一筆，
  記錄 HackMD note ID → 站內 slug、section
  （prepare / respond / mesh / scenarios / selfhost）、order、title。
- **新增一頁手冊**：在 `sync.config.yaml` 加一筆 entry，執行
  `npm run sync`，再 commit 產出的 `src/content/handbook/<section>/<page>.md`
  與 `public/handbook-assets/<slug>/` 圖片。
- `scripts/sync-content.mjs` 逐頁執行：抓取 raw markdown → 清除 HackMD
  語法（frontmatter、tags、`:::` 容器轉 callout）→ 改寫站內／站外連結 →
  **圖片全部 vendor 進 repo**（離線頁面不依賴外部圖床）→ 產生 frontmatter。
  任何一頁失敗都會列入摘要並以非零狀態結束；寫入採原子性（temp 目錄 →
  rename），不會留下半更新的頁面。
- **每週自動同步**：`.github/workflows/sync.yml` 於每週五 21:00 UTC
  （台北時間週六 05:00）執行同步並開 PR（branch `content-sync`）。
- **安全考量**：HackMD 共筆任何人都能編輯。所有內容變更必須經過 PR 人工
  審核才會出現在 digiresi.g0v.tw 這個掛在 g0v 網域下的網站上；排程同步
  失敗時不會開 PR，也不影響已部署的網站。

## 部署

- push 到 `main` 後由 `.github/workflows/deploy.yml` 建置並部署到
  GitHub Pages（自訂網域來自 `public/CNAME` = `digiresi.g0v.tw`）。
- 每個 PR 由 `.github/workflows/ci.yml` 執行完整檢查：單元測試、建置、
  預快取預算、內部連結、離線 e2e。
- **一次性 DNS 設定**：向 g0v 網域 repo 開 PR，把 `digiresi.g0v.tw`
  指向 GitHub Pages：https://github.com/g0v/domain

## 授權

- **程式碼**：MIT（見 [LICENSE](LICENSE)）
- **手冊與網站內容**：[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.zh_TW)
  （沿用 g0v 社群慣例；內容源自 HackMD 共筆）
- **Logo & logotype**：© YellowOne，[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
  （TODO(yellowone-url): 待補 YellowOne 官方頁面連結）
