"use client";

// 居所底下的「看整月」子頁(擁有者裁決 2026-08-01):行事曆與完成度儀表是數字儀表,
// 居所首頁明令禁止顯示這類內容,所以獨立成子頁,想看才點進來。今日待辦邏輯已移到
// 居所首頁本身,這裡不再重複顯示。

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { pageLabel } from "@/lib/labels";

type CalendarItem = {
  type: "明細" | "場次";
  id: string;
  日期: string | null;
  標題: string;
  更次?: string | null;
  項目用途?: string | null;
  當場主題?: string;
  狀態: string | null;
  是實驗?: boolean;
  所屬Session?: string | null;
};

type DashboardData = {
  yearMonth: string;
  calendar: CalendarItem[];
  completion: {
    total: number;
    done: number;
    single: { total: number; byStatus: Record<string, number> };
    batch: { total: number; byStatus: Record<string, number> };
  };
  today: string;
  todayTasks: CalendarItem[];
};

const STATUS_ORDER = ["已抽牌", "已指定用途", "解讀中", "已產出", "已交付"];
const DETAIL_STATUS_ORDER = ["待產出", "已產出", "已交付"];
const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 月曆網格:含前後月補位日,湊滿整週,週日為每列第一天。
function buildMonthGrid(yearMonth: string): { date: Date; iso: string; inMonth: boolean }[][] {
  const [y, m] = yearMonth.split("-").map(Number);
  const firstOfMonth = new Date(y, m - 1, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const gridStart = new Date(y, m - 1, 1 - startWeekday);
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return { date: d, iso: isoOf(d), inMonth: d.getMonth() === m - 1 && d.getFullYear() === y };
  });

  const weeks: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export default function DashboardPage() {
  const [yearMonth, setYearMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/api/dashboard?month=${yearMonth}`);
        if (!r.ok) throw new Error(`載入失敗(${r.status})`);
        const json = await r.json();
        if (!cancelled) {
          setData(json);
          setSelectedDay(json.calendar.some((c: CalendarItem) => c.日期 === json.today) ? json.today : null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [yearMonth]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of data?.calendar ?? []) {
      if (!item.日期) continue;
      const arr = map.get(item.日期) ?? [];
      arr.push(item);
      map.set(item.日期, arr);
    }
    return map;
  }, [data]);

  const weeks = useMemo(() => buildMonthGrid(yearMonth), [yearMonth]);

  const donePct = data && data.completion.total > 0
    ? Math.round((data.completion.done / data.completion.total) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{pageLabel("P1")}</h1>
        <Link href="/" className="text-sm underline text-zinc-500">
          ← 回居所
        </Link>
      </div>
      <section>
        <div className="flex items-center justify-between mb-2">
          <button
            className="px-3 py-1 rounded border border-black/15 dark:border-white/20 text-sm"
            onClick={() => setYearMonth((m) => shiftMonth(m, -1))}
          >
            ← 上月
          </button>
          <h2 className="text-lg font-semibold">{yearMonth}</h2>
          <button
            className="px-3 py-1 rounded border border-black/15 dark:border-white/20 text-sm"
            onClick={() => setYearMonth((m) => shiftMonth(m, 1))}
          >
            下月 →
          </button>
        </div>
        {loading && <p className="text-sm text-zinc-500">載入中…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </section>

      {data && (
        <section className="border border-black/10 dark:border-white/15 rounded-lg p-4">
          <h2 className="font-medium mb-3">
            完成度儀表(本月共 {data.completion.total} 項,已交付 {data.completion.done} 項)
          </h2>
          <div className="w-full h-3 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden mb-4">
            <div className="h-full bg-green-600" style={{ width: `${donePct}%` }} />
          </div>

          <h3 className="text-xs font-medium text-zinc-500 mb-2">
            單筆 Session(依 DB-03 狀態機,共 {data.completion.single.total} 筆)
          </h3>
          {/* 這個頁面掛在 .dojo 殼層底下,Tailwind 的 .grid 工具類別會被 dojo.css
              的 `.dojo .grid`(場域選單用的固定 2 欄版型)蓋掉 grid-template-columns
              ——兩者類別名稱字面相同但語意無關,選擇器特異度 .dojo .grid 又比
              Tailwind 的 .grid/.grid-cols-N 高,一定會贏。這裡改用 inline style
              直接指定欄數,不吃到那條規則。 */}
          <div
            className="gap-2 text-xs text-center mb-4"
            style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)" }}
          >
            {STATUS_ORDER.map((s) => (
              <div key={s}>
                <div className="font-semibold">{data.completion.single.byStatus[s] ?? 0}</div>
                <div className="text-zinc-500">{s}</div>
              </div>
            ))}
          </div>

          <h3 className="text-xs font-medium text-zinc-500 mb-2">
            批次 Session 明細(依 DB-04 明細狀態,共 {data.completion.batch.total} 筆)
          </h3>
          <div
            className="gap-2 text-xs text-center"
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}
          >
            {DETAIL_STATUS_ORDER.map((s) => (
              <div key={s}>
                <div className="font-semibold">{data.completion.batch.byStatus[s] ?? 0}</div>
                <div className="text-zinc-500">{s}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {data && (
        <section className="border border-black/10 dark:border-white/15 rounded-lg p-4">
          <h2 className="font-medium mb-3">行事曆</h2>
          {/* 修正委派書 v1.0 二:同樣的 .dojo .grid 類別碰撞問題(見上方完成度
              儀表的註解),星期標頭與每週日期格都改用 inline style 明確指定
              repeat(7, 1fr),不依賴 Tailwind 的 .grid 工具類別。 */}
          <div
            className="gap-1 text-center text-xs text-zinc-500 mb-1"
            style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}
          >
            {WEEKDAY_LABELS.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="gap-1" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                {week.map((cell) => {
                  const items = byDay.get(cell.iso) ?? [];
                  const isToday = cell.iso === data.today;
                  const isSelected = cell.iso === selectedDay;
                  return (
                    <div
                      key={cell.iso}
                      onClick={() => setSelectedDay(cell.iso)}
                      className={[
                        "min-h-16 sm:min-h-20 rounded border p-1 text-left align-top flex flex-col gap-0.5 cursor-pointer",
                        cell.inMonth
                          ? "border-black/10 dark:border-white/15"
                          : "border-transparent opacity-35",
                        isSelected ? "ring-2 ring-blue-500" : "",
                        isToday ? "bg-blue-50 dark:bg-blue-950" : "",
                      ].join(" ")}
                    >
                      <span className={`text-xs ${isToday ? "font-bold text-blue-700 dark:text-blue-300" : ""}`}>
                        {cell.date.getDate()}
                      </span>
                      {/* 同日多筆任務全數堆疊顯示,不截斷——實測情境為每日 2–3 筆。
                          有「更次」值的明細屬於日上三更批次系統,點擊跳轉到 /sanko
                          清單裡該筆的位置;其餘(單筆明細/場次)維持跳轉 /sessions。 */}
                      {items.map((it) =>
                        it.更次 ? (
                          <Link
                            key={it.id}
                            href={`/sanko?detailId=${it.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] leading-tight truncate rounded bg-zinc-100 dark:bg-zinc-800 px-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 underline decoration-dotted"
                          >
                            {it.標題}
                          </Link>
                        ) : it.所屬Session ? (
                          <Link
                            key={it.id}
                            href={`/sessions?sessionId=${it.所屬Session}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] leading-tight truncate rounded bg-zinc-100 dark:bg-zinc-800 px-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 underline decoration-dotted"
                          >
                            {it.標題}
                          </Link>
                        ) : (
                          <span
                            key={it.id}
                            className="text-[10px] leading-tight truncate rounded bg-zinc-100 dark:bg-zinc-800 px-1"
                          >
                            {it.標題}
                          </span>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {selectedDay && (
            <div className="mt-4 border-t border-black/10 dark:border-white/15 pt-3">
              <h3 className="text-sm font-semibold mb-2">{selectedDay}</h3>
              {(byDay.get(selectedDay) ?? []).length === 0 && (
                <p className="text-sm text-zinc-500">這天沒有任務節點。</p>
              )}
              <ul className="flex flex-col gap-1">
                {(byDay.get(selectedDay) ?? []).map((t) => (
                  <TaskRow key={t.id} item={t} />
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function TaskRow({ item }: { item: CalendarItem }) {
  return (
    <li className="flex items-center gap-2 text-sm border border-black/5 dark:border-white/10 rounded px-3 py-2">
      <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">{item.type}</span>
      {item.所屬Session ? (
        <Link href={`/sessions?sessionId=${item.所屬Session}`} className="flex-1 underline decoration-dotted">
          {item.標題}
        </Link>
      ) : (
        <span className="flex-1">{item.標題}</span>
      )}
      {item.項目用途 && <span className="text-xs text-zinc-500">{item.項目用途}</span>}
      {item.當場主題 && <span className="text-xs text-zinc-500">{item.當場主題}</span>}
      {item.狀態 && <span className="text-xs text-zinc-500">{item.狀態}</span>}
      {item.是實驗 && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-200 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-200">
          實驗
        </span>
      )}
    </li>
  );
}
