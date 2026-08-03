"use client";

// 居所(雛形 home()的等價實作)。回返中心:不顯示 KPI、逾期與完成率,只留下
// 可接續的事與回家的路。
// 修掉雛形本身的問題:「接續中的事」須排除私密項目(擁有者追加指示)。
//
// 擁有者裁決(2026-08-01):P1 主控台拆兩層——「今日待辦」邏輯歸居所首頁本身
// (今天要做什麼是居所的職責),行事曆與完成度儀表(數字儀表,居所明令禁止顯示)
// 移到居所底下的子頁「看整月」(/overview),想看才點進去。

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDojo } from "@/lib/dojo/store";
import { SPACES, GUANGXING, type GuangxingKey } from "@/lib/dojo/constants";
import EntryCard from "./components/EntryCard";

type TodayTask = {
  type: "明細" | "場次";
  id: string;
  標題: string;
  所屬Session?: string | null;
  項目用途?: string | null;
  當場主題?: string;
};

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
  const { entries } = useDojo();
  const [today, setToday] = useState<string | null>(null);
  const [todayTasks, setTodayTasks] = useState<TodayTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);

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

  // 排除私密項目:居所是輕接觸的回返畫面,不在這裡曝光「私人」層級的細節。
  const recentEntries = entries
    .filter((e) => e.privacy !== "私人")
    .slice(-3)
    .reverse();

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

      <h3>接續中的事</h3>
      {recentEntries.length === 0 && <div className="empty">目前沒有可公開顯示的接續事項。</div>}
      {recentEntries.map((e) => (
        // 測頻不得在居所以任何形式顯示(v1.3 §2.3),明確關閉——不要靠 EntryCard
        // 的預設值,避免日後預設值被改動而在居所悄悄露出。
        <EntryCard key={e.id} entry={e} showFreq={false} />
      ))}

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
