import { NextRequest, NextResponse } from "next/server";
import { getDetail } from "@/lib/notion/queries";
import { updateDetailOutputLink, updateDetailStatus } from "@/lib/notion/mutations";
import { normalizeDetailStatus } from "@/lib/notion/schema";

// Notion 是唯一真相來源,寫入/刪除可能發生在 App 之外(擁有者直接在 Notion
// 操作),讀取一律即時查詢,不吃 Next.js 的 Route Handler 快取,避免顯示已經
// 在 Notion 端變動過的舊資料。
export const dynamic = "force-dynamic";
// 日上三更・指令產生器「標記完成」:產出連結為必要(擁有者裁決——批次多篇時
// Session 表頭單一欄位裝不下,這裡是明細層級的產出連結,與 Session 表頭那個是
// 不同欄位)。明細狀態=待產出時不得直接標記完成,必須先「存草稿」進入待審核
// (硬規則:不得跳過審核關卡);已經是待審核則推進為已產出,已產出/已交付則視為
// 事後更正連結,只更新欄位不動狀態。
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/details/[id]/output-link">) {
  const { id } = await ctx.params;
  const body = await req.json();
  const { url } = body as { url: string };

  if (!url || !url.trim()) {
    return NextResponse.json({ error: "缺少必要參數:url(產出連結為必填)" }, { status: 400 });
  }

  const detail = await getDetail(id);
  const current = normalizeDetailStatus(detail.明細狀態);
  if (current === "待產出") {
    return NextResponse.json(
      { error: "須先完成「存草稿」進入待審核,才能標記完成" },
      { status: 409 }
    );
  }

  await updateDetailOutputLink(id, url);
  if (current === "待審核") {
    await updateDetailStatus(id, "已產出");
  }

  return NextResponse.json({ ok: true });
}
