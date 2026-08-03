import { NextRequest, NextResponse } from "next/server";
import { getDetail } from "@/lib/notion/queries";
import { archiveDetail } from "@/lib/notion/mutations";
import { normalizeDetailStatus } from "@/lib/notion/schema";

// Notion 是唯一真相來源,寫入/刪除可能發生在 App 之外(擁有者直接在 Notion
// 操作),讀取一律即時查詢,不吃 Next.js 的 Route Handler 快取,避免顯示已經
// 在 Notion 端變動過的舊資料。
export const dynamic = "force-dynamic";
// 日上三更・批次刪除,單筆(擁有者 2026-08-03 追加指示):只有明細狀態=待產出
// 可以刪除;待審核(已有草稿)、已產出、已交付一律擋下,不開放這個入口。
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/sanko/batches/[id]">) {
  const { id } = await ctx.params;
  const detail = await getDetail(id);
  const status = normalizeDetailStatus(detail.明細狀態);
  if (status !== "待產出") {
    return NextResponse.json({ error: `明細狀態為「${status}」,只有待產出可以刪除` }, { status: 409 });
  }
  await archiveDetail(id);
  return NextResponse.json({ ok: true });
}
