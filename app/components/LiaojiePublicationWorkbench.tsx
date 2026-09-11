"use client";

import { useCallback, useEffect, useState } from "react";
import { LIAOJIE_PLATFORMS, type LiaojiePlatform, type LiaojiePublicationProject } from "@/lib/dojo/liaojiePublication";

const STATUS: Record<LiaojiePublicationProject["status"], string> = { received: "已接收", packaging: "品牌整理中", ready: "可發布", scheduled: "已安排", published: "已發布", archived: "已封存" };
async function json<T>(response: Response): Promise<T> { const value = await response.json().catch(() => ({})); if (!response.ok) throw new Error((value as { error?: string }).error || `操作失敗（${response.status}）`); return value as T; }

export default function LiaojiePublicationWorkbench({ initialId }: { initialId: string | null }) {
  const [projects, setProjects] = useState<LiaojiePublicationProject[]>([]); const [selectedId, setSelectedId] = useState(initialId);
  const [draft, setDraft] = useState<LiaojiePublicationProject | null>(null); const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const response = await fetch("/api/dojo/liaojie-projects", { cache: "no-store" }); const result = await json<{ projects: LiaojiePublicationProject[] }>(response); setProjects(result.projects ?? []); const selected = result.projects.find((item) => item.id === selectedId) ?? result.projects[0] ?? null; setSelectedId(selected?.id ?? null); setDraft(selected); }
    catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setLoading(false); }
  }, [selectedId]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  function choose(project: LiaojiePublicationProject) { setSelectedId(project.id); setDraft(project); setPreview(false); setNotice(null); setError(null); }
  function update(values: Partial<LiaojiePublicationProject>) { if (draft) { setDraft({ ...draft, ...values }); setPreview(false); } }
  async function save(status: LiaojiePublicationProject["status"]) {
    if (!draft || !preview) { setError("請先預覽首發版本，再確認保存。"); return; }
    if (!draft.title.trim()) { setError("請先填寫標題。"); return; }
    setSaving(true); setError(null); setNotice(null);
    const nextStep = status === "published" ? "留下這次發布的精簡回看" : status === "scheduled" ? "依安排日期發布並補上連結" : "決定是否安排發布日期";
    try { const response = await fetch("/api/dojo/liaojie-projects", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: draft.id, project: { ...draft, status, nextStep } }) }); const result = await json<{ project: LiaojiePublicationProject }>(response); setDraft(result.project); setProjects((rows) => rows.map((item) => item.id === result.project.id ? result.project : item)); setNotice(status === "published" ? "已標記發布；沒有自動建立其他平台版本。" : status === "scheduled" ? "發布日期已安排。" : "首發版本已保存。"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setSaving(false); }
  }
  async function saveReview() { if (!draft) return; setSaving(true); setError(null); try { const response = await fetch("/api/dojo/liaojie-projects", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: draft.id, project: { responseNote: draft.responseNote, nextStep: draft.nextStep } }) }); const result = await json<{ project: LiaojiePublicationProject }>(response); setDraft(result.project); setNotice("這次回看已保存。"); } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); } finally { setSaving(false); } }
  async function archive() { if (!draft || !window.confirm("確定封存這張聊解企劃嗎？資料仍可在 Notion 垃圾桶復原。")) return; const response = await fetch(`/api/dojo/liaojie-projects?id=${encodeURIComponent(draft.id)}`, { method: "DELETE" }); await json(response); setSelectedId(null); await load(); }

  return <section className="screen liaojie-workbench-screen">
    <div className="hero li"><span className="eyebrow">全零聊解室</span><h1>聊解室工作台</h1><p>接收已完成作品，整理成一個可面向讀者的首發版本。</p></div>
    {loading && <div className="empty">正在整理待發布作品…</div>}{error && <p className="form-error">{error}</p>}{notice && <p className="save-notice">{notice}</p>}
    {!loading && projects.length === 0 && <div className="weaving-empty"><span>◇</span><b>還沒有送來的作品</b><p>作品只有在織光堂按下「送往聊解室」後才會出現。</p></div>}
    {projects.length > 0 && <div className="publication-project-tabs">{projects.map((project) => <button key={project.id} className={selectedId === project.id ? "on" : ""} onClick={() => choose(project)}><small>{STATUS[project.status]}</small><b>{project.title || project.sourceTitle}</b></button>)}</div>}
    {draft && <>
      <section className="ritual-card publication-source-card"><span className="eyebrow">來源作品</span><h2>{draft.sourceTitle}</h2><p><b>原始核心主張</b>{draft.sourceCoreStatement}</p>{draft.sourceOutputUrl && <a href={draft.sourceOutputUrl} target="_blank" rel="noreferrer">查看織光堂成品 ↗</a>}<details><summary>查看送來的文字快照</summary><div className="full-text-preview">{draft.sourceDraftSnapshot || "這件作品以外部成品連結為主。"}</div></details></section>
      <section className="ritual-card publication-fields"><span className="eyebrow">品牌編排</span><h2>先完成一個首發版本</h2>
        <label>品牌角度</label><textarea className="field" rows={3} value={draft.brandAngle} onChange={(event) => update({ brandAngle: event.target.value })} placeholder="全零聊解室要從哪個觀點帶讀者看這件作品？"/>
        <label>受眾</label><input className="field" value={draft.audience} onChange={(event) => update({ audience: event.target.value })}/>
        <label>首發平台</label><div className="platform-picker">{(Object.entries(LIAOJIE_PLATFORMS) as [LiaojiePlatform,string][]).map(([key,label]) => <button key={key} className={draft.platform === key ? "on" : ""} onClick={() => update({ platform: key })}>{label}</button>)}</div>
        <label>標題</label><input className="field" value={draft.title} onChange={(event) => update({ title: event.target.value })}/>
        <label>封面文案</label><textarea className="field" rows={2} value={draft.coverCopy} onChange={(event) => update({ coverCopy: event.target.value })} placeholder="只有平台需要封面時才填。"/>
        <label>簡介／首發版本摘要</label><textarea className="field" rows={5} value={draft.summary} onChange={(event) => update({ summary: event.target.value })}/>
        <label>CTA</label><textarea className="field" rows={2} value={draft.callToAction} onChange={(event) => update({ callToAction: event.target.value })} placeholder="希望讀者看完後做什麼？可留白。"/>
        <label>主題週／主題群組（可稍後補）</label><input className="field" value={draft.themeGroup} onChange={(event) => update({ themeGroup: event.target.value })}/>
        <label>發布日期</label><input className="field" type="date" value={draft.scheduledOn?.slice(0,10) ?? ""} onChange={(event) => update({ scheduledOn: event.target.value || null })}/>
        <label>發布連結</label><input className="field" type="url" value={draft.publishedUrl} onChange={(event) => update({ publishedUrl: event.target.value })} placeholder="標記已發布前必填"/>
        <button className="primary full-button" onClick={() => setPreview(true)}>預覽首發版本</button>
      </section>
      {preview && <section className="ritual-card publication-preview"><span className="eyebrow">{LIAOJIE_PLATFORMS[draft.platform]} · 首發預覽</span><h2>{draft.coverCopy || draft.title}</h2>{draft.coverCopy && <h3>{draft.title}</h3>}<p>{draft.summary || draft.sourceDraftSnapshot}</p>{draft.callToAction && <blockquote>{draft.callToAction}</blockquote>}<div className="publication-save-actions"><button disabled={saving} onClick={() => void save("ready")}>先保存</button><button disabled={saving} onClick={() => void save("scheduled")}>安排發布</button><button className="primary" disabled={saving} onClick={() => void save("published")}>已發布</button></div></section>}
      {draft.status === "published" && <section className="ritual-card publication-review"><span className="eyebrow">發布後回看</span><h2>只留下能幫助下次創作的資訊</h2><label>滿意的部分、實際反應與要保留或改寫的表達</label><textarea className="field" rows={6} value={draft.responseNote} onChange={(event) => setDraft({ ...draft, responseNote: event.target.value })} placeholder="不用抄完整數據，只留下真正會影響下一次創作的內容。"/><label>下一步是否值得延伸？</label><input className="field" value={draft.nextStep} onChange={(event) => setDraft({ ...draft, nextStep: event.target.value })}/><button disabled={saving} onClick={() => void saveReview()}>保存精簡回看</button></section>}
      <button className="danger-button archive-project-button" onClick={() => void archive()}>封存這張聊解企劃</button>
    </>}
  </section>;
}
