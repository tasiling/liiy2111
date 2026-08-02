"use client";

// 雛形的「entries」是純前端記憶體資料(這階段不做各場域的深層功能,不接 Notion)。
// 用 Context 讓居所/回看/道藏/各場域頁與快速新增表單共用同一份資料與同一個彈窗開關,
// 行為與雛形的全域陣列+單一 modal 相同:重新整理頁面會重置,不持久化。

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { INITIAL_ENTRIES, LIGHT_NEN, SPACES, type DojoEntry, type SpaceKey, type NenKey } from "./constants";

type NewEntry = Omit<DojoEntry, "id" | "date">;

// 快速新增/編輯表單的開啟參數,對應雛形 openForm(title,id,space,kind) 的呼叫情境
// (各場域頁的「留下OO紀錄」按鈕會帶入不同的預設場域/類型)。
export type QuickAddOptions = {
  editId?: number;
  presetSpace?: SpaceKey;
  presetKind?: string;
};

export type TimerConfig = { space: SpaceKey; kind: string; title: string; nen: NenKey | null };

const DEFAULT_TIMER_CONFIG: TimerConfig = {
  space: "practice",
  kind: "修行計時",
  title: "一段修行",
  nen: null,
};

type DojoStore = {
  entries: DojoEntry[];
  addEntry: (entry: NewEntry) => void;
  updateEntry: (id: number, entry: NewEntry) => void;
  removeEntry: (id: number) => void;
  setEntryFreq: (id: number, freq: number | null) => void;
  modalOpen: boolean;
  modalOptions: QuickAddOptions;
  openQuickAdd: (opts?: QuickAddOptions) => void;
  closeQuickAdd: () => void;
  timerConfig: TimerConfig;
  setTimerConfig: (config: TimerConfig) => void;
  // 雛形 startTimerFromCurrent():把目前所在場域帶入計時設定(呼叫端在此之後自行導頁到 /timer)。
  startTimerFromSpace: (space: SpaceKey) => void;
  // 雛形 startNenTimer():以某個光念開始一段修行,呼叫端在此之後自行導頁到 /timer。
  startTimerWithNen: (nen: NenKey) => void;
};

const DojoContext = createContext<DojoStore | null>(null);

export function DojoProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<DojoEntry[]>(INITIAL_ENTRIES);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalOptions, setModalOptions] = useState<QuickAddOptions>({});
  const [timerConfig, setTimerConfig] = useState<TimerConfig>(DEFAULT_TIMER_CONFIG);

  const addEntry = useCallback((entry: NewEntry) => {
    setEntries((prev) => [...prev, { ...entry, id: Date.now(), date: "剛剛" }]);
  }, []);

  const updateEntry = useCallback((id: number, entry: NewEntry) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...entry } : e)));
  }, []);

  const removeEntry = useCallback((id: number) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // 測頻只在收光復盤階段設定(v1.3 §3.5.1),獨立成一個動作而不是借用
  // updateEntry,避免呼叫端得為了改一個數值湊出整筆 NewEntry。freq=null 代表
  // 清除標記,回到「尚未標記」狀態。
  const setEntryFreq = useCallback((id: number, freq: number | null) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, freq: freq ?? undefined } : e)));
  }, []);

  const openQuickAdd = useCallback((opts: QuickAddOptions = {}) => {
    setModalOptions(opts);
    setModalOpen(true);
  }, []);

  const closeQuickAdd = useCallback(() => setModalOpen(false), []);

  const startTimerFromSpace = useCallback((space: SpaceKey) => {
    setTimerConfig((prev) => ({
      ...prev,
      space,
      title: prev.title === "一段修行" ? `${SPACES[space][0]}:一段修行` : prev.title,
    }));
  }, []);

  const startTimerWithNen = useCallback((nen: NenKey) => {
    const v = LIGHT_NEN[nen];
    setTimerConfig({
      space: "practice",
      title: `${v[0]}:${v[2].split("、")[0]}`,
      kind: `光念／${v[0]}`,
      nen,
    });
  }, []);

  const value = useMemo(
    () => ({
      entries,
      addEntry,
      updateEntry,
      removeEntry,
      setEntryFreq,
      modalOpen,
      modalOptions,
      openQuickAdd,
      closeQuickAdd,
      timerConfig,
      setTimerConfig,
      startTimerFromSpace,
      startTimerWithNen,
    }),
    [
      entries,
      addEntry,
      updateEntry,
      removeEntry,
      setEntryFreq,
      modalOpen,
      modalOptions,
      openQuickAdd,
      closeQuickAdd,
      timerConfig,
      startTimerFromSpace,
      startTimerWithNen,
    ]
  );

  return <DojoContext.Provider value={value}>{children}</DojoContext.Provider>;
}

export function useDojo(): DojoStore {
  const ctx = useContext(DojoContext);
  if (!ctx) throw new Error("useDojo() 必須在 <DojoProvider> 內使用");
  return ctx;
}
