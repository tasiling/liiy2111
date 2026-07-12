import { NextRequest, NextResponse } from "next/server";
import { updateSessionOutputLink } from "@/lib/notion/mutations";

// P5 表頭「產出連結」的檢視與編輯(擁有者追加指示,支援手動補登記流程)。
// 不牽動狀態機,允許清空(url 傳空字串代表撤銷)。
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/sessions/[id]/output-link">) {
  const { id } = await ctx.params;
  const body = await req.json();
  const { url } = body as { url: string };
  await updateSessionOutputLink(id, url ?? "");
  return NextResponse.json({ ok: true });
}
