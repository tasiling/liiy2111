"use client";

import { useState } from "react";
import { useCurrentSave } from "@/lib/trpg/useCurrentSave";
import SaveSelector from "../_components/SaveSelector";

const STEPS = ["敘事全文", "結算摘要", "進度更新", "時鐘與伏筆"];

export default function SessionLogPage() {
  const { saves, saveId, setSaveId, loading: loadingSaves } = useCurrentSave();
  const [step, setStep] = useState(0);

  const [title, setTitle] = useState("");
  const [fullText, setFullText] = useState("");
  const [summary, setSummary] = useState("");
  const [nextOpeningHint, setNextOpeningHint] = useState("");
  const [minutesPlayed, setMinutesPlayed] = useState(30);

  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState<{ logId: string } | null>(null);

  async function submit() {
    if (!saveId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/trpg/session-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saveId,
          title: title || `Session ${new Date().toISOString().slice(0, 10)}`,
          fullText,
          summary,
          nextOpeningHint,
          playDateISO: new Date().toISOString().slice(0, 10),
          minutesPlayed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "結算失敗");
      setReport(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (report) {
    return (
      <div className="flex flex-col gap-3 max-w-xl">
        <h1 className="text-lg font-semibold">📖 本次 Session 報告卡</h1>
        <div className="border rounded-lg p-4 flex flex-col gap-1 text-sm">
          <p>遊玩日誌已建立(ID：{report.logId})</p>
          <p>累積時長 +{minutesPlayed} 分</p>
          <p>下次開場提示已寫入 POV 進度表。</p>
        </div>
        <button
          onClick={() => {
            setReport(null);
            setStep(0);
            setTitle("");
            setFullText("");
            setSummary("");
            setNextOpeningHint("");
          }}
          className="py-2 rounded border text-sm"
        >
          再記一次
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-xl pb-16">
      <h1 className="text-lg font-semibold">📖 結算精靈</h1>
      {!loadingSaves && <SaveSelector saves={saves} saveId={saveId} onChange={setSaveId} />}

      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`flex-1 h-1.5 rounded-full ${i <= step ? "bg-foreground" : "bg-black/10 dark:bg-white/10"}`}
          />
        ))}
      </div>
      <p className="text-sm text-zinc-500">
        步驟 {step + 1}/4：{STEPS[step]}
      </p>

      {step === 0 && (
        <div className="flex flex-col gap-2">
          <input
            className="border rounded px-3 py-2 bg-transparent text-sm"
            placeholder="段落標題"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="border rounded px-3 py-2 bg-transparent text-sm"
            rows={10}
            placeholder="貼上本段完整敘事全文"
            value={fullText}
            onChange={(e) => setFullText(e.target.value)}
          />
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-2">
          <label className="text-xs text-zinc-500">段落摘要</label>
          <textarea
            className="border rounded px-3 py-2 bg-transparent text-sm"
            rows={4}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
          <label className="text-xs text-zinc-500">下次開場提示</label>
          <textarea
            className="border rounded px-3 py-2 bg-transparent text-sm"
            rows={3}
            value={nextOpeningHint}
            onChange={(e) => setNextOpeningHint(e.target.value)}
          />
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-2">
          <label className="text-xs text-zinc-500">累積遊玩時長增量(分)</label>
          <input
            type="number"
            className="border rounded px-3 py-2 bg-transparent text-sm"
            value={minutesPlayed}
            onChange={(e) => setMinutesPlayed(Number(e.target.value))}
          />
          <p className="text-xs text-zinc-500">
            目前章節/場景與已完成場景勾選請直接在 Notion 的 POV 進度表調整,或於下個版本補上選擇器。
          </p>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-zinc-500">
            時鐘 +0~3 格請至「⏱️ 時鐘面板」分頁操作;伏筆狀態變更請直接在 Notion 伏筆庫調整。
          </p>
        </div>
      )}

      <div className="flex gap-2 mt-2">
        {step > 0 && (
          <button onClick={() => setStep((s) => s - 1)} className="flex-1 py-2 rounded border text-sm">
            上一步
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="flex-1 py-2 rounded bg-foreground text-background text-sm"
          >
            下一步
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={saving || !saveId || !fullText.trim()}
            className="flex-1 py-2 rounded bg-foreground text-background text-sm disabled:opacity-50"
          >
            {saving ? "送出中…" : "完成結算"}
          </button>
        )}
      </div>
    </div>
  );
}
