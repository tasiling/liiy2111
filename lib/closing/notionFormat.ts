// 收光在 DB-14 知識庫的序列化格式。
//
// v1.0(2026-08-03)裁決:零新增欄位,沿用主站現行 DojoEntry 的欄位語意——
// space/kind/title/note/date——序列化存進 DB-14 既有的「內容」欄位。標題用
// 「收光紀錄-YYYYMMDD」前綴,一天一筆,寫入時若當日已有紀錄則覆蓋,不累積
// 多筆,比照噗浪・蓋樓台先例。
//
// 行光牌與收光系統・地基實作 v2.0(2026-08-04,補充裁決01)更新:
// - 新增 sourceType/traceLevel/traceStatus/viewCount 四個地基欄位(對收光紀錄
//   固定 sourceType="rest",traceLevel/traceStatus/viewCount 本輪維持初始值,
//   不實作任何依賴它們的行為——升級/收納/隱藏留待之後的輪次)。
// - 新增 carryToDate(僅 carry 時必填,明天起七日內)與 carryResolvedAt(僅
//   「標記已處理」按鈕按下才寫入,不是打開卡片就算)。這兩個欄位取代 v1.0
//   當時作廢的同名提案——上次否決是因為那時只需要「隔天」這一種情境,靠
//   「昨天的收光紀錄」就能判斷;這次需要「未來七天內任一天」,才真的需要
//   一個獨立欄位記錄使用者選的是哪一天。
// - DB-14 目前只有一筆用舊格式寫入的真實收光紀錄(沒有這裡任何一個新欄位)
//   ——decodeClosingContent() 對每個新欄位都做空值 fallback,不假設一定
//   存在,讀到這筆舊紀錄不會壞掉。
//
// 收光改版(2026-08-04,補充裁決03)更新:
// - 「直接收光」更名「寫下今天」(原名語意是跳過、什麼都不做,與它現在要
//   承載的日記動作相反)。對應的 API choice 值 close 也已名不符實,改為
//   journal。舊格式紀錄(title 存的是「直接收光」字面)decode 時原樣讀出,
//   不需要遷移——只要求「不得因為讀到舊字串而壞掉」,不要求把歷史紀錄的
//   文字內容也改掉。
// - 七題日記的內容存放位置尚未裁決(見委派書補充裁決03§四之1),本輪暫不
//   加對應欄位,等裁決後再擴充 ClosingContent。
import { CLOSING_TITLE_PREFIX } from "@/lib/notion/schema";
import { addDays, toISODate } from "@/lib/date";
import type { TraceLevel, TraceStatus } from "@/lib/dojo/constants";

export type ClosingChoice = "carry" | "pause" | "journal";
export type ClosingChoiceTitle = "帶回明天" | "暫且放下" | "寫下今天";

export const CLOSING_CHOICE_TITLE: Record<ClosingChoice, ClosingChoiceTitle> = {
  carry: "帶回明天",
  pause: "暫且放下",
  journal: "寫下今天",
};

export type ClosingContent = {
  space: "closing";
  kind: "收光";
  title: ClosingChoiceTitle;
  note?: string;
  date: string; // YYYY-MM-DD,當日(建立日)
  privacy: "私人";
  sourceType: "rest";
  traceLevel: TraceLevel;
  traceStatus: TraceStatus;
  viewCount: number;
  // 僅 choice='carry' 時有值:要帶到的那一天(明天起七日內)。
  carryToDate?: string;
  // 僅 choice='carry' 時可能有值:null/undefined = 尚未標記已處理;按下
  // 「標記已處理」按鈕才會寫入實際的 ISO 時間戳。
  carryResolvedAt?: string | null;
};

export function closingRecordTitle(dateISO: string): string {
  return `${CLOSING_TITLE_PREFIX}${dateISO.replace(/-/g, "")}`;
}

export function encodeClosingContent(content: ClosingContent): string {
  return JSON.stringify(content);
}

// 內容毀損(例如被人手動編輯壞掉)或欄位是舊格式寫入的(缺這輪新增的欄位)
// 時,一律容錯退回合理預設值,不擋讀取——比照噗浪蓋樓台既有的防禦性 fallback
// 慣例,也對應委派書步驟二「必做:空值 fallback」的精神,只是套用在這裡的
// decode 而不是 DojoEntry 本身(DojoEntry 沒有存量資料問題,但這裡有一筆真實
// 的舊格式紀錄)。
export function decodeClosingContent(raw: string): ClosingContent | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.kind !== "收光" || typeof parsed.title !== "string") return null;
    return {
      space: "closing",
      kind: "收光",
      title: parsed.title,
      note: typeof parsed.note === "string" ? parsed.note : undefined,
      date: parsed.date,
      privacy: "私人",
      sourceType: "rest",
      traceLevel: parsed.traceLevel === "accumulated" || parsed.traceLevel === "permanent" ? parsed.traceLevel : "daily",
      traceStatus: parsed.traceStatus === "收納" || parsed.traceStatus === "隱藏" ? parsed.traceStatus : "一般",
      viewCount: typeof parsed.viewCount === "number" ? parsed.viewCount : 0,
      carryToDate: typeof parsed.carryToDate === "string" ? parsed.carryToDate : undefined,
      carryResolvedAt: typeof parsed.carryResolvedAt === "string" ? parsed.carryResolvedAt : null,
    };
  } catch {
    return null;
  }
}

// 帶回日期一律用按鈕列(全站禁用 <select>、日曆元件在手機上太慢),範圍是
// 「明天起七日內」——回傳明天到第七天共 7 個候選日期(升冪)。用 lib/date.ts
// 既有的 UTC-safe addDays/toISODate,不用「本地解析→toISOString()」那種會
// 在 UTC+8 位移一天的寫法(日上三更批次建立那次的教訓)。
export const CARRY_WINDOW_DAYS = 7;

export function carryDateOptions(todayISO: string): string[] {
  return Array.from({ length: CARRY_WINDOW_DAYS }, (_, i) => toISODate(addDays(new Date(todayISO), i + 1)));
}

export function isValidCarryToDate(candidateISO: string, todayISO: string): boolean {
  return carryDateOptions(todayISO).includes(candidateISO);
}

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

// 選完之後的回饋文字(補充裁決03§3.2)要引用「帶回」選的那一天,格式跟日期
// 按鈕列不同(這裡不用「明天/後天」特例,單純日期＋星期幾),獨立成一個小
// 函式,不跟 app/closing/page.tsx 的按鈕標籤格式混用。
export function fmtDateWD(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}(週${WEEKDAY_LABELS[d.getDay()]})`;
}
