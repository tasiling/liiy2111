import { NextRequest, NextResponse } from "next/server";
import { composeSankoPrompt } from "@/lib/generate/composeSanko";
import type { SankoMethodKey } from "@/lib/dojo/methods";

// Notion 是唯一真相來源,寫入/刪除可能發生在 App 之外(擁有者直接在 Notion
// 操作),讀取一律即時查詢,不吃 Next.js 的 Route Handler 快取,避免顯示已經
// 在 Notion 端變動過的舊資料。
export const dynamic = "force-dynamic";
// 日上三更指令產生器組稿:純讀取+文字組裝,不呼叫任何 AI、不寫入 Notion。
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { methodKey, cards, station, extra } = body as {
    methodKey: SankoMethodKey;
    cards?: string;
    station?: string;
    extra?: string;
  };

  if (!methodKey) {
    return NextResponse.json({ ok: false, missing: ["請先選一個方法"] }, { status: 422 });
  }

  const result = await composeSankoPrompt({ methodKey, cards, station, extra });
  if (!result.ok) {
    return NextResponse.json({ ok: false, missing: result.missing }, { status: 422 });
  }
  return NextResponse.json({ ok: true, prompt: result.prompt, meta: result.meta });
}
