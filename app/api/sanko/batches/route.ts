import { NextRequest, NextResponse } from "next/server";
import { listSankoBatchDetails } from "@/lib/notion/queries";
import { createSession, createSankoBatchDetail } from "@/lib/notion/mutations";
import { runBatch } from "@/lib/notion/client";
import { addDays, toISODate } from "@/lib/date";
import { SANKO_UPDATE_TYPES } from "@/lib/notion/schema";

// 日上三更・批次建立與產出清單(委派書 v1.0)。
// GET:回傳所有「更次」有值的明細(不限狀態),前端依「所屬 Session」分組還原
// 成一批一批,再依對應日期展開成日期卡——不在這裡做分組,分組是純展示邏輯。
export async function GET() {
  const details = await listSankoBatchDetails();
  return NextResponse.json({ details });
}

// POST:一次建立 N 天 × 3 筆(晨光/日光/夜光)明細,維持「一個 Session 涵蓋整個
// 日期範圍」的既有資料形狀——序號 1..N*3 正常遞增,更次由獨立欄位承載,不必為了
// 配合編號規則把一次批次動作拆成多筆 Session(委派書 §五裁決:方案 B)。
// 項目用途=日更(既有選項,無需新增):比照既有批次 Session 語意分類。
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { startDate, days } = body as { startDate: string; days: number };

  if (!startDate || !days || days < 1) {
    return NextResponse.json({ error: "缺少必要參數:startDate、days" }, { status: 400 });
  }

  const todayISO = new Date().toISOString().slice(0, 10);
  const session = await createSession({ dateISO: todayISO, 項目用途: "日更", 模式: "批次" });

  const dates = Array.from({ length: days }, (_, i) => toISODate(addDays(new Date(startDate), i)));
  const jobs = dates.flatMap((date, dayIdx) =>
    SANKO_UPDATE_TYPES.map((更次, slotIdx) => ({
      date,
      更次,
      序: dayIdx * SANKO_UPDATE_TYPES.length + slotIdx + 1,
    }))
  );

  const result = await runBatch(jobs, ({ date, 更次, 序 }) =>
    createSankoBatchDetail({ sessionId: session.id, sessionCode: session.code, 對應日期: date, 序, 更次 })
  );

  return NextResponse.json({
    sessionId: session.id,
    sessionCode: session.code,
    succeeded: result.succeeded,
    failed: result.failed,
  });
}
