import { NextResponse } from "next/server";
import { listActiveServiceAtoms } from "@/lib/notion/queries";

// Notion 是唯一真相來源,寫入/刪除可能發生在 App 之外(擁有者直接在 Notion
// 操作),讀取一律即時查詢,不吃 Next.js 的 Route Handler 快取,避免顯示已經
// 在 Notion 端變動過的舊資料。
export const dynamic = "force-dynamic";
// 日上三更指令產生器:25 光站清單改讀 DB-11(擁有者指示),只列狀態=啟用者。
// DB-11 尚未建檔完成(目前僅 1 筆)時顯示現有項目;無資料則前端顯示「光站尚未建檔」
// 並保留自由輸入,不擋流程。DB-11 目前沒有「象限」欄位,無法比照原型做五象限分組,
// 先以扁平清單呈現(詳見 docs/schema/日上三更指令產生器.md)。
export async function GET() {
  const atoms = await listActiveServiceAtoms();
  return NextResponse.json({ stations: atoms.map((a) => a.原子項名稱) });
}
