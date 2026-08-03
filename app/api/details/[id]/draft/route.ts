import { NextRequest, NextResponse } from "next/server";
import { getDetail } from "@/lib/notion/queries";
import { updateDetailDraft, updateDetailStatus, canAdvanceDetailStatus } from "@/lib/notion/mutations";
import { normalizeDetailStatus } from "@/lib/notion/schema";

// Notion 是唯一真相來源,寫入/刪除可能發生在 App 之外(擁有者直接在 Notion
// 操作),讀取一律即時查詢,不吃 Next.js 的 Route Handler 快取,避免顯示已經
// 在 Notion 端變動過的舊資料。
export const dynamic = "force-dynamic";
// 日上三更・指令產生器「存草稿」:草稿一律寫入 Notion(擁有者硬性要求,不存瀏覽器
// 暫存)。第一次存草稿時(明細狀態仍是待產出)自動推進到「待審核」,不得跳過此關卡
// (硬規則:生成完成後狀態一律=待審核)。之後再次更新草稿文字(已經是待審核或更後面)
// 只覆寫文字,不重複觸發狀態推進。
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/details/[id]/draft">) {
  const { id } = await ctx.params;
  const body = await req.json();
  const { draftText } = body as { draftText: string };

  if (!draftText || !draftText.trim()) {
    return NextResponse.json({ error: "缺少必要參數:draftText" }, { status: 400 });
  }

  await updateDetailDraft(id, draftText);

  const detail = await getDetail(id);
  const current = normalizeDetailStatus(detail.明細狀態);
  if (current === "待產出") {
    const check = canAdvanceDetailStatus(current, "待審核");
    if (check.ok) await updateDetailStatus(id, "待審核");
  }

  return NextResponse.json({ ok: true });
}
