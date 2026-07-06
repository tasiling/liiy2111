// 資料對接表:實際 data source ID 與欄位名(全繁體中文,逐庫拉 schema 驗證後填入)
// 依委派書規定:App 不得憑記憶硬編欄位名——此檔案的值皆來自實際 fetch 結果,不是猜測。
// 若日後 Notion 端 schema 變動,必須重新 fetch 驗證並更新此檔,不得自行改 schema 本身。

export const DATA_SOURCES = {
  DB01_牌組表: "c32e70b3-0cc0-4eae-9d5c-b77e9e445ee9",
  DB02_牌卡表: "3ebc19fc-383c-462e-a472-947ef61cad28",
  DB03_抽牌Session: "ba73d9a7-f810-4995-b82e-942d35a61bcc",
  DB04_抽牌明細: "37f8adaf-4eab-434e-8b91-faf295b7a668",
  DB05_解讀規則庫: "cbb9b742-ba3c-4477-ae5d-972dd47a20ab",
  DB06_固定項目註冊表: "828267ac-5fe0-4ac0-a06e-d771f14e7b2f",
  DB07_序列節點表: "5c9e5be3-8d7d-4814-98e5-fb4cefb6a6cf",
  DB08_月主題包: "cbd9f0f4-2177-4293-bb0f-9755be96aeaf",
  DB09_回饋紀錄: "9951ad16-9c33-48d8-8448-fcd7e181a2ac",
  DB10_修正提案: "c607ad7b-8140-4e7d-87d4-cc530415278f",
  DB11_服務原子庫: "4f1a31ee-5ff5-4d46-b4b5-3f2d78ada842",
  DB12_素材庫: "ccad9bd5-4d66-44a5-a30d-9d61d7950097",
  DB13_精進區實驗庫: "9f2ac13e-daea-4d52-9d1b-2586f0598031",
  DB14_知識庫: "6b2ff51d-2e10-4cde-b9ea-4644702846fa",
  DB15_場次表: "e65a709f-c347-4c33-8936-a9da23571f53",
  DB16_標籤詞庫: "43f2bc26-2bac-45c8-9bc0-4d4ed2b87675",
} as const;

// DB-03 抽牌 Session 狀態機(順序固定,終點=已交付)
export const SESSION_STATUS_ORDER = [
  "已抽牌",
  "已指定用途",
  "解讀中",
  "已產出",
  "已交付",
] as const;
export type SessionStatus = (typeof SESSION_STATUS_ORDER)[number];

export const SESSION_項目用途 = ["能量流", "大眾占卜", "日更", "個案", "實驗"] as const;
export const SESSION_模式 = ["單筆", "批次"] as const;

// DB-07 序列節點表 錨點
export const NODE_ANCHOR = ["首場", "每場", "末場"] as const;
export type NodeAnchor = (typeof NODE_ANCHOR)[number];

// DB-06 固定項目註冊表
export const EVENT_TYPE_FORM = ["單日", "多日"] as const; // 事件型態
export const EVENT_STATUS = ["啟用", "停用"] as const;

// DB-15 場次表狀態
export const SESSION_SLOT_STATUS = ["預定", "已完成"] as const;

// DB-09 回饋紀錄:四維評分欄位與範圍(Notion 端無法強制,App 端必須驗證 1–5)
export const FEEDBACK_SCORE_FIELDS = ["準確度", "語感", "轉換效果", "可複用性"] as const;
export const FEEDBACK_SCORE_MIN = 1;
export const FEEDBACK_SCORE_MAX = 5;

// DB-10 修正提案:新建預設狀態(App 端強制)
export const PROPOSAL_DEFAULT_STATUS = "待審" as const;

// DB-14 知識庫:來源=學習筆記時核可狀態強制待審(App 端強制)
export const KNOWLEDGE_SOURCE_REVIEW_REQUIRED = "學習筆記" as const;
export const KNOWLEDGE_REVIEW_STATUS_FOR_LEARNING_NOTE = "待審" as const;
