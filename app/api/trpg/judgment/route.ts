import { NextRequest, NextResponse } from "next/server";
import { createJudgment } from "@/lib/trpg/mutations";

// 判定紀錄表的唯一寫入者(協作協議 §4.3)。結果由 /api/trpg/roll 先算好,
// 使用者確認標籤後再呼叫本端點落地寫入。
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    saveId,
    method,
    pool,
    judgeType,
    position,
    effect,
    result,
    card,
    devilsBargain,
    proactive,
    behaviorTags,
    moralTags,
    note,
  } = body as {
    saveId: string;
    method: "骰子" | "抽牌";
    pool: number;
    judgeType: string;
    position: string;
    effect: string;
    result: string;
    card?: string;
    devilsBargain: boolean;
    proactive?: boolean;
    behaviorTags: string[];
    moralTags: string[];
    note?: string;
  };

  if (!saveId || !method || !judgeType || !position || !effect || !result) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  const created = await createJudgment({
    saveId,
    judgeMethod: method,
    pool,
    judgeType,
    position,
    effect,
    result,
    card,
    devilsBargain: !!devilsBargain,
    proactive: !!proactive,
    behaviorTags: behaviorTags ?? [],
    moralTags: moralTags ?? [],
    note,
  });

  const cliSummary = [
    `【判定結果】${judgeType}｜${method === "骰子" ? `骰池${pool}` : `抽牌${pool}張`}｜${position}/${effect}`,
    `→ ${result}${card ? `（${card}）` : ""}`,
    behaviorTags?.length ? `行為標籤：${behaviorTags.join("、")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return NextResponse.json({ id: created.id, name: created.name, cliSummary });
}
