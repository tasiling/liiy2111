// 收光在 DB-14 知識庫的序列化格式(《收光三選項與居所接續 — 資料邏輯規格
// v1.0》,2026-08-03 擁有者裁決:零新增欄位,沿用主站現行 DojoEntry 的欄位
// 語意——space/kind/title/note/date——只是把它序列化存進 DB-14 既有的「內容」
// 欄位。標題用「收光紀錄-YYYYMMDD」前綴,一天一筆,寫入時若當日已有紀錄則
// 覆蓋,不累積多筆,比照噗浪・蓋樓台先例。
//
// 「帶回明天」的接續判斷不需要 carryToDate 欄位(原委派書提案已作廢):直接用
// 「昨天的收光紀錄」+「title === 帶回明天」判斷,見 findClosingRecord() 呼叫端。
import { CLOSING_TITLE_PREFIX } from "@/lib/notion/schema";

export type ClosingChoiceTitle = "帶回明天" | "暫且放下" | "直接收光";

export const CLOSING_CHOICE_TITLE: Record<"carry" | "pause" | "close", ClosingChoiceTitle> = {
  carry: "帶回明天",
  pause: "暫且放下",
  close: "直接收光",
};

export type ClosingContent = {
  space: "closing";
  kind: "收光";
  title: ClosingChoiceTitle;
  note?: string;
  date: string; // YYYY-MM-DD,當日
};

export function closingRecordTitle(dateISO: string): string {
  return `${CLOSING_TITLE_PREFIX}${dateISO.replace(/-/g, "")}`;
}

export function encodeClosingContent(content: ClosingContent): string {
  return JSON.stringify(content);
}

// 內容毀損(例如被人手動編輯壞掉)時容錯退回 null,不擋讀取——比照噗浪蓋樓台
// 既有的防禦性 fallback 慣例。
export function decodeClosingContent(raw: string): ClosingContent | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.kind === "收光" && typeof parsed.title === "string") {
      return parsed as ClosingContent;
    }
    return null;
  } catch {
    return null;
  }
}
