import { NextResponse } from "next/server";
import { listPendingDetails } from "@/lib/notion/queries";

// Notion 是唯一真相來源,寫入/刪除可能發生在 App 之外(擁有者直接在 Notion
// 操作),讀取一律即時查詢,不吃 Next.js 的 Route Handler 快取,避免顯示已經
// 在 Notion 端變動過的舊資料。
export const dynamic = "force-dynamic";
// 日上三更指令產生器:進入頁面先顯示待產出清單(明細狀態=待產出,依對應日期排序)。
//
// 排除有「更次」值的明細(2026-08-03 批次建立與產出清單新增):那些已經在
// /sanko 新的日期卡清單(依批次+更次分組)顯示,這裡若不排除會讓同一筆明細
// 在頁面上重複出現兩次。
export async function GET() {
  const details = await listPendingDetails();
  return NextResponse.json({ details: details.filter((d) => !d.更次) });
}
