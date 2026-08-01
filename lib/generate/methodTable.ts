// 空雨傘八方法對照表解析(語氣指引現行版全文頁面內「八方法版型與三段命名對照」表格)。
// 依欄位標題比對取值,不寫死表格位置、列數或方法清單本身——升版時只要表格欄位標題
// (方法/版型名/空/雨/傘/傘型態)不變,對照內容改版只換 Notion 資料,不必動這支程式。
import type { Result } from "./sections";
import { fetchNotionPageTables } from "@/lib/notion/queries";

export type MethodMapping = {
  方法: string; // 原始方法名(如「晨光占卜」)
  版型名: string; // 品牌化版型名(如「直覺便利貼」),八按鈕即取此欄
  空: string;
  雨: string;
  傘: string;
  傘型態: string; // 行動 / 替換句
};

const REQUIRED_COLUMNS = ["方法", "版型名", "空", "雨", "傘", "傘型態"] as const;

export function parseMethodMappingTable(tables: string[][][]): MethodMapping[] {
  for (const table of tables) {
    if (table.length === 0) continue;
    const header = table[0].map((h) => h.trim());
    if (!REQUIRED_COLUMNS.every((c) => header.includes(c))) continue;
    const colIndex = Object.fromEntries(
      REQUIRED_COLUMNS.map((c) => [c, header.indexOf(c)])
    ) as Record<(typeof REQUIRED_COLUMNS)[number], number>;
    return table
      .slice(1)
      .filter((row) => row.some((cell) => cell.trim()))
      .map((row) => ({
        方法: row[colIndex.方法]?.trim() ?? "",
        版型名: row[colIndex.版型名]?.trim() ?? "",
        空: row[colIndex.空]?.trim() ?? "",
        雨: row[colIndex.雨]?.trim() ?? "",
        傘: row[colIndex.傘]?.trim() ?? "",
        傘型態: row[colIndex.傘型態]?.trim() ?? "",
      }));
  }
  return [];
}

export async function resolveMethodOptions(sourcePageId: string): Promise<Result<MethodMapping[]>> {
  const tables = await fetchNotionPageTables(sourcePageId);
  const rows = parseMethodMappingTable(tables);
  if (rows.length === 0) {
    return {
      ok: false,
      missing: [
        "語氣指引全文頁面內找不到「方法/版型名/空/雨/傘/傘型態」對照表,八方法選單無法載入",
      ],
    };
  }
  return { ok: true, value: rows };
}

export async function resolveMethodMapping(
  sourcePageId: string,
  methodLabel: string
): Promise<Result<MethodMapping>> {
  const optionsResult = await resolveMethodOptions(sourcePageId);
  if (!optionsResult.ok) return optionsResult;
  const row = optionsResult.value.find((r) => r.版型名 === methodLabel.trim());
  if (!row) {
    return {
      ok: false,
      missing: [
        `對照表中找不到方法「${methodLabel}」,可選方法:${optionsResult.value
          .map((r) => r.版型名)
          .join("、")}`,
      ],
    };
  }
  return { ok: true, value: row };
}
