import { NextRequest, NextResponse } from "next/server";
import { getDetail } from "@/lib/notion/queries";
import { canAdvanceDetailStatus, updateDetailStatus } from "@/lib/notion/mutations";
import { runBatch } from "@/lib/notion/client";
import { DETAIL_STATUS_ORDER, normalizeDetailStatus, type DetailStatus } from "@/lib/notion/schema";

// P5 明細狀態多選批次推進(委派書 v1.6)。逐筆各自驗證只能順序推進,
// 不符合的那幾筆列入失敗清單並附原因,不靜默跳過、不影響其餘筆數。
// 讀到空值一律視同「待產出」(防禦性 fallback),推進時照常寫入真值。
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { detailIds, newStatus } = body as { detailIds: string[]; newStatus: DetailStatus };

  if (!Array.isArray(detailIds) || detailIds.length === 0 || !newStatus) {
    return NextResponse.json({ error: "缺少必要參數:detailIds、newStatus" }, { status: 400 });
  }
  if (!DETAIL_STATUS_ORDER.includes(newStatus)) {
    return NextResponse.json({ error: `未知明細狀態:${newStatus}` }, { status: 400 });
  }

  const result = await runBatch(detailIds, async (detailId) => {
    const detail = await getDetail(detailId);
    const current = normalizeDetailStatus(detail.明細狀態);
    const check = canAdvanceDetailStatus(current, newStatus);
    if (!check.ok) throw new Error(`${detail.明細編號}:${check.reason}`);
    await updateDetailStatus(detailId, newStatus);
    return { detailId, 明細編號: detail.明細編號 };
  });

  return NextResponse.json({
    succeeded: result.succeeded,
    failed: result.failed,
  });
}
