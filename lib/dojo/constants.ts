// 行光道場介面雛形 v1(擁有者提供的 HTML 原型)移植過來的靜態資料。
// 這些是雛形本身定義的展示用常數(七場域),直接沿用,不重新設計。
//
// 修正委派書 v1.0 三:原本的舊版單層五功法系統已作廢,改為兩層獨立選填標籤
// ——光行五(每日修行的運作方式)與光法五(光行成熟後自然發展的應用),兩層
// 互相獨立,不計分、不解鎖、不累積等級。

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

export type GuangxingKey = "ning" | "lian" | "liu" | "xian" | "cang";

// 光行五:每日修行的五種運作方式。[顯示名, 意義, 真實對應]
export const GUANGXING: Record<GuangxingKey, [string, string, string]> = {
  ning: ["凝光", "把散亂的光重新聚回自己,開始前先安住當下", "深呼吸、冥想、今日意圖、感恩、回到此刻"],
  lian: ["煉光", "透過反覆實踐,使光逐漸穩定與純熟", "閱讀、按摩、抽牌、寫作、技能練習"],
  liu: ["流光", "決定生命的光真正流向何處;記錄投入程度而非完成率", "投入程度、專注感、真實參與感(測頻)"],
  xian: ["顯光", "讓內在的光成為世界能夠接住的存在", "發文、完成作品、發布、共振會、公開分享"],
  cang: ["藏光", "收回光,允許恢復;不是逃避,是重新蓄積", "睡眠、放鬆、收光、安靜、大休息"],
};

export type GuangfaKey = "ju" | "shou" | "yin" | "zhu" | "ying";

// 光法五:光行成熟後自然發展的應用。[顯示名, 意義, 真實對應]
export const GUANGFA: Record<GuangfaKey, [string, string, string]> = {
  ju: ["聚光", "將光集中於一個目標", "今天只完成一件重要的事"],
  shou: ["守光", "長時間維持穩定狀態", "長時間深度工作、主持活動、長時間創作"],
  yin: ["隱光", "暫時不對外展現,等待成熟而非停止", "停更、閉關、沉澱、醞釀新作品"],
  zhu: ["祝光", "讓自己的光帶著感謝與祝福,留存於作品中", "牌卡、文章、講義、Podcast 完成時的封存心意"],
  ying: ["映光", "讓世界開始回應自己的光,形成雙向互動而非單向輸出", "留言、討論、AI 論道、共振會互動"],
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
  // 光行／光法皆為獨立選填標籤:不填合法、可只標其一、也可兩者同時標記。
  guangxing: GuangxingKey | null;
  guangfa: GuangfaKey | null;
  // 測頻(三方協作規格書 v1.3 §2.3/§3.5.1):只在收光復盤階段填入,紀錄當下
  // 一律留空。undefined = 尚未標記,不是 0 分——0 不是合法的測頻值。
  freq?: number;
  // 強度(修正委派書 v1.0 四):1–10,與頻率並列、各自獨立可清除,規則同頻率。
  intensity?: number;
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
    guangxing: "ning",
    guangfa: null,
  },
  {
    id: 2,
    title: "我為什麼快完成時會停下來?",
    space: "forage",
    kind: "提問",
    privacy: "私人",
    note: "可帶往 AI 論道或織光堂",
    date: "今天",
    guangxing: null,
    guangfa: null,
  },
  {
    id: 3,
    title: "一則日光草稿",
    space: "weaving",
    kind: "草稿",
    privacy: "私人",
    note: "下一步:列三個標題",
    date: "今天",
    guangxing: "lian",
    guangfa: null,
  },
];
