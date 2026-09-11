"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { WEAVING_FORMATS, type WeavingFormat, type WeavingProject } from "@/lib/dojo/weavingProjects";

const STATUS: Record<WeavingProject["status"], string> = {
  selecting: "選擇中", drafting: "草稿中", producing: "製作中", reviewing: "確認中",
  completed: "作品完成", sent_to_liaojie: "已送聊解室", archived: "已封存",
};

async function json<T>(response: Response): Promise<T> {
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((value as { error?: string }).error || `操作失敗（${response.status}）`);
  return value as T;
}

export default function WeavingProjectHub() {
  const [projects, setProjects] = useState<WeavingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [sourceSnapshot, setSourceSnapshot] = useState("");
  const [coreStatement, setCoreStatement] = useState("");
  const [format, setFormat] = useState<WeavingFormat>("text");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/dojo/weaving-projects", { cache: "no-store" });
      const result = await json<{ projects: WeavingProject[] }>(response);
      setProjects(result.projects ?? []);
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function createManual() {
    if (!sourceSnapshot.trim() || !coreStatement.trim()) { setError("請先放入整理好的題材，並寫下最想說的一句話。"); return; }
    setSaving(true); setError(null);
    try {
      const response = await fetch("/api/dojo/weaving-projects", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType: "manual", sourceSnapshot, coreStatement, format }),
      });
      const result = await json<{ project: WeavingProject }>(response);
      window.location.href = `/weaving/${result.project.id}`;
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); setSaving(false); }
  }

  return <>
    <section className="ritual-card weaving-create-card">
      <div className="section-heading"><div><span className="eyebrow">新作品</span><h2>建立織光案</h2><p className="lead">只決定素材、核心一句話與這次的形式。</p></div><button onClick={() => setCreating((value) => !value)}>{creating ? "收起" : "＋ 手動建立"}</button></div>
      {creating && <div className="weaving-create-flow">
        <label>1．這次要處理哪份素材？</label>
        <textarea className="field" rows={5} value={sourceSnapshot} onChange={(event) => setSourceSnapshot(event.target.value)} placeholder="貼上已整理好的題材、文章或企劃摘要；還只是網址或收藏時，請先留在野採。" />
        <label>2．這次最想說的一句話是什麼？</label>
        <textarea className="field" rows={3} value={coreStatement} onChange={(event) => setCoreStatement(event.target.value)} placeholder="例如：真正的能力感，不是逼自己無所不能，而是知道自己可以採取下一個行動。" />
        <label>3．先做成哪一種形式？</label>
        <div className="format-choice-grid">{Object.entries(WEAVING_FORMATS).map(([key, label]) => <button type="button" key={key} className={format === key ? "on" : ""} onClick={() => setFormat(key as WeavingFormat)}><b>{label}</b><small>{key === "text" ? "第一階段已開放" : key === "comic" ? "保留入口，第二階段開放" : "保留入口，第三階段開放"}</small></button>)}</div>
        <button className="primary" disabled={saving} onClick={() => void createManual()}>{saving ? "建立中…" : "建立這張織光案"}</button>
      </div>}
    </section>

    <section className="weaving-inbox">
      <div className="section-heading weaving-inbox-heading"><div><span className="eyebrow">本次作品</span><h2>織光案</h2><p className="lead">每張案只走一種主要形式；下一步必須是可以直接做的動作。</p></div><span className="weaving-count">{projects.length}</span></div>
      {loading && <div className="empty">正在整理作品…</div>}
      {error && <p className="form-error">{error}<button className="text-link" onClick={() => void load()}>重新讀取</button></p>}
      {!loading && !error && projects.length === 0 && <div className="weaving-empty"><span>◇</span><b>還沒有正式織光案</b><p>可從下方成熟素材開始，或手動建立一張。</p></div>}
      <div className="weaving-project-list">{projects.map((project) => <Link href={`/weaving/${project.id}`} className="weaving-project-row" key={project.id}>
        <div><small>{WEAVING_FORMATS[project.format]} · {STATUS[project.status]}</small><b>{project.title}</b><p>{project.coreStatement}</p></div>
        <span>下一步<br/><b>{project.nextAction}</b></span>
      </Link>)}</div>
    </section>
  </>;
}
