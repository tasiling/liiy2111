import type { ResultTier } from "./schema";

export type TarotCard = {
  name: string;
  isMajor: boolean;
  isCourt: boolean;
  rank: number; // 1-10 對應數字牌;宮廷/大阿爾克那不使用(比較時視為最高)
};

const MAJOR_ARCANA = [
  "愚者", "魔術師", "女祭司", "皇后", "皇帝", "教皇", "戀人", "戰車", "力量", "隱士",
  "命運之輪", "正義", "吊人", "死神", "節制", "惡魔", "高塔", "星星", "月亮", "太陽",
  "審判", "世界",
];

const SUITS = ["權杖", "聖杯", "寶劍", "錢幣"];
const PIP_NAMES: Record<number, string> = {
  1: "王牌", 2: "二", 3: "三", 4: "四", 5: "五", 6: "六", 7: "七", 8: "八", 9: "九", 10: "十",
};
const COURT_NAMES = ["侍者", "騎士", "王后", "國王"];

export const TAROT_DECK: TarotCard[] = [
  ...MAJOR_ARCANA.map((name) => ({ name, isMajor: true, isCourt: false, rank: 99 })),
  ...SUITS.flatMap((suit) => [
    ...Array.from({ length: 10 }, (_, i) => ({
      name: `${suit}${PIP_NAMES[i + 1]}`,
      isMajor: false,
      isCourt: false,
      rank: i + 1,
    })),
    ...COURT_NAMES.map((court) => ({
      name: `${suit}${court}`,
      isMajor: false,
      isCourt: true,
      rank: 99,
    })),
  ]),
];

if (TAROT_DECK.length !== 78) {
  throw new Error(`塔羅牌組張數異常:${TAROT_DECK.length}(應為 78)`);
}

export type DrawnCard = {
  card: TarotCard;
  reversed: boolean;
};

function shuffledDeck(): TarotCard[] {
  const deck = [...TAROT_DECK];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function drawCards(count: number): DrawnCard[] {
  const deck = shuffledDeck();
  return deck.slice(0, count).map((card) => ({ card, reversed: Math.random() < 0.5 }));
}

function tierFromRank(rank: number): ResultTier {
  if (rank >= 7) return "成功";
  if (rank >= 4) return "部分成功";
  return "失敗";
}

export type CardDrawResult = {
  pool: number;
  drawn: DrawnCard[];
  usedCard: DrawnCard;
  tier: ResultTier;
  isTwist: boolean; // 大阿爾克那/宮廷牌:完全成功＋戲劇轉折
  disadvantage: boolean;
  cardLabel: string; // 例:「月亮（逆位）」
};

// 抽牌張數＝骰池大小,讀最高一張;0 顆(劣勢)則抽 2 張取最低一張。
// 大阿爾克那/宮廷牌 → 完全成功(大成功)＋戲劇轉折;逆位為「有代價的成功」,正位為「乾淨的成功」。
export function resolveCardDraw(pool: number): CardDrawResult {
  const disadvantage = pool <= 0;
  const drawCount = disadvantage ? 2 : pool;
  const drawn = drawCards(drawCount);

  const byRankAsc = [...drawn].sort((a, b) => a.card.rank - b.card.rank);
  const usedCard = disadvantage ? byRankAsc[0] : byRankAsc[byRankAsc.length - 1];

  const isSpecial = usedCard.card.isMajor || usedCard.card.isCourt;
  const tier: ResultTier = isSpecial ? "大成功" : tierFromRank(usedCard.card.rank);

  const cardLabel = `${usedCard.card.name}（${usedCard.reversed ? "逆位" : "正位"}）`;

  return {
    pool,
    drawn,
    usedCard,
    tier,
    isTwist: isSpecial,
    disadvantage,
    cardLabel,
  };
}
