import { NextRequest, NextResponse } from "next/server";
import { createSession, createDetailWithTitle } from "@/lib/notion/mutations";
import { runBatch } from "@/lib/notion/client";

type ConfirmedTask = {
  節點編號: string;
  內容類型: string;
  日期: string;
  場次序?: number;
};

// P2 序列展開引擎(確認寫入):擁有者在預覽清單勾選確認後才呼叫。
// 建立一個「批次」Session 承載本次展開,逐筆明細掛上計算出的日期。
// 項目用途留空、節點資訊編碼進明細標題——原因見 docs/schema/項目用途落差說明.md。
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { eventLabel, tasks } = body as { eventLabel: string; tasks: ConfirmedTask[] };

  if (!eventLabel || !Array.isArray(tasks) || tasks.length === 0) {
    return NextResponse.json({ error: "缺少 eventLabel 或 tasks 為空" }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const 備註摘要 = `序列展開來源:${eventLabel}\n` +
    tasks.map((t) => `${t.節點編號} ${t.內容類型}@${t.日期}${t.場次序 ? `(第${t.場次序}場)` : ""}`).join("\n");

  const session = await createSession({
    dateISO: today,
    模式: "批次",
    狀態: "已指定用途",
    備註: 備註摘要.slice(0, 2000), // Notion rich_text 有長度上限,保守截斷
  });

  const result = await runBatch(tasks, (t) => {
    const suffix = t.場次序 ? `-第${t.場次序}場` : "";
    const 明細編號 = `${session.code}_${t.節點編號}${suffix}`;
    return createDetailWithTitle({ sessionId: session.id, 明細編號, 對應日期: t.日期 });
  });

  return NextResponse.json({
    sessionId: session.id,
    sessionCode: session.code,
    succeeded: result.succeeded,
    failed: result.failed,
  });
}
