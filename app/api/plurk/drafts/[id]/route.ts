import { NextRequest, NextResponse } from "next/server";
import { updateKnowledgeEntry, archiveKnowledgeEntry } from "@/lib/notion/mutations";
import { encodePlurkContent, plurkDraftTitle } from "@/lib/plurk/notionFormat";
import { deriveTitle, type PlurkDraft } from "@/lib/plurk/logic";

// 整筆覆寫(呼叫端永遠持有完整草稿物件),不做部分欄位合併,避免要先讀再寫。
// createdAt 由呼叫端原樣回傳(建立時的日期,標題後綴不隨內容編輯而變動),
// 標題的「顯示標題」部分則每次都用當下的主噗內容重新推導,讓 Notion 裡的標題
// 能反映最新內容,方便擁有者瀏覽。
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/plurk/drafts/[id]">) {
  const { id } = await ctx.params;
  const body = await req.json();
  const { method, tplName, main, floors, at, status, createdAt } = body as {
    method: string;
    tplName: string;
    main: string;
    floors: string[];
    at: string;
    status: PlurkDraft["status"];
    createdAt: string;
  };
  const displayTitle = deriveTitle({ main: main ?? "" });
  const content = encodePlurkContent(
    { method: method ?? "", tplName: tplName ?? "", at: at ?? "", status: status ?? "draft", createdAt },
    main ?? "",
    floors ?? []
  );
  await updateKnowledgeEntry(id, { 標題: plurkDraftTitle(displayTitle, createdAt), 內容: content });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/plurk/drafts/[id]">) {
  const { id } = await ctx.params;
  await archiveKnowledgeEntry(id);
  return NextResponse.json({ ok: true });
}
