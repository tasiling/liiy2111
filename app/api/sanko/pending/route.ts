import { NextResponse } from "next/server";
import { listPendingDetails } from "@/lib/notion/queries";

// 日上三更指令產生器:進入頁面先顯示待產出清單(明細狀態=待產出,依對應日期排序)。
export async function GET() {
  const details = await listPendingDetails();
  return NextResponse.json({ details });
}
