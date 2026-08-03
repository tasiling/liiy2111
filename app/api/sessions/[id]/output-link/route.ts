import { NextRequest, NextResponse } from "next/server";
import { updateSessionOutputLink } from "@/lib/notion/mutations";

// Notion 是唯一真相來源,寫入/刪除可能發生在 App 之外(擁有者直接在 Notion
// 操作),讀取一律即時查詢,不吃 Next.js 的 Route Handler 快取,避免顯示已經
// 在 Notion 端變動過的舊資料。
export const dynamic = "force-dynamic";
// P5 表頭「產出連結」的檢視與編輯(擁有者追加指示,支援手動補登記流程)。
// 不牽動狀態機,允許清空(url 傳空字串代表撤銷)。
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/sessions/[id]/output-link">) {
  const { id } = await ctx.params;
  const body = await req.json();
  const { url } = body as { url: string };
  await updateSessionOutputLink(id, url ?? "");
  return NextResponse.json({ ok: true });
}
