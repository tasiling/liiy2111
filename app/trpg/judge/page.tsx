"use client";

import { useEffect, useState } from "react";
import { useCurrentSave } from "@/lib/trpg/useCurrentSave";
import SaveSelector from "../_components/SaveSelector";
import CopyButton from "../_components/CopyButton";

type Options = {
  judgeTypes: readonly string[];
  positions: readonly string[];
  effects: readonly string[];
  behaviorTags: readonly string[];
  moralTags: readonly string[];
};

type RollResponse = {
  effectivePool: number;
  result: string;
  hint: string;
  card?: string;
  isTwist?: boolean;
};

type JudgmentResponse = {
  id: string;
  name: string;
  cliSummary: string;
};

const POSITION_COLOR: Record<string, string> = {
  Controlled: "bg-green-600 text-white border-green-600",
  Risky: "bg-yellow-500 text-white border-yellow-500",
  Desperate: "bg-red-600 text-white border-red-600",
};
const EFFECT_COLOR: Record<string, string> = {
  Limited: "bg-gray-500 text-white border-gray-500",
  Standard: "bg-blue-600 text-white border-blue-600",
  Great: "bg-purple-600 text-white border-purple-600",
};
const RESULT_COLOR: Record<string, string> = {
  失敗: "border-red-600 text-red-600",
  部分成功: "border-yellow-600 text-yellow-600",
  成功: "border-green-600 text-green-600",
  大成功: "border-purple-600 text-purple-600",
};

