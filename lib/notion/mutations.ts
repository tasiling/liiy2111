import { notion, withNotionRateLimit } from "./client";
import {
  DATA_SOURCES,
  SESSION_STATUS_ORDER,
  DETAIL_STATUS_ORDER,
  DETAIL_STATUS_DEFAULT,
  FEEDBACK_SCORE_FIELDS,
  FEEDBACK_SCORE_MIN,
  FEEDBACK_SCORE_MAX,
  type SessionStatus,
  type DetailStatus,
  type Feedback對象類型,
} from "./schema";
import {
  titleProp,
  richTextProp,
  selectProp,
  multiSelectProp,
  numberProp,
  dateProp,
  relationProp,
  urlProp,
} from "./properties";
import { queryAll } from "./queries";
import { readTitle } from "./properties";

// Session 編號格式:S-YYYYMMDD-流水號(總綱 DB-03)。流水號以當日已存在筆數 +1 計算。
export async function nextSessionCode(dateISO: string): Promise<string> {
  const ymd = dateISO.replace(/-/g, "");
  const existing = await queryAll(DATA_SOURCES.DB03_抽牌Session, {
    property: "Session 編號",
    title: { starts_with: `S-${ymd}-` },
  });
  const serial = existing.length + 1;
  return `S-${ymd}-${String(serial).padStart(3, "0")}`;
}

export async function createSession(params: {
  dateISO: string; // 建立日期
  項目用途?: string; // 選填:序列展開產出的文案任務沒有對應選項可用時留空(見 docs/schema/項目用途落差說明.md)
  模式: "單筆" | "批次";
  狀態?: SessionStatus;
  備註?: string;
}) {
  const code = await nextSessionCode(params.dateISO);
  const page = await withNotionRateLimit(() =>
    notion().pages.create({
      parent: { type: "data_source_id", data_source_id: DATA_SOURCES.DB03_抽牌Session },
      properties: {
        "Session 編號": titleProp(code),
        建立日期: dateProp(params.dateISO),
        ...(params.項目用途 ? { 項目用途: selectProp(params.項目用途) } : {}),
        模式: selectProp(params.模式),
        狀態: selectProp(params.狀態 ?? "已抽牌"),
        ...(params.備註 ? { 備註: richTextProp(params.備註) } : {}),
      },
    })
  );
  return { id: page.id, code };
}

// 寫入驗證 10(委派書 v1.6):新建 DB-04 明細一律寫入明細狀態=待產出。
export async function createDetail(params: {
  sessionId: string;
  sessionCode: string;
  對應日期: string;
  序: number; // 批次內第幾筆,用於組明細編號
}) {
  const 明細編號 = `${params.sessionCode}-${String(params.序).padStart(2, "0")}`;
  const page = await withNotionRateLimit(() =>
    notion().pages.create({
      parent: { type: "data_source_id", data_source_id: DATA_SOURCES.DB04_抽牌明細 },
      properties: {
        明細編號: titleProp(明細編號),
        對應日期: dateProp(params.對應日期),
        "所屬 Session": relationProp([params.sessionId]),
        明細狀態: selectProp(DETAIL_STATUS_DEFAULT),
      },
    })
  );
  return { id: page.id, 明細編號 };
}

// 明細標題可自訂文字(用於序列展開任務,把節點內容類型編碼進標題,
// 因為 DB-04 明細沒有獨立欄位可記錄節點/內容類型 —— 見落差說明文件)。
export async function createDetailWithTitle(params: {
  sessionId: string;
  明細編號: string;
  對應日期: string;
}) {
  const page = await withNotionRateLimit(() =>
    notion().pages.create({
      parent: { type: "data_source_id", data_source_id: DATA_SOURCES.DB04_抽牌明細 },
      properties: {
        明細編號: titleProp(params.明細編號),
        對應日期: dateProp(params.對應日期),
        "所屬 Session": relationProp([params.sessionId]),
        明細狀態: selectProp(DETAIL_STATUS_DEFAULT),
      },
    })
  );
  return { id: page.id, 明細編號: params.明細編號 };
}

// 抽牌輸入:寫入抽出牌卡(relation)+ 抽出順序(權威順序文字,如 "MP-15, MP-17, MP-09")
export async function writeDraw(params: {
  detailId: string;
  cardPageIds: string[];
  orderText: string;
}) {
  await withNotionRateLimit(() =>
    notion().pages.update({
      page_id: params.detailId,
      properties: {
        抽出牌卡: relationProp(params.cardPageIds),
        抽出順序: richTextProp(params.orderText),
      },
    })
  );
}

// 狀態機只允許順序推進;跳步需呼叫端先取得二次確認(allowSkip=true)才放行。
export function canAdvance(
  current: SessionStatus,
  next: SessionStatus,
  allowSkip: boolean
): { ok: boolean; reason?: string } {
  const curIdx = SESSION_STATUS_ORDER.indexOf(current);
  const nextIdx = SESSION_STATUS_ORDER.indexOf(next);
  if (curIdx === -1 || nextIdx === -1) return { ok: false, reason: "未知狀態" };
  if (nextIdx <= curIdx) return { ok: false, reason: "只能往前推進,不可回退或停留" };
  if (nextIdx > curIdx + 1 && !allowSkip) {
    return { ok: false, reason: "跳步需二次確認(allowSkip)" };
  }
  return { ok: true };
}

