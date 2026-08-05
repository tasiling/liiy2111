import { NextResponse } from "next/server";
import { markTraceMeasure } from "@/lib/notion/mutations";

// Notion 是唯一真相來源,讀取一律即時查詢,不吃 Route Handler 快取。
export const dynamic = "force-dynamic";

// 標記頻率/強度(補充裁決04「什麼算動靜」表):呼叫端是 lib/dojo/store.tsx
// 的 setEntryFreq()/setEntryIntensity()——只有在設定真的數值時才會呼叫這支
// (清除標記時不呼叫,「取消標記後是否重新開始淡去」這件事沒有裁決過,本輪
// 不猜測,只同步「設定」這個方向)。
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { 頻率, 強度 } = body as { 頻率?: number; 強度?: number };
  await markTraceMeasure(id, { 頻率, 強度 });
  return NextResponse.json({ ok: true });
}
