"use client";

// 居所(雛形 home()的等價實作)。回返中心:不顯示 KPI、逾期與完成率,只留下
// 可接續的事與回家的路。
//
// 擁有者裁決(2026-08-01):P1 主控台拆兩層——「今日待辦」邏輯歸居所首頁本身
// (今天要做什麼是居所的職責),行事曆與完成度儀表(數字儀表,居所明令禁止顯示)
// 移到居所底下的子頁「看整月」(/overview),想看才點進去。
//
// 生活痕跡的居所兩區(補充裁決04/05,2026-08-05,實作順序第5項):原本「接續
// 中的事」是 entries.filter(privacy!=="私人").slice(-3)——純前端記憶體,重整
// 頁面就消失,不是真的接續。改成上區(最近的痕跡,最多5張,7天沒動靜即淡去,
// 不刪除只是從這裡消失)+ 下區(留著的:累積層/永久層或已標記過頻率強度,不
// 限張數,免淡)兩個區塊,背後是 DB-19 生活痕跡庫(見 lib/trace/rules.ts、
// GET /api/traces/home)。私人項目的保護從「居所讀取端過濾」搬到「建立時就
// 不寫進 Notion」(lib/dojo/store.tsx addEntry())——DB-19 沒有 privacy 欄位,
// 只能在建立那一刻擋,不能在讀取那一刻擋。
//
// 下區預設收合/展開(補充裁決05 §五)尚未經擁有者正式拍板,目前用我方回報過
// 的建議選項A(比照全站既有 <details>/<summary>、預設收合、標題不帶數字)。

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDojo } from "@/lib/dojo/store";
import { SPACES, GUANGXING, type GuangxingKey, type SpaceKey } from "@/lib/dojo/constants";

// 生活痕跡的居所兩區(補充裁決04/05):取代原本純前端記憶體的
// entries.filter(...).slice(-3)——那組資料重整頁面就消失,不是真的「接續」。
// 這裡改讀 GET /api/traces/home,背後是 DB-19 生活痕跡庫。
type TraceCard = { id: string; 標題: string; 內容?: string; space: SpaceKey | null };

type TodayTask = {
  type: "明細" | "場次";
  id: string;
  標題: string;
  所屬Session?: string | null;
  項目用途?: string | null;
  當場主題?: string;
};

// 居所「回到哪裡」(收光三選項與居所接續規格 v1.0 §二;行光牌與收光系統・
// 地基實作 v2.0/補充裁決01 追加「標記已處理」):兩個來源依序取用,最多 3
// 張——不依賴使用者一定要做過收光(§0.3),沒收光的日子這裡照樣能有內容
// (來自 Source B1)。零張時這個區塊要整個不顯示,不能出現空狀態文字,所以
// 不用既有的 loadingTasks/tasksError 那套(那套本身就會在零筆時顯示文字)。
type ContinuationCard =
  | { source: "carry"; id: string; text: string }
  | { source: "b1"; text: string; detailId: string; sessionId: string | null };

