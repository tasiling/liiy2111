"use client";

// 雛形 card(e) 的等價實作,供居所/回看/道藏/各場域頁共用。
import { useDojo } from "@/lib/dojo/store";
import { SPACES, LIGHT_NEN, type DojoEntry } from "@/lib/dojo/constants";

export default function EntryCard({ entry }: { entry: DojoEntry }) {
  const { removeEntry, openQuickAdd } = useDojo();
  const colorKey = SPACES[entry.space]?.[1] ?? "dw";
  const nenLabel = entry.nen ? LIGHT_NEN[entry.nen][0] : null;

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
