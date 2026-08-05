import { NextResponse } from "next/server";
import { registerTraceView } from "@/lib/notion/mutations";

// Notion 是唯一真相來源,讀取一律即時查詢,不吃 Route Handler 快取。
export const dynamic = "force-dynamic";

// 回看(補充裁決04「什麼算動靜」表):居所的痕跡卡片被點開/點擊時呼叫——
// 重新計時 7 天 + 回看次數 +1,累積到門檻自動升級 traceLevel(補充裁決05
// 實作順序第4項)。只有明確的點擊會呼叫這支,單純把卡片撈出來顯示在清單裡
// 不算回看(否則每次載入居所都會誤計數)。
export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await registerTraceView(id);
  return NextResponse.json(result);
}
