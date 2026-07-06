"use client";

import { useEffect, useState } from "react";

type EventRow = {
  id: string;
  事件類型: string;
  事件型態: "單日" | "多日" | null;
  狀態: string | null;
  宣傳期長度: number | null;
};

type Task = {
  節點編號: string;
  內容類型: string;
  目的: string;
  發布平台: string[];
  日期: string;
  場次序?: number;
  在滾動窗口內: boolean;
};

export default function ExpandPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventId, setEventId] = useState("");
  const [singleDate, setSingleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [commitMsg, setCommitMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []));
  }, []);

  const selectedEvent = events.find((e) => e.id === eventId);

  async function preview() {
    setError(null);
    setCommitMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/expand/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          singleDate: selectedEvent?.事件型態 === "單日" ? singleDate : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "預覽失敗");
      setTasks(data.tasks);
      setSelected(new Set(data.tasks.map((t: Task) => taskKey(t))));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function taskKey(t: Task) {
    return `${t.節點編號}-${t.場次序 ?? 0}`;
  }

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function commit() {
    if (!selectedEvent) return;
    setError(null);
    setLoading(true);
    try {
      const chosen = tasks.filter((t) => selected.has(taskKey(t)));
      const res = await fetch("/api/expand/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventLabel: selectedEvent.事件類型,
          tasks: chosen.map((t) => ({
            節點編號: t.節點編號,
            內容類型: t.內容類型,
            日期: t.日期,
            場次序: t.場次序,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "寫入失敗");
      const failMsg = data.failed?.length ? `,${data.failed.length} 筆失敗` : "";
      setCommitMsg(`已建立 ${data.sessionCode},成功 ${data.succeeded.length} 筆${failMsg}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">P2 序列展開引擎</h1>
      <p className="text-sm text-zinc-500">
        讀取 DB-06/07/15,依錨點(首場/每場/末場)計算實際日期。展開結果先預覽,勾選確認後才寫入 Notion。
      </p>

      <section className="border border-black/10 dark:border-white/15 rounded-lg p-4 flex flex-wrap gap-2 items-end text-sm">
        <label className="flex flex-col gap-1">
          事件
          <select
            className="border rounded px-2 py-1 bg-transparent min-w-48"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          >
            <option value="">請選擇事件…</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.事件類型}({e.事件型態})
              </option>
            ))}
          </select>
        </label>
        {selectedEvent?.事件型態 === "單日" && (
          <label className="flex flex-col gap-1">
            事件日期
            <input
              type="date"
              className="border rounded px-2 py-1 bg-transparent"
              value={singleDate}
              onChange={(e) => setSingleDate(e.target.value)}
            />
          </label>
        )}
        <button
          disabled={!eventId || loading}
          onClick={preview}
          className="px-3 py-1.5 rounded bg-foreground text-background text-sm disabled:opacity-50"
        >
          預覽展開
        </button>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {commitMsg && <p className="text-sm text-green-700 dark:text-green-400">{commitMsg}</p>}

      {tasks.length > 0 && (
        <section className="border border-black/10 dark:border-white/15 rounded-lg p-4">
          <h2 className="font-medium mb-3">預覽清單(共 {tasks.length} 筆,已選 {selected.size} 筆)</h2>
          <ul className="flex flex-col gap-1">
            {tasks.map((t) => {
              const key = taskKey(t);
              return (
                <li
                  key={key}
                  className="flex items-center gap-2 text-sm border border-black/5 dark:border-white/10 rounded px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(key)}
                    onChange={() => toggle(key)}
                  />
                  <span className="font-mono text-xs">{t.日期}</span>
                  <span className="flex-1">{t.內容類型}</span>
                  <span className="text-xs text-zinc-500">{t.節點編號}</span>
                  {t.場次序 && <span className="text-xs text-zinc-500">第{t.場次序}場</span>}
                  {!t.在滾動窗口內 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-orange-200 text-orange-900 dark:bg-orange-900 dark:text-orange-200">
                      超出 35–40 天窗口
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            disabled={selected.size === 0 || loading}
            onClick={commit}
            className="mt-3 px-3 py-1.5 rounded bg-foreground text-background text-sm disabled:opacity-50"
          >
            確認寫入 Notion(建立 {selected.size} 筆任務)
          </button>
        </section>
      )}
    </div>
  );
}
