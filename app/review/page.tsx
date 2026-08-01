"use client";

// 回看(雛形 review()/searchEntries()/filterNen()的等價實作):跨場域回看,
// 依時間、場域、主題、隱私與光念,而非完成率。
// 保留雛形原本「搜尋」與「光念篩選」互不疊加(各自蓋掉對方)的行為,不多加合併邏輯
// (不屬於本次要修的三個問題,不順手優化)。
import { useState } from "react";
import { useDojo } from "@/lib/dojo/store";
import { LIGHT_NEN, type NenKey } from "@/lib/dojo/constants";
import EntryCard from "../components/EntryCard";

export default function ReviewPage() {
  const { entries } = useDojo();
  const [query, setQuery] = useState("");
  const [nenFilter, setNenFilter] = useState<NenKey | null | undefined>(undefined); // undefined = 全部

  const list = query
    ? entries.filter((e) => (e.title + (e.note ?? "") + e.kind).toLowerCase().includes(query.toLowerCase()))
    : nenFilter !== undefined
      ? entries.filter((e) => e.nen === nenFilter)
      : entries;

  const displayed = list.slice().reverse();
  const emptyMsg = query ? "沒有符合的片刻。" : nenFilter !== undefined ? "這個光念還沒有紀錄。" : "還沒有可回看的痕跡。";

  return (
    <section className="screen">
      <h1>回看</h1>
      <p className="lead">跨場域回看:依時間、場域、主題、隱私與光念,而非完成率。</p>
      <div className="toolbar">
        <input
          className="field"
          style={{ margin: 0 }}
          placeholder="搜尋留下的片刻"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="row">
        <button className={nenFilter === undefined ? "on" : ""} onClick={() => setNenFilter(undefined)}>
          全部
        </button>
        {(Object.entries(LIGHT_NEN) as [NenKey, (typeof LIGHT_NEN)[NenKey]][]).map(([k, v]) => (
          <button key={k} className={nenFilter === k ? "on" : ""} onClick={() => setNenFilter(k)}>
            {v[0]}
          </button>
        ))}
      </div>
      <div id="reviewList">
        {displayed.length === 0 ? <div className="empty">{emptyMsg}</div> : displayed.map((e) => <EntryCard key={e.id} entry={e} />)}
      </div>
    </section>
  );
}
