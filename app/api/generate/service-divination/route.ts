import { NextResponse } from "next/server";
import { listApprovedKnowledgeEntries } from "@/lib/notion/queries";
import { parseServiceDivinationContent } from "@/lib/generate/serviceDivination";

// P8-0(委派書 v1.6):服務導流占卜配對表候選清單(僅心理測驗類任務使用)。
// 只列清單供擁有者點選,不做任何維度/方法自動配對(委派書禁區)。
export async function GET() {
  const entries = await listApprovedKnowledgeEntries();
  const candidates = entries
    .map((e) => parseServiceDivinationContent(e.id, e.標題, e.內容))
    .filter((e) => e !== null);
  return NextResponse.json({ candidates });
}
