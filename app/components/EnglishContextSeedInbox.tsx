"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ContextPracticeSeed } from "@/lib/dojo/contextPractice";

type SeedWithPrompt = ContextPracticeSeed & { practicePrompt: string };
type PracticeDraft = { successSentence: string; stuckPoint: string; nextAdjustment: string };

async function responseJson<T>(response: Response): Promise<T> {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((json as { error?: string }).error ?? `操作失敗（${response.status}）`);
  return json as T;
}
export default function EnglishContextSeedInbox({ onCompleted }: { onCompleted?: () => void | Promise<void> }) {
  const [seeds, setSeeds] = useState<SeedWithPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<PracticeDraft>({ successSentence: "", stuckPoint: "", nextAdjustment: "" });
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/dojo/english-journal/context-seeds", { cache: "no-store" });
      const result = await responseJson<{ seeds: SeedWithPrompt[] }>(response);
      setSeeds(result.seeds ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    const refresh = () => void load();
    window.addEventListener("lumen-context-seeds-updated", refresh);
    return () => { window.clearTimeout(timer); window.removeEventListener("lumen-context-seeds-updated", refresh); };
  }, [load]);

  const pending = useMemo(() => seeds.filter((seed) => seed.status !== "completed"), [seeds]);
  const completed = useMemo(() => seeds.filter((seed) => seed.status === "completed").slice(0, 3), [seeds]);

  async function beginPractice(seed: SeedWithPrompt) {
    setBusyKey(seed.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/dojo/english-journal/context-seeds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: seed.id, action: "start" }),
      });
      const result = await responseJson<{ seed: SeedWithPrompt }>(response);
      setSeeds((current) => current.map((item) => item.id === result.seed.id ? result.seed : item));
      setActiveKey(seed.id);
      setDraft({
        successSentence: result.seed.successSentence,
        stuckPoint: result.seed.stuckPoint,
        nextAdjustment: result.seed.nextAdjustment,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusyKey(null);
    }
  }

  async function copyPrompt(seed: SeedWithPrompt) {
    setError(null);
    try {
      await navigator.clipboard.writeText(seed.practicePrompt);
      setNotice("練習指令已複製；貼到 GPT 後，一次回答一題即可。");
    } catch {
      setError("瀏覽器未允許複製；請再按一次或檢查剪貼簿權限。");
    }
  }

  async function completePractice(seed: SeedWithPrompt) {
    setBusyKey(seed.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/dojo/english-journal/context-seeds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: seed.id, action: "complete", ...draft }),
      });
      const result = await responseJson<{ seed: SeedWithPrompt; weeklySynced: boolean }>(response);
      setSeeds((current) => current.map((item) => item.id === result.seed.id ? result.seed : item));
      setActiveKey(null);
      setDraft({ successSentence: "", stuckPoint: "", nextAdjustment: "" });
      setNotice(result.weeklySynced ? "修習證據已保存，並完成本週一格英文語境聊天。" : "修習證據已保存。這週若有英文語境聊天格，可再從週盤安排。");
      await onCompleted?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusyKey(null);
    }
  }

  async function saveForLater(seed: SeedWithPrompt) {
    setBusyKey(seed.id);
    setError(null);
    try {
      const response = await fetch("/api/dojo/english-journal/context-seeds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: seed.id, action: "start", ...draft }),
      });
      const result = await responseJson<{ seed: SeedWithPrompt }>(response);
      setSeeds((current) => current.map((item) => item.id === result.seed.id ? result.seed : item));
      setActiveKey(null);
      setNotice("目前內容已保存，下次可以從這一項繼續。");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusyKey(null);
    }
  }

  if (loading) return null;
  return <section className="english-context-inbox">
    <div className="subsection-title"><div><small>英文・主動使用</small><h4>句型語法修習匣</h4></div><span>{pending.length} 項待練</span></div>
    <p>一次只選一個句型或語法，完成三回合對話後留下最小修習證據。</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    {notice && <p className="save-notice">{notice}</p>}
    {pending.length === 0 ? <p className="muted-note">目前沒有待練句型或語法。完成日記 AI 對照後，可以從自譯工作台送進來。</p> : <div className="english-context-seed-list">{pending.slice(0, 6).map((seed) => {
      const active = activeKey === seed.id;
      return <article key={seed.id} className={active ? "active" : ""}>
        <div><small>{seed.kind === "grammar" ? "語法" : "句型"}・{seed.sourceDate}{seed.status === "practicing" ? "・修習中" : ""}</small><b>{seed.focus}</b><p>{seed.note || "日常生活、學校或工作情境"}</p></div>
        {!active ? <div className="seed-actions"><button type="button" className="primary" disabled={busyKey === seed.id} onClick={() => void beginPractice(seed)}>{busyKey === seed.id ? "開啟中…" : seed.status === "practicing" ? "繼續這次修習" : "開始這次修習"}</button></div> : <div className="context-practice-round">
          <button type="button" onClick={() => void copyPrompt(seed)}>複製 GPT 三回合指令</button>
          <label>成功說出的句子 <small>選填</small></label>
          <textarea rows={2} value={draft.successSentence} onChange={(event) => setDraft({ ...draft, successSentence: event.target.value })} placeholder="例如：I finally used the sentence naturally." />
          <label>卡住的地方 <small>選填</small></label>
          <textarea rows={2} value={draft.stuckPoint} onChange={(event) => setDraft({ ...draft, stuckPoint: event.target.value })} placeholder="想不到字、語序不確定，或對方沒聽懂的地方" />
          <label>下次想調整 <small>選填</small></label>
          <textarea rows={2} value={draft.nextAdjustment} onChange={(event) => setDraft({ ...draft, nextAdjustment: event.target.value })} placeholder="只留下一個最想調整的點就好" />
          <p>成功句或卡點，至少填一項即可完成。</p>
          <div className="round-actions"><button type="button" disabled={busyKey === seed.id} onClick={() => void saveForLater(seed)}>保存，稍後繼續</button><button type="button" className="primary" disabled={busyKey === seed.id || (!draft.successSentence.trim() && !draft.stuckPoint.trim())} onClick={() => void completePractice(seed)}>{busyKey === seed.id ? "保存中…" : "完成這次修習"}</button></div>
        </div>}
      </article>;
    })}</div>}
    {completed.length > 0 && <details className="context-practice-history"><summary>最近完成的修習</summary>{completed.map((seed) => <div key={seed.id}><b>{seed.focus}</b><small>{seed.successSentence || seed.stuckPoint}</small></div>)}</details>}
  </section>;
}
