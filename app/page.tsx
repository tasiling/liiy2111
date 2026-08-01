"use client";

// 居所(雛形 home()的等價實作)。回返中心:不顯示 KPI、逾期與完成率,只留下
// 可接續的事與回家的路。
// 修掉雛形本身的問題:「接續中的事」須排除私密項目(擁有者追加指示)。

import { useRouter } from "next/navigation";
import { useDojo } from "@/lib/dojo/store";
import { SPACES, LIGHT_NEN, type NenKey } from "@/lib/dojo/constants";
import EntryCard from "./components/EntryCard";

function NenTodayStrip() {
  const { entries } = useDojo();
  const counts: Partial<Record<NenKey, number>> = {};
  for (const e of entries) {
    if (e.nen) counts[e.nen] = (counts[e.nen] ?? 0) + 1;
  }
  return (
    <>
      {(Object.entries(LIGHT_NEN) as [NenKey, (typeof LIGHT_NEN)[NenKey]][]).map(([k, v]) => (
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
          <NenTodayStrip />
        </div>
      </div>

      <h3>接續中的事</h3>
      {recentEntries.length === 0 && <div className="empty">目前沒有可公開顯示的接續事項。</div>}
      {recentEntries.map((e) => (
        <EntryCard key={e.id} entry={e} />
      ))}

      <h3>七個場域</h3>
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
