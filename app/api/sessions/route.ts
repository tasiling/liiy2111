import { NextRequest, NextResponse } from "next/server";
import { listSessionsCreatedBetween } from "@/lib/notion/queries";

// P5 列表:近期建立的 Session,供工作站顯示與狀態推進操作。
export async function GET(req: NextRequest) {
  const days = Number(req.nextUrl.searchParams.get("days") ?? "60");
  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const sessions = await listSessionsCreatedBetween(start, end);
  return NextResponse.json({ sessions });
}
