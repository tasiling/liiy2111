import { NextResponse } from "next/server";
import { listRecentTraceCandidates, listPersistentTraces, mapTrace } from "@/lib/notion/queries";
import { filterUnfaded } from "@/lib/trace/rules";

// Notion 是唯一真相來源,讀取一律即時查詢,不吃 Route Handler 快取。
export const dynamic = "force-dynamic";

// 居所兩區(補充裁決04 §二)。上區最多 5 張,依最後動靜時間新到舊排序;下區
// 不限張數。回傳的卡片刻意不含頻率/強度數值——三方協作規格書 v1.3 §2.3
// 明訂「測頻不得在居所以任何形式顯示」,這是既有紅線,不是這輪新加的限制
// (見 app/components/EntryCard.tsx 既有的 showFreq={false} 慣例)。
const RECENT_MAX = 5;

function toCard(t: ReturnType<typeof mapTrace>) {
  return { id: t.id, 標題: t.標題, 內容: t.內容 || undefined, space: t.space };
}

export async function GET() {
  const [recentCandidates, persistent] = await Promise.all([listRecentTraceCandidates(), listPersistentTraces()]);

  const recent = filterUnfaded(recentCandidates)
    .sort((a, b) => (b.最後動靜時間 ?? "").localeCompare(a.最後動靜時間 ?? ""))
    .slice(0, RECENT_MAX);

  const sortedPersistent = [...persistent].sort((a, b) => (b.最後動靜時間 ?? "").localeCompare(a.最後動靜時間 ?? ""));

  return NextResponse.json({
    recent: recent.map(toCard),
    persistent: sortedPersistent.map(toCard),
  });
}
