import { NextRequest, NextResponse } from "next/server";
import { createFeedback } from "@/lib/notion/mutations";
import { FEEDBACK_對象類型, type Feedback對象類型 } from "@/lib/notion/schema";

// P6 回饋快填:選對象(規則/Session)→四維評分(1–5)→短評一行→送出。
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { 對象類型, targetId, 準確度, 語感, 轉換效果, 可複用性, 問題類型標籤, 短評 } = body as {
    對象類型: Feedback對象類型;
    targetId: string;
    準確度: number;
    語感: number;
    轉換效果: number;
    可複用性: number;
    問題類型標籤?: string[];
    短評?: string;
  };

  if (!FEEDBACK_對象類型.includes(對象類型)) {
    return NextResponse.json({ error: `未知對象類型:${對象類型}` }, { status: 400 });
  }
  if (!targetId) {
    return NextResponse.json({ error: "缺少必要參數:targetId" }, { status: 400 });
  }

  try {
    const todayISO = new Date().toISOString().slice(0, 10);
    const feedback = await createFeedback({
      dateISO: todayISO,
      對象類型,
      targetId,
      準確度,
      語感,
      轉換效果,
      可複用性,
      問題類型標籤: 問題類型標籤 ?? [],
      短評,
    });
    return NextResponse.json({ ok: true, ...feedback });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
