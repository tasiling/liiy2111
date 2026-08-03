import { NextResponse } from "next/server";
import { countFeedbackTags } from "@/lib/notion/queries";

// Notion 是唯一真相來源,寫入/刪除可能發生在 App 之外(擁有者直接在 Notion
// 操作),讀取一律即時查詢,不吃 Next.js 的 Route Handler 快取,避免顯示已經
// 在 Notion 端變動過的舊資料。
export const dynamic = "force-dynamic";
// P6 回饋快填:問題類型標籤選擇時顯示既有累積次數,達三次原則門檻時提示可發起提案。
export async function GET() {
  const counts = await countFeedbackTags();
  return NextResponse.json({ counts });
}
