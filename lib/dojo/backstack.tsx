"use client";

// 行光道場的「返回」基礎設施(擁有者指示:新增返回導航,四項要求—— 頂部返回鍵
// /瀏覽器返回鍵/返回時保留狀態/彈出層的返回)。
//
// 這裡只處理「頁面內狀態」(detail 展開、bottom sheet 打開)的返回:每次打開一個
// 這類狀態,就用 history.pushState 記一筆瀏覽器歷史;使用者用手機返回手勢或
// 瀏覽器返回鍵時,監聽 popstate 把最上層那筆對應的狀態關閉,而不是真的離開頁面。
// 真正的「頁面之間」導航(如 /liaojie → /sanko)本來就是 Next.js router.push,
// 瀏覽器內建就會處理成正常的歷史紀錄與返回手勢,不需要另外處理。
//
// 「返回時保留狀態」(捲動位置、篩選條件)不是靠這裡做——是靠呼叫端不要把
// list 從 DOM 移除(用條件顯示 detail 區塊,而不是整頁替換 list),這樣 React
// state(捲動位置、篩選)本來就不會被重置。這個檔案只負責「返回手勢要能正確
// 關閉 detail/彈出層」這一層。
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";

type BackHandler = () => void;

type BackStackValue = {
  // 開啟一個「可被返回關閉」的狀態:立刻在瀏覽器歷史記錄多推一筆,回傳一個
  // 「主動關閉」函式——呼叫端在自己的狀態被 UI 內按鈕(非返回手勢)關閉時,
  // 必須呼叫這個函式讓歷史記錄同步退回,不然下一次返回手勢會多按一次空的。
  pushBack: (onBack: BackHandler) => () => void;
  // 目前有幾層可返回關閉的狀態疊著(給頂部返回鍵判斷:有疊著時返回鍵應該先
  // 關掉最上層那個,而不是直接跳到場域首頁)。
  depth: () => number;
};

const BackStackContext = createContext<BackStackValue | null>(null);

export function BackStackProvider({ children }: { children: ReactNode }) {
  const stackRef = useRef<{ handler: BackHandler; closedByPop: boolean }[]>([]);

  useEffect(() => {
    function onPopState() {
      const top = stackRef.current.pop();
      if (top) {
        top.closedByPop = true;
        top.handler();
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const pushBack = useCallback((onBack: BackHandler) => {
    const entry = { handler: onBack, closedByPop: false };
    stackRef.current.push(entry);
    window.history.pushState({ __dojoBack: stackRef.current.length }, "", window.location.href);
    return () => {
      const idx = stackRef.current.indexOf(entry);
      if (idx !== -1) stackRef.current.splice(idx, 1);
      // 只有在「不是被 popstate 關掉」的情況才需要自己退回歷史記錄——popstate
      // 觸發時瀏覽器已經自己退了一筆,再退一次會多跳一層。
      if (!entry.closedByPop) window.history.back();
    };
  }, []);

  const depth = useCallback(() => stackRef.current.length, []);

  return <BackStackContext.Provider value={{ pushBack, depth }}>{children}</BackStackContext.Provider>;
}

export function useBackStack(): BackStackValue {
  const ctx = useContext(BackStackContext);
  if (!ctx) throw new Error("useBackStack() 必須在 <BackStackProvider> 內使用");
  return ctx;
}

// 把一個「開啟中的布林狀態」自動接上瀏覽器歷史:isOpen 變 true 時推一筆歷史,
// 變 false 時(不管是被 UI 按鈕關掉還是被返回手勢關掉)同步退回。onClose 是
// 返回手勢觸發時要呼叫的關閉函式(通常就是把狀態設回 false/null)。
export function useBackableState(isOpen: boolean, onClose: () => void) {
  const { pushBack } = useBackStack();
  const popRef = useRef<(() => void) | null>(null);
  const wasOpen = useRef(false);
  const onCloseRef = useRef(onClose);

  // ref 只能在 render 之外寫入(渲染期間寫入會被 lint 擋下,也確實可能導致
  // 元件狀態與畫面不同步)——用一個沒有依賴陣列的 effect,在每次渲染「之後」
  // 同步最新的 onClose,而不是在 render 當下直接賦值。
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      popRef.current = pushBack(() => onCloseRef.current());
    } else if (!isOpen && wasOpen.current) {
      popRef.current?.();
      popRef.current = null;
    }
    wasOpen.current = isOpen;
  }, [isOpen, pushBack]);

  // 卸載時(離開整個頁面)不用特別清理:換頁本身就是一次真正的導航,瀏覽器
  // 歷史記錄的處理交給 Next.js router,不需要在這裡把 push 進去的那筆退掉。
}
