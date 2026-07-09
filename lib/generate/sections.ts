// P8 組稿的可重用區塊解析器:單篇組稿(compose.ts)與批次組稿(batchCompose.ts)共用,
// 避免同一段「查規則/查月主題包/查語氣指引」邏輯寫兩份。
import {
  findCardByIdentifier,
  listCurrentRulesFor適用項目,
  getMonthlyThemeByMonth,
  listToneGuideCandidates,
  extractNotionPageId,
  fetchNotionPagePlainText,
  type mapRule,
  type mapMonthlyTheme,
  type mapKnowledge,
} from "@/lib/notion/queries";
import { parseDrawOrder } from "./cards";
import { pickLatestToneGuide } from "./toneGuide";

type Result<T> = { ok: true; value: T } | { ok: false; missing: string[] };

// 1. 牌卡資料:以「抽出順序」為權威順序,逆位以 R 後綴記法解析。
export async function resolveCardsSection(抽出順序: string): Promise<Result<string>> {
  if (!抽出順序) {
    return { ok: false, missing: ["此明細尚未輸入抽牌結果(抽出順序為空)"] };
  }
  const refs = parseDrawOrder(抽出順序);
  const cards = await Promise.all(refs.map((r) => findCardByIdentifier(r.identifier)));
  const notFoundIdx = cards.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0);
  if (notFoundIdx.length > 0) {
    return {
      ok: false,
      missing: [`以下牌卡識別碼在 DB-02 找不到:${notFoundIdx.map((i) => refs[i].identifier).join("、")}`],
    };
  }
  const section = cards
    .map((c, i) => {
      const r = refs[i];
      const card = c!;
      return `${card.卡片識別碼}${r.reversed ? "(逆位)" : ""} ${card.牌名}:短義=${card.短義};長義=${card.長義};關鍵字=${card.關鍵字.join("、")}`;
    })
    .join("\n");
  return { ok: true, value: section };
}

// 2/5. DB-05 對應規則之現行版(含輸出格式)
export async function resolveRule(
  項目用途: string | null
): Promise<Result<ReturnType<typeof mapRule>>> {
  if (!項目用途) {
    return { ok: false, missing: ["Session 缺少「項目用途」,無法比對規則"] };
  }
  const rules = await listCurrentRulesFor適用項目(項目用途);
  if (rules.length === 0) {
    return { ok: false, missing: [`DB-05 找不到「${項目用途}」的現行版規則(狀態=現行)`] };
  }
  if (rules.length > 1) {
    return {
      ok: false,
      missing: [`DB-05「${項目用途}」同時有 ${rules.length} 筆狀態=現行的規則,版本衝突,需人工確認`],
    };
  }
  return { ok: true, value: rules[0] };
}

// 3. 月主題包(v1.5:一更大眾占卜獨立於月主題,選填)
export async function resolveTheme(
  monthKey: string,
  optional: boolean
): Promise<Result<ReturnType<typeof mapMonthlyTheme> | null>> {
  const theme = await getMonthlyThemeByMonth(monthKey);
  if (!theme && !optional) {
    return { ok: false, missing: [`DB-08 找不到 ${monthKey} 的月主題包`] };
  }
  return { ok: true, value: theme };
}

// 4. 語氣指引現行版(標題以「語氣指引」開頭、核可狀態=已核可,取最新版;連結有值則取回全文)
export async function resolveToneGuide(): Promise<
  Result<{ guide: ReturnType<typeof mapKnowledge>; content: string }>
> {
  const candidates = await listToneGuideCandidates();
  const toneGuide = pickLatestToneGuide(candidates);
  if (!toneGuide) {
    return {
      ok: false,
      missing: ["DB-14 找不到任何「語氣指引 vX」(核可狀態=已核可)——語氣樣本尚未到位,此為已知阻塞項"],
    };
  }
  if (toneGuide.連結) {
    const pageId = extractNotionPageId(toneGuide.連結);
    if (!pageId) {
      return {
        ok: false,
        missing: [`語氣指引「${toneGuide.標題}」的連結不是有效的 Notion 頁面網址,無法取回全文`],
      };
    }
    const text = await fetchNotionPagePlainText(pageId);
    if (!text) {
      return { ok: false, missing: [`語氣指引「${toneGuide.標題}」依連結取回的全文為空`] };
    }
    return { ok: true, value: { guide: toneGuide, content: text } };
  }
  if (toneGuide.內容) {
    return { ok: true, value: { guide: toneGuide, content: toneGuide.內容 } };
  }
  return { ok: false, missing: [`語氣指引「${toneGuide.標題}」的「內容」與「連結」皆為空`] };
}
