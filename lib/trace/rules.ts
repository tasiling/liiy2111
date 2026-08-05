// 生活痕跡的淡去/回看規則(補充裁決04/05)。把「7 天」「3 次」這兩個門檻各自
// 集中成一個具名常數,不是為了複用,是讓之後要調整時只改這裡,不必到處找
// 散落的數字。

// 淡去門檻(補充裁決04 §一):7 天沒有動靜。以「最後動靜時間」即時計算,不
// 寫入任何淡去狀態欄位、不跑排程——判斷放在讀取/顯示那一刻(§1.1),不是存
// 起來的狀態。
export const TRACE_FADE_DAYS = 7;

export function isFaded(lastActivityISO: string | null, nowISO: string = new Date().toISOString()): boolean {
  if (!lastActivityISO) return true;
  const elapsedMs = new Date(nowISO).getTime() - new Date(lastActivityISO).getTime();
  return elapsedMs >= TRACE_FADE_DAYS * 24 * 60 * 60 * 1000;
}

// 上區顯示前的最後一道過濾:listRecentTraceCandidates() 撈回的候選只是縮小到
// 查詢窗口內(見 lib/notion/schema.ts TRACE_QUERY_WINDOW_DAYS),真正「是否已
// 淡」的 7 天比較在這裡做。
export function filterUnfaded<T extends { 最後動靜時間: string | null }>(
  traces: T[],
  nowISO: string = new Date().toISOString()
): T[] {
  return traces.filter((t) => !isFaded(t.最後動靜時間, nowISO));
}

// 回看次數累積到這個門檻,traceLevel 自動升為 accumulated(補充裁決05 實作
// 順序第4項:「門檻 3 次,須為可調設定值」)——這個常數就是那個可調設定值。
export const TRACE_ACCUMULATE_VIEW_THRESHOLD = 3;
