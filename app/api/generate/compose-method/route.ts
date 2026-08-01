import { NextRequest, NextResponse } from "next/server";
import { composeMethodPrompt, type ComposeMethodInput } from "@/lib/generate/composeMethod";

// 空雨傘八方法組稿:純讀取 + 文字組裝,不呼叫任何 AI、不寫入 Notion。
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, detailId, method } = body as ComposeMethodInput;

  if (!sessionId) {
    return NextResponse.json({ error: "缺少必要參數:sessionId" }, { status: 400 });
  }

  const result = await composeMethodPrompt({ sessionId, detailId, method });
  if (!result.ok) {
    return NextResponse.json({ ok: false, missing: result.missing }, { status: 422 });
  }
  return NextResponse.json({ ok: true, prompt: result.prompt });
}
