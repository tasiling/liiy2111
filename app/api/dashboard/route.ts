import { NextRequest, NextResponse } from "next/server";
import {
  listDetailsInRange,
  listSlotsInRange,
  listSessionsCreatedBetween,
  getSession,
} from "@/lib/notion/queries";
import { SESSION_STATUS_ORDER } from "@/lib/notion/schema";

function monthRange(yearMonth: string): { start: string; end: string } {
  const [y, m] = yearMonth.split("-").map(Number);
  const start = `${yearMonth}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

// P1 主控台首頁資料:行事曆(明細+場次)、完成度儀表(依 DB-03 狀態機)、今日待辦。
export async function GET(req: NextRequest) {
  const yearMonth = req.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const { start, end } = monthRange(yearMonth);
  const today = new Date().toISOString().slice(0, 10);

  const [details, slots, sessionsThisMonth] = await Promise.all([
    listDetailsInRange(start, end),
    listSlotsInRange(start, end),
    listSessionsCreatedBetween(start, end),
  ]);

  // 明細需回頭查所屬 Session 的狀態/項目用途,才能在行事曆標示「實驗」等視覺標記。
  const uniqueSessionIds = Array.from(
    new Set(details.map((d) => d.所屬Session).filter((id): id is string => !!id))
  );
  const sessionMap = new Map<string, Awaited<ReturnType<typeof getSession>>>();
  for (const id of uniqueSessionIds) {
    sessionMap.set(id, await getSession(id));
  }

  const calendarFromDetails = details.map((d) => {
    const session = d.所屬Session ? sessionMap.get(d.所屬Session) : undefined;
    return {
      type: "明細" as const,
      id: d.id,
      日期: d.對應日期,
      標題: d.明細編號,
      項目用途: session?.項目用途 ?? null,
      狀態: session?.狀態 ?? null,
      是實驗: session?.項目用途 === "實驗",
    };
  });

  const calendarFromSlots = slots.map((s) => ({
    type: "場次" as const,
    id: s.id,
    日期: s.日期,
    標題: s.場次編號,
    當場主題: s.當場主題,
    狀態: s.狀態,
  }));

  const completion: Record<string, number> = Object.fromEntries(
    SESSION_STATUS_ORDER.map((s) => [s, 0])
  );
  for (const s of sessionsThisMonth) {
    if (s.狀態 && s.狀態 in completion) completion[s.狀態]++;
  }
  const total = sessionsThisMonth.length;

  const todayTasks = [
    ...calendarFromDetails.filter((t) => t.日期 === today),
    ...calendarFromSlots.filter((t) => t.日期 === today),
  ];

  return NextResponse.json({
    yearMonth,
    calendar: [...calendarFromDetails, ...calendarFromSlots],
    completion: { total, byStatus: completion },
    today,
    todayTasks,
  });
}
