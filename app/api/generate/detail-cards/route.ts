import { NextRequest, NextResponse } from "next/server";
import { getDetail } from "@/lib/notion/queries";
import { resolveCardsSection } from "@/lib/generate/sections";

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
