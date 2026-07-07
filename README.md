# 全零的深耕聚光系統 — 產線 C 主控台(第一期 MVP)

依《總綱 v2.2》《大生產日 SOP v0.9》《產線 C 委派書》建置(見 `docs/`)。
Notion 為唯一真實資料源,本 App 不儲存任何權威資料;App 關閉後,擁有者仍可直接在 Notion 手動完成一切操作。

## 第一期範圍

- **P1 主控台首頁**(`/`):行事曆(當月/下月切換)、完成度儀表(依 DB-03 狀態機)、今日待辦。
- **P5 Session 工作站**(`/sessions`):批次/單筆建立 Session+明細、抽牌輸入與識別碼驗證、狀態機只能順序推進(跳步需二次確認)。
- **P2 序列展開引擎**(`/expand`):讀 DB-06/07/15,依錨點(首場/每場/末場)計算實際日期,預覽清單勾選確認後才寫入 Notion。

P3 生產日工作台、P4 固定項目註冊器、P6 回饋快填、P7 提案審核台為第二、三期範圍,本期未實作,期間請直接在 Notion 操作(委派書七、分期交付)。

## 環境變數

在專案根目錄建立 `.env.local`(部署平台則於環境變數設定頁面),見 `.env.example`:

```
NOTION_TOKEN=你的 Notion Internal Integration Token
ACCESS_KEY=你自訂的一組存取金鑰(任意字串,建議夠長夠隨機)
```

- `NOTION_TOKEN`:擁有者自行在 Notion 建立 Integration 並取得,**不得寫死在程式碼或提交進版控**(`.env.local` 已在 `.gitignore` 中)。Integration 需被分享(share)到本委派書「三、資料對接表」列出的 16 個資料庫,否則 API 會回傳 404/未授權。
- `ACCESS_KEY`:單一存取金鑰(委派書 v1.1 新增需求)。**不是登入系統、無帳號無多用戶**——只是一把鑰匙:沒設定這個環境變數,App 會拒絕所有請求;設定了但瀏覽器沒帶對的金鑰,頁面會被導去 `/unlock`、API 會回 401。在 `/unlock` 輸入一次金鑰後存進瀏覽器 cookie(1 年),之後不用再輸入。金鑰本身建議用亂數產生一段夠長的字串(例如 `openssl rand -hex 24`),不要用容易猜的詞。

## 本機開發

```bash
npm install
npm run dev
```

開啟 http://localhost:3000,第一次會被導去 `/unlock` 輸入 `ACCESS_KEY`。

## 部署到 Railway

1. 到 [railway.app](https://railway.app) 用 GitHub 帳號登入,New Project → Deploy from GitHub repo → 選這個 repo、這個分支。
2. Railway 會自動偵測 Next.js 專案。若沒有自動抓到,手動確認:Build Command `npm run build`,Start Command `npm run start`。
3. 專案 → Variables,新增兩個環境變數:
   - `NOTION_TOKEN`
   - `ACCESS_KEY`
4. Deploy。完成後 Railway 會給一個 `*.up.railway.app` 網址,開啟後先到 `/unlock` 輸入你設定的 `ACCESS_KEY`。

## 部署到 Vercel(替代方案)

1. 將本 repo 連接到 Vercel 新專案。
2. 在 Vercel 專案設定 → Environment Variables 新增 `NOTION_TOKEN` 與 `ACCESS_KEY`。
3. 部署。無需額外建置設定(標準 Next.js App Router 專案)。

其他平台(自架 Node 主機等)只需能執行 `npm run build` + `npm run start`,並提供上述環境變數即可。

## 驗證過的事項

- 16 個 Notion 資料庫 schema 已逐庫 fetch 驗證,欄位名與委派書描述一致(見 `lib/notion/schema.ts` 的實際 data source ID)。
- 序列展開引擎(`lib/date.ts` 的 `expandSequence`)已用「顯化共振會一期四場、跨月」案例驗證:首場錨點正確相對第一場、每場錨點對每一場各複製一組、末場錨點正確相對最後一場,跨月不斷裂。
- `npm run build`(TypeScript + ESLint + Next.js production build)通過。
- ACCESS_KEY 存取金鑰保護已本機驗證:無 cookie 訪問頁面會被導去 `/unlock`、訪問 API 回 401;錯誤金鑰回 401;正確金鑰後設 cookie 並放行;`/unlock` 本身不受保護(否則無法輸入金鑰)。
- 已在正式部署(Railway)上用測試資料實際跑過「批次建立 14 天 Session」與「序列展開預覽+確認寫入」,寫入結果與預期完全吻合(序列展開的錨點日期分毫不差),驗證後已清除測試筆。

## 本期未涵蓋事項 / 待擁有者決定

1. ~~DB-03「項目用途」欄位落差~~:**已定案(v1.3)**。擁有者已在 Notion 手動新增「事件序列文、邀請文、心理測驗、個人心得」4 個選項,P2 序列展開引擎已改為寫入「事件序列文」。三更/邀請文、二更/心理測驗的對應規則已記錄於 `docs/schema/項目用途落差說明.md`,但三更、二更本身的自動產生功能不在本期範圍,尚未實作。
2. **DB-04 明細缺乏節點/內容類型欄位**:目前把節點資訊編碼進明細編號(標題)文字,不是結構化欄位,查詢/統計較不便。詳見 `docs/schema/項目用途落差說明.md`。
3. ~~P1 完成度儀表的月份歸屬~~:**已解決**。改為依明細的「對應日期」歸月(一個 Session 在本月有對應日期的明細就計入本月,跨月批次會分別計入涉及的每個月),不再用 Session「建立日期」。
4. ~~P1 行事曆呈現方式~~:**已解決**。改為月曆網格(當月/下月切換),格內顯示當天任務預覽,點格子看當天完整清單。
5. P3、P4、P6、P7 完全未實作(依委派書分期交付規劃,屬第二、三期)。
6. 尚未做手機瀏覽器實測(驗收標準要求 P1、P6 手機可順暢操作;P6 本期未做,P1 已用 Tailwind 響應式版面但未經真機測試)。

## 程式碼結構

```
lib/notion/schema.ts      16 個資料庫的 data source ID 與選項常數(逐庫 fetch 驗證過)
lib/notion/client.ts      Notion client 單例 + 節流佇列(~3 req/s)+ 指數退避重試
lib/notion/properties.ts  Notion 屬性值讀寫小工具
lib/notion/queries.ts     各資料庫查詢函式(含分頁)
lib/notion/mutations.ts   建立/更新頁面、狀態機推進規則
lib/date.ts               序列展開引擎的錨點日期計算(首場/每場/末場)
app/                      P1 主控台、P5 Session 工作站、P2 序列展開 三個頁面 + API routes
docs/                     總綱、SOP、委派書原文 + schema 落差說明
```
