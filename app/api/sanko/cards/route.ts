import { NextRequest, NextResponse } from "next/server";
import { getDetail } from "@/lib/notion/queries";
import { resolveCardsSection } from "@/lib/generate/sections";

// Notion 是唯一真相來源,寫入/刪除可能發生在 App 之外(擁有者直接在 Notion
// 操作),讀取一律即時查詢,不吃 Next.js 的 Route Handler 快取,避免顯示已經
// 在 Notion 端變動過的舊資料。
export const dynamic = "force-dynamic";
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
