import { NextRequest, NextResponse } from "next/server";
import { updateKnowledgeEntry, archiveKnowledgeEntry } from "@/lib/notion/mutations";
import { encodePlurkContent, plurkTemplateTitle } from "@/lib/plurk/notionFormat";

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
