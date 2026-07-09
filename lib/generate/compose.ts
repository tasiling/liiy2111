// P8 階段一・一鍵組稿:純讀取 + 純文字組裝,不呼叫任何 AI、不寫入 Notion(零 API 成本)。
// 五項輸入缺一即報錯,不得靜默省略(委派書 P8 規格硬規定)。
import {
  getSession,
  getDetail,
  listDetailsForSession,
  findCardByIdentifier,
  listCurrentRulesFor適用項目,
  getMonthlyThemeByMonth,
  listToneGuideCandidates,
} from "@/lib/notion/queries";
import { parseDrawOrder } from "./cards";
import { pickLatestToneGuide } from "./toneGuide";

export type ComposeInput = {
  sessionId: string;
  detailId?: string;
  monthKey: string; // YYYY-MM
};

export type ComposeResult =
  | { ok: true; prompt: string }
  | { ok: false; missing: string[] };

export async function composePrompt(input: ComposeInput): Promise<ComposeResult> {
  const missing: string[] = [];

  const session = await getSession(input.sessionId);
  if (!session.項目用途) {
    missing.push("Session 缺少「項目用途」,無法比對規則");
  }

  // 決定要用哪一筆明細:批次 Session 需指定 detailId(逐日生成,SOP 小生產日步驟 2);
  // 單筆 Session 只有一筆明細,自動取用。
  let detail: Awaited<ReturnType<typeof getDetail>> | null = null;
  if (input.detailId) {
    detail = await getDetail(input.detailId);
  } else {
    const details = await listDetailsForSession(input.sessionId);
    if (details.length === 1) {
      detail = details[0];
    } else if (details.length === 0) {
      missing.push("Session 底下沒有任何明細,無法取得牌卡資料");
    } else {
      missing.push(
        `Session 為批次模式(${details.length} 筆明細),需指定 detailId 才知道要組哪一天的稿`
      );
    }
  }

  // 1. 牌卡資料(DB-03/04 → DB-02),以「抽出順序」為權威順序,逆位以 R 後綴記法解析。
  let cardsSection: string | null = null;
  if (detail) {
    if (!detail.抽出順序) {
      missing.push("此明細尚未輸入抽牌結果(抽出順序為空)");
    } else {
      const refs = parseDrawOrder(detail.抽出順序);
      const cards = await Promise.all(refs.map((r) => findCardByIdentifier(r.identifier)));
      const notFoundIdx = cards
        .map((c, i) => (c === null ? i : -1))
        .filter((i) => i >= 0);
      if (notFoundIdx.length > 0) {
        missing.push(
          `以下牌卡識別碼在 DB-02 找不到:${notFoundIdx.map((i) => refs[i].identifier).join("、")}`
        );
      } else {
        cardsSection = cards
          .map((c, i) => {
            const r = refs[i];
            const card = c!;
            return `${card.卡片識別碼}${r.reversed ? "(逆位)" : ""} ${card.牌名}:短義=${card.短義};長義=${card.長義};關鍵字=${card.關鍵字.join("、")}`;
          })
          .join("\n");
      }
    }
  }

  // 2/5. DB-05 對應規則之現行版(含輸出格式,同一筆)
  let rule: Awaited<ReturnType<typeof listCurrentRulesFor適用項目>>[number] | null = null;
  if (session.項目用途) {
    const rules = await listCurrentRulesFor適用項目(session.項目用途);
    if (rules.length === 0) {
      missing.push(`DB-05 找不到「${session.項目用途}」的現行版規則(狀態=現行)`);
    } else if (rules.length > 1) {
      missing.push(
        `DB-05「${session.項目用途}」同時有 ${rules.length} 筆狀態=現行的規則,版本衝突,需人工確認`
      );
    } else {
      rule = rules[0];
    }
  }

  // 3. 月主題包
  const theme = await getMonthlyThemeByMonth(input.monthKey);
  if (!theme) {
    missing.push(`DB-08 找不到 ${input.monthKey} 的月主題包`);
  }

  // 4. 語氣指引現行版
  const toneCandidates = await listToneGuideCandidates();
  const toneGuide = pickLatestToneGuide(toneCandidates);
  if (!toneGuide) {
    missing.push("DB-14 找不到任何「語氣指引 vX」(來源=原創)——語氣樣本尚未到位,此為已知阻塞項");
  }

  if (missing.length > 0 || !cardsSection || !rule || !theme || !toneGuide) {
    return { ok: false, missing };
  }

  const prompt = [
    "【牌卡資料】",
    cardsSection,
    "",
    `【解讀規則(${rule.規則代碼},現行版)】`,
    `牌位定義:${rule.牌位定義}`,
    `解讀邏輯:${rule.解讀邏輯}`,
    "",
    `【本月主題包(${theme.月份}${theme.主題名 ? " " + theme.主題名 : ""})】`,
    `深度討論題目:${theme.深度討論題目}`,
    `每日互動方向:${theme.每日互動方向}`,
    `當月三款主題服務:${theme.當月三款主題服務}`,
    "",
    `【語氣指引(${toneGuide.標題})】`,
    toneGuide.內容,
    "",
    "【輸出格式】",
    rule.輸出格式,
  ].join("\n");

  return { ok: true, prompt };
}
