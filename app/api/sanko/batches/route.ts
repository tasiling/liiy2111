import { NextRequest, NextResponse } from "next/server";
import { listSankoBatchDetails, listDetailsForSession } from "@/lib/notion/queries";
import { createSession, createSankoBatchDetail, archiveDetail } from "@/lib/notion/mutations";
import { runBatch } from "@/lib/notion/client";
import { addDays, toISODate } from "@/lib/date";
import { SANKO_UPDATE_TYPES, normalizeDetailStatus } from "@/lib/notion/schema";

// Notion 是唯一真相來源,寫入/刪除可能發生在 App 之外(擁有者直接在 Notion
// 操作),讀取一律即時查詢,不吃 Next.js 的 Route Handler 快取,避免顯示已經
// 在 Notion 端變動過的舊資料。
export const dynamic = "force-dynamic";
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

  // 修正委派書 v1.0 一之 4:預覽與寫入結果必須一致——回傳「實際成功寫入」的
  // 日期範圍與筆數,而不是直接照抄請求參數(days/startDate)回填。兩者在全部
  // 成功時會相同,但只要有任何一筆失敗(如逐筆重試 3 次後仍失敗的暫時性錯誤),
  // 就必須讓呼叫端看得出實際寫入的與預期的不一致,而不是照樣回報「已建立
  // 整批」掩蓋掉部分寫入失敗的事實。
  // jobs 依日期升冪排出,runBatch 的 failed.input 與 jobs 是同一參照,可用來
  // 篩出真正成功的子集合,篩選後仍維持原本的日期升冪順序。
  const failedJobs = new Set(result.failed.map((f) => f.input));
  const actualJobs = jobs.filter((j) => !failedJobs.has(j));

  return NextResponse.json({
    sessionId: session.id,
    sessionCode: session.code,
    succeeded: result.succeeded,
    failed: result.failed,
    expectedCount: jobs.length,
    actualCount: actualJobs.length,
    actualStart: actualJobs.length ? actualJobs[0].date : null,
    actualEnd: actualJobs.length ? actualJobs[actualJobs.length - 1].date : null,
  });
}

// DELETE:整批刪除(?sessionId=xxx)——只刪該 Session 底下明細狀態=待產出的
// 明細,已產出/已交付一律跳過並回報哪幾筆被跳過,不整批擋下(擁有者 2026-08-03
// 追加指示:「整批刪除時若混有已產出的項目,只刪待產出的部分,並明確告知哪
// 幾筆被跳過」)。以伺服器重新查詢的當下狀態為準,不信任前端快取的狀態。
export async function DELETE(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "缺少必要參數:sessionId" }, { status: 400 });
  }

  const details = await listDetailsForSession(sessionId);
  const deletable = details.filter((d) => normalizeDetailStatus(d.明細狀態) === "待產出");
  const skipped = details.filter((d) => normalizeDetailStatus(d.明細狀態) !== "待產出");

  const result = await runBatch(deletable, (d) => archiveDetail(d.id));

  return NextResponse.json({
    deletedCount: result.succeeded.length,
    failed: result.failed,
    skipped: skipped.map((d) => ({
      id: d.id,
      對應日期: d.對應日期,
      更次: d.更次,
      明細狀態: normalizeDetailStatus(d.明細狀態),
    })),
  });
}
