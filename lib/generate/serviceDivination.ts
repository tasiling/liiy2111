// P8-0 維度/方法選擇(委派書 v1.6 第四章):撈 DB-14 服務導流占卜配對表候選清單。
// DB-14 沒有獨立的「主維度」「方法」欄位(總綱不擴充欄位原則),這些資訊以固定格式
// 寫在「內容」欄的純文字裡,逐行「鍵:值」解析。實際觀察到的鍵包含:
// 型別(選填,如「群體」)、主維度、方法、方法說明、題目1、題目2、題目3、註記(選填)。
export type ServiceDivinationEntry = {
  id: string;
  標題: string;
  型別: string | null;
  主維度: string[];
  方法: string;
  方法說明: string;
  題目: string[];
  註記: string | null;
};

function parseLines(內容: string): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const rawLine of 內容.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(/^([^:：]+)[:：](.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const value = m[2].trim();
    (map[key] ??= []).push(value);
  }
  return map;
}

// 內容不符合「主維度/方法」格式(如語氣指引、一般知識庫筆記)一律回傳 null,不誤判為候選。
export function parseServiceDivinationContent(
  id: string,
  標題: string,
  內容: string
): ServiceDivinationEntry | null {
  const kv = parseLines(內容);
  if (!kv["主維度"]?.[0] || !kv["方法"]?.[0]) return null;
  return {
    id,
    標題,
    型別: kv["型別"]?.[0] ?? null,
    主維度: kv["主維度"][0].split(/[、,]/).map((s) => s.trim()).filter(Boolean),
    方法: kv["方法"][0],
    方法說明: kv["方法說明"]?.[0] ?? "",
    題目: [kv["題目1"]?.[0], kv["題目2"]?.[0], kv["題目3"]?.[0]].filter((s): s is string => !!s),
    註記: kv["註記"]?.[0] ?? null,
  };
}
