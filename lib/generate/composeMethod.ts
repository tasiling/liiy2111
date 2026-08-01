// 空雨傘八方法・日光互動貼文組稿。五項輸入:牌卡資料、DB-05 對應規則現行版、語氣指引
// 全文、所選方法的空雨傘三段命名與傘段型態、輸出格式,缺一律報錯,不組出殘缺提示詞。
// 與 P8 階段一同一原則:純讀取 + 文字組裝,不呼叫任何 AI、不寫入 Notion,零 API 成本。
// 「主文≤500字+解析包」的輸出規格已隨語氣指引全文(第七章格式規範)一併帶入提示詞,
// 不需要另外寫死——升版時這段規格只會隨語氣指引資料變動,不必動這支程式。
import { getSession } from "@/lib/notion/queries";
import { resolveCardsSection, resolveDetailForSession, resolveRule, resolveToneGuide } from "./sections";
import { resolveMethodMapping } from "./methodTable";

export type ComposeMethodInput = {
  sessionId: string;
  detailId?: string;
  method: string; // 版型名,使用者從八種方法按鈕擇一後帶入
};

export type ComposeMethodResult = { ok: true; prompt: string } | { ok: false; missing: string[] };

export async function composeMethodPrompt(input: ComposeMethodInput): Promise<ComposeMethodResult> {
  const missing: string[] = [];
  if (!input.method) missing.push("尚未選擇方法(請先從八種方法按鈕擇一)");

  const session = await getSession(input.sessionId);

  const detailResult = await resolveDetailForSession(input.sessionId, input.detailId);
  if (!detailResult.ok) missing.push(...detailResult.missing);
  const detail = detailResult.ok ? detailResult.value : null;

  const cardsResult = detail ? await resolveCardsSection(detail.抽出順序) : null;
  if (cardsResult && !cardsResult.ok) missing.push(...cardsResult.missing);

  const ruleResult = await resolveRule(session.項目用途);
  if (!ruleResult.ok) missing.push(...ruleResult.missing);

  const toneResult = await resolveToneGuide();
  if (!toneResult.ok) missing.push(...toneResult.missing);

  const methodResult =
    toneResult.ok && input.method ? await resolveMethodMapping(toneResult.value.sourcePageId, input.method) : null;
  if (methodResult && !methodResult.ok) missing.push(...methodResult.missing);

  if (missing.length > 0 || !cardsResult?.ok || !ruleResult.ok || !toneResult.ok || !methodResult?.ok) {
    return { ok: false, missing };
  }

  const rule = ruleResult.value;
  const { guide: toneGuide, content: toneGuideContent } = toneResult.value;
  const method = methodResult.value;

  const prompt = [
    "【牌卡資料】",
    cardsResult.value,
    "",
    `【解讀規則(${rule.規則代碼},現行版)】`,
    `牌位定義:${rule.牌位定義}`,
    `解讀邏輯:${rule.解讀邏輯}`,
    "",
    `【語氣指引(${toneGuide.標題})】`,
    toneGuideContent,
    "",
    `【方法:${method.版型名}(原始方法:${method.方法}｜傘型態:${method.傘型態})】`,
    `空(現狀共振):${method.空}`,
    `雨(牌卡訊息):${method.雨}`,
    `傘(微光行動/新內在句):${method.傘}`,
    "",
    "【輸出格式】",
    rule.輸出格式,
  ].join("\n");

  return { ok: true, prompt };
}