export default function JudgePage() {
  const { saves, saveId, setSaveId, loading: loadingSaves } = useCurrentSave();
  const [options, setOptions] = useState<Options | null>(null);

  const [method, setMethod] = useState<"骰子" | "抽牌">("骰子");
  const [pool, setPool] = useState(2);
  const [position, setPosition] = useState("Risky");
  const [effect, setEffect] = useState("Standard");
  const [devilsBargain, setDevilsBargain] = useState(false);
  const [judgeType, setJudgeType] = useState("調查");
  const [behaviorTags, setBehaviorTags] = useState<string[]>([]);
  const [moralTags, setMoralTags] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const [rolling, setRolling] = useState(false);
  const [roll, setRoll] = useState<RollResponse | null>(null);
  const [writing, setWriting] = useState(false);
  const [written, setWritten] = useState<JudgmentResponse | null>(null);

  useEffect(() => {
    fetch("/api/trpg/options")
      .then((r) => r.json())
      .then(setOptions);
  }, []);

  const effectivePool = pool + (devilsBargain ? 1 : 0);

  function toggleBehaviorTag(tag: string) {
    setBehaviorTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : prev.length >= 3
          ? prev
          : [...prev, tag]
    );
  }
  function toggleMoralTag(tag: string) {
    setMoralTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function execute() {
    setRolling(true);
    setRoll(null);
    setWritten(null);
    try {
      const res = await fetch("/api/trpg/roll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, pool, devilsBargain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "判定失敗");
      setRoll(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setRolling(false);
    }
  }

  async function writeJudgment() {
    if (!saveId || !roll) return;
    setWriting(true);
    try {
      const res = await fetch("/api/trpg/judgment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saveId,
          method,
          pool: roll.effectivePool,
          judgeType,
          position,
          effect,
          result: roll.result,
          card: roll.card,
          devilsBargain,
          behaviorTags,
          moralTags,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "寫入失敗");
      setWritten(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setWriting(false);
    }
  }

  if (!options) return <p className="text-sm text-zinc-500">讀取中…</p>;

  return (
    <div className="flex flex-col gap-4 max-w-xl pb-16">
      <h1 className="text-lg font-semibold">🎲 判定台</h1>

      {!loadingSaves && <SaveSelector saves={saves} saveId={saveId} onChange={setSaveId} />}

      <div className="flex rounded-lg overflow-hidden border">
        {(["骰子", "抽牌"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={`flex-1 py-3 text-sm font-medium ${
              method === m ? "bg-foreground text-background" : "hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            {m === "骰子" ? "🎲 骰子" : "🃏 抽牌"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-zinc-500">
          {method === "骰子" ? "骰池大小" : "抽牌張數"}
        </label>
        <div className="flex items-center gap-3">
          <button
            className="w-10 h-10 rounded-full border text-lg"
            onClick={() => setPool((p) => Math.max(0, p - 1))}
          >
            −
          </button>
          <span className="w-10 text-center text-xl font-semibold">{pool}</span>
          <button
            className="w-10 h-10 rounded-full border text-lg"
            onClick={() => setPool((p) => Math.min(4, p + 1))}
          >
            ＋
          </button>
          {devilsBargain && <span className="text-xs text-red-600">(+1 = {effectivePool})</span>}
        </div>
        {pool === 0 && (
          <p className="text-xs text-orange-600">
            劣勢：{method === "骰子" ? "骰 2 顆取低" : "抽 2 張取最低"}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-zinc-500">Position</label>
        <div className="flex gap-2">
          {options.positions.map((p) => (
            <button
              key={p}
              onClick={() => setPosition(p)}
              className={`flex-1 py-2 rounded border text-sm ${
                position === p ? POSITION_COLOR[p] : "hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-zinc-500">Effect</label>
        <div className="flex gap-2">
          {options.effects.map((e) => (
            <button
              key={e}
              onClick={() => setEffect(e)}
              className={`flex-1 py-2 rounded border text-sm ${
                effect === e ? EFFECT_COLOR[e] : "hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={devilsBargain}
          onChange={(e) => setDevilsBargain(e.target.checked)}
        />
        Devil&apos;s Bargain(骰池 +1)
      </label>
      {devilsBargain && (
        <div className="rounded border border-red-600 bg-red-600/10 px-3 py-2 text-xs text-red-600">
          已接受惡魔交易,敘事上會伴隨額外代價。
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm text-zinc-500">判定類型</label>
        <div className="grid grid-cols-4 gap-2">
          {options.judgeTypes.map((t) => (
            <button
              key={t}
              onClick={() => setJudgeType(t)}
              className={`py-2 rounded border text-sm ${
                judgeType === t
                  ? "bg-foreground text-background"
                  : "hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={execute}
        disabled={rolling}
        className="sticky bottom-20 md:bottom-4 py-4 rounded-lg bg-foreground text-background text-lg font-semibold disabled:opacity-50"
      >
        {rolling ? "判定中…" : method === "骰子" ? "擲骰！" : "抽牌！"}
      </button>

      {roll && (
        <div className={`border-2 rounded-lg p-4 flex flex-col gap-1 ${RESULT_COLOR[roll.result] ?? ""}`}>
          <p className="text-xl font-bold">
            {roll.result}
            {roll.card ? `（${roll.card}）` : ""}
            {roll.isTwist && <span className="ml-1 text-sm">⚡轉折</span>}
          </p>
          <p className="text-sm">{roll.hint}</p>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm text-zinc-500">行為標籤(最多 3)</label>
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
          {options.behaviorTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleBehaviorTag(tag)}
              className={`px-2 py-1 rounded-full border text-xs ${
                behaviorTags.includes(tag)
                  ? "bg-foreground text-background"
                  : "hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-zinc-500">道德標籤</label>
        <div className="flex flex-wrap gap-1.5">
          {options.moralTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleMoralTag(tag)}
              className={`px-2 py-1 rounded-full border text-xs ${
                moralTags.includes(tag)
                  ? "bg-foreground text-background"
                  : "hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <textarea
        className="border rounded px-3 py-2 bg-transparent text-sm"
        placeholder="備註(選填)"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {roll && !written && (
        <button
          onClick={writeJudgment}
          disabled={writing || !saveId}
          className="py-3 rounded-lg border-2 border-foreground text-sm font-semibold disabled:opacity-50"
        >
          {writing ? "寫入中…" : "寫入判定紀錄"}
        </button>
      )}

      {written && (
        <div className="border rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">已寫入判定紀錄表 ✓ 貼回 CLI 摘要</span>
            <CopyButton text={written.cliSummary} />
          </div>
          <pre className="text-xs whitespace-pre-wrap bg-black/5 dark:bg-white/5 rounded p-2">
            {written.cliSummary}
          </pre>
        </div>
      )}
    </div>
  );
}
