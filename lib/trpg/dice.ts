import type { ResultTier } from "./schema";

export const RESULT_HINT: Record<ResultTier, string> = {
  失敗: "事與願違，情勢因此惡化",
  部分成功: "你做到了，但代價正在逼近",
  成功: "乾淨俐落，如你所願",
  大成功: "超乎預期的完美結果",
};

function rollD6(): number {
  return 1 + Math.floor(Math.random() * 6);
}

function tierFromHighest(highest: number, sixCount: number): ResultTier {
  if (highest === 6) return sixCount >= 2 ? "大成功" : "成功";
  if (highest >= 4) return "部分成功";
  return "失敗";
}

export type DiceRollResult = {
  pool: number;
  rolls: number[];
  usedRoll: number;
  tier: ResultTier;
  disadvantage: boolean;
};

// Blades in the Dark 式骰池判讀:pool 顆 d6 取最高;0 顆(劣勢)則骰 2 顆取最低。
export function rollDicePool(pool: number): DiceRollResult {
  const disadvantage = pool <= 0;
  const rolls = disadvantage ? [rollD6(), rollD6()] : Array.from({ length: pool }, rollD6);
  const usedRoll = disadvantage ? Math.min(...rolls) : Math.max(...rolls);
  const sixCount = rolls.filter((r) => r === 6).length;
  const tier = disadvantage ? tierFromHighest(usedRoll, 0) : tierFromHighest(usedRoll, sixCount);
  return { pool, rolls, usedRoll, tier, disadvantage };
}
