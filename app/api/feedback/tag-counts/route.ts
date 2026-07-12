import { NextResponse } from "next/server";
import { countFeedbackTags } from "@/lib/notion/queries";

// P6 回饋快填:問題類型標籤選擇時顯示既有累積次數,達三次原則門檻時提示可發起提案。
export async function GET() {
  const counts = await countFeedbackTags();
  return NextResponse.json({ counts });
}
