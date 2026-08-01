import { NextRequest, NextResponse } from "next/server";
import { getDetail } from "@/lib/notion/queries";
import { resolveCardsSection } from "@/lib/generate/sections";

// 日上三更指令產生器:點選待產出清單中的一筆,自動帶入牌卡資料(若已抽牌)。
// 尚未抽牌(抽出順序為空)或牌卡查無資料時回傳空字串,不擋流程——使用者仍可在
// 「這次抽到什麼牌」欄位手動輸入或貼上抽牌筆記(沿用原型的自由文字設計)。
export async function GET(req: NextRequest) {
  const detailId = req.nextUrl.searchParams.get("detailId");
  if (!detailId) {
    return NextResponse.json({ error: "缺少必要參數:detailId" }, { status: 400 });
  }
  const detail = await getDetail(detailId);
  const result = await resolveCardsSection(detail.抽出順序);
  return NextResponse.json({ cards: result.ok ? result.value : "" });
}
