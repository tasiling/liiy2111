// 噗浪・蓋樓台(聊解室 → 噗浪蓋樓)。這份資料原樣移植自擁有者驗證過的
// plurk-tower.html 原型(EMO_ROW/FATE_ROW/DEFAULTS/SANKO 等常數),不重新設計數值。
//
// SANKO(10 張日上三更版型卡)與 lib/dojo/methods.ts 的「八方法規格」有 8 個
// 方法重疊(shixiang/yinian/zhuse/touse/huanwei/wuqi/qianshi/bianli),但這裡另外
// 多兩張(xincheng 心乘光・週指引、yeguang 夜光・服務陪伴)且每張多帶噗浪蓋樓
// 專用的欄位(sect 分組、opts 選項清單、hint 提示文字、text 純文字型的段落清單)。
// 刻意不與 lib/dojo/methods.ts 共用同一份資料——原型本身就是把兩邊的資料各自
// 內嵌,兩份用途不同(那邊是指令產生器的方法規格,這邊是噗浪版排版骨架),
// 依「照做即可,不要重新設計」原則各自獨立複製一份。

export const EMO_ROW = [
  "https://emos.plurk.com/95c16ff38bc825cc65454f4b6a7f7dd3_w43_h15.png",
  "https://emos.plurk.com/a6118475be00e26f77ce160ffab9fb2c_w33_h15.png",
  "https://emos.plurk.com/8296dcf1fea33becaa647e1c3460b902_w33_h15.png",
  "https://emos.plurk.com/ebba7549d6d720efd0571e5727e346c2_w33_h15.png",
  "https://emos.plurk.com/923718f49e06964dcc3735c726ce43f1_w33_h15.png",
  "https://emos.plurk.com/594c12dce6d2f94e5f4cfd0e6a6594cf_w33_h15.png",
  "https://emos.plurk.com/53312074fc7bedb66a154961421e63e2_w33_h16.png",
  "https://emos.plurk.com/08c3da1b38a87fd27ae0a51968c68cf3_w33_h16.png",
].join(" ");
export const EMO_END = "https://emos.plurk.com/048cb3819644a3f17490baddae3cdc24_w48_h25.gif";
export const FATE_ROW = [
  "https://emos.plurk.com/dd74e4af49f17fc4eadbd4fd2a5f5904_w33_h15.png",
  "https://emos.plurk.com/c72ff2a3091d05985a18b15c1fd7ebac_w33_h15.png",
  "https://emos.plurk.com/42538f414dcd34257cbd921b98922aa9_w33_h15.png",
  "https://emos.plurk.com/9897e7c66a46d03c6c6c9c79d9d033d1_w33_h16.png",
].join(" ");
export const FATE_END = "https://emos.plurk.com/483fc4423567a451547a38794413f8c4_w38_h32.png";
export const CIRC = "①②③④⑤⑥⑦⑧⑨⑩";

function buildXcgFloors(): string[] {
  const floors: string[] = [];
  ["A", "B", "C"].forEach((L) => {
    floors.push(
      `[emo456]**【選項${L}】**\n(牌卡:月相／牌意)\n\n[emo461]**現狀共振**:\n(這個選項對應的近況與情緒描述)`
    );
    floors.push(`[emo462]**乘光訊息:**\n(牌卡的核心指引,分行書寫)`);
    floors.push(
      `[emo484]**祈請詞定錨**:\n「(一句祈請詞)」\n\n[emo465]**微光行動:**\n(一個具體可做的小行動)`
    );
  });
  return floors;
}

function buildFateFloors(): string[] {
  const floors: string[] = [];
  for (let i = 0; i < 10; i++) {
    floors.push(
      (i === 0 ? "第X週｜(主題)\n\n" : "") +
        CIRC[i] +
        " (籤名)\n「(籤詩兩句)」\n\n[emo73] (解析內文)\n[emo433] (一句總結)"
    );
  }
  return floors;
}

export const XCG_FLOORS = buildXcgFloors();
export const FATE_FLOORS = buildFateFloors();

export type PlurkTemplateSeed = {
  id: string;
  method: string;
  name: string;
  main: string;
  floors: string[];
};

