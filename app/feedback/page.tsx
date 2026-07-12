"use client";

import { useEffect, useState } from "react";
import { FEEDBACK_對象類型, FEEDBACK_QUESTION_TAGS, FEEDBACK_PROPOSAL_THRESHOLD } from "@/lib/notion/schema";

const 對象類型_OPTIONS: readonly string[] = FEEDBACK_對象類型;
const TAG_OPTIONS: readonly string[] = FEEDBACK_QUESTION_TAGS;
const SCORE_FIELDS = [
  { key: "準確度", label: "準確度" },
  { key: "語感", label: "語感" },
  { key: "轉換效果", label: "轉換效果" },
  { key: "可複用性", label: "可複用性" },
] as const;

type Rule = { id: string; 規則代碼: string; 規則名稱: string; 適用項目: string | null };
type SessionOption = { id: string; Session編號: string; 項目用途: string | null };

// P6 回饋快填(委派書 §四):手機優先,30 秒內完成——選對象→四維評分→短評一行→送出。
export default function FeedbackPage() {
  const [對象類型, set對象類型] = useState<string>(對象類型_OPTIONS[1]); // 預設 Session,較常用
  const [targetId, setTargetId] = useState("");
  const [rules, setRules] = useState<Rule[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [scores, setScores] = useState<Record<string, number | null>>({
    準確度: null,
    語感: null,
    轉換效果: null,
    可複用性: null,
  });
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [tagCounts, setTagCounts] = useState<Record<string, number>>({});
  const [短評, set短評] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/rules")
      .then((r) => r.json())
      .then((d) => setRules(d.rules ?? []));
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []));
    refreshTagCounts();
  }, []);

  function refreshTagCounts() {
    fetch("/api/feedback/tag-counts")
      .then((r) => r.json())
      .then((d) => setTagCounts(d.counts ?? {}));
  }

  function toggleTag(tag: string) {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  const allScoresChosen = SCORE_FIELDS.every((f) => scores[f.key] != null);
  const canSubmit = !!targetId && allScoresChosen && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          對象類型,
          targetId,
          準確度: scores.準確度,
          語感: scores.語感,
          轉換效果: scores.轉換效果,
          可複用性: scores.可複用性,
          問題類型標籤: [...tags],
          短評,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "送出失敗");
      setResult(`已記錄 ${data.code}`);
      // 重置表單,方便連續快填下一筆
      setTargetId("");
      setScores({ 準確度: null, 語感: null, 轉換效果: null, 可複用性: null });
      setTags(new Set());
      set短評("");
      refreshTagCounts();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <h1 className="text-lg font-semibold">P6 回饋快填</h1>
      {result && <p className="text-sm text-green-700 dark:text-green-400">{result}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="flex flex-col gap-2">
        <span className="text-sm font-medium">對象</span>
        <div className="flex gap-2">
          {對象類型_OPTIONS.map((o) => (
            <button
              key={o}
              onClick={() => {
                set對象類型(o);
                setTargetId("");
              }}
              className={`flex-1 px-3 py-2 rounded border text-sm ${
                對象類型 === o
                  ? "bg-foreground text-background border-foreground"
                  : "border-black/15 dark:border-white/20"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
        {對象類型 === "規則" ? (
          <select
            className="border rounded px-2 py-2 bg-transparent text-sm"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          >
            <option value="">選擇規則…</option>
            {rules.map((r) => (
              <option key={r.id} value={r.id}>
                {r.規則代碼} {r.規則名稱}
              </option>
            ))}
          </select>
        ) : (
          <select
            className="border rounded px-2 py-2 bg-transparent text-sm"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          >
            <option value="">選擇 Session…</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.Session編號} {s.項目用途}
              </option>
            ))}
          </select>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <span className="text-sm font-medium">四維評分(1–5)</span>
        {SCORE_FIELDS.map((f) => (
          <div key={f.key} className="flex items-center gap-2">
            <span className="text-sm w-16 shrink-0">{f.label}</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setScores((prev) => ({ ...prev, [f.key]: n }))}
                  className={`w-9 h-9 rounded-full border text-sm ${
                    scores[f.key] === n
                      ? "bg-foreground text-background border-foreground"
                      : "border-black/15 dark:border-white/20"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <span className="text-sm font-medium">問題類型標籤(選填)</span>
        <div className="flex flex-col gap-1">
          {TAG_OPTIONS.map((tag) => {
            const count = tagCounts[tag] ?? 0;
            return (
              <label key={tag} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={tags.has(tag)} onChange={() => toggleTag(tag)} />
                <span>
                  {tag}(既有 {count} 次)
                </span>
                {count >= FEEDBACK_PROPOSAL_THRESHOLD && (
                  <span className="text-xs text-orange-600 dark:text-orange-400">
                    已達三次原則,可發起提案
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <span className="text-sm font-medium">短評(選填,一行)</span>
        <input
          className="border rounded px-2 py-2 bg-transparent text-sm"
          value={短評}
          onChange={(e) => set短評(e.target.value)}
          placeholder="一句話短評"
        />
      </section>

      <button
        disabled={!canSubmit}
        onClick={submit}
        className="px-4 py-3 rounded bg-foreground text-background text-sm font-medium disabled:opacity-50"
      >
        {submitting ? "送出中…" : "送出"}
      </button>
    </div>
  );
}
