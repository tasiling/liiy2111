import { NextRequest, NextResponse } from "next/server";
import { getDetail } from "@/lib/notion/queries";
import { canAdvanceDetailStatus, updateDetailStatus } from "@/lib/notion/mutations";
import { DETAIL_STATUS_ORDER, type DetailStatus } from "@/lib/notion/schema";

// P5 明細狀態單筆推進(委派書 v1.6):只允許順序推進,待產出→已產出→已交付。
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/details/[id]/status">) {
  const { id } = await ctx.params;
  const body = await req.json();
  const { newStatus } = body as { newStatus: DetailStatus };

  if (!DETAIL_STATUS_ORDER.includes(newStatus)) {
    return NextResponse.json({ error: `未知明細狀態:${newStatus}` }, { status: 400 });
  }

  const detail = await getDetail(id);
  if (!detail.明細狀態) {
    return NextResponse.json({ error: "找不到現有明細狀態" }, { status: 404 });
  }

  const check = canAdvanceDetailStatus(detail.明細狀態 as DetailStatus, newStatus);
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 409 });
  }

  await updateDetailStatus(id, newStatus);
  return NextResponse.json({ ok: true, from: detail.明細狀態, to: newStatus });
}
