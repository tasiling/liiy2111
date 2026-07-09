// 批次組稿的共用區塊(規則/月主題包/語氣指引)只需解析一次,供模式甲/模式乙共用。
import { getSession } from "@/lib/notion/queries";
import { resolveRule, resolveTheme, resolveToneGuide } from "./sections";

export type SharedContext = {
  項目用途: string;
  規則代碼: string;
  牌位定義: string;
  解讀邏輯: string;
  輸出格式: string;
  theme: { 月份: string; 主題名: string; 深度討論題目: string; 每日互動方向: string; 當月三款主題服務: string } | null;
  語氣指引標題: string;
  語氣指引內容: string;
};

export type ContextResult = { ok: true; value: SharedContext } | { ok: false; missing: string[] };

export async function resolveSharedContext(sessionId: string, monthKey: string): Promise<ContextResult> {
  const missing: string[] = [];
  const session = await getSession(sessionId);

  const ruleResult = await resolveRule(session.項目用途);
  if (!ruleResult.ok) missing.push(...ruleResult.missing);

  const themeOptional = session.項目用途 === "大眾占卜";
  const themeResult = await resolveTheme(monthKey, themeOptional);
  if (!themeResult.ok) missing.push(...themeResult.missing);

  const toneResult = await resolveToneGuide();
  if (!toneResult.ok) missing.push(...toneResult.missing);

  if (missing.length > 0 || !ruleResult.ok || !themeResult.ok || !toneResult.ok) {
    return { ok: false, missing };
  }

  const rule = ruleResult.value;
  const { guide, content } = toneResult.value;

  return {
    ok: true,
    value: {
      項目用途: session.項目用途 ?? "",
      規則代碼: rule.規則代碼,
      牌位定義: rule.牌位定義,
      解讀邏輯: rule.解讀邏輯,
      輸出格式: rule.輸出格式,
      theme: themeResult.value,
      語氣指引標題: guide.標題,
      語氣指引內容: content,
    },
  };
}
