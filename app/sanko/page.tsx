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
// 這三步的資料模型判斷與已知落差,見 docs/schema/日上三更指令產生器.md。
import { useEffect, useState } from "react";
import { SANKO_METHOD_LIST, type SankoMethodKey } from "@/lib/dojo/methods";

type PendingDetail = {
  id: string;
  明細編號: string;
  對應日期: string | null;
  抽出順序: string;
  所屬Session: string | null;
  明細狀態: string | null;
};

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

function draftKey(detailId: string) {
  return `sanko-draft-${detailId}`;
}

// 用 localStorage 保存進行中的草稿(而非純 React state):實際使用情境是使用者會
// 短暫離開 App 去外部 AI 生成,手機瀏覽器背景分頁有被系統回收的風險,存在
// localStorage 才能保證回來後進度還在。
function loadDraft(detailId: string): SankoDraft {
  if (typeof window === "undefined") return EMPTY_DRAFT;
  const raw = window.localStorage.getItem(draftKey(detailId));
  if (!raw) return EMPTY_DRAFT;
  try {
    return { ...EMPTY_DRAFT, ...JSON.parse(raw) };
  } catch {
    return EMPTY_DRAFT;
  }
}

function saveDraft(detailId: string, draft: SankoDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(draftKey(detailId), JSON.stringify(draft));
}

function clearDraft(detailId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(draftKey(detailId));
}

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

  const [finishing, setFinishing] = useState(false);
  const [finishMsg, setFinishMsg] = useState<string | null>(null);
  const [finishError, setFinishError] = useState<string | null>(null);

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

  useEffect(() => {
    async function load() {
      await refreshPending();
      const r = await fetch("/api/sanko/stations");
      const d = await r.json();
      setStations(d.stations ?? []);
    }
    load();
  }, []);

  // 選定一筆待產出明細:先看有沒有存過的草稿(離開又回來),沒有才用該筆的
  // 抽出順序自動帶入牌卡資料。
  async function selectDetail(item: PendingDetail) {
    setSelected(item);
    setComposeMissing(null);
    setCopied(false);
    setFinishMsg(null);
    setFinishError(null);
    const saved = loadDraft(item.id);
    if (saved.methodKey || saved.cards || saved.prompt) {
      setDraft(saved);
      return;
    }
    const next = { ...EMPTY_DRAFT };
    setDraft(next);
    if (item.抽出順序) {
      const r = await fetch(`/api/sanko/cards?detailId=${item.id}`);
      const d = await r.json();
      if (d.cards) {
        const withCards = { ...next, cards: d.cards };
        setDraft(withCards);
        saveDraft(item.id, withCards);
      }
    }
  }

  function updateDraft(patch: Partial<SankoDraft>) {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      if (selected) saveDraft(selected.id, next);
      return next;
    });
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

  async function finish() {
    if (!selected) return;
    setFinishing(true);
    setFinishError(null);
    setFinishMsg(null);
    try {
      const statusRes = await fetch(`/api/details/${selected.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newStatus: "已產出" }),
      });
      const statusData = await statusRes.json();
      if (!statusRes.ok) throw new Error(statusData.error ?? "狀態更新失敗");

      if (draft.outputLink.trim() && selected.所屬Session) {
        await fetch(`/api/sessions/${selected.所屬Session}/output-link`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: draft.outputLink.trim() }),
        });
      }

      clearDraft(selected.id);
      setFinishMsg(`${selected.明細編號} 已標記完成。`);
      setSelected(null);
      setDraft(EMPTY_DRAFT);
      refreshPending();
    } catch (e) {
      setFinishError(e instanceof Error ? e.message : String(e));
    } finally {
      setFinishing(false);
    }
  }

  const methodInfo = draft.methodKey ? SANKO_METHOD_LIST.find((m) => m.key === draft.methodKey) : null;

  return (
    <section className="screen sanko">
      <h1>日上三更 · 指令產生器</h1>
        <p className="lead">語氣指引動態讀取現行版 · 選完直接複製</p>

        {finishMsg && <div className="note" style={{ color: "var(--green)" }}>{finishMsg}</div>}

        <div className="step">
          <h2>待產出清單</h2>
          <div className="hint">明細狀態=待產出,依對應日期排序;點一筆進入下面的流程。</div>
          {loadingPending && <p className="meta">載入中…</p>}
          {!loadingPending && pending.length === 0 && <p className="meta">目前沒有待產出的明細。</p>}
          <div className="row">
            {pending.map((item) => (
              <button
                key={item.id}
                className={selected?.id === item.id ? "on" : ""}
                onClick={() => selectDetail(item)}
              >
                {item.明細編號}
                <small>{item.對應日期 ?? "無日期"}</small>
              </button>
            ))}
          </div>
        </div>

        {selected && (
          <>
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

            {draft.prompt && (
              <div className="step">
                <h2>五 · 貼回生成結果</h2>
                <div className="hint">從外部 AI 拿到內容後貼回這裡,先存著,確認沒問題再標記完成。</div>
                <textarea
                  className="field"
                  value={draft.draftText}
                  onChange={(e) => updateDraft({ draftText: e.target.value })}
                  placeholder="貼上 AI 生成的主文+解析包"
                />
                <label>產出連結(選填)</label>
                <input
                  className="field"
                  value={draft.outputLink}
                  onChange={(e) => updateDraft({ outputLink: e.target.value })}
                  placeholder="發布後的連結,可留空之後再補"
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
