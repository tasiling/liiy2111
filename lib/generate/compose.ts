// P8 階段一・一鍵組稿(單篇):純讀取 + 純文字組裝,不呼叫任何 AI、不寫入 Notion(零 API 成本)。
// 五項輸入缺一即報錯,不得靜默省略(委派書 P8 規格硬規定)。
import { getSession } from "@/lib/notion/queries";
import {
  resolveCardsSection,
  resolveDetailForSession,
  resolveRule,
  resolveTheme,
  resolveToneGuide,
} from "./sections";
import { buildP8ZeroSection, type P8ZeroInput } from "./p8zero";

export type ComposeInput = {
  sessionId: string;
  detailId?: string;
  monthKey: string; // YYYY-MM
  p8zero?: P8ZeroInput;
};

export type ComposeResult = { ok: true; prompt: string } | { ok: false; missing: string[] };

export async function composePrompt(input: ComposeInput): Promise<ComposeResult> {
  const missing: string[] = [];

  const session = await getSession(input.sessionId);

  const detailResult = await resolveDetailForSession(input.sessionId, input.detailId);
  if (!detailResult.ok) missing.push(...detailResult.missing);
  const detail = detailResult.ok ? detailResult.value : null;

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
    ...buildP8ZeroSection(input.p8zero ?? {}),
  ].join("\n");

  return { ok: true, prompt };
}
