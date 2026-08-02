// Notion 屬性值的讀/寫小工具。集中在此,避免各 API route 各自處理屬性形狀。
// 型別故意寬鬆(unknown 為主),因為 Notion SDK 的完整型別對這個單用戶小工具而言過重。

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProps = Record<string, any>;

export function readTitle(page: { properties: AnyProps }, prop: string): string {
  const arr = page.properties?.[prop]?.title ?? [];
  return arr.map((t: { plain_text: string }) => t.plain_text).join("");
}

export function readRichText(page: { properties: AnyProps }, prop: string): string {
  const arr = page.properties?.[prop]?.rich_text ?? [];
  return arr.map((t: { plain_text: string }) => t.plain_text).join("");
}

export function readSelect(page: { properties: AnyProps }, prop: string): string | null {
  return page.properties?.[prop]?.select?.name ?? null;
}

export function readMultiSelect(page: { properties: AnyProps }, prop: string): string[] {
  const arr = page.properties?.[prop]?.multi_select ?? [];
  return arr.map((o: { name: string }) => o.name);
}

export function readNumber(page: { properties: AnyProps }, prop: string): number | null {
  return page.properties?.[prop]?.number ?? null;
}

export function readDateStart(page: { properties: AnyProps }, prop: string): string | null {
  return page.properties?.[prop]?.date?.start ?? null;
}

export function readRelationIds(page: { properties: AnyProps }, prop: string): string[] {
  const arr = page.properties?.[prop]?.relation ?? [];
  return arr.map((r: { id: string }) => r.id);
}

export function readUrl(page: { properties: AnyProps }, prop: string): string | null {
  return page.properties?.[prop]?.url ?? null;
}

// --- 寫入用的 property value builders ---

export function titleProp(text: string) {
  return { title: [{ text: { content: text } }] };
}

// Notion 單一 rich_text 區塊的 text.content 上限是 2000 字元(API 硬限制),超過會被
// 拒絕。長文字(如噗浪蓋樓多樓草稿,一批可能上萬字)需要切成多個區塊——讀取端
// readRichText() 本來就是把多個區塊的 plain_text 串接讀回,這裡補上寫入端對稱的
// 切塊,對既有呼叫端(內容遠短於 2000 字)是無感的相容變更。
const RICH_TEXT_BLOCK_LIMIT = 2000;

export function richTextProp(text: string) {
  const chunks: { text: { content: string } }[] = [];
  for (let i = 0; i < text.length; i += RICH_TEXT_BLOCK_LIMIT) {
    chunks.push({ text: { content: text.slice(i, i + RICH_TEXT_BLOCK_LIMIT) } });
  }
  return { rich_text: chunks.length ? chunks : [{ text: { content: "" } }] };
}

export function selectProp(name: string) {
  return { select: { name } };
}

export function multiSelectProp(names: string[]) {
  return { multi_select: names.map((name) => ({ name })) };
}

export function numberProp(value: number) {
  return { number: value };
}

export function dateProp(isoDate: string) {
  return { date: { start: isoDate } };
}

export function relationProp(pageIds: string[]) {
  return { relation: pageIds.map((id) => ({ id })) };
}

export function urlProp(url: string) {
  return { url };
}
