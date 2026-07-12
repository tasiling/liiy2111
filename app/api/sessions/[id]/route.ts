import { NextResponse } from "next/server";
import { getSession } from "@/lib/notion/queries";

// 單筆 Session 表頭查詢——供行事曆任務點擊跳轉時,若該 Session 不在近期 60 天清單快取內,
// 仍能取得表頭資料(如「產出連結」)。
export async function GET(_req: Request, ctx: RouteContext<"/api/sessions/[id]">) {
  const { id } = await ctx.params;
  const session = await getSession(id);
  return NextResponse.json({ session });
}
