import { NextRequest, NextResponse } from "next/server";
import { listPlurkDrafts } from "@/lib/notion/queries";
import { createKnowledgeEntry } from "@/lib/notion/mutations";
import { encodePlurkContent, decodePlurkContent, plurkDraftTitle } from "@/lib/plurk/notionFormat";
import { deriveTitle, type PlurkDraft } from "@/lib/plurk/logic";

// 噗浪・蓋樓台「草稿」存 DB-14(2026-08-02 擁有者裁決),標題前綴「噗浪草稿-」,
// 內容欄序列化 method/tplName/at/status/createdAt+主噗+各樓。
export async function GET() {
  const pages = await listPlurkDrafts();
  const drafts: PlurkDraft[] = pages.map((p) => {
    const { meta, main, floors } = decodePlurkContent(p.內容);
    return {
      id: p.id,
      method: meta.method,
      tplName: meta.tplName ?? "",
      main,
      floors,
      at: meta.at ?? "",
      status: meta.status ?? "draft",
      createdAt: meta.createdAt ?? "",
    };
  });
  return NextResponse.json({ drafts });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { method, tplName, main, floors, at, status } = body as {
    method: string;
    tplName: string;
    main: string;
    floors: string[];
    at: string;
    status: PlurkDraft["status"];
  };
  const createdAt = new Date().toISOString().slice(0, 10);
  const displayTitle = deriveTitle({ main: main ?? "" });
  const content = encodePlurkContent(
    { method: method ?? "", tplName: tplName ?? "", at: at ?? "", status: status ?? "draft", createdAt },
    main ?? "",
    floors ?? []
  );
  const { id } = await createKnowledgeEntry({ 標題: plurkDraftTitle(displayTitle, createdAt), 內容: content });
  return NextResponse.json({ id, createdAt });
}
