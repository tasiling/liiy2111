import { NextResponse } from "next/server";
import { listPendingDetails } from "@/lib/notion/queries";

// 日上三更指令產生器:進入頁面先顯示待產出清單(明細狀態=待產出,依對應日期排序)。
//
// 排除有「更次」值的明細(2026-08-03 批次建立與產出清單新增):那些已經在
// /sanko 新的日期卡清單(依批次+更次分組)顯示,這裡若不排除會讓同一筆明細
// 在頁面上重複出現兩次。
export async function GET() {
  const details = await listPendingDetails();
  return NextResponse.json({ details: details.filter((d) => !d.更次) });
}
