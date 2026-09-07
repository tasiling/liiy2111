"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CONTEXT_PRACTICE_MODE_LABELS,
  CONTEXT_ROOM_STATUSES,
  CONTEXT_TOPIC_LABELS,
  contextResultCanCompleteActivity,
  missingContextResultFields,
  parseContextRoomSummary,
  type ContextActivityCandidate,
  type ContextPracticeMode,
  type ContextRoomResult,
  type ContextRoomResultDraft,
  type ContextRoomStatus,
  type ContextTopicLabel,
} from "@/lib/dojo/contextRoomResult";

const CONTEXT_ROOM_URL = "https://lumen-context-room.liiy21110.chatgpt.site";

type SavedResult = ContextRoomResult & { id: string };

async function responseJson<T>(response: Response): Promise<T> {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((json as { error?: string }).error ?? `操作失敗（${response.status}）`);
  return json as T;
}

function taipeiToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function resultSubtitle(result: ContextRoomResult): string {
  const mode = CONTEXT_PRACTICE_MODE_LABELS[result.practiceMode];
  return `${result.topicLabel} · ${mode}${result.secondTakeCompleted ? " · Second Take 完成" : ""}`;
}

export default function EnglishContextRoomBridge({ onCompleted }: { onCompleted?: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [draft, setDraft] = useState<ContextRoomResultDraft | null>(null);
  const [activities, setActivities] = useState<ContextActivityCandidate[]>([]);
  const [recent, setRecent] = useState<SavedResult[]>([]);
  const [linkedActivityId, setLinkedActivityId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/dojo/context-room-results", { cache: "no-store" });
      const result = await responseJson<{ activities: ContextActivityCandidate[]; recent: SavedResult[] }>(response);
      setActivities(result.activities ?? []);
      setRecent(result.recent ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const missing = useMemo(() => draft ? missingContextResultFields(draft) : [], [draft]);
  const canLink = useMemo(() => draft ? contextResultCanCompleteActivity(draft) : false, [draft]);

  function beginPaste() {
    setOpen(true);
    setDraft(null);
    setLinkedActivityId("");
    setError(null);
    setNotice(null);
  }

  function parseSummary() {
    if (!raw.trim()) {
      setError("請先貼上語境修習室產生的成果摘要。");
      return;
    }
    const parsed = parseContextRoomSummary(raw, taipeiToday());
    setDraft(parsed.draft);
    setLinkedActivityId("");
    setError(null);
    setNotice(parsed.missingFields.length
      ? `已保留原文；請在預覽補上：${parsed.missingFields.join("、")}`
      : "解析完成。請確認內容與要關聯的活動，再保存。"
    );
  }

  function patchDraft(patch: Partial<ContextRoomResultDraft>) {
    setDraft((current) => current ? { ...current, ...patch } : current);
  }

  async function save() {
    if (!draft || missing.length) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/dojo/context-room-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, linkedActivityId: linkedActivityId || null }),
      });
      const result = await responseJson<{
        result: SavedResult;
        duplicate: boolean;
        activityLabel: string | null;
      }>(response);
      setNotice(result.duplicate
        ? "這筆語境修習已經記錄，沒有重複增加完成次數。"
        : result.activityLabel
          ? `成果已保存至英文修習紀錄，並只完成「${result.activityLabel}」這一格。`
          : "成果已保存至英文修習紀錄；這次是自由修習，沒有變更週盤或今日三件事。"
      );
      setRecent((current) => [result.result, ...current.filter((item) => item.id !== result.result.id)].slice(0, 3));
      setActivities((current) => result.activityLabel
        ? current.filter((activity) => activity.id !== result.result.linkedActivityId)
        : current
      );
      setDraft(null);
      setRaw("");
      setLinkedActivityId("");
      await onCompleted?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  }

  return <section className="context-room-bridge">
    <div className="context-room-bridge-head">
      <div><span className="eyebrow">英文・素材轉用</span><h4>語境修習室</h4><p>把書籍、影片與課堂素材，轉化成可以寫、可以說、可以跨情境使用的英文。</p></div>
      <span className="context-room-external-mark" aria-hidden="true">↗</span>
    </div>
    <div className="context-room-bridge-actions">
      <a className="primary" href={CONTEXT_ROOM_URL} target="_blank" rel="noreferrer">開啟語境修習室</a>
      <button type="button" onClick={beginPaste}>從語境修習室貼回成果</button>
    </div>

    {open && <div className="context-room-return">
      <div className="context-room-return-title"><div><small>回到行光道場</small><b>{draft ? "確認這次修習成果" : "貼上成果摘要"}</b></div><button type="button" onClick={() => { setOpen(false); setDraft(null); setError(null); setNotice(null); }}>關閉</button></div>
      {!draft ? <>
        <label htmlFor="context-room-summary">語境修習室成果摘要</label>
        <textarea id="context-room-summary" rows={9} value={raw} onChange={(event) => setRaw(event.target.value)} placeholder={'素材：Magic Tree House #1 Chapter 1–3\n完成：解釋 2 / 5\n模式：主題口說\nSecond Take：完成\n留下表達：3 個\n狀態：Responded\n本次卡點：解釋人物動機時容易停頓'} />
        <p>貼入後只會產生預覽，不會立即修改週盤。</p>
        <button type="button" className="primary context-room-parse" onClick={parseSummary}>解析並預覽</button>
      </> : <div className="context-room-preview">
        <div className="context-room-preview-grid">
          <label className="wide">素材名稱 *<input value={draft.materialTitle} onChange={(event) => patchDraft({ materialTitle: event.target.value })} /></label>
          <label className="wide">內容批次／章節<input value={draft.batchLabel} onChange={(event) => patchDraft({ batchLabel: event.target.value })} placeholder="沒有可留空" /></label>
          <label>完成的話題 *<select value={draft.topicLabel ?? ""} onChange={(event) => patchDraft({ topicLabel: (event.target.value || null) as ContextTopicLabel | null })}><option value="">請選擇</option>{CONTEXT_TOPIC_LABELS.map((label) => <option key={label}>{label}</option>)}</select></label>
          <label>話題位置<input type="number" min={1} max={99} value={draft.topicPosition ?? ""} onChange={(event) => patchDraft({ topicPosition: event.target.value ? Number(event.target.value) : null })} placeholder="例如 2" /></label>
          <label>練習模式 *<select value={draft.practiceMode ?? ""} onChange={(event) => patchDraft({ practiceMode: (event.target.value || null) as ContextPracticeMode | null })}><option value="">請選擇</option>{Object.entries(CONTEXT_PRACTICE_MODE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label>語境狀態 *<select value={draft.contextRoomStatus ?? ""} onChange={(event) => patchDraft({ contextRoomStatus: (event.target.value || null) as ContextRoomStatus | null })}><option value="">請選擇</option>{CONTEXT_ROOM_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
          <label>留下表達數<input type="number" min={0} max={99} value={draft.expressionCount} onChange={(event) => patchDraft({ expressionCount: Number(event.target.value) || 0 })} /></label>
          <label>記入日期 *<input type="date" value={draft.practicedOn} onChange={(event) => patchDraft({ practicedOn: event.target.value })} /></label>
        </div>
        <label className="context-room-second-take"><input type="checkbox" checked={draft.secondTakeCompleted} onChange={(event) => patchDraft({ secondTakeCompleted: event.target.checked })} /><span><b>Second Take 已完成</b><small>若成果摘要顯示 Revised Draft，可在此確認。</small></span></label>
        <label>本次卡點<textarea rows={3} value={draft.focus} onChange={(event) => patchDraft({ focus: event.target.value })} placeholder="沒有卡點可以留空" /></label>

        <div className="context-room-link-activity">
          <label htmlFor="context-room-activity">對應的行光道場活動</label>
          <select id="context-room-activity" value={linkedActivityId} disabled={!canLink} onChange={(event) => setLinkedActivityId(event.target.value)}>
            <option value="">不關聯活動，保存為自由修習</option>
            {activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.shortLabel}{activity.assignedDate ? `・已排入 ${activity.assignedDate}` : ""}</option>)}
          </select>
          <small>{canLink ? "只會完成你在這裡選擇的一項活動。" : "目前狀態尚未達完成門檻，仍可保存為自由修習。"}</small>
        </div>
        {missing.length > 0 && <p className="context-room-missing">還需要確認：{missing.join("、")}</p>}
        <div className="context-room-preview-actions"><button type="button" onClick={() => { setDraft(null); setLinkedActivityId(""); }}>返回修改原文</button><button type="button" className="primary" disabled={saving || missing.length > 0} onClick={() => void save()}>{saving ? "保存中…" : "確認保存"}</button></div>
      </div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="save-notice">{notice}</p>}
    </div>}

    {!loading && recent.length > 0 && <details className="context-room-recent"><summary>最近貼回的成果</summary>{recent.map((result) => <div key={result.id}><span><small>{result.practicedOn}</small><b>{result.materialTitle}{result.batchLabel ? `｜${result.batchLabel}` : ""}</b><small>{resultSubtitle(result)}</small></span>{result.linkedActivityCompletedAt ? <em>已完成活動</em> : <em>自由修習</em>}</div>)}</details>}
  </section>;
}
