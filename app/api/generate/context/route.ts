import { NextRequest, NextResponse } from "next/server";
import { resolveSharedContext } from "@/lib/generate/context";

// 批次組稿共用區塊(規則/月主題包/語氣指引),模式甲/模式乙皆只解析一次。
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, monthKey } = body as { sessionId: string; monthKey: string };

  if (!sessionId || !monthKey) {
    return NextResponse.json({ error: "缺少必要參數:sessionId、monthKey" }, { status: 400 });
  }

  const result = await resolveSharedContext(sessionId, monthKey);
  if (!result.ok) {
    return NextResponse.json({ ok: false, missing: result.missing }, { status: 422 });
  }
  return NextResponse.json({ ok: true, ...result.value });
}
