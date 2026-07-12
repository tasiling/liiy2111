import { NextResponse } from "next/server";
import { listCurrentRules } from "@/lib/notion/queries";

// P6 回饋快填:對象=規則時的選單資料來源(不分適用項目,列出全部現行版)。
export async function GET() {
  const rules = await listCurrentRules();
  return NextResponse.json({ rules });
}
