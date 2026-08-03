import { NextRequest, NextResponse } from "next/server";
import { listPlurkTemplates } from "@/lib/notion/queries";
import { createKnowledgeEntry } from "@/lib/notion/mutations";
import { encodePlurkContent, decodePlurkContent, plurkTemplateTitle, plurkTemplateNameFromTitle } from "@/lib/plurk/notionFormat";
import type { PlurkTemplate } from "@/lib/plurk/logic";

// Notion 是唯一真相來源,寫入/刪除可能發生在 App 之外(擁有者直接在 Notion
// 操作),讀取一律即時查詢,不吃 Next.js 的 Route Handler 快取,避免顯示已經
// 在 Notion 端變動過的舊資料。
export const dynamic = "force-dynamic";
// 噗浪・蓋樓台「範本」存 DB-14(2026-08-02 擁有者裁決),標題前綴「噗浪範本-」,
// 內容欄序列化 method+主噗+各樓。
export async function GET() {
  const pages = await listPlurkTemplates();
  const templates: PlurkTemplate[] = pages.map((p) => {
    const { meta, main, floors } = decodePlurkContent(p.內容);
    return { id: p.id, method: meta.method, name: plurkTemplateNameFromTitle(p.標題), main, floors };
  });
  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, method, main, floors } = body as { name: string; method: string; main: string; floors: string[] };
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "缺少必要參數:name" }, { status: 400 });
  }
  const content = encodePlurkContent({ method: method ?? "" }, main ?? "", floors ?? []);
  const { id } = await createKnowledgeEntry({ 標題: plurkTemplateTitle(name), 內容: content });
  return NextResponse.json({ id });
}
