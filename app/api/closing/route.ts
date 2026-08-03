import { NextRequest, NextResponse } from "next/server";
import { findKnowledgeEntryByTitle } from "@/lib/notion/queries";
import { createKnowledgeEntry, updateKnowledgeEntry } from "@/lib/notion/mutations";
import {
  CLOSING_CHOICE_TITLE,
  closingRecordTitle,
  encodeClosingContent,
  type ClosingContent,
} from "@/lib/closing/notionFormat";

// Notion 是唯一真相來源,讀取一律即時查詢,不吃 Route Handler 快取。
export const dynamic = "force-dynamic";

// 收光三選項(《收光三選項與居所接續 — 資料邏輯規格 v1.0》):三個選項都只是
// 「今天整體怎麼結束」的一次性動作,不改動任何一筆痕跡的狀態(§0.1)。零新增
// 欄位,沿用 DojoEntry 的 space/kind/title/note/date 語意,序列化存進 DB-14
// 既有的「內容」欄——標題「收光紀錄-YYYYMMDD」一天一筆,若當日已有紀錄則
// 覆蓋(擁有者可能改變主意),不累積多筆(§四)。
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { choice, note } = body as { choice?: "carry" | "pause" | "close"; note?: string };

  const choiceTitle = choice ? CLOSING_CHOICE_TITLE[choice] : undefined;
  if (!choiceTitle) {
    return NextResponse.json({ error: "缺少或不明的必要參數:choice" }, { status: 400 });
  }

  const todayISO = new Date().toISOString().slice(0, 10);
  const content: ClosingContent = {
    space: "closing",
    kind: "收光",
    title: choiceTitle,
    // note 只有「帶回明天」才可能有值,規格明訂可留空——空字串一律存成 undefined,
    // 不要讓「使用者沒寫」跟「使用者寫了空白」在資料上難以分辨。
    note: choice === "carry" ? note?.trim() || undefined : undefined,
    date: todayISO,
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
