"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CreativeRoleProfile, ManifestationMilestone } from "@/lib/dojo/manifestation";

type Phase = "setup" | "practice" | "reflection";

function clock(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

async function readResponse<T>(response: Response): Promise<T> {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((json as { error?: string }).error ?? "操作失敗");
  return json as T;
}

export default function VisionPractice() {
  const [profile, setProfile] = useState<CreativeRoleProfile | null>(null);
  const [milestones, setMilestones] = useState<ManifestationMilestone[]>([]);
  const [sourceKey, setSourceKey] = useState("custom");
  const [scene, setScene] = useState("");
  const [phase, setPhase] = useState<Phase>("setup");
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [sensoryDetails, setSensoryDetails] = useState("");
  const [bodyFeeling, setBodyFeeling] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/dojo/manifestation", { cache: "no-store" })
      .then((response) => readResponse<{ profile: CreativeRoleProfile; milestones: ManifestationMilestone[] }>(response))
      .then((json) => {
        if (cancelled) return;
        setProfile(json.profile); setMilestones(json.milestones.slice(0, 8));
        if (json.profile.traits[0]) setSourceKey(`trait:${json.profile.traits[0]}`);
      })
      .catch((caught) => !cancelled && setError(caught instanceof Error ? caught.message : String(caught)));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const source = useMemo(() => {
    if (sourceKey.startsWith("trait:")) {
      const label = sourceKey.slice(6);
      return { sourceType: "trait" as const, sourceId: null, sourceLabel: label };
    }
    if (sourceKey.startsWith("milestone:")) {
      const id = sourceKey.slice(10);
      const item = milestones.find((milestone) => milestone.id === id);
      return { sourceType: "milestone" as const, sourceId: id, sourceLabel: item ? `${item.trait}・${item.action}` : "近期里程碑" };
    }
    return { sourceType: "custom" as const, sourceId: null, sourceLabel: "自行設定" };
  }, [milestones, sourceKey]);

  function begin() {
    if (!scene.trim()) return;
    setMessage(null); setError(null); setSeconds(0); setSensoryDetails(""); setBodyFeeling("");
    setPhase("practice"); setRunning(true);
  }

  async function save() {
    setSaving(true); setError(null);
    try {
      await readResponse(await fetch("/api/dojo/manifestation/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "vision", ...source, scene, durationSeconds: seconds, sensoryDetails, bodyFeeling }),
      }));
      setMessage("這次視覺化沉浸已保存到創現修習紀錄。");
      setPhase("setup"); setRunning(false); setScene("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally { setSaving(false); }
  }

  return <section className="creative-practice-card vision-practice">
    <div className="section-heading"><div><span className="eyebrow">Vision・感官與體驗</span><h3>視覺化沉浸</h3></div><small>適時進行，不是每日項目</small></div>
    <p className="creative-practice-intro">透過具體場景與感官細節，沉浸預演你決定創作的生活狀態。沒有時長上限，也不必每天進行。</p>
    <details className="practice-moment-list"><summary>什麼時候適合進行？</summary><ul><li>剛留下里程碑，想加深這份進度的情緒印記</li><li>準備做一個與創現角色有關的重要決定</li><li>今天特別穩或亮，想讓身體更熟悉這個狀態</li></ul></details>

    {phase === "setup" && <>
      <label htmlFor="vision-source">這次從哪裡取一個場景？</label>
      <select id="vision-source" className="field" value={sourceKey} onChange={(event) => setSourceKey(event.target.value)}>
        <option value="custom">自己寫一個場景</option>
        {profile?.traits.map((trait) => <option key={`trait:${trait}`} value={`trait:${trait}`}>核心特質・{trait}</option>)}
        {milestones.map((item) => <option key={item.id} value={`milestone:${item.id}`}>里程碑・{item.trait}・{item.action.slice(0, 28)}</option>)}
      </select>
      {source.sourceType !== "custom" && <p className="vision-source-note">取材：{source.sourceLabel}</p>}
      <label htmlFor="vision-scene">今天要沉浸的具體場景</label>
      <textarea id="vision-scene" className="field" rows={4} value={scene} onChange={(event) => setScene(event.target.value)} placeholder="例如：我走進明亮安靜的工作室，把自己的作品放上桌，肩膀是鬆的，呼吸很平穩。" />
      <button type="button" className="primary" disabled={!scene.trim()} onClick={begin}>開始沉浸</button>
    </>}

    {phase === "practice" && <div className="creative-focus-stage vision-focus">
      <span className="focus-clock">{clock(seconds)}</span>
      <small>正在沉浸的場景</small><p className="vision-scene">{scene}</p>
      <div className="two"><button type="button" onClick={() => setRunning((value) => !value)}>{running ? "暫停" : "繼續"}</button><button type="button" className="primary" onClick={() => { setRunning(false); setPhase("reflection"); }}>結束沉浸</button></div>
    </div>}

    {phase === "reflection" && <div className="creative-practice-reflection">
      <p>本次沉浸 {clock(seconds)}</p>
      <label htmlFor="vision-senses">體驗到的感官細節（選填）</label>
      <textarea id="vision-senses" className="field" rows={3} value={sensoryDetails} onChange={(event) => setSensoryDetails(event.target.value)} placeholder="畫面、聲音、觸感或空間細節。" />
      <label htmlFor="vision-body">這個場景帶來的身體感受（選填）</label>
      <textarea id="vision-body" className="field" rows={3} value={bodyFeeling} onChange={(event) => setBodyFeeling(event.target.value)} placeholder="例如：肩膀放鬆，胸口變得開闊。" />
      <div className="two"><button type="button" onClick={() => setPhase("practice")}>回到沉浸</button><button type="button" className="primary" disabled={saving} onClick={() => void save()}>{saving ? "保存中…" : "保存這次修習"}</button></div>
    </div>}
    {error && <p className="form-error">{error}</p>}{message && <p className="save-notice">{message}</p>}
  </section>;
}
