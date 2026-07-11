import { NextRequest, NextResponse } from "next/server";
import { createSession, createDetail } from "@/lib/notion/mutations";
import { runBatch } from "@/lib/notion/client";
import { addDays, toISODate } from "@/lib/date";

// P5:批次建立 Session + N 筆明細(如 14 天大眾占卜批次)。
// 寫入前無「預覽確認」是因為這支路由本身就是使用者按下「建立」後才呼叫;
// 前端頁面在呼叫前應先讓使用者看過將建立的日期清單。
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { 項目用途, startDate, days } = body as {
    項目用途: string;
    startDate: string;
    days: number;
  };

  if (!項目用途 || !startDate || !days || days < 1) {
    return NextResponse.json({ error: "缺少必要參數:項目用途、startDate、days" }, { status: 400 });
  }

  // 「建立日期」= 這筆 Session 記錄實際被建立的那天(伺服器當下),與批次內容的
  // 起始日期脫鉤——內容日期已經獨立記在每筆明細的「對應日期」。startDate 若是未來
  // 日期(如提前規劃下一批),不應該讓「建立日期」也跟著變成未來,否則會跑出「近期
  // Session」清單的查詢區間(上界=今天),使用者重新整理也看不到剛建立的資料。
  const todayISO = new Date().toISOString().slice(0, 10);
  const session = await createSession({ dateISO: todayISO, 項目用途, 模式: "批次" });

  const dates = Array.from({ length: days }, (_, i) => toISODate(addDays(new Date(startDate), i)));
  const result = await runBatch(
    dates.map((d, idx) => ({ date: d, 序: idx + 1 })),
    ({ date, 序 }) =>
      createDetail({ sessionId: session.id, sessionCode: session.code, 對應日期: date, 序 })
  );

  return NextResponse.json({
    sessionId: session.id,
    sessionCode: session.code,
    succeeded: result.succeeded,
    failed: result.failed, // 部分成功時明確列出哪幾筆沒寫入,供手動補
  });
}
