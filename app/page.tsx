"use client";

import { useEffect, useMemo, useState } from "react";

type CalendarItem = {
  type: "明細" | "場次";
  id: string;
  日期: string | null;
  標題: string;
  項目用途?: string | null;
  當場主題?: string;
  狀態: string | null;
  是實驗?: boolean;
};

type DashboardData = {
  yearMonth: string;
  calendar: CalendarItem[];
  completion: { total: number; byStatus: Record<string, number> };
  today: string;
  todayTasks: CalendarItem[];
};

const STATUS_ORDER = ["已抽牌", "已指定用途", "解讀中", "已產出", "已交付"];

function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function DashboardPage() {
  const [yearMonth, setYearMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/api/dashboard?month=${yearMonth}`);
        if (!r.ok) throw new Error(`載入失敗(${r.status})`);
        const json = await r.json();
        if (!cancelled) setData(json);
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
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  const donePct = data && data.completion.total > 0
    ? Math.round(((data.completion.byStatus["已交付"] ?? 0) / data.completion.total) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="flex items-center justify-between mb-2">
          <button
            className="px-3 py-1 rounded border border-black/15 dark:border-white/20 text-sm"
            onClick={() => setYearMonth((m) => shiftMonth(m, -1))}
          >
            ← 上月
          </button>
          <h1 className="text-lg font-semibold">{yearMonth}</h1>
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
          <h2 className="font-medium mb-3">完成度儀表(本月建立的 Session,共 {data.completion.total} 筆)</h2>
          <div className="w-full h-3 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden mb-3">
            <div className="h-full bg-green-600" style={{ width: `${donePct}%` }} />
          </div>
          <div className="grid grid-cols-5 gap-2 text-xs text-center">
            {STATUS_ORDER.map((s) => (
              <div key={s}>
                <div className="font-semibold">{data.completion.byStatus[s] ?? 0}</div>
                <div className="text-zinc-500">{s}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {data && (
        <section className="border border-black/10 dark:border-white/15 rounded-lg p-4">
          <h2 className="font-medium mb-3">今日待辦({data.today})</h2>
          {data.todayTasks.length === 0 && <p className="text-sm text-zinc-500">今天沒有到期任務。</p>}
          <ul className="flex flex-col gap-2">
            {data.todayTasks.map((t) => (
              <TaskRow key={t.id} item={t} />
            ))}
          </ul>
        </section>
      )}

      {data && (
        <section className="border border-black/10 dark:border-white/15 rounded-lg p-4">
          <h2 className="font-medium mb-3">行事曆(依日期排列)</h2>
          {byDay.length === 0 && <p className="text-sm text-zinc-500">本月尚無任務節點。</p>}
          <div className="flex flex-col gap-4">
            {byDay.map(([day, items]) => (
              <div key={day}>
                <div className="text-sm font-semibold mb-1">{day}</div>
                <ul className="flex flex-col gap-1">
                  {items.map((t) => (
                    <TaskRow key={t.id} item={t} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TaskRow({ item }: { item: CalendarItem }) {
  return (
    <li className="flex items-center gap-2 text-sm border border-black/5 dark:border-white/10 rounded px-3 py-2">
      <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">{item.type}</span>
      <span className="flex-1">{item.標題}</span>
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
