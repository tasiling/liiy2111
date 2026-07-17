// 介面用語抽換層(擁有者 2026-07-14 追加指示)。
//
// 所有頁面/模組的顯示名稱一律經此檔輸出,不寫死在元件裡——資料庫欄位名與選項值
// (如 DB-03「項目用途」「狀態」的選項字串)完全不受影響,這純粹是介面文字層。
// 擁有者稍後會分批提供品牌用語替換清單,屆時只需要改這個檔案,不用動任何頁面元件。

export const PAGE_LABELS = {
  P1: "總覽台",
  P2: "序列展開",
  P3: "生產日工作台",
  P4: "活動註冊表",
  P5: "任務管理站",
  P6: "快速評分",
  P7: "提案審核區",
  P8: "組稿台",
} as const;

export type PageCode = keyof typeof PAGE_LABELS;

export function pageLabel(code: PageCode): string {
  return PAGE_LABELS[code];
}
