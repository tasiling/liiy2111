import { NextRequest, NextResponse } from "next/server";
import { composePrompt, type ComposeInput } from "@/lib/generate/compose";

// P8 階段一・一鍵組稿:純讀取 + 文字組裝,不呼叫任何 AI、不寫入 Notion。
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, detailId, monthKey, p8zero } = body as ComposeInput;

  if (!sessionId || !monthKey) {
    return NextResponse.json({ error: "缺少必要參數:sessionId、monthKey" }, { status: 400 });
  }

  const result = await composePrompt({ sessionId, detailId, monthKey, p8zero });
  if (!result.ok) {
    return NextResponse.json({ ok: false, missing: result.missing }, { status: 422 });
  }
  return NextResponse.json({ ok: true, prompt: result.prompt });
}
