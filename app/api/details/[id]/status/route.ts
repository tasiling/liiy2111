import { NextRequest, NextResponse } from "next/server";
import { getDetail } from "@/lib/notion/queries";
import { canAdvanceDetailStatus, updateDetailStatus } from "@/lib/notion/mutations";
import { DETAIL_STATUS_ORDER, normalizeDetailStatus, type DetailStatus } from "@/lib/notion/schema";

// Notion 是唯一真相來源,寫入/刪除可能發生在 App 之外(擁有者直接在 Notion
// 操作),讀取一律即時查詢,不吃 Next.js 的 Route Handler 快取,避免顯示已經
// 在 Notion 端變動過的舊資料。
export const dynamic = "force-dynamic";
// P5 明細狀態單筆推進(委派書 v1.6):只允許順序推進,待產出→已產出→已交付。
// 讀到空值一律視同「待產出」(防禦性 fallback),推進時照常寫入真值,自然修復舊資料。
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/details/[id]/status">) {
  const { id } = await ctx.params;
  const body = await req.json();
  const { newStatus } = body as { newStatus: DetailStatus };

  if (!DETAIL_STATUS_ORDER.includes(newStatus)) {
    return NextResponse.json({ error: `未知明細狀態:${newStatus}` }, { status: 400 });
  }

  const detail = await getDetail(id);
  const current = normalizeDetailStatus(detail.明細狀態);

  const check = canAdvanceDetailStatus(current, newStatus);
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 409 });
  }

  await updateDetailStatus(id, newStatus);
  return NextResponse.json({ ok: true, from: current, to: newStatus });
}
