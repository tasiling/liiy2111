import { NextResponse } from "next/server";
import { listApprovedKnowledgeEntries } from "@/lib/notion/queries";
import { parseServiceDivinationContent } from "@/lib/generate/serviceDivination";

// Notion 是唯一真相來源,寫入/刪除可能發生在 App 之外(擁有者直接在 Notion
// 操作),讀取一律即時查詢,不吃 Next.js 的 Route Handler 快取,避免顯示已經
// 在 Notion 端變動過的舊資料。
export const dynamic = "force-dynamic";
// P8-0(委派書 v1.6):服務導流占卜配對表候選清單(僅心理測驗類任務使用)。
// 只列清單供擁有者點選,不做任何維度/方法自動配對(委派書禁區)。
export async function GET() {
  const entries = await listApprovedKnowledgeEntries();
  const candidates = entries
    .map((e) => parseServiceDivinationContent(e.id, e.標題, e.內容))
    .filter((e) => e !== null);
  return NextResponse.json({ candidates });
}
