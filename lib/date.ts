// 序列展開引擎的日期計算:錨點(首場/每場/末場)+ 相對天數 → 實際日期。
// 依總綱五、事件宣傳序列模板 與 委派書 P2:
//   首場錨點相對第一場、每場錨點對每一場複製一組、末場錨點相對最後一場。

const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// 解析「相對天數」欄位文字。
// 首場/末場格式:T-7、T-3、T-1、T+0、T+1
// 每場格式:場前1日、場後(場後=活動當場之後 1 天,對應 SOP 的「回饋收集」節點)
export function parseRelativeOffset(text: string): number {
  const tMatch = text.trim().match(/^T([+-]\d+)$/);
  if (tMatch) return parseInt(tMatch[1], 10);

  const beforeMatch = text.trim().match(/^場前(\d+)日$/);
  if (beforeMatch) return -parseInt(beforeMatch[1], 10);

  if (text.trim() === "場後") return 1;

  throw new Error(`無法解析相對天數格式:「${text}」`);
}

export type SequenceNode = {
  節點編號: string;
  錨點: "首場" | "每場" | "末場";
  相對天數: string;
  [key: string]: unknown;
};

export type ExpandedTask = {
  來源節點編號: string;
  場次序?: number; // 僅「每場」節點有值,從 1 起算
  日期: string; // ISO date
  節點: SequenceNode;
};

// sessionDates 需已按時間升冪排序;單日事件傳入長度為 1 的陣列即可,
// 首場/每場/末場計算會自然收斂到同一天。
export function expandSequence(nodes: SequenceNode[], sessionDates: Date[]): ExpandedTask[] {
  if (sessionDates.length === 0) {
    throw new Error("展開序列需要至少一個場次日期");
  }
  const first = sessionDates[0];
  const last = sessionDates[sessionDates.length - 1];
  const tasks: ExpandedTask[] = [];

  for (const node of nodes) {
    const offset = parseRelativeOffset(node.相對天數);
    if (node.錨點 === "首場") {
      tasks.push({ 來源節點編號: node.節點編號, 日期: toISODate(addDays(first, offset)), 節點: node });
    } else if (node.錨點 === "末場") {
      tasks.push({ 來源節點編號: node.節點編號, 日期: toISODate(addDays(last, offset)), 節點: node });
    } else if (node.錨點 === "每場") {
      sessionDates.forEach((d, idx) => {
        tasks.push({
          來源節點編號: node.節點編號,
          場次序: idx + 1,
          日期: toISODate(addDays(d, offset)),
          節點: node,
        });
      });
    }
  }
  return tasks;
}

// 滾動窗口:大生產日展開未來 35–40 天內所有已知節點(總綱六、任務行事曆)。
// 多日活動一經確認開課,不受此限制(呼叫端應略過窗口過濾)。
export function isWithinRollingWindow(date: Date, from: Date, windowDays = 40): boolean {
  const diffDays = (date.getTime() - from.getTime()) / DAY_MS;
  return diffDays >= 0 && diffDays <= windowDays;
}
