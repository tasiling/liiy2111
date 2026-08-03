import { NextResponse } from "next/server";
import { resolveToneGuide } from "@/lib/generate/sections";
import { resolveMethodOptions } from "@/lib/generate/methodTable";

// Notion 是唯一真相來源,寫入/刪除可能發生在 App 之外(擁有者直接在 Notion
// 操作),讀取一律即時查詢,不吃 Next.js 的 Route Handler 快取,避免顯示已經
// 在 Notion 端變動過的舊資料。
export const dynamic = "force-dynamic";
// 空雨傘八方法按鈕清單:動態取自語氣指引現行版全文頁面內的對照表,不寫死方法清單於
// 程式碼——升版時對照表內容變動,此清單自動跟著變,不需要改程式(僅換資料)。
export async function GET() {
  const toneResult = await resolveToneGuide();
  if (!toneResult.ok) {
    return NextResponse.json({ ok: false, missing: toneResult.missing }, { status: 422 });
  }
  const optionsResult = await resolveMethodOptions(toneResult.value.sourcePageId);
  if (!optionsResult.ok) {
    return NextResponse.json({ ok: false, missing: optionsResult.missing }, { status: 422 });
  }
  return NextResponse.json({ ok: true, methods: optionsResult.value });
}
