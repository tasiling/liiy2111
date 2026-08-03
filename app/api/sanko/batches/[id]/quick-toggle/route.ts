import { NextRequest, NextResponse } from "next/server";
import { getDetail } from "@/lib/notion/queries";
import { setDetailQuickDone } from "@/lib/notion/mutations";
import { normalizeDetailStatus } from "@/lib/notion/schema";

// 日上三更・批次建立與產出清單(委派書 v1.0 §4.4)日期卡的快速勾選:
// 直接勾選完成→已產出,取消勾選→待產出。刻意允許「取消勾選」往回走
// (不經過明細狀態機的單向限制)——這是勾選方塊的直覺,不是正式審核流程。
// 已交付是更終局的歷史紀錄,不開放這個入口去動它。
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/sanko/batches/[id]/quick-toggle">) {
  const { id } = await ctx.params;
  const body = await req.json();
  const { done } = body as { done: boolean };

  const detail = await getDetail(id);
  const current = normalizeDetailStatus(detail.明細狀態);
  if (current === "已交付") {
    return NextResponse.json({ error: "已交付是歷史紀錄,不能用快速勾選更動" }, { status: 409 });
  }

  await setDetailQuickDone(id, Boolean(done));
  return NextResponse.json({ ok: true });
}
