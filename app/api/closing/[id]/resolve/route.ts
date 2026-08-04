import { NextRequest, NextResponse } from "next/server";
import { getKnowledgeEntry } from "@/lib/notion/queries";
import { updateKnowledgeEntry } from "@/lib/notion/mutations";
import { decodeClosingContent, encodeClosingContent } from "@/lib/closing/notionFormat";

// Notion 是唯一真相來源,讀取一律即時查詢,不吃 Route Handler 快取。
export const dynamic = "force-dynamic";

// 「標記已處理」(行光牌與收光系統・地基實作 v2.0,補充裁決01 §一之3):
// 「消化」一張帶回卡要有明確動作,不採用「打開就算」——按下這顆按鈕才寫入
// carryResolvedAt,滑到/誤觸/只是想再看一眼都不會被算成處理掉。
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = await getKnowledgeEntry(id);
  const content = decodeClosingContent(entry.內容);
  if (!content || content.title !== "帶回明天" || !content.carryToDate) {
    return NextResponse.json({ error: "這筆不是可標記已處理的帶回紀錄" }, { status: 400 });
  }
  if (content.carryResolvedAt) {
    return NextResponse.json({ error: "這筆已經標記過已處理" }, { status: 409 });
  }
  await updateKnowledgeEntry(id, {
    內容: encodeClosingContent({ ...content, carryResolvedAt: new Date().toISOString() }),
  });
  return NextResponse.json({ ok: true });
}
