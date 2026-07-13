"use client";

import { useEffect, useState } from "react";
import { useCurrentSave } from "@/lib/trpg/useCurrentSave";
import SaveSelector from "./_components/SaveSelector";
import CopyButton from "./_components/CopyButton";

type ContextData = {
  save: {
    存檔名稱: string;
    世界名稱: string | null;
    角色名稱: string | null;
    章節名稱: string | null;
    場景名稱: string | null;
    最近摘要: string;
    累積遊玩時長: number;
  };
  clocks: { id: string; 時鐘名稱: string; 目前格數: number; 格數上限: number }[];
  unresolvedClues: { id: string; 伏筆名稱: string; 埋下章節: string; 預計回收章節: string }[];
  pendingCanon: { id: string; 場景標題: string }[];
  awarenessGaps: { id: string; 知情紀錄ID: string; 誤解內容: string }[];
  recentJudgments: { id: string; 判定名稱: string; 結果級別: string }[];
  openingPack: string;
};

export default function DashboardPage() {
  const { saves, saveId, setSaveId, loading: loadingSaves } = useCurrentSave();
  const [ctx, setCtx] = useState<ContextData | null>(null);
  const loading = !!saveId && !ctx;

  useEffect(() => {
    if (!saveId) return;
    let cancelled = false;
    fetch(`/api/trpg/context?saveId=${saveId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setCtx(data);
      });
    return () => {
      cancelled = true;
    };
  }, [saveId]);

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h1 className="text-lg font-semibold">戰情儀表板</h1>
      {!loadingSaves && <SaveSelector saves={saves} saveId={saveId} onChange={setSaveId} />}

      {loading && <p className="text-sm text-zinc-500">讀取中…</p>}

      {ctx && (
        <>
          <section className="border rounded-lg p-4 flex flex-col gap-1">
            <h2 className="font-medium text-sm text-zinc-500">目前存檔</h2>
            <p className="text-base font-medium">{ctx.save.存檔名稱}</p>
            <p className="text-sm">
              {ctx.save.角色名稱 ?? "?"} POV｜{ctx.save.章節名稱 ?? "?"}・{ctx.save.場景名稱 ?? "?"}
            </p>
            <p className="text-sm text-zinc-500">累積時長 {ctx.save.累積遊玩時長} 分</p>
            {ctx.save.最近摘要 && <p className="text-sm mt-1">{ctx.save.最近摘要}</p>}
          </section>

          <section className="border rounded-lg p-4 flex flex-col gap-2">
            <h2 className="font-medium text-sm text-zinc-500">進度時鐘</h2>
            {ctx.clocks.length === 0 && <p className="text-sm text-zinc-500">目前章節無活躍時鐘</p>}
            <div className="flex flex-wrap gap-3">
              {ctx.clocks.map((c) => (
                <ClockDial key={c.id} name={c.時鐘名稱} current={c.目前格數} max={c.格數上限} />
              ))}
            </div>
          </section>

          <section className="border rounded-lg p-4 flex flex-col gap-2">
            <h2 className="font-medium text-sm text-zinc-500">
              未回收伏筆 ({ctx.unresolvedClues.length})
            </h2>
            <ul className="text-sm flex flex-col gap-1">
              {ctx.unresolvedClues.map((c) => (
                <li key={c.id}>
                  {c.伏筆名稱}
                  <span className="text-zinc-500">
                    　{c.埋下章節}埋 → 預計{c.預計回收章節}收
                  </span>
                </li>
              ))}
              {ctx.unresolvedClues.length === 0 && <li className="text-zinc-500">無</li>}
            </ul>
          </section>

          <section className="border rounded-lg p-4 flex flex-col gap-2">
            <h2 className="font-medium text-sm text-zinc-500">
              Canon 待審 ({ctx.pendingCanon.length})
            </h2>
            <ul className="text-sm flex flex-col gap-1">
              {ctx.pendingCanon.map((c) => (
                <li key={c.id}>{c.場景標題}</li>
              ))}
              {ctx.pendingCanon.length === 0 && <li className="text-zinc-500">無</li>}
            </ul>
          </section>

          <section className="border rounded-lg p-4 flex flex-col gap-2">
            <h2 className="font-medium text-sm text-zinc-500">
              知情落差 ({ctx.awarenessGaps.length})
            </h2>
            <ul className="text-sm flex flex-col gap-1">
              {ctx.awarenessGaps.map((a) => (
                <li key={a.id}>{a.誤解內容 || a.知情紀錄ID}</li>
              ))}
              {ctx.awarenessGaps.length === 0 && <li className="text-zinc-500">無</li>}
            </ul>
          </section>

          <section className="border rounded-lg p-4 flex flex-col gap-2">
            <h2 className="font-medium text-sm text-zinc-500">最近判定</h2>
            <ul className="text-sm flex flex-col gap-1">
              {ctx.recentJudgments.map((j) => (
                <li key={j.id}>
                  {j.判定名稱}　<span className="text-zinc-500">{j.結果級別}</span>
                </li>
              ))}
              {ctx.recentJudgments.length === 0 && <li className="text-zinc-500">無</li>}
            </ul>
          </section>

          <section className="border rounded-lg p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-sm text-zinc-500">開場包(貼給 CLI)</h2>
              <CopyButton text={ctx.openingPack} />
            </div>
            <pre className="text-xs whitespace-pre-wrap bg-black/5 dark:bg-white/5 rounded p-2">
              {ctx.openingPack}
            </pre>
          </section>
        </>
      )}
    </div>
  );
}

function ClockDial({ name, current, max }: { name: string; current: number; max: number }) {
  const full = current >= max;
  const r = 18;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? current / max : 0;
  return (
    <div className="flex flex-col items-center gap-1 w-20">
      <svg width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="6" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke={full ? "#dc2626" : "#2563eb"}
          strokeWidth="6"
          strokeDasharray={`${c * pct} ${c}`}
          strokeLinecap="round"
          transform="rotate(-90 22 22)"
        />
      </svg>
      <span className="text-xs text-center">{name}</span>
      <span className="text-xs text-zinc-500">
        {current}/{max}
      </span>
    </div>
  );
}
