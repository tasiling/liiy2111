"use client";

// 雛形 modulePage()/moduleContent()/modTab() 的等價實作,供野採/織光堂/聊解室共用
// (三個場域的頁籤+卡片+新增/計時按鈕結構完全相同,只有文案與資料不同)。
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDojo } from "@/lib/dojo/store";
import { SPACES, type SpaceKey } from "@/lib/dojo/constants";
import EntryCard from "./EntryCard";

export default function ModuleDomainPage({
  title,
  lead,
  tabs,
  items,
  actions,
  space,
  extra,
  tabLinks,
}: {
  title: string;
  lead: string;
  tabs: string[];
  items: string[];
  actions: string[];
  space: SpaceKey;
  /** 既有功能連結區(擁有者指示重新掛進場域的真實頁面),顯示在雛形內容之前。 */
  extra?: React.ReactNode;
  /** 對應 tabs 索引:該頁籤若有真實功能頁面,填入路徑,新增按鈕會導頁過去取代模擬新增。 */
  tabLinks?: (string | null)[];
}) {
  const [tabIndex, setTabIndex] = useState(0);
  const { entries, openQuickAdd, startTimerFromSpace } = useDojo();
  const router = useRouter();
  const colorKey = SPACES[space][1];
  const spaceEntries = entries.filter((e) => e.space === space);

  const cardLabel = items[tabIndex];
  const cardTitle = tabIndex === 0 ? "目前正在處理的一件事" : "這個子系統的資料入口";
  const cardNote =
    space === "liaojie" && tabIndex === 1
      ? "AI 只能生成預覽,發布前必須人工審核。"
      : space === "weaving" && tabIndex === 0
        ? "可從野採主動帶入素材,再做成草稿。"
        : "資料可新增、編輯、篩選、關聯並保留來源。";

  function startTimerHere() {
    startTimerFromSpace(space);
    router.push("/timer");
  }

  return (
    <section className="screen">
      <h1>{title}</h1>
      <p className="lead">{lead}</p>
      {extra}
      <div className="row">
        {tabs.map((t, i) => (
          <button key={t} className={tabIndex === i ? "on" : ""} onClick={() => setTabIndex(i)}>
            {t}
          </button>
        ))}
      </div>
      <div>
        <div className={`card ${colorKey}`}>
          <span className="label">{cardLabel}</span>
          <b>{cardTitle}</b>
          <small>{cardNote}</small>
        </div>
        {spaceEntries.map((e) => (
          <EntryCard key={e.id} entry={e} />
        ))}
        <div className="two">
          {tabLinks?.[tabIndex] ? (
            <button className="primary" onClick={() => router.push(tabLinks[tabIndex]!)}>
              進入{tabs[tabIndex]} →
            </button>
          ) : (
            <button
              className="primary"
              onClick={() => openQuickAdd({ presetSpace: space, presetKind: items[tabIndex] })}
            >
              {actions[tabIndex] || "新增紀錄"}
            </button>
          )}
          <button onClick={startTimerHere}>◷ 在此計時</button>
        </div>
      </div>
      <div className="note">測試重點:每個頁籤都需要再拆出列表、詳情、新增／編輯、關聯轉移頁;目前先讓你確認架構與操作層級。</div>
    </section>
  );
}
