"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { WEAVING_FORMATS, type WeavingFormat } from "@/lib/dojo/weavingProjects";
import { currentCore, type WeavingShuttleBundle } from "@/lib/dojo/weavingShuttle";

const SHUTTLE_STATUS = { active: "正在發展", resting: "暫時沉澱", branched: "已產生分支", archived: "已封存" } as const;
const WORK_STATUS = { selecting: "選擇中", drafting: "草稿中", producing: "製作中", reviewing: "確認中", completed: "已完成", sent_to_liaojie: "已送聊解室", archived: "已封存" } as const;

async function json<T>(response: Response): Promise<T> {
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((value as { error?: string }).error || `操作失敗（${response.status}）`);
  return value as T;
}

export default function WeavingProjectHub() {
  const [bundles, setBundles] = useState<WeavingShuttleBundle[]>([]);
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
      const response = await fetch("/api/dojo/weaving-shuttles", { cache: "no-store" });
      const result = await json<{ bundles: WeavingShuttleBundle[] }>(response);
      setBundles(result.bundles ?? []);
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function createManual() {
    if (!sourceSnapshot.trim() || !coreStatement.trim()) { setError("請先放入整理好的題材，並寫下最想說的一句話。"); return; }
    setSaving(true); setError(null);
    try {
      const response = await fetch("/api/dojo/weaving-shuttles", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType: "manual", sourceSnapshot, coreStatement, format }),
      });
      const result = await json<{ bundle: WeavingShuttleBundle }>(response);
      const work = result.bundle.works[0];
      window.location.href = `/weaving/${result.bundle.shuttle.id}${work ? `?work=${encodeURIComponent(work.id)}` : ""}`;
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); setSaving(false); }
  }

  return <>
    <section className="ritual-card weaving-create-card">
      <div className="section-heading"><div><span className="eyebrow">新的創作根系</span><h2>建立織光杼</h2><p className="lead">杼（ㄓㄨˋ）牽引核心觀點，長成一件又一件作品。</p></div><button onClick={() => setCreating((value) => !value)}>{creating ? "收起" : "＋ 手動建立"}</button></div>
      {creating && <div className="weaving-create-flow">
        <label>1．這次從哪份成熟素材開始？</label>
        <textarea className="field" rows={5} value={sourceSnapshot} onChange={(event) => setSourceSnapshot(event.target.value)} placeholder="貼上已整理好的題材、文章或企劃摘要；只有網址或收藏時，先留在野採。" />
        <label>2．目前最想說的一句話是什麼？</label>
        <textarea className="field" rows={3} value={coreStatement} onChange={(event) => setCoreStatement(event.target.value)} placeholder="這會成為核心經線 v1；之後可以被作品補充或改寫。" />
        <label>3．第一件作品先做成哪一種形式？</label>
        <div className="format-choice-grid">{Object.entries(WEAVING_FORMATS).map(([key, label]) => <button type="button" key={key} className={format === key ? "on" : ""} onClick={() => setFormat(key as WeavingFormat)}><b>{label}</b><small>{key === "text" ? "文字路徑已開放" : key === "comic" ? "保留作品線，漫畫工作台後續開放" : "保留作品線，影片工作台後續開放"}</small></button>)}</div>
        <button className="primary" disabled={saving} onClick={() => void createManual()}>{saving ? "建立中…" : "建立織光杼與作品 A"}</button>
      </div>}
    </section>

    <section className="weaving-inbox">
      <div className="section-heading weaving-inbox-heading"><div><span className="eyebrow">創作脈絡</span><h2>織光杼</h2><p className="lead">母卡不必完成；它保存觀點如何經由作品持續生長。</p></div><span className="weaving-count">{bundles.length}</span></div>
      {loading && <div className="empty">正在整理織光杼…</div>}
      {error && <p className="form-error">{error}<button className="text-link" onClick={() => void load()}>重新讀取</button></p>}
      {!loading && !error && bundles.length === 0 && <div className="weaving-empty"><span>◇</span><b>還沒有織光杼</b><p>可從下方成熟素材開始，或手動建立第一張。</p></div>}
      <div className="weaving-project-list">{bundles.map((bundle) => {
        const activeWork = bundle.works.find((work) => !["completed", "sent_to_liaojie", "archived"].includes(work.status)) ?? bundle.works[0];
        return <Link href={`/weaving/${bundle.shuttle.id}${activeWork ? `?work=${encodeURIComponent(activeWork.id)}` : ""}`} className="weaving-project-row shuttle-row" key={bundle.shuttle.id}>
          <div><small>{SHUTTLE_STATUS[bundle.shuttle.status]} · 核心經線 v{currentCore(bundle.shuttle).number}{bundle.legacyProjectId ? " · 舊版待升級" : ""}</small><b>{bundle.shuttle.title}</b><p>{currentCore(bundle.shuttle).statement}</p><em>{bundle.works.length} 件作品</em></div>
          <span>{activeWork ? `${WEAVING_FORMATS[activeWork.format]} · ${WORK_STATUS[activeWork.status]}` : "尚未建立作品"}<br/><b>{activeWork?.nextAction || "建立第一件作品"}</b></span>
        </Link>;
      })}</div>
    </section>
  </>;
}
