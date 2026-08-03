import { NextRequest, NextResponse } from "next/server";
import { updateKnowledgeEntry, archiveKnowledgeEntry } from "@/lib/notion/mutations";
import { encodePlurkContent, plurkTemplateTitle } from "@/lib/plurk/notionFormat";

// Notion 是唯一真相來源,寫入/刪除可能發生在 App 之外(擁有者直接在 Notion
// 操作),讀取一律即時查詢,不吃 Next.js 的 Route Handler 快取,避免顯示已經
// 在 Notion 端變動過的舊資料。
export const dynamic = "force-dynamic";
// 整筆覆寫(呼叫端永遠持有完整範本物件),不做部分欄位合併,避免要先讀再寫。
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/plurk/templates/[id]">) {
  const { id } = await ctx.params;
  const body = await req.json();
  const { name, method, main, floors } = body as { name: string; method: string; main: string; floors: string[] };
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "缺少必要參數:name" }, { status: 400 });
  }
  const content = encodePlurkContent({ method: method ?? "" }, main ?? "", floors ?? []);
  await updateKnowledgeEntry(id, { 標題: plurkTemplateTitle(name), 內容: content });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/plurk/templates/[id]">) {
  const { id } = await ctx.params;
  await archiveKnowledgeEntry(id);
  return NextResponse.json({ ok: true });
}
