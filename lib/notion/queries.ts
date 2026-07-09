import { notion, withNotionRateLimit } from "./client";
import { DATA_SOURCES } from "./schema";
import {
  readTitle,
  readRichText,
  readSelect,
  readMultiSelect,
  readNumber,
  readDateStart,
  readRelationIds,
} from "./properties";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryFilter = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QuerySorts = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NotionPage = any;

// 分頁抓取整個 data source 的查詢結果(節流 + 重試由 withNotionRateLimit 處理)。
export async function queryAll(
  dataSourceId: string,
  filter?: QueryFilter,
  sorts?: QuerySorts
): Promise<NotionPage[]> {
  const results: NotionPage[] = [];
  let cursor: string | undefined = undefined;
  do {
    const res = await withNotionRateLimit(() =>
      notion().dataSources.query({
        data_source_id: dataSourceId,
        filter,
        sorts,
        start_cursor: cursor,
        page_size: 100,
      })
    );
    results.push(...res.results);
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return results;
}

// --- DB-01 牌組表 ---
export async function listDecks() {
  const pages = await queryAll(DATA_SOURCES.DB01_牌組表);
  return pages.map((p) => ({
    id: p.id,
    牌組代碼: readTitle(p, "牌組代碼"),
    牌組名稱: readRichText(p, "牌組名稱"),
    總張數: readNumber(p, "總張數"),
  }));
}

// --- DB-02 牌卡表:依識別碼(如 MP-15)查單張卡,用於抽牌輸入驗證與 P8 組稿 ---
export function mapCard(p: NotionPage) {
  return {
    id: p.id,
    卡片識別碼: readTitle(p, "卡片識別碼"),
    牌名: readRichText(p, "牌名"),
    短義: readRichText(p, "短義"),
    長義: readRichText(p, "長義"),
    關鍵字: readMultiSelect(p, "關鍵字"),
  };
}

export async function findCardByIdentifier(identifier: string) {
  const pages = await queryAll(DATA_SOURCES.DB02_牌卡表, {
    property: "卡片識別碼",
    title: { equals: identifier },
  });
  if (pages.length === 0) return null;
  return mapCard(pages[0]);
}

// --- DB-03 抽牌 Session ---
export function mapSession(p: NotionPage) {
  return {
    id: p.id,
    Session編號: readTitle(p, "Session 編號"),
    狀態: readSelect(p, "狀態"),
    模式: readSelect(p, "模式"),
    項目用途: readSelect(p, "項目用途"),
    建立日期: readDateStart(p, "建立日期"),
    抽牌明細: readRelationIds(p, "抽牌明細"),
  };
}

export async function listSessionsCreatedBetween(startISO: string, endISO: string) {
  const pages = await queryAll(DATA_SOURCES.DB03_抽牌Session, {
    and: [
      { property: "建立日期", date: { on_or_after: startISO } },
      { property: "建立日期", date: { on_or_before: endISO } },
    ],
  });
  return pages.map(mapSession);
}

export async function getSession(sessionId: string) {
  const p = await withNotionRateLimit(() => notion().pages.retrieve({ page_id: sessionId }));
  return mapSession(p as NotionPage);
}

// --- DB-04 抽牌明細:依「對應日期」查區間,用於行事曆與今日待辦 ---
export function mapDetail(p: NotionPage) {
  return {
    id: p.id,
    明細編號: readTitle(p, "明細編號"),
    對應日期: readDateStart(p, "對應日期"),
    抽出順序: readRichText(p, "抽出順序"),
    所屬Session: readRelationIds(p, "所屬 Session")[0] ?? null,
  };
}

export async function listDetailsForSession(sessionId: string) {
  const pages = await queryAll(DATA_SOURCES.DB04_抽牌明細, {
    property: "所屬 Session",
    relation: { contains: sessionId },
  });
  return pages.map(mapDetail).sort((a, b) => a.明細編號.localeCompare(b.明細編號));
}

export async function getDetail(detailId: string) {
  const p = await withNotionRateLimit(() => notion().pages.retrieve({ page_id: detailId }));
  return mapDetail(p as NotionPage);
}

export async function listDetailsInRange(startISO: string, endISO: string) {
  const pages = await queryAll(DATA_SOURCES.DB04_抽牌明細, {
    and: [
      { property: "對應日期", date: { on_or_after: startISO } },
      { property: "對應日期", date: { on_or_before: endISO } },
    ],
  });
  return pages.map(mapDetail);
}

// --- DB-06 固定項目註冊表 ---
export function mapEvent(p: NotionPage) {
  return {
    id: p.id,
    事件類型: readTitle(p, "事件類型"),
    事件型態: readSelect(p, "事件型態") as "單日" | "多日" | null,
    狀態: readSelect(p, "狀態"),
    宣傳期長度: readNumber(p, "宣傳期長度"),
    場次節奏說明: readRichText(p, "場次節奏說明"),
  };
}

export async function listActiveEvents() {
  const pages = await queryAll(DATA_SOURCES.DB06_固定項目註冊表, {
    property: "狀態",
    select: { equals: "啟用" },
  });
  return pages.map(mapEvent);
}

export async function getEvent(eventId: string) {
  const page = await withNotionRateLimit(() => notion().pages.retrieve({ page_id: eventId }));
  return mapEvent(page as NotionPage);
}

// --- DB-07 序列節點表:依所屬事件查節點模板 ---
export function mapNode(p: NotionPage) {
  return {
    id: p.id,
    節點編號: readTitle(p, "節點編號"),
    錨點: readSelect(p, "錨點") as "首場" | "每場" | "末場" | null,
    相對天數: readRichText(p, "相對天數"),
    內容類型: readRichText(p, "內容類型"),
    目的: readRichText(p, "目的"),
    發布平台: readMultiSelect(p, "發布平台"),
    CanvaTemplateNo: readRichText(p, "Canva 模板編號"),
  };
}

export async function listNodesForEvent(eventPageId: string) {
  const pages = await queryAll(DATA_SOURCES.DB07_序列節點表, {
    property: "所屬事件",
    relation: { contains: eventPageId },
  });
  return pages.map(mapNode);
}

// --- DB-15 場次表:依所屬事件查場次,依場次序排序 ---
export function mapSlot(p: NotionPage) {
  return {
    id: p.id,
    場次編號: readTitle(p, "場次編號"),
    場次序: readNumber(p, "場次序"),
    日期: readDateStart(p, "日期"),
    狀態: readSelect(p, "狀態"),
    當場主題: readRichText(p, "當場主題"),
  };
}

export async function listSlotsForEvent(eventPageId: string) {
  const pages = await queryAll(
    DATA_SOURCES.DB15_場次表,
    { property: "所屬事件", relation: { contains: eventPageId } },
    [{ property: "場次序", direction: "ascending" }]
  );
  return pages.map(mapSlot);
}

export async function listSlotsInRange(startISO: string, endISO: string) {
  const pages = await queryAll(DATA_SOURCES.DB15_場次表, {
    and: [
      { property: "日期", date: { on_or_after: startISO } },
      { property: "日期", date: { on_or_before: endISO } },
    ],
  });
  return pages.map(mapSlot);
}

// --- DB-05 解讀規則庫:P8 組稿用,找「適用項目」對應的現行版規則 ---
export function mapRule(p: NotionPage) {
  return {
    id: p.id,
    規則代碼: readTitle(p, "規則代碼"),
    規則名稱: readRichText(p, "規則名稱"),
    適用項目: readSelect(p, "適用項目"),
    狀態: readSelect(p, "狀態"),
    牌位定義: readRichText(p, "牌位定義"),
    解讀邏輯: readRichText(p, "解讀邏輯"),
    輸出格式: readRichText(p, "輸出格式"),
    版本號: readNumber(p, "版本號"),
  };
}

export async function listCurrentRulesFor適用項目(適用項目: string) {
  const pages = await queryAll(DATA_SOURCES.DB05_解讀規則庫, {
    and: [
      { property: "適用項目", select: { equals: 適用項目 } },
      { property: "狀態", select: { equals: "現行" } },
    ],
  });
  return pages.map(mapRule);
}

// --- DB-08 月主題包:P8 組稿用 ---
export function mapMonthlyTheme(p: NotionPage) {
  return {
    id: p.id,
    月份: readTitle(p, "月份"),
    主題名: readRichText(p, "主題名"),
    深度討論題目: readRichText(p, "深度討論題目"),
    每日互動方向: readRichText(p, "每日互動方向"),
    當月三款主題服務: readRichText(p, "當月三款主題服務"),
  };
}

export async function listMonthlyThemes() {
  const pages = await queryAll(DATA_SOURCES.DB08_月主題包);
  return pages.map(mapMonthlyTheme).sort((a, b) => b.月份.localeCompare(a.月份));
}

export async function getMonthlyThemeByMonth(monthKey: string) {
  const pages = await queryAll(DATA_SOURCES.DB08_月主題包, {
    property: "月份",
    title: { equals: monthKey },
  });
  return pages.length > 0 ? mapMonthlyTheme(pages[0]) : null;
}

// --- DB-14 知識庫:P8 組稿用,找語氣指引現行版(來源=原創,標題「語氣指引 vX」,取最新版) ---
export function mapKnowledge(p: NotionPage) {
  return {
    id: p.id,
    標題: readTitle(p, "標題"),
    內容: readRichText(p, "內容"),
    來源: readSelect(p, "來源"),
    核可狀態: readSelect(p, "核可狀態"),
  };
}

export async function listToneGuideCandidates() {
  const pages = await queryAll(DATA_SOURCES.DB14_知識庫, {
    and: [
      { property: "來源", select: { equals: "原創" } },
      { property: "標題", title: { starts_with: "語氣指引" } },
    ],
  });
  return pages.map(mapKnowledge);
}
