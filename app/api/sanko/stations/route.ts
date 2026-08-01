import { NextResponse } from "next/server";
import { listActiveServiceAtoms } from "@/lib/notion/queries";

// 日上三更指令產生器:25 光站清單改讀 DB-11(擁有者指示),只列狀態=啟用者。
// DB-11 尚未建檔完成(目前僅 1 筆)時顯示現有項目;無資料則前端顯示「光站尚未建檔」
// 並保留自由輸入,不擋流程。DB-11 目前沒有「象限」欄位,無法比照原型做五象限分組,
// 先以扁平清單呈現(詳見 docs/schema/日上三更指令產生器.md)。
export async function GET() {
  const atoms = await listActiveServiceAtoms();
  return NextResponse.json({ stations: atoms.map((a) => a.原子項名稱) });
}
