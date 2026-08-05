import { NextRequest, NextResponse } from "next/server";
import { createTraceEntry } from "@/lib/notion/mutations";
import type { SpaceKey, SourceType } from "@/lib/dojo/constants";

// Notion 是唯一真相來源,讀取一律即時查詢,不吃 Route Handler 快取。
export const dynamic = "force-dynamic";

// 補充裁決04/05:痕跡建立的背景同步端點,呼叫端是 lib/dojo/store.tsx 的
// addEntry()——每次建立一筆 DojoEntry(私人項目除外)就打這支,失敗靜默,
// 不擋 UI(這支端點本身不重試,重試/補建機制不在這輪範圍)。
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { 標題, 內容, space, sourceType } = body as {
    標題?: string;
    內容?: string;
    space?: SpaceKey;
    sourceType?: SourceType;
  };
  if (!標題 || !space || !sourceType) {
    return NextResponse.json({ error: "缺少必要參數:標題/space/sourceType" }, { status: 400 });
  }
  const { id } = await createTraceEntry({ 標題, 內容, space, sourceType });
  return NextResponse.json({ id });
}
