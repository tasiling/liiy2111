import { NextRequest, NextResponse } from "next/server";
import { getDetail } from "@/lib/notion/queries";
import { updateDetailDate, appendSessionNote } from "@/lib/notion/mutations";
import { normalizeDetailStatus } from "@/lib/notion/schema";

// P5 單筆明細日期編輯(擁有者追加指示):同批次平移的限制——只允許明細狀態=待產出者
// 變動日期,已產出/已交付是歷史紀錄,只增不改。異動同樣留軌跡於所屬 Session 表頭備註。
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/details/[id]/date">) {
  const { id } = await ctx.params;
  const body = await req.json();
  const { newDate } = body as { newDate: string };

  if (!newDate) {
    return NextResponse.json({ error: "缺少必要參數:newDate" }, { status: 400 });
  }

  const detail = await getDetail(id);
  const status = normalizeDetailStatus(detail.明細狀態);
  if (status !== "待產出") {
    return NextResponse.json(
      { error: `明細狀態=${status},已產出/已交付明細不可更改日期(紀錄層只增不改)` },
      { status: 409 }
    );
  }

  const oldDate = detail.對應日期;
  await updateDetailDate(id, newDate);

  if (detail.所屬Session) {
    const todayISO = new Date().toISOString().slice(0, 10);
    const note = `【日期修改】明細 ${detail.明細編號}:${oldDate} → ${newDate}(操作日期 ${todayISO})`;
    await appendSessionNote(detail.所屬Session, note);
  }

  return NextResponse.json({ ok: true, from: oldDate, to: newDate });
}
