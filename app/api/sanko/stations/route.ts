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

// 補充裁決02§三:清單原本是 Notion 回傳的預設順序(建立順序),不是依編號排的。
// 改為依標題開頭的數字編號升冪排序——純顯示層調整,不改動 Notion 裡的任何
// 資料或編號本身。取開頭數字轉整數再比(不是直接字串排序),這樣未來若編號
// 變成三位數也不會壞(例如「100」字串排序會排在「20」前面,轉成整數比較才
// 正確)。目前 25 筆裡有一筆「顯化能量指引」沒有數字前綴,視為沒有編號,排
// 在整份清單最後——不屬於 01–25 的編號序列,無法判斷它「正確」該排哪裡。
function stationSortKey(name: string): number {
  const match = name.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

export async function GET() {
  const atoms = await listActiveServiceAtoms();
  const sorted = [...atoms].sort((a, b) => stationSortKey(a.原子項名稱) - stationSortKey(b.原子項名稱));
  return NextResponse.json({ stations: sorted.map((a) => a.原子項名稱) });
}
