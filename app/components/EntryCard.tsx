"use client";

// 雛形 card(e) 的等價實作,供居所/回看/道藏/各場域頁共用。
//
// 測頻標籤(三方協作規格書 v1.3 §2.3):居所不得以任何形式顯示測頻,這裡用
// showFreq props 控制——居所頁呼叫時明確傳 showFreq={false},其餘頁面(回看、
// 各場域)維持預設 true。單筆的數值＋霍金斯狀態標籤是紀錄本身,不是評分,
// 所以沒有值時就不顯示,不畫任何空的佔位條。
import { useDojo } from "@/lib/dojo/store";
import { SPACES, LIGHT_NEN, type DojoEntry } from "@/lib/dojo/constants";
import { resolveHawkinsLevel } from "@/lib/dojo/hawkins";

export default function EntryCard({ entry, showFreq = true }: { entry: DojoEntry; showFreq?: boolean }) {
  const { removeEntry, openQuickAdd } = useDojo();
  const colorKey = SPACES[entry.space]?.[1] ?? "dw";
  const nenLabel = entry.nen ? LIGHT_NEN[entry.nen][0] : null;
  const freqLevel = showFreq && entry.freq != null ? resolveHawkinsLevel(entry.freq) : null;

  return (
    <div className={`item ${colorKey}`}>
      <span className="status">
        <span className="dot" />
        {entry.kind}
      </span>
      {nenLabel && (
        <span className="tag" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}>
          {nenLabel}
        </span>
      )}
      {freqLevel && (
        <span className="tag" style={{ borderColor: freqLevel.color, color: freqLevel.color }}>
          {entry.freq}・{freqLevel.label}
        </span>
      )}
      <b>{entry.title}</b>
      <small>
        {entry.note || "尚未留下說明"} · {entry.privacy} · {entry.date}
      </small>
      <div className="actions">
        <button onClick={() => openQuickAdd({ editId: entry.id })}>編輯</button>
        <button
          onClick={() =>
            alert(`帶往功能為工程測試版:\n「${entry.title}」可帶往其他場域,正式版需明確確認彈窗。`)
          }
        >
          帶往…
        </button>
        <button className="danger" onClick={() => removeEntry(entry.id)}>
          刪除
        </button>
      </div>
    </div>
  );
}
