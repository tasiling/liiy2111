import { NextRequest, NextResponse } from "next/server";
import { createSession, createDetail } from "@/lib/notion/mutations";

// P5:單筆建立 Session + 1 筆明細。
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { 項目用途, date } = body as { 項目用途: string; date: string };

  if (!項目用途 || !date) {
    return NextResponse.json({ error: "缺少必要參數:項目用途、date" }, { status: 400 });
  }

  const session = await createSession({ dateISO: date, 項目用途, 模式: "單筆" });
  const detail = await createDetail({
    sessionId: session.id,
    sessionCode: session.code,
    對應日期: date,
    序: 1,
  });

  return NextResponse.json({ sessionId: session.id, sessionCode: session.code, detail });
}
