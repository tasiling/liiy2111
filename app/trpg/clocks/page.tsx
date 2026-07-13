"use client";

import { useEffect, useState } from "react";
import { useCurrentSave } from "@/lib/trpg/useCurrentSave";
import SaveSelector from "../_components/SaveSelector";

type Clock = {
  id: string;
  時鐘名稱: string;
  類型: string;
  目前格數: number;
  格數上限: number;
  影響結果: string;
  並行時鐘對照: string[];
};

export default function ClocksPage() {
  const { saves, saveId, setSaveId, loading: loadingSaves } = useCurrentSave();
  const [chapterId, setChapterId] = useState<string | undefined>();
  const [clocks, setClocks] = useState<Clock[] | null>(null);
  const loading = !!saveId && clocks === null;

  useEffect(() => {
    if (!saveId) return;
    fetch(`/api/trpg/context?saveId=${saveId}`)
      .then((r) => r.json())
      .then((data) => setChapterId(data.save.目前章節 ?? undefined));
  }, [saveId]);

  useEffect(() => {
    const qs = chapterId ? `?chapterId=${chapterId}` : "";
    fetch(`/api/trpg/clocks${qs}`)
      .then((r) => r.json())
      .then((data) => setClocks(data.clocks ?? []));
  }, [chapterId]);

  async function adjust(id: string, delta: number) {
    setClocks(
      (prev) =>
        prev?.map((c) =>
          c.id === id
            ? { ...c, 目前格數: Math.max(0, Math.min(c.格數上限, c.目前格數 + delta)) }
            : c
        ) ?? null
    );
    await fetch(`/api/trpg/clock/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta }),
    });
  }

  const allClocks = clocks ?? [];
  const raceClocks = allClocks.filter((c) => c.類型 === "競速" && c.並行時鐘對照.length > 0);
  const otherClocks = allClocks.filter((c) => !raceClocks.includes(c));

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <h1 className="text-lg font-semibold">⏱️ 時鐘面板</h1>
      {!loadingSaves && <SaveSelector saves={saves} saveId={saveId} onChange={setSaveId} />}

      {loading && <p className="text-sm text-zinc-500">讀取中…</p>}

      {!loading && allClocks.length === 0 && (
        <p className="text-sm text-zinc-500">目前章節無時鐘資料</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {otherClocks.map((c) => (
          <ClockCard key={c.id} clock={c} onAdjust={adjust} />
        ))}
      </div>

      {raceClocks.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm text-zinc-500">競速型(並排對照)</h2>
          <div className="flex gap-4 overflow-x-auto">
            {raceClocks.map((c) => (
              <ClockCard key={c.id} clock={c} onAdjust={adjust} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ClockCard({
  clock,
  onAdjust,
}: {
  clock: Clock;
  onAdjust: (id: string, delta: number) => void;
}) {
  const full = clock.目前格數 >= clock.格數上限;
  const r = 30;
  const c = 2 * Math.PI * r;
  const pct = clock.格數上限 > 0 ? clock.目前格數 / clock.格數上限 : 0;

  return (
    <div className="border rounded-lg p-3 flex flex-col items-center gap-2">
      <svg
        width="72"
        height="72"
        viewBox="0 0 72 72"
        onClick={() => onAdjust(clock.id, 1)}
        onContextMenu={(e) => {
          e.preventDefault();
          onAdjust(clock.id, -1);
        }}
        className="cursor-pointer"
      >
        <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="10" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={full ? "#dc2626" : "#2563eb"}
          strokeWidth="10"
          strokeDasharray={`${c * pct} ${c}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
      </svg>
      <span className="text-sm text-center font-medium">{clock.時鐘名稱}</span>
      <span className="text-xs text-zinc-500">
        {clock.類型}｜{clock.目前格數}/{clock.格數上限}
      </span>
      {full && clock.影響結果 && (
        <p className="text-xs text-red-600 text-center">滿格：{clock.影響結果}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => onAdjust(clock.id, -1)}
          className="w-8 h-8 rounded-full border text-sm"
        >
          −
        </button>
        <button
          onClick={() => onAdjust(clock.id, 1)}
          className="w-8 h-8 rounded-full border text-sm"
        >
          ＋
        </button>
      </div>
    </div>
  );
}
