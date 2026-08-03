"use client";

// 日上三更・指令產生器(聊解室 → 日上三更)。依擁有者驗證過的 HTML 原型實作,
// 版面結構、四步驟流程、按鈕列(非下拉選單)、25 光站收合展開皆照原型,不重新設計。
//
// 與原型的差異(擁有者明確指示的三處):
// 1. 語氣指引改讀 DB-14(resolveToneGuide,伺服器端 /api/sanko/compose 內完成),
//    不寫死在前端。
// 2. 25 光站改讀 DB-11(/api/sanko/stations);DB-11 尚未建檔完成,只顯示現有項目,
//    無資料則顯示「光站尚未建檔」並保留自由輸入。
// 3. 八方法規格集中在 lib/dojo/methods.ts,維持寫死(總綱凍結清單)。
//
// 新增(原型沒有):待產出清單入口、貼回生成結果存草稿、完成回寫 DB-04。
// 草稿與產出連結(2026-08-01 擁有者於 Notion 新增對應欄位後)一律直接寫 Notion,
// 不經瀏覽器暫存——App 掛掉時擁有者必須能在 Notion 直接看到草稿並手動接手。
// 詳見 docs/schema/日上三更指令產生器.md。
//
// 批次建立與產出清單(委派書 v1.0,2026-08-03):比照 sanko-batch-prototype.html
// 實作,依日期×更次(晨光/日光/夜光)分組呈現,不再讓使用者面對裸的明細編號。
// 點「產出」進入的就是這份檔案原有的生成流程(選方法→輸入牌→選光站→補充→
// 產生指令→複製→貼回→標記完成),沿用既有邏輯,只是入口從清單換成日期卡。
// 拍照辨牌(委派書 §4.2 引用的舊規格)確認不接——實際上線的生成流程本來就
// 沒有這步,擁有者已確認不要臨時加。
import { useEffect, useMemo, useRef, useState } from "react";
import { SANKO_METHOD_LIST, type SankoMethodKey } from "@/lib/dojo/methods";
import { useBackableState } from "@/lib/dojo/backstack";
import { normalizeDetailStatus } from "@/lib/notion/schema";

type SankoUpdateType = "晨光" | "日光" | "夜光";
const UPDATE_TYPES: SankoUpdateType[] = ["晨光", "日光", "夜光"];
const UPDATE_INFO: Record<SankoUpdateType, { desc: string; mode: "生成" | "完成"; colorVar: string }> = {
  晨光: { desc: "直覺入口", mode: "生成", colorVar: "var(--morning)" },
  日光: { desc: "自我辨識", mode: "生成", colorVar: "var(--day)" },
  夜光: { desc: "服務理解 · 全圖文", mode: "完成", colorVar: "var(--night)" },
};
const BATCH_DAY_OPTIONS = [7, 14, 21, 28];
const WD = ["日", "一", "二", "三", "四", "五", "六"];

