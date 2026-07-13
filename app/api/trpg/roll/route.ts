import { NextRequest, NextResponse } from "next/server";
import { rollDicePool, RESULT_HINT } from "@/lib/trpg/dice";
import { resolveCardDraw } from "@/lib/trpg/tarot";

// 純判定(骰子/抽牌),不寫入 Notion——寫入交給 /api/trpg/judgment,
// 讓使用者能先看結果、選好標籤,再按「寫入判定紀錄」確定送出(規格書 §2.1)。
export async function POST(req: NextRequest) {
  const { method, pool, devilsBargain } = (await req.json()) as {
    method: "骰子" | "抽牌";
    pool: number;
    devilsBargain: boolean;
  };

  const effectivePool = pool + (devilsBargain ? 1 : 0);

  if (method === "骰子") {
    const roll = rollDicePool(effectivePool);
    return NextResponse.json({
      effectivePool,
      result: roll.tier,
      hint: RESULT_HINT[roll.tier],
      rollDetail: roll,
    });
  }

  const draw = resolveCardDraw(effectivePool);
  return NextResponse.json({
    effectivePool,
    result: draw.tier,
    card: draw.cardLabel,
    isTwist: draw.isTwist,
    hint: RESULT_HINT[draw.tier],
    rollDetail: draw,
  });
}
