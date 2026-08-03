"use client";

// 雛形的「entries」是純前端記憶體資料(這階段不做各場域的深層功能,不接 Notion)。
// 用 Context 讓居所/回看/道藏/各場域頁與快速新增表單共用同一份資料與同一個彈窗開關,
// 行為與雛形的全域陣列+單一 modal 相同:重新整理頁面會重置,不持久化。

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  INITIAL_ENTRIES,
  SPACES,
  type DojoEntry,
  type SpaceKey,
  type GuangxingKey,
  type GuangfaKey,
} from "./constants";

type NewEntry = Omit<DojoEntry, "id" | "date">;

// 快速新增/編輯表單的開啟參數,對應雛形 openForm(title,id,space,kind) 的呼叫情境
// (各場域頁的「留下OO紀錄」按鈕會帶入不同的預設場域/類型)。
export type QuickAddOptions = {
  editId?: number;
  presetSpace?: SpaceKey;
  presetKind?: string;
};

export type TimerConfig = {
  space: SpaceKey;
  kind: string;
  title: string;
  guangxing: GuangxingKey | null;
  guangfa: GuangfaKey | null;
};

const DEFAULT_TIMER_CONFIG: TimerConfig = {
  space: "practice",
  kind: "修行計時",
  title: "一段修行",
  guangxing: null,
  guangfa: null,
};

export type StartTimerParams = {
  space: SpaceKey;
  title: string;
  kind: string;
  guangxing?: GuangxingKey | null;
  guangfa?: GuangfaKey | null;
};

type DojoStore = {
  entries: DojoEntry[];
  addEntry: (entry: NewEntry) => void;
  updateEntry: (id: number, entry: NewEntry) => void;
  removeEntry: (id: number) => void;
  setEntryFreq: (id: number, freq: number | null) => void;
  setEntryIntensity: (id: number, intensity: number | null) => void;
  modalOpen: boolean;
  modalOptions: QuickAddOptions;
  openQuickAdd: (opts?: QuickAddOptions) => void;
  closeQuickAdd: () => void;
  timerConfig: TimerConfig;
  setTimerConfig: (config: TimerConfig) => void;
  // 雛形 startTimerFromCurrent():把目前所在場域帶入計時設定(呼叫端在此之後自行導頁到 /timer)。
  startTimerFromSpace: (space: SpaceKey) => void;
  // 修習所各子項目「在此計時」(2026-08-03 擁有者追加指示):呼叫端直接給出
  // 完整的 space/title/kind/光行/光法,一次覆蓋整個 timerConfig,不是像
  // startTimerFromSpace 那樣只帶場域、其餘沿用上一次的值——驗收要求「點在此
  // 計時進入計時器時,不需要動任何選項就能按開始」,子項目名稱必須直接對上
  // 「你在練什麼」,不能是「修習所:一段修行」這種泛稱。
  startTimerWith: (params: StartTimerParams) => void;
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

  // 強度與頻率是兩個獨立欄位(修正委派書 v1.0 四):各自獨立的 setter,清除
  // 其中一個不會動到另一個——不要合併成同一個函式再用參數判斷要改哪一個,
  // 那樣呼叫端反而更容易誤觸另一個欄位。
  const setEntryIntensity = useCallback((id: number, intensity: number | null) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, intensity: intensity ?? undefined } : e)));
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

  const startTimerWith = useCallback((params: StartTimerParams) => {
    setTimerConfig({
      space: params.space,
      title: params.title,
      kind: params.kind,
      guangxing: params.guangxing ?? null,
      guangfa: params.guangfa ?? null,
    });
  }, []);

  const value = useMemo(
    () => ({
      entries,
      addEntry,
      updateEntry,
      removeEntry,
      setEntryFreq,
      setEntryIntensity,
      modalOpen,
      modalOptions,
      openQuickAdd,
      closeQuickAdd,
      timerConfig,
      setTimerConfig,
      startTimerFromSpace,
      startTimerWith,
    }),
    [
      entries,
      addEntry,
      updateEntry,
      removeEntry,
      setEntryFreq,
      setEntryIntensity,
      modalOpen,
      modalOptions,
      openQuickAdd,
      closeQuickAdd,
      timerConfig,
      startTimerFromSpace,
      startTimerWith,
    ]
  );

  return <DojoContext.Provider value={value}>{children}</DojoContext.Provider>;
}

export function useDojo(): DojoStore {
  const ctx = useContext(DojoContext);
  if (!ctx) throw new Error("useDojo() 必須在 <DojoProvider> 內使用");
  return ctx;
}
