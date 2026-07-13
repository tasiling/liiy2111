import { NextRequest, NextResponse } from "next/server";
import { listClocksForChapter } from "@/lib/trpg/queries";

export async function GET(req: NextRequest) {
  const chapterId = req.nextUrl.searchParams.get("chapterId") ?? undefined;
  const clocks = await listClocksForChapter(chapterId);
  return NextResponse.json({ clocks });
}
