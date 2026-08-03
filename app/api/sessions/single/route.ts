import { NextRequest, NextResponse } from "next/server";
import { createSession, createDetail } from "@/lib/notion/mutations";

// Notion 是唯一真相來源,寫入/刪除可能發生在 App 之外(擁有者直接在 Notion
// 操作),讀取一律即時查詢,不吃 Next.js 的 Route Handler 快取,避免顯示已經
// 在 Notion 端變動過的舊資料。
export const dynamic = "force-dynamic";
// P5:單筆建立 Session + 1 筆明細。
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { 項目用途, date } = body as { 項目用途: string; date: string };

  if (!項目用途 || !date) {
    return NextResponse.json({ error: "缺少必要參數:項目用途、date" }, { status: 400 });
  }

  // 「建立日期」= 這筆 Session 記錄實際被建立的那天(伺服器當下),與內容日期脫鉤,
  // 理由同批次建立路由(見該檔案註解)。
  const todayISO = new Date().toISOString().slice(0, 10);
  const session = await createSession({ dateISO: todayISO, 項目用途, 模式: "單筆" });
  const detail = await createDetail({
    sessionId: session.id,
    sessionCode: session.code,
    對應日期: date,
    序: 1,
  });

  return NextResponse.json({ sessionId: session.id, sessionCode: session.code, detail });
}
