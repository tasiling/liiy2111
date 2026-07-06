import { NextRequest, NextResponse } from "next/server";
import { findCardByIdentifier } from "@/lib/notion/queries";
import { writeDraw } from "@/lib/notion/mutations";

// P5 抽牌輸入:選牌組 + 輸入牌號序列 → 組出識別碼(MP-15 格式)並驗證存在於 DB-02。
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { detailId, deckCode, cardNumbers } = body as {
    detailId: string;
    deckCode: string;
    cardNumbers: number[];
  };

  if (!detailId || !deckCode || !Array.isArray(cardNumbers) || cardNumbers.length === 0) {
    return NextResponse.json(
      { error: "缺少必要參數:detailId、deckCode、cardNumbers" },
      { status: 400 }
    );
  }

  const identifiers = cardNumbers.map((n) => `${deckCode}-${String(n).padStart(2, "0")}`);
  const lookups = await Promise.all(identifiers.map((id) => findCardByIdentifier(id)));

  const missing = identifiers.filter((_, idx) => lookups[idx] === null);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `以下牌卡識別碼在 DB-02 找不到,未寫入:${missing.join("、")}` },
      { status: 400 }
    );
  }

  const cardPageIds = lookups.map((c) => c!.id);
  const orderText = identifiers.join(", ");
  await writeDraw({ detailId, cardPageIds, orderText });

  return NextResponse.json({ ok: true, 抽出順序: orderText });
}
