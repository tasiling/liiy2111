// 日記(收光改版 3.4/3.5,補充裁決03 §四之1 選項C,擁有者 2026-08-05 裁決:另開
// 專用資料庫 DB-18 日記庫,不塞進 DB-14 的 JSON——七題各自是 DB-18 的原生
// rich_text 欄位,存放位置與收光紀錄完全分開,見 docs/schema/收光改版.md)。
//
// 七題全部選填,「有寫的就填、沒寫的留空」(擁有者原話,2026-08-05)——不塞
// 預設文字。UI 端硬規則(委派書補充裁決03 §3.4):七題一次全部列出,不得顯示
// 已填幾題/還剩幾題/進度條/任何完成度,不得要求先選「今天要寫多少」。
export const JOURNAL_QUESTIONS = [
  { key: "我很感恩的三件事", label: "我很感恩的三件事", group: "晨間" },
  { key: "讓這一天變更棒的方法", label: "讓這一天變更棒的方法", group: "晨間" },
  { key: "我的正向肯定句", label: "我的正向肯定句", group: "晨間" },
  { key: "我的未來日記", label: "我的未來日記", group: "晨間" },
  { key: "我今天做的好事", label: "我今天做的好事", group: "夜間" },
  { key: "我要改善什麼問題", label: "我要改善什麼問題(我的覺察與思考)", group: "夜間" },
  { key: "我今天經歷的美好事物", label: "我今天經歷的美好事物／幸福時刻", group: "夜間" },
] as const;

export type JournalQuestionKey = (typeof JOURNAL_QUESTIONS)[number]["key"];
export type JournalAnswers = Partial<Record<JournalQuestionKey, string>>;

export const JOURNAL_TITLE_PREFIX = "日記-";

export function journalRecordTitle(dateISO: string): string {
  return `${JOURNAL_TITLE_PREFIX}${dateISO.replace(/-/g, "")}`;
}

// 一天一筆,比照收光紀錄「當日已有紀錄則覆蓋」的既有慣例——寫入時七題一律
// 全寫(有寫的填裁邊後的文字,沒寫的填空字串),不做「只補有值的欄位、其餘
// 維持舊值」的部分合併,避免「這次送出到底覆蓋了什麼」變得難以追蹤。
export function normalizeJournalAnswers(answers: JournalAnswers): Record<JournalQuestionKey, string> {
  const result = {} as Record<JournalQuestionKey, string>;
  for (const q of JOURNAL_QUESTIONS) {
    result[q.key] = (answers[q.key] ?? "").trim();
  }
  return result;
}

// 判斷這次送出「有沒有真的寫了什麼」——沒開日記面板、或開了但七題全部留白,
// 都不建立/更新 DB-18 紀錄,避免庫裡堆一堆完全空白的日記列。
export function hasAnyJournalAnswer(answers: JournalAnswers): boolean {
  return Object.values(normalizeJournalAnswers(answers)).some((v) => v !== "");
}
