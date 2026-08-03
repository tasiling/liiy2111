import { NextResponse } from "next/server";
import { getSession } from "@/lib/notion/queries";

// Notion 是唯一真相來源,寫入/刪除可能發生在 App 之外(擁有者直接在 Notion
// 操作),讀取一律即時查詢,不吃 Next.js 的 Route Handler 快取,避免顯示已經
// 在 Notion 端變動過的舊資料。
export const dynamic = "force-dynamic";
// 單筆 Session 表頭查詢——供行事曆任務點擊跳轉時,若該 Session 不在近期 60 天清單快取內,
// 仍能取得表頭資料(如「產出連結」)。
export async function GET(_req: Request, ctx: RouteContext<"/api/sessions/[id]">) {
  const { id } = await ctx.params;
  const session = await getSession(id);
  return NextResponse.json({ session });
}
