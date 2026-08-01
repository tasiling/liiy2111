"use client";

// 行光道場外殼:雛形的頂部列 + 底部五項固定導航 + 快速新增 bottom sheet。
// 版面結構與互動邏輯沿用雛形(go()/openForm()/saveEntry() 的等價實作),不重新設計。
// 修掉雛形本身的問題:快速新增表單原本用 <select> 選場域/光念/隱私,這裡全部
// 改成按鈕列(照雛形計時器頁「setMinutes/pickTimerSpace/pickTimerNen」的按鈕列做法)。

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useDojo } from "@/lib/dojo/store";
import { SPACES, LIGHT_NEN, type SpaceKey, type NenKey, type Privacy } from "@/lib/dojo/constants";

// 雛形 currentSpace():目前所在頁面若是七場域之一就用該場域,否則預設「修習所」。
function currentSpaceFromPath(pathname: string): SpaceKey {
  const key = pathname.replace(/^\//, "") as SpaceKey;
  return key in SPACES ? key : "practice";
}

const NAV_ITEMS: { key: string; icon: string; label: string; href?: string }[] = [
  { key: "home", icon: "⌂", label: "居所", href: "/" },
  { key: "map", icon: "⌘", label: "探索", href: "/map" },
  { key: "add", icon: "＋", label: "新增" },
  { key: "review", icon: "◷", label: "回看", href: "/review" },
  { key: "assistant", icon: "✦", label: "執事", href: "/assistant" },
];

const PRIVACY_OPTIONS: Privacy[] = ["私人", "限閱", "公開"];

export default function DojoShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { entries, addEntry, updateEntry, modalOpen, modalOptions, openQuickAdd, closeQuickAdd, startTimerFromSpace } =
    useDojo();

  function openTimerFromHere() {
    startTimerFromSpace(currentSpaceFromPath(pathname));
    router.push("/timer");
  }

  return (
    <div className="dojo">
      <main className="app">
        <header className="top">
          <div className="brand">行光道場</div>
          <div style={{ display: "flex", gap: 7 }}>
            <button onClick={openTimerFromHere}>◷ 計時</button>
            <button onClick={() => router.push("/map")}>⌘ 地圖</button>
          </div>
        </header>
        <div id="view">{children}</div>
      </main>

      <nav className="nav">
        {NAV_ITEMS.map((item) =>
          item.href ? (
            <button
              key={item.key}
              className={pathname === item.href ? "on" : ""}
              onClick={() => router.push(item.href!)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ) : (
            <button key={item.key} onClick={() => openQuickAdd()}>
              <span>{item.icon}</span>
              {item.label}
            </button>
          )
        )}
      </nav>

      {modalOpen && (
        <QuickAddModal
          entry={modalOptions.editId ? entries.find((e) => e.id === modalOptions.editId) : undefined}
          presetSpace={modalOptions.presetSpace}
          presetKind={modalOptions.presetKind}
          onClose={closeQuickAdd}
          onSave={(data) => {
            if (modalOptions.editId) updateEntry(modalOptions.editId, data);
            else addEntry(data);
            closeQuickAdd();
          }}
        />
      )}
    </div>
  );
}

function QuickAddModal({
  entry,
  presetSpace,
  presetKind,
  onClose,
  onSave,
}: {
  entry?: { title: string; note?: string; space: SpaceKey; kind: string; nen: NenKey | null; privacy: Privacy };
  presetSpace?: SpaceKey;
  presetKind?: string;
  onClose: () => void;
  onSave: (data: {
    title: string;
    note?: string;
    space: SpaceKey;
    kind: string;
    nen: NenKey | null;
    privacy: Privacy;
  }) => void;
}) {
  const [title, setTitle] = useState(entry?.title ?? "");
  const [note, setNote] = useState(entry?.note ?? "");
  const [space, setSpace] = useState<SpaceKey>(entry?.space ?? presetSpace ?? "practice");
  const [kind, setKind] = useState(entry?.kind ?? presetKind ?? "");
  const [nen, setNen] = useState<NenKey | null>(entry?.nen ?? null);
  const [privacy, setPrivacy] = useState<Privacy>(entry?.privacy ?? "私人");
  const [error, setError] = useState<string | null>(null);

  // Esc 鍵關閉,對齊雛形點擊遮罩關閉的體驗(bottom sheet 常見互動)。
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit() {
    if (!title.trim()) {
      setError("請先留下一個標題或一句話。");
      return;
    }
    onSave({ title: title.trim(), note: note.trim() || undefined, space, kind: kind.trim() || "未分類", nen, privacy });
  }

  return (
    <div className="modal show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <button onClick={onClose}>關閉</button>
        <h2>{entry ? "編輯紀錄" : "快速紀錄"}</h2>
        <p className="lead">這是可測的本地資料流程;送出後會立刻顯示在相關場域與回看中。</p>

        <label>標題／一句話</label>
        <input
          className="field"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="此刻想留下什麼?"
        />

        <label>說明(可留白)</label>
        <textarea
          className="field"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="描述、感受、來源或下一步"
        />

        <label>場域</label>
        <div className="row">
          {Object.entries(SPACES).map(([k, v]) => (
            <button key={k} className={space === k ? "on" : ""} onClick={() => setSpace(k as SpaceKey)}>
              {v[0]}
            </button>
          ))}
        </div>

        <label>類型</label>
        <input
          className="field"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          placeholder="例如:心／情、提問、草稿"
        />

        <label>光念(選填)</label>
        <div className="row">
          <button className={nen === null ? "on" : ""} onClick={() => setNen(null)}>
            不特別標記
          </button>
          {Object.entries(LIGHT_NEN).map(([k, v]) => (
            <button key={k} className={nen === k ? "on" : ""} onClick={() => setNen(k as NenKey)}>
              {v[0]}
            </button>
          ))}
        </div>

        <label>隱私</label>
        <div className="row">
          {PRIVACY_OPTIONS.map((p) => (
            <button key={p} className={privacy === p ? "on" : ""} onClick={() => setPrivacy(p)}>
              {p}
            </button>
          ))}
        </div>

        {error && <p className="note" style={{ color: "var(--danger)" }}>{error}</p>}

        <button className="primary" onClick={submit}>
          {entry ? "儲存修改" : "保留這則痕跡"}
        </button>
      </div>
    </div>
  );
}
