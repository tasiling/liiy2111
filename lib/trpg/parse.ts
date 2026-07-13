import type { QuickAddTargetType } from "./schema";

// 快速輸入台的「關鍵字：內容」欄位字典。key = 正式資料庫的 Notion 屬性名,
// aliases = 使用者可能打出的口語詞(逐一比對,不做模糊比對)。
export type FieldSpec = {
  key: string;
  label: string;
  aliases: string[];
  isTitle?: boolean;
  isSelect?: boolean;
};

export const QUICK_ADD_FIELD_DICT: Record<QuickAddTargetType, FieldSpec[]> = {
  角色: [
    { key: "角色名稱", label: "姓名", aliases: ["姓名", "名字", "角色名稱", "角色名"], isTitle: true },
    { key: "核心動機", label: "動機", aliases: ["動機", "核心動機"] },
    { key: "基本資料", label: "基本資料", aliases: ["基本資料", "背景"] },
    { key: "外顯特徵", label: "外顯特徵", aliases: ["外顯特徵", "外貌", "特徵"] },
    { key: "已知資訊", label: "已知資訊", aliases: ["已知資訊", "已知"] },
    { key: "目標", label: "目標", aliases: ["目標"] },
    { key: "關係狀態", label: "關係狀態", aliases: ["關係狀態", "關係"] },
    { key: "角色定位", label: "定位", aliases: ["定位", "角色定位"], isSelect: true },
    { key: "陣營", label: "陣營", aliases: ["陣營"], isSelect: true },
  ],
  事件: [
    { key: "事件名稱", label: "名稱", aliases: ["名稱", "事件名稱", "標題"], isTitle: true },
    { key: "事件摘要", label: "摘要", aliases: ["摘要", "事件摘要", "內容"] },
    { key: "事件類型", label: "類型", aliases: ["類型", "事件類型"], isSelect: true },
    { key: "事件狀態", label: "狀態", aliases: ["狀態", "事件狀態"], isSelect: true },
    { key: "事件可見度", label: "可見度", aliases: ["可見度", "事件可見度"], isSelect: true },
  ],
  地點: [
    { key: "地點名稱", label: "名稱", aliases: ["名稱", "地點名稱", "標題"], isTitle: true },
    { key: "描述", label: "描述", aliases: ["描述", "介紹"] },
    { key: "地點類型", label: "類型", aliases: ["類型", "地點類型"], isSelect: true },
    { key: "區域", label: "區域", aliases: ["區域"] },
  ],
  世界觀: [
    { key: "設定名稱", label: "名稱", aliases: ["名稱", "設定名稱", "標題"], isTitle: true },
    { key: "設定內容", label: "內容", aliases: ["內容", "設定內容", "描述"] },
    { key: "設定分類", label: "分類", aliases: ["分類", "設定分類"], isSelect: true },
  ],
};

export type ParsedQuickAdd = {
  fields: Record<string, string>; // key = FieldSpec.key
  summary: string; // 未匹配整段文字
};

// 逐行比對「關鍵字：內容」(全形/半形冒號皆可);未匹配的整段文字塞入摘要。
export function parseQuickAddText(text: string, targetType: QuickAddTargetType): ParsedQuickAdd {
  const specs = QUICK_ADD_FIELD_DICT[targetType];
  const aliasToKey = new Map<string, string>();
  for (const spec of specs) {
    for (const alias of spec.aliases) aliasToKey.set(alias, spec.key);
  }

  const lines = text.split(/\r?\n/);
  const fields: Record<string, string> = {};
  const unmatchedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^([^\s：:]{1,10})[：:]\s*(.+)$/);
    const key = match ? aliasToKey.get(match[1]) : undefined;
    if (match && key) {
      fields[key] = fields[key] ? `${fields[key]}\n${match[2]}` : match[2];
    } else {
      unmatchedLines.push(trimmed);
    }
  }

  return { fields, summary: unmatchedLines.join("\n") };
}
