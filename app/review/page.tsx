"use client";

// 回看(雛形 review()/searchEntries()/filterNen()的等價實作):跨場域回看,
// 依時間、場域、主題、隱私與光念,而非完成率。
//
// 測頻篩選(三方協作規格書 v1.3 §2.3,新增):簡化為淺／中／深三段,不是十七個
// 狀態按鈕牆——依這段時間投入的深淺篩選片刻,不顯示平均值、不做排名或趨勢圖。
// 搜尋、光念篩選、測頻篩選三者互不疊加(選了其中一種,另外兩種自動歸零),沿用
// 雛形原本「各自蓋掉對方」的行為,只是現在有三種而不是兩種,統一成一個 filter
// 狀態管理,不分別維護三個布林/字串變數各自判斷優先序。
import { useState } from "react";
import { useDojo } from "@/lib/dojo/store";
import { LIGHT_NEN, type NenKey } from "@/lib/dojo/constants";
import { resolveFreqBand, FREQ_BAND_LABELS, type FreqBand } from "@/lib/dojo/hawkins";
import EntryCard from "../components/EntryCard";

type Filter =
  | { kind: "all" }
  | { kind: "query"; value: string }
  | { kind: "nen"; value: NenKey }
  | { kind: "freq"; value: FreqBand };

export default function ReviewPage() {
  const { entries } = useDojo();
  const [queryText, setQueryText] = useState("");
  const [filter, setFilter] = useState<Filter>({ kind: "all" });

  function onQueryChange(v: string) {
    setQueryText(v);
    setFilter(v ? { kind: "query", value: v } : { kind: "all" });
  }
  function onNenClick(v: NenKey | null) {
    setQueryText("");
    setFilter(v ? { kind: "nen", value: v } : { kind: "all" });
  }
  function onFreqClick(v: FreqBand | null) {
    setQueryText("");
    setFilter(v ? { kind: "freq", value: v } : { kind: "all" });
  }

  const list =
    filter.kind === "query"
      ? entries.filter((e) => (e.title + (e.note ?? "") + e.kind).toLowerCase().includes(filter.value.toLowerCase()))
      : filter.kind === "nen"
        ? entries.filter((e) => e.nen === filter.value)
        : filter.kind === "freq"
          ? entries.filter((e) => e.freq != null && resolveFreqBand(e.freq) === filter.value)
          : entries;

  const displayed = list.slice().reverse();
  const emptyMsg =
    filter.kind === "query"
      ? "沒有符合的片刻。"
      : filter.kind === "nen"
        ? "這個光念還沒有紀錄。"
        : filter.kind === "freq"
          ? "這個深淺區間還沒有標記過的片刻。"
          : "還沒有可回看的痕跡。";

  return (
    <section className="screen">
      <h1>回看</h1>
      <p className="lead">跨場域回看:依時間、場域、主題、隱私與光念,而非完成率。</p>
      <div className="toolbar">
        <input
          className="field"
          style={{ margin: 0 }}
          placeholder="搜尋留下的片刻"
          value={queryText}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>

      <div className="row">
        <button className={filter.kind === "all" ? "on" : ""} onClick={() => onNenClick(null)}>
          全部
        </button>
        {(Object.entries(LIGHT_NEN) as [NenKey, (typeof LIGHT_NEN)[NenKey]][]).map(([k, v]) => (
          <button key={k} className={filter.kind === "nen" && filter.value === k ? "on" : ""} onClick={() => onNenClick(k)}>
            {v[0]}
          </button>
        ))}
      </div>

      <p className="lead" style={{ marginBottom: 4 }}>
        依測頻區間篩選:這段時間投入得多深,不顯示平均值或排名。
      </p>
      <div className="row">
        <button className={filter.kind === "all" ? "on" : ""} onClick={() => onFreqClick(null)}>
          全部
        </button>
        {(Object.entries(FREQ_BAND_LABELS) as [FreqBand, string][]).map(([k, label]) => (
          <button key={k} className={filter.kind === "freq" && filter.value === k ? "on" : ""} onClick={() => onFreqClick(k)}>
            {label}
          </button>
        ))}
      </div>

      <div id="reviewList">
        {displayed.length === 0 ? <div className="empty">{emptyMsg}</div> : displayed.map((e) => <EntryCard key={e.id} entry={e} />)}
      </div>
    </section>
  );
}
