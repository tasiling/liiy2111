import { NextRequest, NextResponse } from "next/server";
import { createStagingEntry, createDirectEntry } from "@/lib/trpg/mutations";
import { QUICK_ADD_TARGET_TYPE, type QuickAddTargetType } from "@/lib/trpg/schema";

// mode = staging(存入暫存,解析狀態=待確認) | direct(直接入庫+暫存表同步記一筆已存檔)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { targetType, rawText, fields, mode } = body as {
    targetType: QuickAddTargetType;
    rawText: string;
    fields: Record<string, string>;
    mode: "staging" | "direct";
  };

  if (!QUICK_ADD_TARGET_TYPE.includes(targetType)) {
    return NextResponse.json({ error: "目標類型不合法" }, { status: 400 });
  }
  if (!rawText?.trim()) {
    return NextResponse.json({ error: "缺少原始輸入文字" }, { status: 400 });
  }

  if (mode === "direct") {
    const result = await createDirectEntry({ targetType, rawText, fields: fields ?? {} });
    return NextResponse.json({ mode, ...result });
  }

  const result = await createStagingEntry({
    targetType,
    rawText,
    fields: fields ?? {},
    parseStatus: "待確認",
  });
  return NextResponse.json({ mode, ...result });
}
