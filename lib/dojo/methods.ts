// 日上三更・指令產生器:八方法規格集中設定檔(擁有者指示:總綱凍結的封閉清單,
// 可先維持寫死,但三段命名與版型規格須集中在單一設定檔,不散落在元件裡)。
// 這份資料原樣移植自擁有者驗證過的 HTML 原型(METHODS 常數),不重新設計數值。
//
// 注意:這份「八方法」與 /generate 頁「方法系列組稿」讀的語氣指引全文對照表
// (lib/generate/methodTable.ts,動態讀 Notion)是兩套不同來源,刻意如此——擁有者
// 對本功能的明確指示是維持寫死,不是疏漏。若兩邊之後出現內容分歧,以本檔案的
// 指示為準,回報請擁有者決定是否要收斂成同一份來源。

export type SankoMethodKey =
  | "shixiang"
  | "yinian"
  | "zhuse"
  | "touse"
  | "huanwei"
  | "wuqi"
  | "qianshi"
  | "bianli";

export type SankoMethod = {
  key: SankoMethodKey;
  name: string; // 版型名(按鈕顯示)
  method: string; // 原始方法名
  kong: string;
  yu: string;
  san: string;
  type: "行動" | "替換句";
  spec: string;
  note: string;
};

export const SANKO_METHODS: Record<SankoMethodKey, SankoMethod> = {
  shixiang: {
    key: "shixiang",
    name: "實相觀測站",
    method: "情境選擇法",
    kong: "實相對照",
    yu: "簾後心跡",
    san: "隨手一動",
    type: "行動",
    spec: "4 選 1",
    note: "空段多寫第一反應;雨段多寫這反應在保護什麼;傘段寫下次如何調整一點點。",
  },
  yinian: {
    key: "yinian",
    name: "一念拾物",
    method: "直覺選圖法",
    kong: "落目觸心",
    yu: "物影回響",
    san: "隨身儀式",
    type: "行動",
    spec: "固定 5 選 1",
    note: "每個選項是一個象徵物(門、藥水、礦石、場景)+其背後綁定的一個提問。空段寫選這個代表想打開什麼。",
  },
  zhuse: {
    key: "zhuse",
    name: "燭色漸行計",
    method: "程度量表法",
    kong: "燭影初現",
    yu: "芯火洞察",
    san: "餘溫安放",
    type: "行動",
    spec: "固定 6 題,每題 1–5 分,總分 6–30 對應三區間",
    note: "題目為陳述句讓讀者自評共鳴度,非問句。三個區間各走一輪完整空雨傘。",
  },
  touse: {
    key: "touse",
    name: "投射語句填空",
    method: "投射書寫法",
    kong: "筆尖浮生",
    yu: "紙背餘音",
    san: "寫入日常",
    type: "行動",
    spec: "固定 6 選項,無自由填寫",
    note: "一句主題句+6 個可代入的填空選項。空段照見這句話為何跳出來;雨段翻它底下的需求、害怕或渴望。",
  },
  huanwei: {
    key: "huanwei",
    name: "換位傾聽·真心話",
    method: "角色代入法",
    kong: "異位入座",
    yu: "心聲對流",
    san: "換句真話",
    type: "替換句",
    spec: "4 選 1",
    note: "選項為關係中的角色姿態。雨段固定用「如果你心裡的這個角色能說話,它其實很想對你說……」",
  },
  wuqi: {
    key: "wuqi",
    name: "霧氣抹除",
    method: "霧氣抹除",
    kong: "霧中一句",
    yu: "霧後真心",
    san: "新內在句",
    type: "替換句",
    spec: "5 選 1",
    note: "選項是第一人稱的舊規則自我命令句(例:我不能麻煩別人),非情境或感受。抹去的是舊規則,不是情緒或過去。",
  },
  qianshi: {
    key: "qianshi",
    name: "命運籤詩",
    method: "命運籤詩法",
    kong: "二字詞組+七言對句",
    yu: "解析段",
    san: "金句",
    type: "行動",
    spec: "一週 10 支",
    note: "七言對句要文言節奏但白話意思,讀者不需查典。每支:二字詞組→七言對句→解析→一句金句。",
  },
  bianli: {
    key: "bianli",
    name: "直覺便利貼",
    method: "晨光占卜",
    kong: "便利貼寄語(空雨合併)",
    yu: "—",
    san: "貼上便利貼",
    type: "行動",
    spec: "4 選 1",
    note: "卦名／牌名放在選項標題,寄語裡只用翻譯後的白話。晨光語感,開場可帶「先別急著刷手機喔」這類日常引導。",
  },
};

export const SANKO_METHOD_LIST: SankoMethod[] = Object.values(SANKO_METHODS);
