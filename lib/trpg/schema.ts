// POV敘事跑團系統 資料對接表 — 逐庫 fetch 驗證後填入(見規格書 v1 §3.3)。
// 與 lib/notion/schema.ts(產線 C 主控台)完全獨立,互不影響。

export const TRPG_DATA_SOURCES = {
  世界庫: "a8961575-8a26-44fd-a1ae-6d2b4dc6b307",
  角色庫: "52bc5e17-45da-469f-b6bc-dd2f104668d8",
  地點庫: "1abe621b-9dc4-4dcc-9774-0724664e4604",
  事件庫: "ed518e53-6afe-4bbb-b51c-c50df070fbf7",
  伏筆情節庫: "f768cec2-e873-45db-a723-f9a7cdf78cf9",
  抉擇分支庫: "e49ab9b4-f561-4de4-8a55-99f33b3430ff",
  世界設定庫: "99357bd4-7a9a-46da-93d2-1a35fd846226",
  遊玩日誌: "cfdf727e-4daf-42f4-b98d-9318663d055a",
  幕表: "bde8ac1a-bda0-4163-8160-371b46d34016",
  章表: "140f09bb-b6d7-415c-9c3d-ef3639487bfa",
  場景表: "c97435a5-7249-4755-9cc4-7d44ef9537ad",
  時鐘表: "c92763fb-24c0-400e-8efd-f89aa255d22b",
  判定紀錄表: "b16c4ae2-a160-4c15-bf8d-9bb235924777",
  角色知情表: "311728a5-78c3-4073-9c7f-eb8fda8c3a9b",
  角色分析表: "aed6ae82-bc39-4842-b28c-6631b1c4da30",
  角色設定表: "a5275dd2-d526-4d1f-9dcb-bcf7195e7c80",
  快速輸入暫存表: "1966fef3-188d-4b5a-bb45-f69b5fa3848e",
  POV進度表: "c8a2a1cb-fb35-4d37-bace-c5246b09de11",
} as const;

// --- 判定紀錄表(b16c4ae2) ---
export const JUDGMENT_METHOD = ["骰子", "抽牌"] as const;
export const JUDGMENT_TYPE = [
  "戰鬥",
  "社交",
  "調查",
  "潛行",
  "求生",
  "情感",
  "知識",
  "生活",
] as const;
export const POSITION = ["Controlled", "Risky", "Desperate"] as const;
export const EFFECT = ["Limited", "Standard", "Great"] as const;
export const RESULT_TIER = ["失敗", "部分成功", "成功", "大成功"] as const;
export type ResultTier = (typeof RESULT_TIER)[number];

// 判定紀錄表「行為標籤」多選欄實際註冊選項(逐字比對,不得自行新增)
export const BEHAVIOR_TAGS = [
  "低調", "高調", "積極", "消極", "老實", "狡猾", "成熟", "幼稚", "冷靜", "衝動",
  "寡言", "多話", "順從", "執拗", "自律", "奔放", "嚴謹", "輕浮", "坦率", "彆扭",
  "好奇", "淡漠", "敏銳", "遲鈍", "樂觀", "悲觀", "豐富", "面癱", "愚蠢", "聰慧",
  "單純", "複雜", "斯文", "粗魯", "臉皮厚", "臉皮薄", "溫和", "火爆", "易碎", "堅強",
  "低慾望", "強慾望", "膽小", "勇敢", "幽默", "木訥", "輕信", "多疑", "低自尊", "高自尊",
  "低自信", "高自信", "反應快", "反應慢", "戰鬥優勢", "戰鬥劣勢", "社交優勢", "社交劣勢",
  "調查優勢", "調查劣勢", "幸運", "倒楣",
] as const;

export const MORAL_TAGS = ["利他", "利己", "守序", "混亂", "仁慈", "殘酷", "誠實", "欺瞞"] as const;

// --- 伏筆／情節庫(f768cec2) ---
export const CLUE_STATUS = ["未回收", "進行中", "已回收", "已封死"] as const;

// --- 抉擇／分支庫(e49ab9b4) ---
export const CANON_STATUS = ["草稿", "試玩成立", "正式canon", "廢案"] as const;

// --- 角色知情表(311728a5) ---
export const AWARENESS_LEVEL = ["0不知情", "1聽聞", "2知結果", "3親歷", "4洞悉"] as const;

// --- 快速輸入暫存表(1966fef3) ---
export const QUICK_ADD_TARGET_TYPE = ["角色", "事件", "地點", "世界觀"] as const;
export type QuickAddTargetType = (typeof QUICK_ADD_TARGET_TYPE)[number];
export const QUICK_ADD_PARSE_STATUS = ["待確認", "已存檔", "已捨棄"] as const;

// --- 時鐘表(c92763fb) ---
export const CLOCK_TYPE = ["威脅", "調查", "關係", "任務", "競速", "拉鋸", "連鎖"] as const;

// --- 遊玩日誌(cfdf727e) ---
export const LOG_STATUS = ["原始紀錄", "整理中", "可轉寫", "已成稿"] as const;

// 目標類型 → 快速輸入應寫入的正式資料庫 + 標題欄名
export const QUICK_ADD_TARGET_DB: Record<
  QuickAddTargetType,
  { dataSource: string; titleProp: string }
> = {
  角色: { dataSource: TRPG_DATA_SOURCES.角色庫, titleProp: "角色名稱" },
  事件: { dataSource: TRPG_DATA_SOURCES.事件庫, titleProp: "事件名稱" },
  地點: { dataSource: TRPG_DATA_SOURCES.地點庫, titleProp: "地點名稱" },
  世界觀: { dataSource: TRPG_DATA_SOURCES.世界設定庫, titleProp: "設定名稱" },
};