function GuangxingTodayStrip() {
  const { entries } = useDojo();
  const counts: Partial<Record<GuangxingKey, number>> = {};
  for (const e of entries) {
    if (e.guangxing) counts[e.guangxing] = (counts[e.guangxing] ?? 0) + 1;
  }
  return (
    <>
      {(Object.entries(GUANGXING) as [GuangxingKey, (typeof GUANGXING)[GuangxingKey]][]).map(([k, v]) => (
        <span
          key={k}
          className="tag"
          style={counts[k] ? { background: "#eee1c8", borderColor: "var(--gold)", color: "var(--ink)" } : undefined}
        >
          {v[0]}
          {counts[k] ? ` ·${counts[k]}` : ""}
        </span>
      ))}
    </>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [today, setToday] = useState<string | null>(null);
  const [todayTasks, setTodayTasks] = useState<TodayTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [continuationCards, setContinuationCards] = useState<ContinuationCard[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [recentTraces, setRecentTraces] = useState<TraceCard[]>([]);
  const [persistentTraces, setPersistentTraces] = useState<TraceCard[]>([]);

  // 補充裁決04/05:居所兩區改讀 DB-19,不再是 entries.slice(-3) 那種重整就
  // 消失的前端記憶體資料。查詢失敗靜默(比照這個頁面既有的 continuationCards
  // 慣例)——兩區「零筆時整區不顯示」本身就涵蓋了「查詢失敗」這個情況,不需要
  // 另外顯示錯誤訊息。
  useEffect(() => {
    let cancelled = false;
    fetch("/api/traces/home")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) {
          setRecentTraces(json.recent ?? []);
          setPersistentTraces(json.persistent ?? []);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // 回看(補充裁決04「什麼算動靜」表):點卡片才算,不是撈出來顯示就算——
  // 重新計時 7 天、回看次數 +1(達門檻自動升級 traceLevel,補充裁決05 第4
  // 項)。安靜地發生,不回饋任何數字/確認訊息(§1.2 不顯示倒數的同一個精神:
  // 淡去要安靜,回看也不需要用視覺提示打斷)。
  function viewTrace(id: string) {
    fetch(`/api/traces/${id}/view`, { method: "PATCH" }).catch(() => {});
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/closing/continuations")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setContinuationCards(json.cards ?? []);
      })
      .catch(() => {
        // 靜默失敗:這個區塊本來就是「有才顯示」,查詢失敗等同沒有卡片,不彈錯誤。
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 「標記已處理」(補充裁決01§一之3):按下才算消化掉,不是打開卡片就算。
  // 成功後直接把這張卡從畫面上拿掉,不用整批重新打 API——伺服器那邊已經
  // 寫入 carryResolvedAt,下次真的重新整理頁面時也不會再撈到它。
  async function resolveCard(id: string) {
    setResolvingId(id);
    try {
      const res = await fetch(`/api/closing/${id}/resolve`, { method: "PATCH" });
      if (res.ok) {
        setContinuationCards((prev) => prev.filter((c) => !(c.source === "carry" && c.id === id)));
      }
    } finally {
      setResolvingId(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingTasks(true);
      setTasksError(null);
      try {
        const r = await fetch("/api/dashboard");
        if (!r.ok) throw new Error(`載入失敗(${r.status})`);
        const json = await r.json();
        if (!cancelled) {
          setToday(json.today ?? null);
          setTodayTasks(json.todayTasks ?? []);
        }
      } catch (e) {
        if (!cancelled) setTasksError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoadingTasks(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="screen">
      <div className="hero">
        <div className="eyebrow">居所 · 回返中心</div>
        <h2>今天的你,想去哪裡?</h2>
        <p>這裡不顯示 KPI、逾期與完成率;只留下可接續的事與回家的路。</p>
        <div style={{ marginTop: 10 }}>
          <GuangxingTodayStrip />
        </div>
      </div>

      <div className="toolbar">
        <h3 style={{ margin: 0 }}>今天要做的事{today ? `(${today})` : ""}</h3>
        <Link href="/overview" className="tag" style={{ color: "var(--gold)", borderColor: "var(--gold)" }}>
          看整月 →
        </Link>
      </div>
      {loadingTasks && <p className="lead">載入中…</p>}
      {tasksError && <p className="lead" style={{ color: "var(--danger)" }}>{tasksError}</p>}
      {!loadingTasks && !tasksError && todayTasks.length === 0 && <div className="empty">今天沒有到期的任務。</div>}
      {todayTasks.map((t) => (
        <button
          key={t.id}
          className="item dw"
          onClick={() => t.所屬Session && router.push(`/sessions?sessionId=${t.所屬Session}`)}
        >
          <span className="status">
            <span className="dot" />
            {t.type}
          </span>
          <b>{t.標題}</b>
          <small>{t.項目用途 || t.當場主題 || ""}</small>
        </button>
      ))}

      {continuationCards.length > 0 && (
        <>
          <h3>回到哪裡</h3>
          {continuationCards.map((c) =>
            c.source === "b1" ? (
              <button key={c.detailId} className="item dw" onClick={() => router.push(`/sanko?detailId=${c.detailId}`)}>
                <span className="status">
                  <span className="dot" />
                  日上三更
                </span>
                <b>{c.text}</b>
              </button>
            ) : (
              <div key={c.id} className="item cl">
                <span className="status">
                  <span className="dot" />
                  帶回
                </span>
                <b>{c.text}</b>
                <button
                  style={{ marginTop: 6 }}
                  disabled={resolvingId === c.id}
                  onClick={() => resolveCard(c.id)}
                >
                  {resolvingId === c.id ? "處理中…" : "標記已處理"}
                </button>
              </div>
            )
          )}
        </>
      )}

      {recentTraces.length > 0 && (
        <>
          <h3>最近的痕跡</h3>
          {recentTraces.map((t) => (
            <TraceCardItem key={t.id} trace={t} onView={viewTrace} />
          ))}
        </>
      )}

      {persistentTraces.length > 0 && (
        // 下區「可摺疊」(補充裁決04 §2.2),標題不帶數字(補充裁決05 §五仍待
        // 裁決「預設展開還是收合」——這裡先用我方回報過的建議選項A:比照全站
        // 既有的 <details>/<summary>、預設收合、標題維持中性文字不帶提示。
        // 這個預設值本身尚未經過擁有者正式拍板,交付時已標明,之後若要改成
        // 選項B(預設展開)或選項C(加提示點)都只是這裡的區域性調整。
        <details className="item dw" style={{ marginTop: 10 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>留著的</summary>
          <div style={{ marginTop: 8 }}>
            {persistentTraces.map((t) => (
              <TraceCardItem key={t.id} trace={t} onView={viewTrace} />
            ))}
          </div>
        </details>
      )}

      <h3>六個場域</h3>
      <div className="grid">
        {Object.entries(SPACES).map(([k, v]) => (
          <button key={k} className={`space ${v[1]}`} onClick={() => router.push(`/${k}`)}>
            <span className="dot" />
            <b>{v[0]}</b>
            <small>{v[2]}</small>
          </button>
        ))}
      </div>

      <div className="note">測試重點:居所是否只保留「回返」與「接續」,不取代各場域的完整功能。</div>
    </section>
  );
}

// 痕跡卡片(上區/下區共用)。點卡片本身就是「回看」——不額外加一顆「查看」
// 按鈕,卡片內容本身就是可以看的東西。刻意不顯示頻率/強度、不顯示任何時間
// /天數(§1.2 不顯示倒數),文字只有標題與內容,中性描述(§2.3)。
function TraceCardItem({ trace, onView }: { trace: TraceCard; onView: (id: string) => void }) {
  const colorKey = trace.space ? SPACES[trace.space]?.[1] ?? "dw" : "dw";
  return (
    <button className={`item ${colorKey}`} style={{ textAlign: "left" }} onClick={() => onView(trace.id)}>
      <b>{trace.標題}</b>
      {trace.內容 && <small>{trace.內容}</small>}
    </button>
  );
}
