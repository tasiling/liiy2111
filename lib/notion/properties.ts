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

export function readCheckbox(page: { properties: AnyProps }, prop: string): boolean {
  return page.properties?.[prop]?.checkbox ?? false;
}

// --- 寫入用的 property value builders ---

export function titleProp(text: string) {
  return { title: [{ text: { content: text } }] };
}

export function richTextProp(text: string) {
  return { rich_text: [{ text: { content: text } }] };
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

export function checkboxProp(value: boolean) {
  return { checkbox: value };
}
