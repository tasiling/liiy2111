import { NextResponse } from "next/server";
import { listCurrentRules, listRecentlyUsedRuleIds } from "@/lib/notion/queries";

const 最近使用天數 = 14;

// P6 回饋快填:對象=規則時的選單資料來源(不分適用項目,列出全部現行版)。
// 另外回傳最近 14 天內有 Session 使用過的規則 id,供前端把選單分成「置頂」/「更多」
// 兩段(擁有者裁決,純前端過濾顯示順序,不改變回傳的規則清單本身)。
export async function GET() {
  const [rules, recentlyUsedIds] = await Promise.all([
    listCurrentRules(),
    listRecentlyUsedRuleIds(最近使用天數),
  ]);
  return NextResponse.json({ rules, recentlyUsedIds });
}
