import { NextRequest, NextResponse } from "next/server";
import { composePrompt, type ComposeInput } from "@/lib/generate/compose";

// Notion 是唯一真相來源,寫入/刪除可能發生在 App 之外(擁有者直接在 Notion
// 操作),讀取一律即時查詢,不吃 Next.js 的 Route Handler 快取,避免顯示已經
// 在 Notion 端變動過的舊資料。
export const dynamic = "force-dynamic";
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