export const DEFAULT_TEMPLATES: PlurkTemplateSeed[] = [
  {
    id: "tpl-xcg",
    method: "xincheng",
    name: "心乘光・週指引",
    main:
      EMO_ROW +
      "\n**【心乘光•指引:{{起}}～{{迄}}】**\n(此處上傳本週牌卡圖)\n深呼吸三次,選擇最有感覺的選項\n點擊下方留言處,有詳細的解析\n覺得有幫助的話,歡迎轉噗分享哦 " +
      EMO_END,
    floors: XCG_FLOORS,
  },
  {
    id: "tpl-fate",
    method: "qianshi",
    name: "聊解時間・命運籤詩",
    main:
      FATE_ROW +
      "\n**【聊解時間 ※ 命運籤詩】**\n來試試看新玩法～\n因為是影片檔注意網路流量\n\n下收詳細解析 " +
      FATE_END,
    floors: FATE_FLOORS,
  },
];

export type SankoTemplateSpec = {
  key: string;
  sect: "晨光" | "日光" | "夜光";
  name: string;
  method: string;
  kong: string;
  yu: string;
  san: string;
  type: "行動" | "替換句" | "文字";
  opts: string[];
  hint: string;
  text?: string[];
};

export const SANKO_TEMPLATES: SankoTemplateSpec[] = [
  {
    key: "shixiang",
    sect: "日光",
    name: "實相觀測站",
    method: "情境選擇法",
    kong: "實相對照",
    yu: "簾後心跡",
    san: "隨手一動",
    type: "行動",
    opts: ["A", "B", "C", "D"],
    hint: "(這個選項的第一反應)",
  },
  {
    key: "yinian",
    sect: "日光",
    name: "一念拾物",
    method: "直覺選圖法",
    kong: "落目觸心",
    yu: "物影回響",
    san: "隨身儀式",
    type: "行動",
    opts: ["A", "B", "C", "D", "E"],
    hint: "(象徵物＋它綁定的提問)",
  },
  {
    key: "zhuse",
    sect: "日光",
    name: "燭色漸行計",
    method: "程度量表法",
    kong: "燭影初現",
    yu: "芯火洞察",
    san: "餘溫安放",
    type: "行動",
    opts: ["輕盈區 6-12", "起伏區 13-21", "滿載區 22-30"],
    hint: "(此區間的分數範圍)",
  },
  {
    key: "touse",
    sect: "日光",
    name: "投射語句填空",
    method: "投射書寫法",
    kong: "筆尖浮生",
    yu: "紙背餘音",
    san: "寫入日常",
    type: "行動",
    opts: ["A", "B", "C", "D", "E", "F"],
    hint: "(這個填空句)",
  },
  {
    key: "huanwei",
    sect: "日光",
    name: "換位傾聽・真心話",
    method: "角色代入法",
    kong: "異位入座",
    yu: "心聲對流",
    san: "換句真話",
    type: "替換句",
    opts: ["A", "B", "C", "D"],
    hint: "(這個角色姿態)",
  },
  {
    key: "wuqi",
    sect: "日光",
    name: "霧氣抹除",
    method: "霧氣抹除",
    kong: "霧中一句",
    yu: "霧後真心",
    san: "新內在句",
    type: "替換句",
    opts: ["A", "B", "C", "D", "E"],
    hint: "(這句舊規則)",
  },
  {
    key: "qianshi",
    sect: "日光",
    name: "命運籤詩",
    method: "命運籤詩法",
    kong: "詞組＋七言對句",
    yu: "解析段",
    san: "金句",
    type: "行動",
    opts: [],
    hint: "",
  },
  {
    key: "xincheng",
    sect: "晨光",
    name: "心乘光・週指引",
    method: "心乘光指引",
    kong: "現狀共振",
    yu: "乘光訊息",
    san: "祈請詞定錨＋微光行動",
    type: "行動",
    opts: ["A", "B", "C"],
    hint: "(牌卡:月相／牌意)",
  },
  {
    key: "bianli",
    sect: "晨光",
    name: "直覺便利貼",
    method: "晨光占卜",
    kong: "便利貼寄語",
    yu: "",
    san: "貼上便利貼",
    type: "行動",
    opts: ["A", "B", "C", "D"],
    hint: "(卦名／牌名)",
  },
  {
    key: "yeguang",
    sect: "夜光",
    name: "夜光・服務陪伴",
    method: "服務理解",
    kong: "",
    yu: "",
    san: "",
    type: "文字",
    opts: [],
    hint: "",
    text: ["這個光站在陪伴什麼狀態", "它聚焦處理什麼,以及不處理什麼", "適合什麼樣的讀者或時機", "可以如何銜接下一站"],
  },
];

export const SANKO_SECT_ORDER = ["晨光", "日光", "夜光"] as const;
export const SANKO_SECT_HINT: Record<string, string> = {
  晨光: "直覺入口",
  日光: "自我辨識・七方法",
  夜光: "服務理解・純文字",
};
