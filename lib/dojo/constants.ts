// 行光道場介面雛形 v1(擁有者提供的 HTML 原型)移植過來的靜態資料。
// 這些是雛形本身定義的展示用常數(七場域、五光念),直接沿用,不重新設計。

export type SpaceKey = "practice" | "forage" | "weaving" | "liaojie" | "dao" | "closing";

// [顯示名, 色彩 key, 一句話描述]
export const SPACES: Record<SpaceKey, [string, string, string]> = {
  practice: ["修習所", "pr", "專注、沉靜"],
  forage: ["野採", "fo", "好奇、探索"],
  weaving: ["織光堂", "we", "創造、流動"],
  liaojie: ["聊解室", "li", "信任、服務"],
  dao: ["道藏", "da", "珍藏、回望"],
  closing: ["收光", "cl", "放鬆、圓滿"],
};

export type NenKey = "ning" | "cang" | "lian" | "xian" | "heng";

// [顯示名, 說明, 對應動作舉例]
export const LIGHT_NEN: Record<NenKey, [string, string, string]> = {
  ning: ["凝光", "聚焦注意力、安住當下", "冥想、感恩、覺察、回到自己"],
  cang: ["藏光", "收回能量、恢復", "休息、獨處、降低刺激、收光"],
  lian: ["煉光", "重複鍛鍊、提高意念密度", "肯定句、抽牌、反覆練習"],
  xian: ["顯光", "將內在化為可見成果", "發文、完成服務、創作、活動"],
  heng: ["恆光", "長期穩定維持修行", "連續修行、長週期累積"],
};

export type Privacy = "私人" | "限閱" | "公開";

export type DojoEntry = {
  id: number;
  title: string;
  space: SpaceKey;
  kind: string;
  privacy: Privacy;
  note?: string;
  date: string;
  nen: NenKey | null;
  // 測頻(三方協作規格書 v1.3 §2.3/§3.5.1):只在收光復盤階段填入,紀錄當下
  // 一律留空。undefined = 尚未標記,不是 0 分——0 不是合法的測頻值。
  freq?: number;
};

// 雛形內建的三筆示範資料,直接沿用。
export const INITIAL_ENTRIES: DojoEntry[] = [
  {
    id: 1,
    title: "靜坐 10 分鐘",
    space: "practice",
    kind: "心／情",
    privacy: "私人",
    note: "讓心慢慢安靜下來",
    date: "今天",
    nen: "ning",
  },
  {
    id: 2,
    title: "我為什麼快完成時會停下來？",
    space: "forage",
    kind: "提問",
    privacy: "私人",
    note: "可帶往 AI 論道或織光堂",
    date: "今天",
    nen: null,
  },
  {
    id: 3,
    title: "一則日光草稿",
    space: "weaving",
    kind: "草稿",
    privacy: "私人",
    note: "下一步:列三個標題",
    date: "今天",
    nen: "lian",
  },
];
