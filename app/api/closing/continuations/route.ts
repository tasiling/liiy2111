import { NextResponse } from "next/server";
import { findKnowledgeEntryByTitle, listPendingDetails } from "@/lib/notion/queries";
import { normalizeDetailStatus } from "@/lib/notion/schema";
import { addDays, toISODate } from "@/lib/date";
import { closingRecordTitle, decodeClosingContent } from "@/lib/closing/notionFormat";

// Notion 是唯一真相來源,讀取一律即時查詢,不吃 Route Handler 快取。
export const dynamic = "force-dynamic";

type ContinuationCard =
  | { source: "carry"; text: string }
  | { source: "b1"; text: string; detailId: string; sessionId: string | null };

const MAX_CARDS = 3;

function fmtMD(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

// 居所「回到哪裡」區塊(《收光三選項與居所接續 — 資料邏輯規格 v1.0》§二):
// 兩個來源依序取用,最多 3 張——Source A(使用者主動帶回)優先,Source B1
// (日上三更待產出)補滿剩餘名額。B2(織光堂)/B3(野採)兩個場域目前沒有任何
// 持久化資料模型可以掛,擁有者裁決本輪跳過,留到那兩個場域真正動工那一輪
// 再處理(不是遺漏,是明確裁決的範圍縮減)。
//
// 硬性限制(§2.2):最多 3 張,不足時不補空位;卡片文字中性,不使用催促語氣、
// 不顯示總數或逾期天數——呼叫端(app/page.tsx)在零張時要把整區隱藏,不顯示
// 空狀態文字。
export async function GET() {
  const todayISO = new Date().toISOString().slice(0, 10);
  const yesterdayISO = toISODate(addDays(new Date(todayISO), -1));

  const cards: ContinuationCard[] = [];

  // Source A:昨天的收光紀錄若是「帶回明天」,今天就接住——不需要 carryToDate
  // 欄位,直接用「昨天那一筆」+「title === 帶回明天」判斷(委派書追加裁決:
  // 原提案的 carryToDate 已作廢)。
  const yesterdayRecord = await findKnowledgeEntryByTitle(closingRecordTitle(yesterdayISO));
  if (yesterdayRecord) {
    const content = decodeClosingContent(yesterdayRecord.內容);
    if (content?.title === "帶回明天") {
      cards.push({ source: "carry", text: content.note?.trim() || "昨天你想把這件事帶到今天" });
    }
  }

  // Source B1:日上三更待產出,對應日期 <= 今天,依日期升冪補滿剩餘名額
  // (規格 §2.1:「B1 是最重要的一項……若 B1 有多筆,取日期最早的」)。
  if (cards.length < MAX_CARDS) {
    const pending = (await listPendingDetails())
      .filter((d) => normalizeDetailStatus(d.明細狀態) === "待產出" && d.對應日期 && d.對應日期 <= todayISO)
      .sort((a, b) => (a.對應日期 as string).localeCompare(b.對應日期 as string));
    for (const d of pending) {
      if (cards.length >= MAX_CARDS) break;
      const date = d.對應日期 as string;
      const text = d.更次 ? `${fmtMD(date)} 的 ${d.更次} 還沒發` : `${fmtMD(date)} 有一篇還沒發`;
      cards.push({ source: "b1", text, detailId: d.id, sessionId: d.所屬Session });
    }
  }

  return NextResponse.json({ cards });
}
