// 噗浪・蓋樓台的暫時儲存層(TEMP,等擁有者裁決範本/草稿的 Notion 落點後即替換)。
//
// 委派書指示「草稿可沿用 DB-04 的『草稿』欄位」,但 DB-04 明細的「所屬 Session」是
// 必填關聯,且沒有排程時間、也沒有對應噗浪這邊「草稿/已排程/已發佈」三態的狀態欄——
// 這與委派書的既有規則衝突(不得自行加欄位/加選項,也不該為了塞資料而捏造假
// Session)。範本(templates)存放處委派書本身就要求「先回報建議方案再實作」。
// 兩者都是需要擁有者決定的架構問題,見 docs/schema/噗浪蓋樓台.md,已在 PR 說明中
// 提出建議方案並等待答覆。
//
// 在確定答案之前,先用瀏覽器 localStorage 讓整個介面可以操作、驗收流程走得通
// (三個子頁、分樓、骨架產生、複製流、排程判斷),資料格式與 key 命名沿用原型
// (plurk-tower-v1),之後把這個檔案換成呼叫 Notion 的 API route 即可,不影響
// app/plurk/page.tsx 的其餘邏輯。
import { DEFAULT_TEMPLATES } from "./data";
import type { PlurkDraft, PlurkTemplate } from "./logic";

const STORAGE_KEY = "plurk-tower-v1";

export type PlurkState = {
  templates: PlurkTemplate[];
  drafts: PlurkDraft[];
};

function defaultState(): PlurkState {
  return {
    templates: DEFAULT_TEMPLATES.map((t) => ({ ...t, floors: [...t.floors] })),
    drafts: [],
  };
}

export function loadPlurkState(): PlurkState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      templates: Array.isArray(parsed.templates) && parsed.templates.length ? parsed.templates : defaultState().templates,
      drafts: Array.isArray(parsed.drafts) ? parsed.drafts : [],
    };
  } catch {
    return defaultState();
  }
}

export function savePlurkState(state: PlurkState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存不進去(容量滿等)時不擋操作,狀態仍留在記憶體中直到重整。
  }
}
