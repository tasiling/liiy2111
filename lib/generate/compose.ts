// P8 階段一・一鍵組稿(單篇):純讀取 + 純文字組裝,不呼叫任何 AI、不寫入 Notion(零 API 成本)。
// 五項輸入缺一即報錯,不得靜默省略(委派書 P8 規格硬規定)。
import { getSession, getDetail, listDetailsForSession } from "@/lib/notion/queries";
import { resolveCardsSection, resolveRule, resolveTheme, resolveToneGuide } from "./sections";

export type ComposeInput = {
  sessionId: string;
  detailId?: string;
  monthKey: string; // YYYY-MM
};

export type ComposeResult = { ok: true; prompt: string } | { ok: false; missing: string[] };

export async function composePrompt(input: ComposeInput): Promise<ComposeResult> {
  const missing: string[] = [];

  const session = await getSession(input.sessionId);

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
        `Session 為批次模式(${details.length} 筆明細),請改用批次組稿,或指定 detailId 組單篇稿`
      );
    }
  }

  const cardsResult = detail ? await resolveCardsSection(detail.抽出順序) : null;
  if (cardsResult && !cardsResult.ok) missing.push(...cardsResult.missing);

  const ruleResult = await resolveRule(session.項目用途);
  if (!ruleResult.ok) missing.push(...ruleResult.missing);

  const themeOptional = session.項目用途 === "大眾占卜";
  const themeResult = await resolveTheme(input.monthKey, themeOptional);
  if (!themeResult.ok) missing.push(...themeResult.missing);

  const toneResult = await resolveToneGuide();
  if (!toneResult.ok) missing.push(...toneResult.missing);

  if (missing.length > 0 || !cardsResult?.ok || !ruleResult.ok || !themeResult.ok || !toneResult.ok) {
    return { ok: false, missing };
  }

  const rule = ruleResult.value;
  const theme = themeResult.value;
  const { guide: toneGuide, content: toneGuideContent } = toneResult.value;

  const themeSection = theme
    ? [
        "",
        `【本月主題包(${theme.月份}${theme.主題名 ? " " + theme.主題名 : ""})】`,
        `深度討論題目:${theme.深度討論題目}`,
        `每日互動方向:${theme.每日互動方向}`,
        `當月三款主題服務:${theme.當月三款主題服務}`,
      ]
    : [];

  const prompt = [
    "【牌卡資料】",
    cardsResult.value,
    "",
    `【解讀規則(${rule.規則代碼},現行版)】`,
    `牌位定義:${rule.牌位定義}`,
    `解讀邏輯:${rule.解讀邏輯}`,
    ...themeSection,
    "",
    `【語氣指引(${toneGuide.標題})】`,
    toneGuideContent,
    "",
    "【輸出格式】",
    rule.輸出格式,
  ].join("\n");

  return { ok: true, prompt };
}
