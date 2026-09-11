"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DAILY_TASK_CATEGORIES, emptyBingoCell, mondayOf, taipeiTodayISO, type DailyTaskCategory, type WeeklyBoard } from "@/lib/dojo/formal";
import { TEXT_SUBTYPES, WEAVING_FORMATS, type TextSubtype, type WeavingProject } from "@/lib/dojo/weavingProjects";
import { WEAVING_TEXT_TOOLS, weavingPrompt } from "@/lib/dojo/weavingTools";

async function json<T>(response: Response): Promise<T> {
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((value as { error?: string }).error || `操作失敗（${response.status}）`);
  return value as T;
}

export default function WeavingProjectWorkbench() {
  const params = useParams<{ id: string }>(); const router = useRouter(); const id = params.id;
  const [project, setProject] = useState<WeavingProject | null>(null);
  const [draft, setDraft] = useState(""); const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null);
  const [boardOpen, setBoardOpen] = useState(false); const [board, setBoard] = useState<WeeklyBoard | null>(null);
  const [selectedCell, setSelectedCell] = useState<number | null>(null); const [boardCategory, setBoardCategory] = useState<DailyTaskCategory>("important");

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/dojo/weaving-projects?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const result = await json<{ project: WeavingProject }>(response); setProject(result.project); setDraft(result.project.draftText);
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  async function patch(values: Partial<WeavingProject>, message?: string) {
    if (!project) return null; setSaving(true); setError(null); setNotice(null);
    try {
      const response = await fetch("/api/dojo/weaving-projects", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: project.id, project: values }) });
      const result = await json<{ project: WeavingProject }>(response); setProject(result.project); setDraft(result.project.draftText); if (message) setNotice(message); return result.project;
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); return null; }
    finally { setSaving(false); }
  }

  const tool = useMemo(() => project ? WEAVING_TEXT_TOOLS[project.formatSubtype] : null, [project]);
  async function copyPrompt() { if (!project) return; await navigator.clipboard.writeText(weavingPrompt(project)); setNotice("已複製包含素材與核心主張的製作指令。"); }
  function openTool() { if (!tool?.href) return; window.open(tool.href, "_blank", "noopener,noreferrer"); }
  async function savePreview() { if (!project || !draft.trim()) return; const next = await patch({ draftText: draft, outputUrl: project.outputUrl, status: "reviewing", nextAction: "確認這份文字可否作為本次成品" }, "預覽內容已確認並保存。"); if (next) setPreview(false); }
  async function complete() { if (!project || (!project.draftText.trim() && !project.outputUrl.trim())) { setError("請先保存文字或成品連結，再確認完成。"); return; } await patch({ outputUrl: project.outputUrl, status: "completed", nextAction: "決定是否送往聊解室" }, "作品已確認完成；不會自動發布或建立其他形式。"); }
  async function sendToLiaojie() {
    if (!project) return; setSaving(true); setError(null);
    try {
      const response = await fetch("/api/dojo/liaojie-projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weavingProjectId: project.id }) });
      const result = await json<{ project: { id: string } }>(response); router.push(`/liaojie/workbench?id=${result.project.id}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); setSaving(false); }
  }
  async function openBoard() {
    if (!project?.nextAction.trim()) return; setBoardOpen(true); setError(null);
    try { const week = mondayOf(taipeiTodayISO()); const response = await fetch(`/api/dojo/bingo?week=${week}`, { cache: "no-store" }); const result = await json<{ board: WeeklyBoard }>(response); setBoard(result.board); }
    catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
  }
  async function addToBoard() {
    if (!project || !board || selectedCell === null) return; const cell = board.cells[selectedCell];
    if (!cell || cell.index === 12 || cell.text.trim()) { setError("請選擇一個空白週盤格。"); return; }
    const next: WeeklyBoard = { ...board, colorsConfirmedAt: null, cells: board.cells.map((item) => item.index !== selectedCell ? item : { ...emptyBingoCell(item.index, board.weekStart), text: project.nextAction, shortLabel: project.nextAction.slice(0, 12), category: boardCategory, sourceType: "project", sourceId: project.id }) };
    setSaving(true); setError(null);
    try { const response = await fetch("/api/dojo/bingo", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weekStart: board.weekStart, board: next }) }); const result = await json<{ board: WeeklyBoard }>(response); setBoard(result.board); setBoardOpen(false); setSelectedCell(null); setNotice("只把這一個具體動作排入本週；作品狀態沒有被改動。"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setSaving(false); }
  }
  async function archive() { if (!project || !window.confirm("確定封存這張織光案嗎？資料仍可在 Notion 垃圾桶復原。")) return; const response = await fetch(`/api/dojo/weaving-projects?id=${encodeURIComponent(project.id)}`, { method: "DELETE" }); await json(response); router.push("/weaving"); }

  if (loading) return <section className="screen"><div className="empty">正在打開這張織光案…</div></section>;
  if (!project) return <section className="screen"><p className="form-error">{error || "找不到織光案"}</p></section>;
  const textReady = project.format === "text";
  return <section className="screen weaving-workbench-screen">
    <div className="hero we"><span className="eyebrow">織光案 · {WEAVING_FORMATS[project.format]}</span><h1>{project.title}</h1><p>{project.coreStatement}</p></div>
    {error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="save-notice" role="status">{notice}</p>}
    <section className="ritual-card source-work-card"><span className="eyebrow">來源素材</span><details><summary>查看本次使用的來源快照</summary><p>{project.sourceSnapshot || "手動題材"}</p></details><label>本次唯一核心主張</label><textarea className="field" rows={3} value={project.coreStatement} onChange={(event) => setProject({ ...project, coreStatement: event.target.value })}/><label>受眾（可稍後補）</label><input className="field" value={project.audience} onChange={(event) => setProject({ ...project, audience: event.target.value })} placeholder="例如：正在練習顯化、但容易責怪自己的讀者"/><button disabled={saving} onClick={() => void patch({ coreStatement: project.coreStatement, audience: project.audience }, "作品方向已保存。")}>保存作品方向</button></section>

    {!textReady ? <section className="ritual-card future-format-card"><span className="eyebrow">延伸骨架</span><h2>{project.format === "comic" ? "漫畫工作台將在第二階段開放" : "影片工作台將在第三階段開放"}</h2><p>這張案已安全保存，但不會自動產生文字、漫畫、影片三組待辦。</p></section> : <>
      <section className="ritual-card"><span className="eyebrow">文字路徑</span><h2>這次要完成哪一種文字？</h2><div className="text-subtype-grid">{(Object.entries(TEXT_SUBTYPES) as [TextSubtype,string][]).filter(([key]) => key !== "lesson_legacy").map(([key,label]) => <button key={key} className={project.formatSubtype === key ? "on" : ""} onClick={() => void patch({ formatSubtype: key, toolKey: WEAVING_TEXT_TOOLS[key].key, status: "drafting", nextAction: "開啟工具並完成文字初稿" })}>{label}</button>)}</div></section>
      {tool && <section className="ritual-card tool-handoff-card"><span className="eyebrow">製作工具</span><h2>{tool.label}</h2><p>{tool.note}</p><div className="two"><button onClick={() => void copyPrompt()}>複製完整製作指令</button>{tool.href && <button className="primary" onClick={openTool}>新分頁開啟工具</button>}</div></section>}
      <section className="ritual-card draft-return-card"><span className="eyebrow">外部結果貼回</span><h2>先貼回，再預覽</h2><p className="lead">貼上的內容不會立刻覆蓋已保存草稿。</p><textarea className="field work-draft-field" rows={14} value={draft} onChange={(event) => { setDraft(event.target.value); setPreview(false); }} placeholder="把完成文字貼在這裡。下一步先看完整預覽，再確認保存。"/><label>成品連結（可稍後補）</label><input className="field" type="url" value={project.outputUrl} onChange={(event) => setProject({ ...project, outputUrl: event.target.value })} placeholder="https://…"/><div className="two"><button disabled={!draft.trim()} onClick={() => setPreview(true)}>預覽完整文字</button><button disabled={saving} onClick={() => void patch({ outputUrl: project.outputUrl }, "成品連結已保存。")}>保存連結</button></div></section>
      {preview && <section className="ritual-card text-preview-card"><div className="section-heading"><div><span className="eyebrow">保存前預覽</span><h2>{project.title}</h2></div><button onClick={() => setPreview(false)}>返回修改</button></div><div className="full-text-preview">{draft}</div><button className="primary" disabled={saving} onClick={() => void savePreview()}>{saving ? "保存中…" : "確認預覽並保存"}</button></section>}
    </>}

    <section className="ritual-card next-action-card"><span className="eyebrow">現在狀態與下一步</span><h2>{project.nextAction}</h2><label>下一個可直接執行的動作</label><input className="field" value={project.nextAction} onChange={(event) => setProject({ ...project, nextAction: event.target.value })} placeholder="例如：決定 IG 封面文字"/><div className="two"><button onClick={() => void patch({ nextAction: project.nextAction }, "下一步已保存。")}>保存下一步</button><button onClick={() => void openBoard()}>排入本週一格</button></div>{project.status !== "completed" && project.status !== "sent_to_liaojie" && <button className="primary full-button" disabled={saving} onClick={() => void complete()}>確認這件作品完成</button>}{project.status === "completed" && <button className="primary full-button" disabled={saving} onClick={() => void sendToLiaojie()}>手動送往聊解室</button>}{project.status === "sent_to_liaojie" && <button className="full-button" onClick={() => router.push("/liaojie/workbench")}>前往聊解室工作台</button>}</section>
    {boardOpen && board && <div className="modal show" onClick={(event) => event.target === event.currentTarget && setBoardOpen(false)}><section className="sheet board-picker-sheet"><div className="toolbar"><h2>排入本週一格</h2><button onClick={() => setBoardOpen(false)}>關閉</button></div><p>只排入「{project.nextAction}」，不代表整件作品完成。</p><div className="board-empty-grid">{board.cells.filter((cell) => cell.index !== 12 && !cell.text.trim()).map((cell) => <button key={cell.index} className={selectedCell === cell.index ? "on" : ""} onClick={() => setSelectedCell(cell.index)}>第 {cell.index + 1} 格</button>)}</div><label>本週分類</label><div className="row">{(Object.keys(DAILY_TASK_CATEGORIES) as DailyTaskCategory[]).map((category) => <button key={category} className={boardCategory === category ? "on" : ""} onClick={() => setBoardCategory(category)}>{DAILY_TASK_CATEGORIES[category].label.replace(/^一件/, "")}</button>)}</div><button className="primary" disabled={selectedCell === null || saving} onClick={() => void addToBoard()}>確認排入這一格</button></section></div>}
    <button className="danger-button archive-project-button" onClick={() => void archive()}>封存這張織光案</button>
  </section>;
}