export async function updateSessionStatus(sessionId: string, newStatus: SessionStatus) {
  await withNotionRateLimit(() =>
    notion().pages.update({
      page_id: sessionId,
      properties: { 狀態: selectProp(newStatus) },
    })
  );
}

// 明細狀態機(委派書 v1.6,寫入驗證 10):只允許順序推進,待產出→已產出→已交付。
// 明細狀態只有三階,不像表頭狀態機那樣需要「跳步二次確認」的中間步驟夠多的情境,
// 但仍套用同一套「只能往前一步」的收斂規則,不開放任意跳轉。
export function canAdvanceDetailStatus(
  current: DetailStatus,
  next: DetailStatus
): { ok: boolean; reason?: string } {
  const curIdx = DETAIL_STATUS_ORDER.indexOf(current);
  const nextIdx = DETAIL_STATUS_ORDER.indexOf(next);
  if (curIdx === -1 || nextIdx === -1) return { ok: false, reason: "未知狀態" };
  if (nextIdx <= curIdx) return { ok: false, reason: "只能往前推進,不可回退或停留" };
  return { ok: true };
}

export async function updateDetailStatus(detailId: string, newStatus: DetailStatus) {
  await withNotionRateLimit(() =>
    notion().pages.update({
      page_id: detailId,
      properties: { 明細狀態: selectProp(newStatus) },
    })
  );
}

// 「產出連結」欄位檢視與編輯(擁有者 2026-07-12 追加指示):支援內容完成後手動補登記連結,
// 純粹欄位覆寫,不牽動狀態機。允許清空(傳空字串代表撤銷誤填的連結),Notion url 屬性
// 清空須寫 null,不能寫空字串(空字串會被 API 判為不合法 URL 格式而拒絕)。
export async function updateSessionOutputLink(sessionId: string, url: string) {
  const trimmed = url.trim();
  await withNotionRateLimit(() =>
    notion().pages.update({
      page_id: sessionId,
      properties: { 產出連結: trimmed ? urlProp(trimmed) : { url: null } },
    })
  );
}

export async function findSessionCodeById(sessionId: string): Promise<string> {
  const page = await withNotionRateLimit(() => notion().pages.retrieve({ page_id: sessionId }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return readTitle(page as any, "Session 編號");
}

// --- DB-09 回饋紀錄:P6 回饋快填 ---

// 回饋編號格式比照 Session 編號慣例:FB-YYYYMMDD-流水號。
export async function nextFeedbackCode(dateISO: string): Promise<string> {
  const ymd = dateISO.replace(/-/g, "");
  const existing = await queryAll(DATA_SOURCES.DB09_回饋紀錄, {
    property: "回饋編號",
    title: { starts_with: `FB-${ymd}-` },
  });
  const serial = existing.length + 1;
  return `FB-${ymd}-${String(serial).padStart(3, "0")}`;
}

// 寫入驗證(委派書五之 1):四維評分限 1–5,App 端強制檢查(Notion number 欄位無法內建範圍限制)。
export function validateFeedbackScore(value: number): { ok: boolean; reason?: string } {
  if (!Number.isFinite(value) || value < FEEDBACK_SCORE_MIN || value > FEEDBACK_SCORE_MAX) {
    return { ok: false, reason: `評分須介於 ${FEEDBACK_SCORE_MIN}–${FEEDBACK_SCORE_MAX}` };
  }
  return { ok: true };
}

export async function createFeedback(params: {
  dateISO: string;
  對象類型: Feedback對象類型;
  targetId: string; // 對象類型=規則 時填 DB-05 頁面 id,=Session 時填 DB-03 頁面 id
  準確度: number;
  語感: number;
  轉換效果: number;
  可複用性: number;
  問題類型標籤: string[];
  短評?: string;
}) {
  for (const field of FEEDBACK_SCORE_FIELDS) {
    const check = validateFeedbackScore(params[field]);
    if (!check.ok) throw new Error(`${field}:${check.reason}`);
  }
  const code = await nextFeedbackCode(params.dateISO);
  const targetProp = params.對象類型 === "規則" ? "對象-規則" : "對象-Session";
  const page = await withNotionRateLimit(() =>
    notion().pages.create({
      parent: { type: "data_source_id", data_source_id: DATA_SOURCES.DB09_回饋紀錄 },
      properties: {
        回饋編號: titleProp(code),
        對象類型: selectProp(params.對象類型),
        [targetProp]: relationProp([params.targetId]),
        // P6 為擁有者手動快填的當下評分,對應「個人評價時填」的四維評分欄位。
        來源: selectProp("個人評價"),
        日期: dateProp(params.dateISO),
        準確度: numberProp(params.準確度),
        語感: numberProp(params.語感),
        轉換效果: numberProp(params.轉換效果),
        可複用性: numberProp(params.可複用性),
        ...(params.問題類型標籤.length ? { 問題類型標籤: multiSelectProp(params.問題類型標籤) } : {}),
        ...(params.短評 ? { 短評: richTextProp(params.短評) } : {}),
      },
    })
  );
  return { id: page.id, code };
}
