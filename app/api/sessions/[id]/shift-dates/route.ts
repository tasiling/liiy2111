import { NextRequest, NextResponse } from "next/server";
import { listDetailsForSession } from "@/lib/notion/queries";
import { updateDetailDate, appendSessionNote } from "@/lib/notion/mutations";
import { runBatch } from "@/lib/notion/client";
import { addDays, toISODate } from "@/lib/date";
import { normalizeDetailStatus } from "@/lib/notion/schema";

// P5 批次日期平移(擁有者追加指示):整批明細對應日期一次平移 offsetDays 天,
// 用「加同一個天數」實作,結構上自動保持原本的間隔(不論逐日或未來的非連續批次)。
// 只平移明細狀態=待產出者;已產出/已交付是歷史紀錄,只增不改,原樣跳過並列出。
// 寫入前的預覽由前端用已載入的明細清單算好給擁有者確認,這支路由只在擁有者按下
// 「確認平移」後才呼叫,不在此路由內做預覽。
export async function POST(req: NextRequest, ctx: RouteContext<"/api/sessions/[id]/shift-dates">) {
  const { id } = await ctx.params;
  const body = await req.json();
  const { offsetDays } = body as { offsetDays: number };

  if (!Number.isFinite(offsetDays) || offsetDays === 0) {
    return NextResponse.json({ error: "offsetDays 須為非零整數" }, { status: 400 });
  }

  const details = await listDetailsForSession(id);
  const shiftable = details.filter(
    (d) => normalizeDetailStatus(d.明細狀態) === "待產出" && d.對應日期
  );
  const skipped = details
    .filter((d) => !(normalizeDetailStatus(d.明細狀態) === "待產出" && d.對應日期))
    .map((d) => ({ id: d.id, 明細編號: d.明細編號, 明細狀態: normalizeDetailStatus(d.明細狀態) }));

  if (shiftable.length === 0) {
    return NextResponse.json(
      { error: "沒有可平移的明細(全部已產出/已交付,或缺少對應日期)" },
      { status: 400 }
    );
  }

  const plan = shiftable.map((d) => ({
    id: d.id,
    明細編號: d.明細編號,
    from: d.對應日期 as string,
    to: toISODate(addDays(new Date(d.對應日期 as string), offsetDays)),
  }));

  const result = await runBatch(plan, async (item) => {
    await updateDetailDate(item.id, item.to);
    return item;
  });

  if (result.succeeded.length > 0) {
    const froms = result.succeeded.map((s) => s.from).sort();
    const tos = result.succeeded.map((s) => s.to).sort();
    const todayISO = new Date().toISOString().slice(0, 10);
    const skipNote = skipped.length ? `,跳過 ${skipped.length} 筆已產出/已交付明細` : "";
    const note = `【日期平移】${froms[0]}~${froms[froms.length - 1]} → ${tos[0]}~${tos[tos.length - 1]}(${
      offsetDays > 0 ? "+" : ""
    }${offsetDays} 天,操作日期 ${todayISO}${skipNote})`;
    await appendSessionNote(id, note);
  }

  return NextResponse.json({
    succeeded: result.succeeded,
    failed: result.failed,
    skipped,
  });
}
