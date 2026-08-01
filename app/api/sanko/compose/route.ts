import { NextRequest, NextResponse } from "next/server";
import { composeSankoPrompt } from "@/lib/generate/composeSanko";
import type { SankoMethodKey } from "@/lib/dojo/methods";

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
