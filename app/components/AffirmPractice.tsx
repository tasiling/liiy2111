"use client";

import { useEffect, useRef, useState } from "react";
import { suggestedAffirmations, type CreativeRoleProfile } from "@/lib/dojo/manifestation";

type Phase = "setup" | "practice" | "reflection";

function clock(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

async function readResponse<T>(response: Response): Promise<T> {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((json as { error?: string }).error ?? "保存失敗");
  return json as T;
}

export default function AffirmPractice({ profile }: { profile: CreativeRoleProfile }) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [statementText, setStatementText] = useState(() => suggestedAffirmations(profile).join("\n"));
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(0);
  const [feeling, setFeeling] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const statements = statementText.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 3);

  function begin() {
    if (!statements.length) return;
    setMessage(null); setError(null); setSeconds(0); setCount(0); setFeeling("");
    setPhase("practice"); setRunning(true);
  }

  async function save() {
    setSaving(true); setError(null);
    try {
      await readResponse(await fetch("/api/dojo/manifestation/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "affirm",
          statements,
          repetitionCount: count || null,
          feeling,
          durationSeconds: seconds,
          roleSnapshot: { title: profile.title, traits: profile.traits },
        }),
      }));
      setMessage("這次狂A肯定句已保存為獨立修習，不會取代每日肯定句。");
      setPhase("setup"); setRunning(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally { setSaving(false); }
  }

  return <section className="creative-practice-card affirm-practice">
    <div className="section-heading"><div><span className="eyebrow">Affirm・語言與信念</span><h3>狂A肯定句</h3></div><small>適時進行，不是每日項目</small></div>
    <p className="creative-practice-intro">選一段時間專心複誦符合創現角色的句子；這和晨間只寫一次的正向肯定句，是兩種不同修習。</p>
    <details className="practice-moment-list"><summary>什麼時候適合進行？</summary><ul><li>重要決定前，想先穩住創作方向</li><li>一段時間沒有進展，想重新連回創現角色</li><li>今天特別穩或亮，想加深這個狀態</li></ul></details>

    {phase === "setup" && <>
      <label htmlFor="affirm-statements">這次要專注複誦的肯定句</label>
      <textarea id="affirm-statements" className="field" rows={4} value={statementText} onChange={(event) => setStatementText(event.target.value)} placeholder="每行一句；可以使用系統帶出的句子，也可以改成自己的版本。" />
      <small className="field-help">內容從目前的角色稱號與核心特質帶出，開始前仍可修改。</small>
      <button type="button" className="ghost compact" onClick={() => setStatementText(suggestedAffirmations(profile).join("\n"))}>依目前角色重新帶入</button>
      <button type="button" className="primary" disabled={!statements.length} onClick={begin}>開始專注複誦</button>
    </>}

    {phase === "practice" && <div className="creative-focus-stage">
      <span className="focus-clock">{clock(seconds)}</span>
      <div className="focus-statements">{statements.map((item) => <p key={item}>{item}</p>)}</div>
      <button type="button" className="affirm-count" onClick={() => setCount((value) => value + 1)}><b>＋1</b><span>{count ? `已記 ${count} 次` : "需要時點一下；次數選填"}</span></button>
      <div className="two">
        <button type="button" onClick={() => setRunning((value) => !value)}>{running ? "暫停" : "繼續"}</button>
        <button type="button" className="primary" onClick={() => { setRunning(false); setPhase("reflection"); }}>結束這次複誦</button>
      </div>
    </div>}

    {phase === "reflection" && <div className="creative-practice-reflection">
      <p>本次專注 {clock(seconds)}{count ? `・記錄 ${count} 次` : "・未記次數"}</p>
      <label htmlFor="affirm-feeling">唸完後的感受（選填）</label>
      <textarea id="affirm-feeling" className="field" rows={3} value={feeling} onChange={(event) => setFeeling(event.target.value)} placeholder="一句話就好，也可以直接保存。" />
      <div className="two"><button type="button" onClick={() => setPhase("practice")}>回到複誦</button><button type="button" className="primary" disabled={saving} onClick={() => void save()}>{saving ? "保存中…" : "保存這次修習"}</button></div>
    </div>}
    {error && <p className="form-error">{error}</p>}{message && <p className="save-notice">{message}</p>}
  </section>;
}
