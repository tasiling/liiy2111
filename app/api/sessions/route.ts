import { NextRequest, NextResponse } from "next/server";
import { listSessionsCreatedBetween } from "@/lib/notion/queries";

// Notion 是唯一真相來源,寫入/刪除可能發生在 App 之外(擁有者直接在 Notion
// 操作),讀取一律即時查詢,不吃 Next.js 的 Route Handler 快取,避免顯示已經
// 在 Notion 端變動過的舊資料。
export const dynamic = "force-dynamic";
// P5 列表:近期建立的 Session,供工作站顯示與狀態推進操作。
export async function GET(req: NextRequest) {
  const days = Number(req.nextUrl.searchParams.get("days") ?? "60");
  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const sessions = await listSessionsCreatedBetween(start, end);
  return NextResponse.json({ sessions });
}
