import { notion, withNotionRateLimit } from "../notion/client";
import { queryAll, type NotionPage } from "../notion/queries";
import {
  readTitle,
  readRichText,
  readSelect,
  readMultiSelect,
  readNumber,
  readRelationIds,
  readCheckbox,
} from "../notion/properties";
import { TRPG_DATA_SOURCES } from "./schema";

// --- 💾 POV進度表 ---
export function mapSave(p: NotionPage) {
  return {
    id: p.id,
    存檔名稱: readTitle(p, "存檔名稱"),
    存檔狀態: readSelect(p, "存檔狀態"),
    所屬世界: readRelationIds(p, "所屬世界")[0] ?? null,
    視角角色: readRelationIds(p, "視角角色")[0] ?? null,
    目前幕: readRelationIds(p, "目前幕")[0] ?? null,
    目前章節: readRelationIds(p, "目前章節")[0] ?? null,
    目前場景: readRelationIds(p, "目前場景")[0] ?? null,
    已完成章節: readRelationIds(p, "已完成章節"),
    已完成場景: readRelationIds(p, "已完成場景"),
    最近摘要: readRichText(p, "最近摘要"),
    累積遊玩時長: readNumber(p, "累積遊玩時長(分)") ?? 0,
  };
}

export async function listSaves() {
  const pages = await queryAll(TRPG_DATA_SOURCES.POV進度表);
  return pages.map(mapSave);
}

export async function getSave(id: string) {
  const p = await withNotionRateLimit(() => notion().pages.retrieve({ page_id: id }));
  return mapSave(p as NotionPage);
}

// --- 通用「id + 名稱」清單(下拉選單用) ---
async function listIdName(dataSourceId: string, titleProp: string) {
  const pages = await queryAll(dataSourceId);
  return pages.map((p) => ({ id: p.id, name: readTitle(p, titleProp) }));
}

export const listWorlds = () => listIdName(TRPG_DATA_SOURCES.世界庫, "世界名稱");
export const listCharacters = () => listIdName(TRPG_DATA_SOURCES.角色庫, "角色名稱");
export const listChapters = () => listIdName(TRPG_DATA_SOURCES.章表, "章節名稱");
export const listScenes = () => listIdName(TRPG_DATA_SOURCES.場景表, "場景名稱");

// --- 🧵 伏筆／情節庫:未回收清單 ---
export function mapClue(p: NotionPage) {
  return {
    id: p.id,
    伏筆名稱: readTitle(p, "伏筆名稱"),
    狀態: readSelect(p, "狀態"),
    埋下章節: readRichText(p, "埋下章節"),
    預計回收章節: readRichText(p, "預計回收章節"),
    線索內容: readRichText(p, "線索內容"),
    所屬世界: readRelationIds(p, "所屬世界"),
  };
}

export async function listUnresolvedClues(worldId?: string) {
  const pages = await queryAll(TRPG_DATA_SOURCES.伏筆情節庫, {
    property: "狀態",
    select: { equals: "未回收" },
  });
  const clues = pages.map(mapClue);
  return worldId ? clues.filter((c) => c.所屬世界.includes(worldId)) : clues;
}

// --- 🎯 抉擇／分支庫:Canon 待審(試玩成立) ---
export function mapChoice(p: NotionPage) {
  return {
    id: p.id,
    場景標題: readTitle(p, "場景標題"),
    Canon狀態: readSelect(p, "Canon狀態"),
    所屬世界: readRelationIds(p, "所屬世界"),
    章節回合: readNumber(p, "章節回合"),
  };
}

export async function listPendingCanon(worldId?: string) {
  const pages = await queryAll(TRPG_DATA_SOURCES.抉擇分支庫, {
    property: "Canon狀態",
    select: { equals: "試玩成立" },
  });
  const choices = pages.map(mapChoice);
  return worldId ? choices.filter((c) => c.所屬世界.includes(worldId)) : choices;
}

// --- 🧠 角色知情表:知情落差(誤解且未過時) ---
export function mapAwareness(p: NotionPage) {
  return {
    id: p.id,
    知情紀錄ID: readTitle(p, "知情紀錄ID"),
    角色: readRelationIds(p, "角色"),
    事件: readRelationIds(p, "事件"),
    是否誤解: readCheckbox(p, "是否誤解"),
    是否已過時: readCheckbox(p, "是否已過時"),
    誤解內容: readRichText(p, "誤解內容"),
    知情等級: readSelect(p, "知情等級"),
  };
}