type PendingDetail = {
  id: string;
  明細編號: string;
  對應日期: string | null;
  抽出順序: string;
  所屬Session: string | null;
  明細狀態: string | null;
  草稿: string;
  產出連結: string | null;
  更次: SankoUpdateType | null;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function fmtMD(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
function fmtWD(iso: string): string {
  return `週${WD[new Date(iso + "T00:00:00").getDay()]}`;
}

type BatchGroup = {
  sessionId: string;
  start: string;
  end: string;
  days: { date: string; slots: Record<SankoUpdateType, PendingDetail | null> }[];
};

// 依「所屬 Session」還原成一批一批(委派書裁決:一個 Session 涵蓋整個日期範圍,
// 不是一天一個 Session),再依對應日期展開日期卡、依更次分到三個欄位。
function groupIntoBatches(details: PendingDetail[]): BatchGroup[] {
  const bySession = new Map<string, PendingDetail[]>();
  for (const d of details) {
    if (!d.所屬Session || !d.對應日期) continue;
    const list = bySession.get(d.所屬Session) ?? [];
    list.push(d);
    bySession.set(d.所屬Session, list);
  }
  const groups: BatchGroup[] = [];
  for (const [sessionId, items] of bySession) {
    const byDate = new Map<string, Record<SankoUpdateType, PendingDetail | null>>();
    for (const item of items) {
      const date = item.對應日期 as string;
      const slots = byDate.get(date) ?? { 晨光: null, 日光: null, 夜光: null };
      if (item.更次) slots[item.更次] = item;
      byDate.set(date, slots);
    }
    const dates = [...byDate.keys()].sort();
    if (!dates.length) continue;
    groups.push({
      sessionId,
      start: dates[0],
      end: dates[dates.length - 1],
      days: dates.map((date) => ({ date, slots: byDate.get(date)! })),
    });
  }
  // 新批次(起始日較晚)排前面,對齊原型 unshift 新批次到最前面的呈現順序。
  return groups.sort((a, b) => b.start.localeCompare(a.start));
}

type SankoDraft = {
  methodKey: SankoMethodKey | null;
  cards: string;
  station: string;
  extra: string;
  prompt: string | null;
  meta: string | null;
  draftText: string;
  outputLink: string;
};

const EMPTY_DRAFT: SankoDraft = {
  methodKey: null,
  cards: "",
  station: "",
  extra: "",
  prompt: null,
  meta: null,
  draftText: "",
  outputLink: "",
};

export default function SankoPage() {
  const [pending, setPending] = useState<PendingDetail[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [selected, setSelected] = useState<PendingDetail | null>(null);
  const [draft, setDraft] = useState<SankoDraft>(EMPTY_DRAFT);

  const [stations, setStations] = useState<string[]>([]);
  const [stationsExpanded, setStationsExpanded] = useState(false);

  const [composing, setComposing] = useState(false);
  const [composeMissing, setComposeMissing] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  const [savingDraft, setSavingDraft] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishMsg, setFinishMsg] = useState<string | null>(null);
  const [finishError, setFinishError] = useState<string | null>(null);

  const [batchDetails, setBatchDetails] = useState<PendingDetail[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [batchStart, setBatchStart] = useState(todayISO());
  const [batchDays, setBatchDays] = useState(14);
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [batchMsg, setBatchMsg] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  // 長按整列顯示刪除(擁有者 2026-08-03 修正指示:移除常駐的「⋯」,改長按/右滑
  // 才出現)。用 ref 而非 state 記時器與「剛長按過」旗標,避免每次計時都觸發
  // 重繪;長按觸發後 pointerup 隨後而來的 click 事件要被吃掉,不然放開手指
  // 會被判定成又點了一下整列(誤觸發產出流程或勾選切換)。
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  function startLongPress(id: string) {
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setOpenMenuId(id);
    }, 500);
  }
  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  // 點一筆進入詳情是頁面內的「drill-down」,不是換頁(擁有者指示:返回手勢
  // 要能一步步退回,單筆詳情 → 來源清單):打開時推一筆瀏覽器歷史,返回時
  // 自動收合回清單,不會直接跳出 /sanko。
  useBackableState(selected != null, () => setSelected(null));

  async function refreshPending() {
    setLoadingPending(true);
    try {
      const r = await fetch("/api/sanko/pending");
      const d = await r.json();
      setPending(d.details ?? []);
    } finally {
      setLoadingPending(false);
    }
  }

  async function refreshBatches() {
    setLoadingBatches(true);
    try {
      const r = await fetch("/api/sanko/batches");
      const d = await r.json();
      setBatchDetails(d.details ?? []);
    } finally {
      setLoadingBatches(false);
    }
  }

  useEffect(() => {
    async function load() {
      await Promise.all([refreshPending(), refreshBatches()]);
      const r = await fetch("/api/sanko/stations");
      const d = await r.json();
      setStations(d.stations ?? []);
    }
    load();
  }, []);

  const batchGroups = useMemo(() => groupIntoBatches(batchDetails), [batchDetails]);

  async function createBatch() {
    setCreatingBatch(true);
    setBatchMsg(null);
    try {
      const res = await fetch("/api/sanko/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: batchStart, days: batchDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "建立失敗");
      const failMsg = data.failed?.length ? `,${data.failed.length} 筆失敗` : "";
      setBatchMsg(`已建立 ${fmtMD(batchStart)}–${fmtMD(addDaysISO(batchStart, batchDays - 1))},共 ${batchDays * 3} 篇${failMsg}`);
      await refreshBatches();
    } catch (e) {
      setBatchMsg(`錯誤:${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setCreatingBatch(false);
    }
  }

  // 日期卡的快速勾選(委派書 §4.4):直接勾選完成/取消勾選,不進生成流程。
  // 夜光只有這個入口(不做生成);晨光/日光也可以直接勾選,不強制走流程。
  async function quickToggle(detail: PendingDetail, done: boolean) {
    setTogglingId(detail.id);
    try {
      const res = await fetch(`/api/sanko/batches/${detail.id}/quick-toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done }),
      });
      if (!res.ok) {
        const data = await res.json();
        setBatchMsg(`錯誤:${data.error ?? "更新失敗"}`);
        return;
      }
      await refreshBatches();
    } finally {
      setTogglingId(null);
    }
  }

  // 單筆刪除(擁有者 2026-08-03 追加指示):只有明細狀態=待產出可以刪除,
  // 「⋯」展開後才出現「刪除」,按下去還要再過一次 window.confirm 二次確認,
  // 三步才會真的刪掉,避免手滑誤刪「無法復原」的動作。
  async function deleteDetail(detail: PendingDetail) {
    if (!window.confirm("將刪除 1 筆,此動作無法復原。確定要刪除嗎?")) return;
    setDeletingId(detail.id);
    try {
      const res = await fetch(`/api/sanko/batches/${detail.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setBatchMsg(`錯誤:${data.error ?? "刪除失敗"}`);
        return;
      }
      setOpenMenuId(null);
      await refreshBatches();
    } finally {
      setDeletingId(null);
    }
  }

  // 整批刪除:只刪這個 Session 底下明細狀態=待產出的部分,已產出/已交付一律
  // 跳過——確認訊息先用前端已知的資料算出「會刪幾筆、跳過幾筆」,實際刪除
  // 結果以伺服器回應為準(避免前端快取過期造成誤導)。
  async function deleteBatch(batch: BatchGroup) {
    const allDetails = batch.days.flatMap((day) => UPDATE_TYPES.map((u) => day.slots[u]).filter((d): d is PendingDetail => d != null));
    const deletableCount = allDetails.filter((d) => normalizeDetailStatus(d.明細狀態) === "待產出").length;
    const skippedCount = allDetails.length - deletableCount;
    if (deletableCount === 0) {
      setBatchMsg("這一批沒有待產出的明細可以刪除(已產出/已交付一律不能從 App 刪除)。");
      return;
    }
    const skipNote = skippedCount > 0 ? `,${skippedCount} 筆已產出/已交付會跳過` : "";
    if (!window.confirm(`將刪除 ${deletableCount} 筆${skipNote},此動作無法復原。確定要刪除嗎?`)) return;
    setDeletingSessionId(batch.sessionId);
    try {
      const res = await fetch(`/api/sanko/batches?sessionId=${batch.sessionId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setBatchMsg(`錯誤:${data.error ?? "刪除失敗"}`);
        return;
      }
      const skippedMsg = data.skipped?.length ? `,跳過 ${data.skipped.length} 筆已產出/已交付` : "";
      setBatchMsg(`已刪除 ${data.deletedCount} 筆${skippedMsg}。`);
      await refreshBatches();
    } finally {
      setDeletingSessionId(null);
    }
  }

  // 選定一筆明細:草稿與產出連結直接來自 Notion(pending 清單 API 已回傳),
  // 不再從 localStorage 讀取。方法/牌卡/光站/補充是每次生成指令用的暫時輸入,
  // 不需要跨造訪保存,所以有抽出順序就重新帶入牌卡文字即可。
  async function selectDetail(item: PendingDetail) {
    setSelected(item);
    setComposeMissing(null);
    setCopied(false);
    setFinishMsg(null);
    setFinishError(null);
    const next: SankoDraft = {
      ...EMPTY_DRAFT,
      draftText: item.草稿 ?? "",
      outputLink: item.產出連結 ?? "",
    };
    setDraft(next);
    if (item.抽出順序) {
      const r = await fetch(`/api/sanko/cards?detailId=${item.id}`);
      const d = await r.json();
      if (d.cards) {
        setDraft((prev) => ({ ...prev, cards: d.cards }));
      }
    }
  }

  function updateDraft(patch: Partial<SankoDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  async function build() {
    if (!draft.methodKey) {
      alert("請先選一個方法。");
      return;
    }
    setComposing(true);
    setComposeMissing(null);
    try {
      const res = await fetch("/api/sanko/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          methodKey: draft.methodKey,
          cards: draft.cards.trim() || undefined,
          station: (draft.station || "").trim() || undefined,
          extra: draft.extra.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setComposeMissing(data.missing);
        return;
      }
      updateDraft({ prompt: data.prompt, meta: data.meta });
    } finally {
      setComposing(false);
    }
  }

  async function copyPrompt() {
    if (!draft.prompt) return;
    await navigator.clipboard.writeText(draft.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  }

  // 存草稿:寫入 DB-04「草稿」欄位。若明細仍是待產出,伺服器端會自動推進到待審核
  // (不得跳過此關卡)。
  async function saveDraftText() {
    if (!selected) return;
    if (!draft.draftText.trim()) {
      setFinishError("請先貼上生成結果,再存草稿。");
      return;
    }
    setSavingDraft(true);
    setFinishError(null);
    setFinishMsg(null);
    try {
      const res = await fetch(`/api/details/${selected.id}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftText: draft.draftText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "草稿儲存失敗");
      setFinishMsg("草稿已存入 Notion。");
      refreshPending();
      refreshBatches();
    } catch (e) {
      setFinishError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingDraft(false);
    }
  }

  // 標記完成:寫入 DB-04 明細層級「產出連結」(必填,批次多篇時每篇各自一則貼文,
  // Session 表頭單一欄位裝不下)。伺服器端會擋待產出直接標記完成(須先存草稿進入
  // 待審核),待審核則推進為已產出。
  async function finish() {
    if (!selected) return;
    if (!draft.outputLink.trim()) {
      setFinishError("產出連結為必填,請先填入再標記完成。");
      return;
    }
    setFinishing(true);
    setFinishError(null);
    setFinishMsg(null);
    try {
      const res = await fetch(`/api/details/${selected.id}/output-link`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: draft.outputLink.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "標記完成失敗");
      setFinishMsg(`${selected.對應日期 ?? ""}${selected.更次 ?? ""} 已標記完成。`);
      setSelected(null);
      setDraft(EMPTY_DRAFT);
      refreshPending();
      refreshBatches();
    } catch (e) {
      setFinishError(e instanceof Error ? e.message : String(e));
    } finally {
      setFinishing(false);
    }
  }

  const methodInfo = draft.methodKey ? SANKO_METHOD_LIST.find((m) => m.key === draft.methodKey) : null;
  const showDraftBack = Boolean(draft.prompt || draft.draftText);

  return (
    <section className="screen sanko">
      <h1>日上三更 · 指令產生器</h1>
        <p className="lead">語氣指引動態讀取現行版 · 選完直接複製</p>

        {finishMsg && <div className="note" style={{ color: "var(--green)" }}>{finishMsg}</div>}
        {batchMsg && <div className="note">{batchMsg}</div>}

        <div className="step">
          <h2>建立新的一批</h2>
          <div className="hint">選定起始日與天數,系統會為每一天建立晨光、日光、夜光三篇。</div>
          <div className="lab">從哪一天開始</div>
          <input className="field" type="date" value={batchStart} onChange={(e) => setBatchStart(e.target.value)} />
          <div className="lab">連續幾天</div>
          <div className="row">
            {BATCH_DAY_OPTIONS.map((n) => (
              <button key={n} className={batchDays === n ? "on" : ""} onClick={() => setBatchDays(n)}>
                {n} 天
              </button>
            ))}
          </div>
          <div className="preview">
            <div className="big">
              {fmtMD(batchStart)} – {fmtMD(addDaysISO(batchStart, batchDays - 1))}
            </div>
            <div className="small">
              {batchDays} 天 × 3 篇(晨光／日光／夜光)＝ 共 {batchDays * 3} 篇
            </div>
          </div>
          <button className="primary" disabled={creatingBatch} onClick={createBatch}>
            {creatingBatch ? "建立中…" : "建立這一批"}
          </button>
        </div>

        <div className="legend">
          <span>
            <i style={{ background: "var(--morning)" }} />
            晨光 · 直覺入口
          </span>
          <span>
            <i style={{ background: "var(--day)" }} />
            日光 · 自我辨識
          </span>
          <span>
            <i style={{ background: "var(--night)" }} />
            夜光 · 全圖文
          </span>
        </div>

        {loadingBatches && <p className="meta">載入中…</p>}
        {!loadingBatches && batchGroups.length === 0 && (
          <div className="empty">還沒有批次。選好起始日與天數,按上面的按鈕建立第一批。</div>
        )}

        {batchGroups.map((batch) => {
          const isDone = (d: PendingDetail | null) => Boolean(d && normalizeDetailStatus(d.明細狀態) === "已產出");
          const isDelivered = (d: PendingDetail | null) => Boolean(d && normalizeDetailStatus(d.明細狀態) === "已交付");
          const isFinished = (d: PendingDetail | null) => isDone(d) || isDelivered(d);
          const totalDone = batch.days.reduce(
            (sum, day) => sum + UPDATE_TYPES.filter((u) => isFinished(day.slots[u])).length,
            0
          );
          const total = batch.days.length * 3;
          const batchDeleting = deletingSessionId === batch.sessionId;
          return (
            <div key={batch.sessionId}>
              <div className="step" style={{ padding: "13px 15px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div>
                    <h2>
                      {fmtMD(batch.start)} – {fmtMD(batch.end)}
                    </h2>
                    <div className="hint" style={{ margin: 0 }}>
                      已完成 {totalDone} / {total} 篇
                    </div>
                  </div>
                  <button
                    className="act"
                    disabled={batchDeleting}
                    onClick={() => setOpenMenuId(openMenuId === batch.sessionId ? null : batch.sessionId)}
                  >
                    ⋯
                  </button>
                </div>
                {openMenuId === batch.sessionId && (
                  <button className="act" style={{ marginTop: 8, color: "var(--danger)" }} disabled={batchDeleting} onClick={() => deleteBatch(batch)}>
                    {batchDeleting ? "刪除中…" : "刪除整批"}
                  </button>
                )}
              </div>
              {batch.days.map((day) => {
                const doneN = UPDATE_TYPES.filter((u) => isFinished(day.slots[u])).length;
                const isToday = day.date === todayISO();
                return (
                  <div key={day.date} className={"daycard" + (isToday ? " today" : "")}>
                    <div className="dayhead">
                      <div className="daydate">
                        {fmtMD(day.date)}
                        <small>
                          {fmtWD(day.date)}
                          {isToday ? " · 今天" : ""}
                        </small>
                      </div>
                      <div className={"daycount" + (doneN === 3 ? " done" : "")}>{doneN} / 3</div>
                    </div>
                    {UPDATE_TYPES.map((u) => {
                      const detail = day.slots[u];
                      const info = UPDATE_INFO[u];
                      const finished = isFinished(detail);
                      const detailStatus = detail ? normalizeDetailStatus(detail.明細狀態) : null;
                      const status = !detail
                        ? "未建立"
                        : finished
                          ? "已完成"
                          : detailStatus === "待審核"
                            ? "待審核"
                            : "待產出";
                      const toggling = Boolean(detail && togglingId === detail.id);
                      const deletable = Boolean(detail && detailStatus === "待產出");
                      const menuOpen = Boolean(detail && openMenuId === detail.id);
                      const rowDeleting = Boolean(detail && deletingId === detail.id);

                      function activateRow() {
                        if (!detail) return;
                        if (info.mode === "生成") selectDetail(detail);
                        else quickToggle(detail, !finished);
                      }
                      function onRowClick() {
                        if (!detail) return;
                        if (longPressFired.current) {
                          longPressFired.current = false;
                          return;
                        }
                        if (menuOpen) {
                          setOpenMenuId(null);
                          return;
                        }
                        activateRow();
                      }

                      return (
                        <div key={u} className={"slot" + (finished ? " done" : "")}>
                          {!detail ? (
                            <>
                              <span className="bar" style={{ background: info.colorVar }} />
                              <div className="info">
                                <div className="name">{u}</div>
                                <div className="meta">
                                  {info.desc} · {status}
                                </div>
                              </div>
                              <span className="meta">—</span>
                            </>
                          ) : (
                            <>
                              <div
                                className="slotmain"
                                role="button"
                                tabIndex={0}
                                onClick={onRowClick}
                                onPointerDown={() => deletable && startLongPress(detail.id)}
                                onPointerUp={cancelLongPress}
                                onPointerLeave={cancelLongPress}
                                onPointerCancel={cancelLongPress}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onRowClick();
                                  }
                                }}
                              >
                                <span className="bar" style={{ background: info.colorVar }} />
                                <div className="info">
                                  <div className="name">{u}</div>
                                  <div className="meta">
                                    {info.desc} · {status}
                                  </div>
                                </div>
                              </div>
                              <button
                                className={"act check" + (finished ? " on" : "")}
                                disabled={toggling}
                                aria-label={finished ? "取消勾選" : "標記完成"}
                                onClick={() => quickToggle(detail, !finished)}
                              >
                                {finished && "✓"}
                              </button>
                              {menuOpen && (
                                <button
                                  className="act"
                                  style={{ color: "var(--danger)" }}
                                  disabled={rowDeleting}
                                  onClick={() => deleteDetail(detail)}
                                >
                                  {rowDeleting ? "刪除中…" : "刪除"}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}

        <p className="note">
          晨光與日光走產出流程(選方法→輸入牌→生成草稿);夜光為全圖文,只需在完成後勾選。任何一篇都可以直接勾選標記完成,不一定要走流程。
        </p>

        <div className="step">
          <h2>待產出清單</h2>
          <div className="hint">明細狀態=待產出或待審核,依對應日期排序;待審核代表已存過草稿,點進去可以接續完成。</div>
          {loadingPending && <p className="meta">載入中…</p>}
          {!loadingPending && pending.length === 0 && <p className="meta">目前沒有待處理的明細。</p>}
          <div className="row">
            {pending.map((item) => (
              <button
                key={item.id}
                className={selected?.id === item.id ? "on" : ""}
                onClick={() => selectDetail(item)}
              >
                {item.明細編號}
                <small>{item.對應日期 ?? "無日期"} · {item.明細狀態 ?? "待產出"}</small>
              </button>
            ))}
          </div>
        </div>

        {selected && (
          <>
            <div className="note">
              正在製作:{selected.對應日期 ?? "未排定日期"}
              {selected.更次 ? ` · ${selected.更次}` : ""}
            </div>
            <div className="step">
              <h2>一 · 這篇用哪個方法</h2>
              <div className="hint">選定後自動帶入三段命名、傘段型態與版型規格</div>
              <div className="row">
                {SANKO_METHOD_LIST.map((m) => (
                  <button
                    key={m.key}
                    className={draft.methodKey === m.key ? "on" : ""}
                    onClick={() => updateDraft({ methodKey: m.key })}
                  >
                    {m.name}
                    <small>{m.method}</small>
                  </button>
                ))}
              </div>
              {methodInfo && (
                <div className="meta">
                  <span className="tag">空 {methodInfo.kong}</span>
                  <span className="tag">雨 {methodInfo.yu}</span>
                  <span className="tag">傘 {methodInfo.san}</span>
                  <span className="tag sub">傘={methodInfo.type}型</span>
                  <span className="tag sub">{methodInfo.spec}</span>
                </div>
              )}
            </div>

            <div className="step">
              <h2>二 · 這次抽到什麼牌</h2>
              <div className="hint">牌名、牌義關鍵字,或直接貼你的抽牌筆記(已抽牌會自動帶入)</div>
              <textarea
                className="field"
                value={draft.cards}
                onChange={(e) => updateDraft({ cards: e.target.value })}
                placeholder="例如:MP-15 月相顯化牌．蛻變／或直接貼牌義"
              />
            </div>

            <div className="step">
              <h2>三 · 這篇對應哪一站</h2>
              <div className="hint">選填。建構期用;一般日更可留空</div>
              {stations.length === 0 ? (
                <p className="meta">光站尚未建檔</p>
              ) : (
                <>
                  <button
                    className="ghost"
                    style={{ width: "100%" }}
                    onClick={() => setStationsExpanded((v) => !v)}
                  >
                    {stationsExpanded ? "收合光站清單" : `展開 ${stations.length} 個光站`}
                  </button>
                  {stationsExpanded && (
                    <div className="stationgrid">
                      {stations.map((s) => (
                        <button
                          key={s}
                          className={draft.station === s ? "on" : ""}
                          onClick={() => updateDraft({ station: draft.station === s ? "" : s })}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              <input
                className="field"
                value={stations.includes(draft.station) ? "" : draft.station}
                onChange={(e) => updateDraft({ station: e.target.value })}
                placeholder="或自行輸入主題"
              />
            </div>

            <div className="step">
              <h2>四 · 補充(選填)</h2>
              <div className="hint">這次想強調的角度、避開的方向、季節或活動脈絡</div>
              <textarea
                className="field"
                value={draft.extra}
                onChange={(e) => updateDraft({ extra: e.target.value })}
                placeholder="例如:這週想扣共振會報名／避免提到工作壓力"
              />
            </div>

            <button className="primary" disabled={composing} onClick={build}>
              {composing ? "產生中…" : "產生指令"}
            </button>
            {composeMissing && (
              <div className="warn">
                {composeMissing.map((m, i) => (
                  <div key={i}>{m}</div>
                ))}
              </div>
            )}

            {draft.prompt && (
              <div className="step" style={{ marginTop: 14 }}>
                <h2>指令已產生</h2>
                <div className="hint">{draft.meta}</div>
                <button className="primary" onClick={copyPrompt}>
                  {copied ? "已複製,貼到 AI 對話即可" : "複製全部指令"}
                </button>
                <div className="out">{draft.prompt}</div>
                <div className="warn">貼進任何 AI 對話即可。產出後請自行讀三秒做語感確認——AI 可以生成,但不能驗收。</div>
              </div>
            )}

            {showDraftBack && (
              <div className="step">
                <h2>五 · 貼回生成結果</h2>
                <div className="hint">從外部 AI 拿到內容後貼回這裡並按「存草稿」——草稿直接存進 Notion,不是暫存在這個瀏覽器裡。</div>
                <textarea
                  className="field"
                  value={draft.draftText}
                  onChange={(e) => updateDraft({ draftText: e.target.value })}
                  placeholder="貼上 AI 生成的主文+解析包"
                />
                <button className="ghost" disabled={savingDraft} onClick={saveDraftText}>
                  {savingDraft ? "存檔中…" : "存草稿"}
                </button>

                <label>產出連結(必填)</label>
                <input
                  className="field"
                  value={draft.outputLink}
                  onChange={(e) => updateDraft({ outputLink: e.target.value })}
                  placeholder="發布後的連結(標記完成前必須先填)"
                />
                <button className="primary" disabled={finishing} onClick={finish}>
                  {finishing ? "送出中…" : "標記完成"}
                </button>
                {finishError && <div className="warn">{finishError}</div>}
              </div>
            )}
          </>
        )}
    </section>
  );
}
