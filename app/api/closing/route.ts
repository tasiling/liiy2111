import { NextRequest, NextResponse } from "next/server";
import { findKnowledgeEntryByTitle } from "@/lib/notion/queries";
import { createKnowledgeEntry, updateKnowledgeEntry } from "@/lib/notion/mutations";
import {
  CLOSING_CHOICE_TITLE,
  closingRecordTitle,
  encodeClosingContent,
  isValidCarryToDate,
  type ClosingContent,
} from "@/lib/closing/notionFormat";

// Notion 是唯一真相來源,讀取一律即時查詢,不吃 Route Handler 快取。
export const dynamic = "force-dynamic";

// 收光三選項(《收光三選項與居所接續》v1.0,行光牌與收光系統・地基實作
// v2.0/補充裁決01 追加 carryToDate):三個選項都只是「今天整體怎麼結束」的
// 一次性動作,不改動任何一筆痕跡的狀態(§0.1)。序列化存進 DB-14 既有的
// 「內容」欄——標題「收光紀錄-YYYYMMDD」一天一筆,若當日已有紀錄則覆蓋
// (擁有者可能改變主意),不累積多筆。
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { choice, note, carryToDate } = body as {
    choice?: "carry" | "pause" | "close";
    note?: string;
    carryToDate?: string;
  };

  const choiceTitle = choice ? CLOSING_CHOICE_TITLE[choice] : undefined;
  if (!choiceTitle) {
    return NextResponse.json({ error: "缺少或不明的必要參數:choice" }, { status: 400 });
  }

  const todayISO = new Date().toISOString().slice(0, 10);

  // carryToDate 僅 carry 時必填,且一律限定「明天起七日內」——不是排程工具,
  // 不接受任意未來日期(地基實作 v2.0 步驟三)。
  if (choice === "carry") {
    if (!carryToDate || !isValidCarryToDate(carryToDate, todayISO)) {
      return NextResponse.json({ error: "carryToDate 必須是明天起七日內的日期" }, { status: 400 });
    }
  }

  const content: ClosingContent = {
    space: "closing",
    kind: "收光",
    title: choiceTitle,
    // note 只有「帶回」才可能有值,規格明訂可留空——空字串一律存成 undefined,
    // 不要讓「使用者沒寫」跟「使用者寫了空白」在資料上難以分辨。
    note: choice === "carry" ? note?.trim() || undefined : undefined,
    date: todayISO,
    privacy: "私人",
    sourceType: "rest",
    traceLevel: "daily",
    traceStatus: "一般",
    viewCount: 0,
    carryToDate: choice === "carry" ? carryToDate : undefined,
    // 尚未標記已處理——只有「標記已處理」按鈕按下才會寫入實際時間戳
    // (地基實作 v2.0 §一之3 裁決:不採用「打開就算」)。
    carryResolvedAt: choice === "carry" ? null : undefined,
  };

  const notionTitle = closingRecordTitle(todayISO);
  const existing = await findKnowledgeEntryByTitle(notionTitle);
  if (existing) {
    await updateKnowledgeEntry(existing.id, { 內容: encodeClosingContent(content) });
  } else {
    await createKnowledgeEntry({ 標題: notionTitle, 內容: encodeClosingContent(content) });
  }

  return NextResponse.json({ ok: true });
}