export async function listAwarenessGaps() {
  const pages = await queryAll(TRPG_DATA_SOURCES.角色知情表, {
    property: "是否誤解",
    checkbox: { equals: true },
  });
  return pages.map(mapAwareness).filter((a) => !a.是否已過時);
}

// --- ⚡ 快速輸入暫存表:待確認清單 ---
export function mapStaging(p: NotionPage) {
  return {
    id: p.id,
    暫存紀錄名稱: readTitle(p, "暫存紀錄名稱"),
    目標類型: readSelect(p, "目標類型"),
    原始輸入文字: readRichText(p, "原始輸入文字"),
    解析欄位JSON: readRichText(p, "解析欄位JSON"),
    解析狀態: readSelect(p, "解析狀態"),
    建立時間: p.properties?.建立時間?.created_time ?? null,
  };
}

export async function listPendingStaging() {
  const pages = await queryAll(
    TRPG_DATA_SOURCES.快速輸入暫存表,
    { property: "解析狀態", select: { equals: "待確認" } },
    [{ timestamp: "created_time", direction: "descending" }]
  );
  return pages.map(mapStaging);
}

// --- 🎬 幕表 / 📗 章表 / 🎞️ 場景表:名稱查詢(儀表板顯示用) ---
export async function getChapterName(id: string): Promise<string | null> {
  if (!id) return null;
  const p = await withNotionRateLimit(() => notion().pages.retrieve({ page_id: id }));
  return readTitle(p as NotionPage, "章節名稱");
}

export async function getSceneName(id: string): Promise<string | null> {
  if (!id) return null;
  const p = await withNotionRateLimit(() => notion().pages.retrieve({ page_id: id }));
  return readTitle(p as NotionPage, "場景名稱");
}

export async function getWorldName(id: string): Promise<string | null> {
  if (!id) return null;
  const p = await withNotionRateLimit(() => notion().pages.retrieve({ page_id: id }));
  return readTitle(p as NotionPage, "世界名稱");
}

export async function getCharacterName(id: string): Promise<string | null> {
  if (!id) return null;
  const p = await withNotionRateLimit(() => notion().pages.retrieve({ page_id: id }));
  return readTitle(p as NotionPage, "角色名稱");
}

// --- ⏱️ 時鐘表:依章節查目前活躍時鐘 ---
export function mapClock(p: NotionPage) {
  return {
    id: p.id,
    時鐘名稱: readTitle(p, "時鐘名稱"),
    類型: readSelect(p, "類型"),
    目前格數: readNumber(p, "目前格數") ?? 0,
    格數上限: readNumber(p, "格數上限") ?? 4,
    影響結果: readRichText(p, "影響結果"),
    所屬章節: readRelationIds(p, "所屬章節"),
    並行時鐘對照: readRelationIds(p, "並行時鐘(對照)"),
  };
}

export async function listClocksForChapter(chapterId?: string) {
  const pages = chapterId
    ? await queryAll(TRPG_DATA_SOURCES.時鐘表, {
        property: "所屬章節",
        relation: { contains: chapterId },
      })
    : await queryAll(TRPG_DATA_SOURCES.時鐘表);
  return pages.map(mapClock);
}

export async function getClock(id: string) {
  const p = await withNotionRateLimit(() => notion().pages.retrieve({ page_id: id }));
  return mapClock(p as NotionPage);
}

// --- 🎲 判定紀錄表:最近紀錄(儀表板/判定台歷史) ---
export function mapJudgment(p: NotionPage) {
  return {
    id: p.id,
    判定名稱: readTitle(p, "判定名稱"),
    判定方式: readSelect(p, "判定方式"),
    判定類型: readSelect(p, "判定類型"),
    Position: readSelect(p, "Position"),
    Effect: readSelect(p, "Effect"),
    結果級別: readSelect(p, "結果級別"),
    行為標籤: readMultiSelect(p, "行為標籤"),
    道德標籤: readMultiSelect(p, "道德標籤"),
    備註: readRichText(p, "備註"),
  };
}

export async function listRecentJudgments(limit = 10) {
  const pages = await queryAll(TRPG_DATA_SOURCES.判定紀錄表, undefined, [
    { timestamp: "created_time", direction: "descending" },
  ]);
  return pages.slice(0, limit).map(mapJudgment);
}
