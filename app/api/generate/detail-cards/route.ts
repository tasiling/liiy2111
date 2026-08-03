import { NextRequest, NextResponse } from "next/server";
import { getDetail } from "@/lib/notion/queries";
import { resolveCardsSection } from "@/lib/generate/sections";

// Notion 是唯一真相來源,寫入/刪除可能發生在 App 之外(擁有者直接在 Notion
// 操作),讀取一律即時查詢,不吃 Next.js 的 Route Handler 快取,避免顯示已經
// 在 Notion 端變動過的舊資料。
export const dynamic = "force-dynamic";
// 批次組稿:逐筆明細取牌卡資料。前端逐筆呼叫此端點以顯示進度(第 N/M 筆),
// 也讓速率限制(節流佇列)自然分散在多次請求上,而不是一次巨大請求悶著跑。
export async function GET(req: NextRequest) {
  const detailId = req.nextUrl.searchParams.get("detailId");
  if (!detailId) {
    return NextResponse.json({ error: "缺少必要參數:detailId" }, { status: 400 });
  }

  const detail = await getDetail(detailId);
  const result = await resolveCardsSection(detail.抽出順序);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, 明細編號: detail.明細編號, 對應日期: detail.對應日期, missing: result.missing },
      { status: 200 }
    );
  }
  return NextResponse.json({
    ok: true,
    明細編號: detail.明細編號,
    對應日期: detail.對應日期,
    cardsSection: result.value,
  });
}
