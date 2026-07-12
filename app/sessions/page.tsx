"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  SESSION_STATUS_ORDER,
  SESSION_項目用途,
  DETAIL_STATUS_ORDER,
  normalizeDetailStatus,
  normalizeSessionStatus,
} from "@/lib/notion/schema";

const STATUS_ORDER: readonly string[] = SESSION_STATUS_ORDER;
const 項目用途_OPTIONS: readonly string[] = SESSION_項目用途;
const DETAIL_STATUSES: readonly string[] = DETAIL_STATUS_ORDER;

type SessionRow = {
  id: string;
  Session編號: string;
  狀態: string | null;
  模式: string | null;
  項目用途: string | null;
  產出連結?: string | null;
};

type Deck = { id: string; 牌組代碼: string; 牌組名稱: string };

type DetailRow = {
  id: string;
  明細編號: string;
  對應日期: string | null;
  抽出順序: string;
  明細狀態: string | null;
};

export default function SessionsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">載入中…</p>}>
      <SessionsPageInner />
    </Suspense>
  );
}

function SessionsPageInner() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const rowRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  function refreshSessions() {
    return fetch("/api/sessions")
      .then((r) => r.json())
      .then((d) => {
        setSessions(d.sessions ?? []);
        return d.sessions ?? [];
      });
  }

  useEffect(() => {
    fetch("/api/decks")
      .then((r) => r.json())
      .then((d) => setDecks(d.decks ?? []));

    // 從行事曆任務點擊跳轉過來時(?sessionId=xxx),自動展開該 Session 明細並捲動定位。
    // 若目標不在近期清單(建立日期超過 60 天)內,直接補查該筆表頭,插入清單最前面顯示。
    const targetId = searchParams.get("sessionId");
    refreshSessions().then(async (loaded: SessionRow[]) => {
      if (!targetId) return;
      let target = loaded.find((s) => s.id === targetId);
      if (!target) {
        try {
          const r = await fetch(`/api/sessions/${targetId}`);
          if (r.ok) {
            const data = await r.json();
            target = data.session;
            if (target) setSessions((prev) => [target as SessionRow, ...prev]);
          }
        } catch {
          // 查無此筆(如 ID 錯誤或已刪除),不阻斷頁面,底下 highlightId 找不到對應列即安靜略過。
        }
      }
      if (target) {
        setHighlightId(target.id);
        await openDetails(target.id);
        rowRefs.current.get(target.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setMsg(`找不到指定的 Session(${targetId}),可能已刪除或 ID 有誤。`);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshDetails(sessionId: string) {
    const res = await fetch(`/api/sessions/${sessionId}/details`);
    const data = await res.json();
    setDetails(data.details ?? []);
  }

  async function openDetails(sessionId: string) {
    if (expandedId === sessionId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(sessionId);
    await refreshDetails(sessionId);
  }

  async function advanceStatus(session: SessionRow, newStatus: string) {
    const curIdx = STATUS_ORDER.indexOf(normalizeSessionStatus(session.狀態));
    const nextIdx = STATUS_ORDER.indexOf(newStatus);
    const isSkip = nextIdx > curIdx + 1;
    if (isSkip && !confirm(`「${newStatus}」跳過了中間步驟,確定要跳步嗎?`)) return;

    const res = await fetch(`/api/sessions/${session.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus, allowSkip: isSkip }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(`狀態更新失敗:${data.error}`);
      return;
    }
    setMsg(`已將 ${session.Session編號} 狀態改為 ${newStatus}`);
    refreshSessions();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">P5 Session 工作站</h1>
      {msg && <p className="text-sm text-blue-700 dark:text-blue-400">{msg}</p>}

      <BatchCreateForm onCreated={refreshSessions} />
      <SingleCreateForm onCreated={refreshSessions} />

      <section className="border border-black/10 dark:border-white/15 rounded-lg p-4">
        <h2 className="font-medium mb-3">近期 Session</h2>
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => (
            <li
              key={s.id}
              ref={(el) => {
                if (el) rowRefs.current.set(s.id, el);
                else rowRefs.current.delete(s.id);
              }}
              className={`border rounded p-3 ${
                highlightId === s.id
                  ? "border-blue-500 ring-2 ring-blue-500"
                  : "border-black/5 dark:border-white/10"
              }`}
            >
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="font-mono">{s.Session編號}</span>
                <span className="text-xs text-zinc-500">{s.項目用途}</span>
                <span className="text-xs text-zinc-500">{s.模式}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                  {normalizeSessionStatus(s.狀態)}
                </span>
                <select
                  className="ml-auto text-xs border rounded px-1 py-0.5 bg-transparent"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) advanceStatus(s, e.target.value);
                    e.target.value = "";
                  }}
                >
                  <option value="">推進狀態…</option>
                  {STATUS_ORDER.filter((st) => st !== normalizeSessionStatus(s.狀態)).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <button
                  className="text-xs underline"
                  onClick={() => openDetails(s.id)}
                >
                  {expandedId === s.id ? "收合明細" : "查看明細"}
                </button>
              </div>
              <OutputLinkEditor
                session={s}
                onSaved={(url) =>
                  setSessions((prev) => prev.map((row) => (row.id === s.id ? { ...row, 產出連結: url } : row)))
                }
              />
              {expandedId === s.id && (
                <>
                  <DetailList
                    details={details}
                    decks={decks}
                    onDrawn={() => refreshDetails(s.id)}
                    onStatusChanged={() => refreshDetails(s.id)}
                  />
                  {details.length > 0 &&
                    details.every((d) => d.明細狀態 === "已交付") &&
                    s.狀態 !== "已交付" && (
                      <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/10 text-sm flex items-center gap-2">
                        <span className="text-green-700 dark:text-green-400">
                          全數明細已交付。
                        </span>
                        <button
                          onClick={() => advanceStatus(s, "已交付")}
                          className="px-2 py-1 rounded bg-foreground text-background text-xs"
                        >
                          確認將 Session 狀態推進為「已交付」
                        </button>
                      </div>
                    )}
                </>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function BatchCreateForm({ onCreated }: { onCreated: () => void }) {
  const [項目用途, set項目用途] = useState(項目用途_OPTIONS[1]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState(14);
  const [result, setResult] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/sessions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 項目用途, startDate, days }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "建立失敗");
      const failMsg = data.failed?.length ? `,${data.failed.length} 筆失敗` : "";
      setResult(`已建立 ${data.sessionCode},成功 ${data.succeeded.length} 筆明細${failMsg}`);
      onCreated();
    } catch (e) {
      setResult(`錯誤:${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="border border-black/10 dark:border-white/15 rounded-lg p-4">
      <h2 className="font-medium mb-3">批次建立(如雙週一更占卜 14 天份)</h2>
      <div className="flex flex-wrap gap-2 items-end text-sm">
        <label className="flex flex-col gap-1">
          項目用途
          <select
            className="border rounded px-2 py-1 bg-transparent"
            value={項目用途}
            onChange={(e) => set項目用途(e.target.value)}
          >
            {項目用途_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          起始日期
          <input
            type="date"
            className="border rounded px-2 py-1 bg-transparent"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          天數
          <input
            type="number"
            min={1}
            className="border rounded px-2 py-1 bg-transparent w-20"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          />
        </label>
        <button
          disabled={submitting}
          onClick={submit}
          className="px-3 py-1.5 rounded bg-foreground text-background text-sm disabled:opacity-50"
        >
          {submitting ? "建立中…" : "一鍵建立"}
        </button>
      </div>
      {result && <p className="text-sm mt-2">{result}</p>}
    </section>
  );
}

function SingleCreateForm({ onCreated }: { onCreated: () => void }) {
  const [項目用途, set項目用途] = useState(項目用途_OPTIONS[0]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/sessions/single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 項目用途, date }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "建立失敗");
      setResult(`已建立 ${data.sessionCode}`);
      onCreated();
    } catch (e) {
      setResult(`錯誤:${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="border border-black/10 dark:border-white/15 rounded-lg p-4">
      <h2 className="font-medium mb-3">單筆建立(如月能量流)</h2>
      <div className="flex flex-wrap gap-2 items-end text-sm">
        <label className="flex flex-col gap-1">
          項目用途
          <select
            className="border rounded px-2 py-1 bg-transparent"
            value={項目用途}
            onChange={(e) => set項目用途(e.target.value)}
          >
            {項目用途_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          日期
          <input
            type="date"
            className="border rounded px-2 py-1 bg-transparent"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <button
          disabled={submitting}
          onClick={submit}
          className="px-3 py-1.5 rounded bg-foreground text-background text-sm disabled:opacity-50"
        >
          {submitting ? "建立中…" : "建立"}
        </button>
      </div>
      {result && <p className="text-sm mt-2">{result}</p>}
    </section>
  );
}

function DetailList({
  details,
  decks,
  onDrawn,
  onStatusChanged,
}: {
  details: DetailRow[];
  decks: Deck[];
  onDrawn: () => void;
  onStatusChanged: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchTarget, setBatchTarget] = useState("");
  const [batchMsg, setBatchMsg] = useState<string | null>(null);
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  // 空值一律視同「待產出」(防禦性 fallback),不讓儀表/清單出現黑數;
  // 推進動作照常寫入真值,舊資料重新整理後就會顯示真的狀態。
  const summary: Record<string, number> = Object.fromEntries(DETAIL_STATUSES.map((s) => [s, 0]));
  for (const d of details) {
    summary[normalizeDetailStatus(d.明細狀態)]++;
  }

  // 多選批次推進:所選明細目前狀態須一致,才能明確知道「推進到下一步」是哪一步,
  // 避免混合狀態時的跳步語意不清。
  const selectedDetails = details.filter((d) => selected.has(d.id));
  const selectedCurrentStatuses = new Set(selectedDetails.map((d) => normalizeDetailStatus(d.明細狀態)));
  const uniformCurrent = selectedCurrentStatuses.size === 1 ? [...selectedCurrentStatuses][0] : null;
  const nextForUniform =
    uniformCurrent && DETAIL_STATUSES.includes(uniformCurrent)
      ? DETAIL_STATUSES[DETAIL_STATUSES.indexOf(uniformCurrent) + 1]
      : undefined;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function applyBatch() {
    if (!batchTarget || selected.size === 0) return;
    setBatchSubmitting(true);
    setBatchMsg(null);
    try {
      const res = await fetch("/api/details/batch-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detailIds: [...selected], newStatus: batchTarget }),
      });
      const data = await res.json();
      const failMsg = data.failed?.length ? `,${data.failed.length} 筆失敗:${data.failed.map((f: { error: string }) => f.error).join(";")}` : "";
      setBatchMsg(`成功 ${data.succeeded?.length ?? 0} 筆${failMsg}`);
      setSelected(new Set());
      setBatchTarget("");
      onStatusChanged();
    } finally {
      setBatchSubmitting(false);
    }
  }

  return (
    <div className="mt-3 border-t border-black/5 dark:border-white/10 pt-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 mb-2">
        <span>明細狀態匯總:</span>
        {DETAIL_STATUSES.map((s) => (
          <span key={s}>
            {s} {summary[s]}/{details.length}
          </span>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 text-xs mb-2">
          <span>已選 {selected.size} 筆</span>
          {uniformCurrent && nextForUniform ? (
            <>
              <button
                disabled={batchSubmitting}
                onClick={() => setBatchTarget(nextForUniform)}
                className={`px-2 py-1 rounded border ${batchTarget === nextForUniform ? "bg-foreground text-background" : "border-black/15 dark:border-white/20"}`}
              >
                推進為「{nextForUniform}」
              </button>
              {batchTarget === nextForUniform && (
                <button
                  disabled={batchSubmitting}
                  onClick={applyBatch}
                  className="px-2 py-1 rounded bg-foreground text-background disabled:opacity-50"
                >
                  {batchSubmitting ? "送出中…" : "確認套用"}
                </button>
              )}
            </>
          ) : (
            <span className="text-orange-600 dark:text-orange-400">
              所選明細目前狀態不一致,請個別操作或篩選同狀態再批次推進
            </span>
          )}
        </div>
      )}
      {batchMsg && <p className="text-xs text-blue-700 dark:text-blue-400 mb-2">{batchMsg}</p>}

      <ul className="flex flex-col gap-2">
        {details.map((d) => (
          <DetailRowItem
            key={d.id}
            detail={d}
            decks={decks}
            onDrawn={onDrawn}
            onStatusChanged={onStatusChanged}
            selected={selected.has(d.id)}
            onToggleSelect={() => toggle(d.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function DetailRowItem({
  detail,
  decks,
  onDrawn,
  onStatusChanged,
  selected,
  onToggleSelect,
}: {
  detail: DetailRow;
  decks: Deck[];
  onDrawn: () => void;
  onStatusChanged: () => void;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const [deckCode, setDeckCode] = useState(decks[0]?.牌組代碼 ?? "");
  const [numbers, setNumbers] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setMsg(null);
    try {
      const cardNumbers = numbers
        .split(/[,\s]+/)
        .filter(Boolean)
        .map((n) => Number(n));
      const res = await fetch("/api/sessions/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detailId: detail.id, deckCode, cardNumbers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(`已記錄:${data.抽出順序}`);
      onDrawn();
    } catch (e) {
      setMsg(`錯誤:${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function advanceDetailStatus(newStatus: string) {
    setStatusMsg(null);
    const res = await fetch(`/api/details/${detail.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatusMsg(`失敗:${data.error}`);
      return;
    }
    onStatusChanged();
  }

  return (
    <li className="text-sm flex flex-wrap items-center gap-2">
      <input type="checkbox" checked={selected} onChange={onToggleSelect} />
      <span className="font-mono text-xs">{detail.明細編號}</span>
      <span className="text-xs text-zinc-500">{detail.對應日期}</span>
      <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
        {normalizeDetailStatus(detail.明細狀態)}
      </span>
      <select
        className="text-xs border rounded px-1 py-0.5 bg-transparent"
        value=""
        onChange={(e) => {
          if (e.target.value) advanceDetailStatus(e.target.value);
          e.target.value = "";
        }}
      >
        <option value="">推進明細狀態…</option>
        {DETAIL_STATUSES.filter(
          (st) => DETAIL_STATUSES.indexOf(st) > DETAIL_STATUSES.indexOf(normalizeDetailStatus(detail.明細狀態))
        ).map((st) => (
          <option key={st} value={st}>
            {st}
          </option>
        ))}
      </select>
      {statusMsg && <span className="text-xs text-red-600">{statusMsg}</span>}
      {detail.抽出順序 ? (
        <span className="text-xs">{detail.抽出順序}</span>
      ) : (
        <>
          <select
            className="text-xs border rounded px-1 py-0.5 bg-transparent"
            value={deckCode}
            onChange={(e) => setDeckCode(e.target.value)}
          >
            {decks.map((d) => (
              <option key={d.id} value={d.牌組代碼}>
                {d.牌組代碼} {d.牌組名稱}
              </option>
            ))}
          </select>
          <input
            className="text-xs border rounded px-1 py-0.5 bg-transparent w-32"
            placeholder="牌號,如 15,17,9"
            value={numbers}
            onChange={(e) => setNumbers(e.target.value)}
          />
          <button
            disabled={submitting}
            onClick={submit}
            className="text-xs px-2 py-0.5 rounded bg-foreground text-background disabled:opacity-50"
          >
            {submitting ? "送出中…" : "登記抽牌"}
          </button>
        </>
      )}
      {msg && <span className="text-xs text-blue-700 dark:text-blue-400">{msg}</span>}
    </li>
  );
}

// 「產出連結」檢視與編輯(擁有者追加指示):支援內容完成後手動補登記連結,純欄位覆寫,
// 不牽動狀態機。留空儲存代表清空(撤銷誤填的連結)。
function OutputLinkEditor({
  session,
  onSaved,
}: {
  session: SessionRow;
  onSaved: (url: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(session.產出連結 ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${session.id}/output-link`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "儲存失敗");
      onSaved(value.trim() || null);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 text-xs mt-1">
        <span className="text-zinc-500">產出連結:</span>
        {session.產出連結 ? (
          <a
            href={session.產出連結}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-700 dark:text-blue-400 truncate max-w-xs"
          >
            {session.產出連結}
          </a>
        ) : (
          <span className="text-zinc-400">未登記</span>
        )}
        <button className="underline" onClick={() => setEditing(true)}>
          編輯
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs mt-1">
      <span className="text-zinc-500">產出連結:</span>
      <input
        className="border rounded px-1 py-0.5 bg-transparent flex-1 min-w-0"
        placeholder="貼上內容成品連結(留空儲存=清空)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        disabled={saving}
        onClick={save}
        className="px-2 py-0.5 rounded bg-foreground text-background disabled:opacity-50"
      >
        {saving ? "儲存中…" : "儲存"}
      </button>
      <button
        disabled={saving}
        onClick={() => {
          setValue(session.產出連結 ?? "");
          setEditing(false);
          setError(null);
        }}
      >
        取消
      </button>
      {error && <span className="text-red-600">{error}</span>}
    </div>
  );
}
