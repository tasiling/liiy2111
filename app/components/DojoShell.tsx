"use client";

// 行光道場外殼:雛形的頂部列 + 底部五項固定導航 + 快速新增 bottom sheet。
// 版面結構與互動邏輯沿用雛形(go()/openForm()/saveEntry() 的等價實作),不重新設計。
// 修掉雛形本身的問題:快速新增表單原本用 <select> 選場域/光行光法/隱私,這裡
// 全部改成按鈕列(照雛形計時器頁「setMinutes/pickTimerSpace/pickTimerNen」的
// 按鈕列做法)。

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useDojo } from "@/lib/dojo/store";
import {
  SPACES,
  GUANGXING,
  GUANGFA,
  type SpaceKey,
  type GuangxingKey,
  type GuangfaKey,
  type Privacy,
} from "@/lib/dojo/constants";
import { useBackStack, useBackableState } from "@/lib/dojo/backstack";
import { PARENT_ROUTE, ROUTE_LABEL, USE_BROWSER_BACK, NO_BACK_BUTTON } from "@/lib/dojo/backroutes";

// 雛形 currentSpace():目前所在頁面若是七場域之一就用該場域,否則預設「修習所」。
function currentSpaceFromPath(pathname: string): SpaceKey {
  const key = pathname.replace(/^\//, "") as SpaceKey;
  return key in SPACES ? key : "practice";
}

// 頂部返回鍵(擁有者指示:除居所外的所有頁面左上角顯示返回鍵,回到「上一層」
// 而不是首頁)。若目前有 detail/彈出層開著(depth() > 0),先關掉那一層,和
// 返回手勢的行為保持一致——不然使用者在 detail 展開時按這顆按鈕,會跳過
// 「先收合 detail」這一步直接離開整個頁面,體感上比手勢版本少一層。
function BackButton({ pathname }: { pathname: string }) {
  const router = useRouter();
  const { depth } = useBackStack();

  if (NO_BACK_BUTTON.has(pathname)) return null;

  const useBrowserBack = USE_BROWSER_BACK.has(pathname);
  const parent = PARENT_ROUTE[pathname] ?? "/";
  const label = useBrowserBack ? "返回" : (ROUTE_LABEL[parent] ?? "居所");

  function handleClick() {
    if (depth() > 0) {
      window.history.back();
      return;
    }
    if (useBrowserBack) {
      router.back();
      return;
    }
    router.push(parent);
  }

  return (
    <button className="backbtn" onClick={handleClick} aria-label={`返回${label}`}>
      ‹ {label}
    </button>
  );
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

  // 快速新增/編輯是全站共用的 bottom sheet(擁有者指示「彈出層的返回」要能關掉
  // 彈出層而不是離開頁面):打開就推一筆瀏覽器歷史,返回手勢或按鈕關閉時，
  // 歷史記錄自動同步退回。
  useBackableState(modalOpen, closeQuickAdd);

  function openTimerFromHere() {
    startTimerFromSpace(currentSpaceFromPath(pathname));
    router.push("/timer");
  }

  return (
    <div className="dojo">
      <main className="app">
        <header className="top">
          {pathname === "/" ? <div className="brand">行光道場</div> : <BackButton pathname={pathname} />}
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
  entry?: {
    title: string;
    note?: string;
    space: SpaceKey;
    kind: string;
    guangxing: GuangxingKey | null;
    guangfa: GuangfaKey | null;
    privacy: Privacy;
  };
  presetSpace?: SpaceKey;
  presetKind?: string;
  onClose: () => void;
  onSave: (data: {
    title: string;
    note?: string;
    space: SpaceKey;
    kind: string;
    guangxing: GuangxingKey | null;
    guangfa: GuangfaKey | null;
    privacy: Privacy;
  }) => void;
}) {
  const [title, setTitle] = useState(entry?.title ?? "");
  const [note, setNote] = useState(entry?.note ?? "");
  const [space, setSpace] = useState<SpaceKey>(entry?.space ?? presetSpace ?? "practice");
  const [kind, setKind] = useState(entry?.kind ?? presetKind ?? "");
  const [guangxing, setGuangxing] = useState<GuangxingKey | null>(entry?.guangxing ?? null);
  const [guangfa, setGuangfa] = useState<GuangfaKey | null>(entry?.guangfa ?? null);
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
    onSave({
      title: title.trim(),
      note: note.trim() || undefined,
      space,
      kind: kind.trim() || "未分類",
      guangxing,
      guangfa,
      privacy,
    });
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

        <label>光行(選填)</label>
        <div className="row">
          <button className={guangxing === null ? "on" : ""} onClick={() => setGuangxing(null)}>
            不特別標記
          </button>
          {Object.entries(GUANGXING).map(([k, v]) => (
            <button key={k} className={guangxing === k ? "on" : ""} onClick={() => setGuangxing(k as GuangxingKey)}>
              {v[0]}
            </button>
          ))}
        </div>

        <label>光法(選填)</label>
        <div className="row">
          <button className={guangfa === null ? "on" : ""} onClick={() => setGuangfa(null)}>
            不特別標記
          </button>
          {Object.entries(GUANGFA).map(([k, v]) => (
            <button key={k} className={guangfa === k ? "on" : ""} onClick={() => setGuangfa(k as GuangfaKey)}>
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
