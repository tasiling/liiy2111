export const CONTEXT_ROOM_RESULT_TITLE_PREFIX = "行光語境成果-";

export const CONTEXT_TOPIC_LABELS = ["重述", "解釋", "連結", "判斷", "轉用"] as const;
export type ContextTopicLabel = (typeof CONTEXT_TOPIC_LABELS)[number];

export const CONTEXT_PRACTICE_MODES = ["writing", "topic_speaking", "dialogue", "quick_retell"] as const;
export type ContextPracticeMode = (typeof CONTEXT_PRACTICE_MODES)[number];

export const CONTEXT_ROOM_STATUSES = ["New", "Understood", "Responded", "Revised", "Revisited", "Transferred"] as const;
export type ContextRoomStatus = (typeof CONTEXT_ROOM_STATUSES)[number];

export type ContextRoomResultDraft = {
  sourceEventId: string | null;
  materialTitle: string;
  batchLabel: string;
  topicLabel: ContextTopicLabel | null;
  topicPosition: number | null;
  practiceMode: ContextPracticeMode | null;
  secondTakeCompleted: boolean;
  expressionCount: number;
  contextRoomStatus: ContextRoomStatus | null;
  focus: string;
  practicedOn: string;
  rawSummary: string;
};

export type ContextRoomResult = Omit<ContextRoomResultDraft, "topicLabel" | "practiceMode" | "contextRoomStatus"> & {
  version: 1;
  recordType: "context-room-result";
  sourceSystem: "context_room";
  activityType: "english_context_practice";
  duplicateKey: string;
  topicLabel: ContextTopicLabel;
  practiceMode: ContextPracticeMode;
  contextRoomStatus: ContextRoomStatus;
  linkedActivityId: string | null;
  linkedActivityCompletedAt: string | null;
  createdAt: string;
};

export type ContextActivityCandidate = {
  id: string;
  weekStart: string;
  cellIndex: number;
  templateKey: string;
  title: string;
  shortLabel: string;
  categoryLabel: string;
  assignedDate: string | null;
  progress: number;
  target: number;
  unit: string;
};

export type ContextSummaryParseResult = {
  draft: ContextRoomResultDraft;
  missingFields: string[];
};

export const CONTEXT_PRACTICE_MODE_LABELS: Record<ContextPracticeMode, string> = {
  writing: "寫作",
  topic_speaking: "主題口說",
  dialogue: "對話",
  quick_retell: "快速重說",
};

function clean(value: unknown, maximum = 1000): string {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function validDate(value: unknown): string {
  const text = clean(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function lineValues(raw: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const line of raw.replace(/\r\n?/g, "\n").split("\n")) {
    const match = line.trim().match(/^([^：:]+)[：:]\s*(.*)$/);
    if (!match) continue;
    values.set(match[1].trim().replace(/\s+/g, ""), match[2].trim());
  }
  return values;
}

function splitMaterial(value: string): { materialTitle: string; batchLabel: string } {
  const chapter = value.match(/^(.*?)(\b(?:Chapters?|Ch\.)\s*[\w\d]+(?:\s*[–—~-]\s*[\w\d]+)?(?:\b.*)?)$/i);
  if (chapter && chapter[1].trim()) {
    return { materialTitle: chapter[1].trim(), batchLabel: chapter[2].trim() };
  }
  const chineseChapter = value.match(/^(.*?)(第\s*[一二三四五六七八九十百\d]+(?:\s*[–—~-]\s*[一二三四五六七八九十百\d]+)?\s*章.*)$/);
  if (chineseChapter && chineseChapter[1].trim()) {
    return { materialTitle: chineseChapter[1].trim(), batchLabel: chineseChapter[2].trim() };
  }
  return { materialTitle: value.trim(), batchLabel: "" };
}

function parseMode(value: string): ContextPracticeMode | null {
  const compact = value.replace(/\s+/g, "");
  if (/快速.*(?:重說|重述)|quick.*retell/i.test(compact)) return "quick_retell";
  if (/主題.*口說|topic.*speaking/i.test(compact)) return "topic_speaking";
  if (/對話|對談|dialogue|conversation/i.test(compact)) return "dialogue";
  if (/寫作|writing/i.test(compact)) return "writing";
  return null;
}

function parseStatus(value: string): ContextRoomStatus | null {
  return CONTEXT_ROOM_STATUSES.find((status) => status.toLowerCase() === value.trim().toLowerCase()) ?? null;
}

function parseSecondTake(value: string): boolean {
  if (/未完成|否|false|no/i.test(value)) return false;
  return /完成|是|true|yes/i.test(value);
}

export function parseContextRoomSummary(raw: string, defaultDate: string): ContextSummaryParseResult {
  const rawSummary = raw.slice(0, 8000);
  const values = lineValues(rawSummary);
  const source = values.get("素材") ?? values.get("材料") ?? "";
  const explicitBatch = values.get("內容批次") ?? values.get("章節") ?? values.get("批次") ?? "";
  const material = splitMaterial(source);
  const completion = values.get("完成") ?? "";
  const topicMatch = completion.match(/(重述|解釋|連結|判斷|轉用)(?:\s*(\d+))?/);
  const expressionMatch = (values.get("留下表達") ?? "").match(/\d+/);
  const secondTake = values.get("SecondTake") ?? values.get("Second Take") ?? "";
  const draft: ContextRoomResultDraft = {
    sourceEventId: clean(values.get("sourceEventId") ?? values.get("來源事件ID"), 200) || null,
    materialTitle: material.materialTitle.slice(0, 500),
    batchLabel: clean(explicitBatch || material.batchLabel, 300),
    topicLabel: topicMatch?.[1] as ContextTopicLabel | undefined ?? null,
    topicPosition: topicMatch?.[2] ? Math.max(1, Math.min(99, Number(topicMatch[2]))) : null,
    practiceMode: parseMode(values.get("模式") ?? ""),
    secondTakeCompleted: parseSecondTake(secondTake),
    expressionCount: Math.max(0, Math.min(99, Number(expressionMatch?.[0] ?? 0))),
    contextRoomStatus: parseStatus(values.get("狀態") ?? ""),
    focus: clean(values.get("本次卡點") ?? values.get("卡點"), 2000),
    practicedOn: validDate(values.get("日期")) || defaultDate,
    rawSummary,
  };
  return { draft, missingFields: missingContextResultFields(draft) };
}

export function normalizeContextRoomDraft(value: unknown): ContextRoomResultDraft {
  const source = value && typeof value === "object" ? value as Partial<ContextRoomResultDraft> : {};
  return {
    sourceEventId: clean(source.sourceEventId, 200) || null,
    materialTitle: clean(source.materialTitle, 500),
    batchLabel: clean(source.batchLabel, 300),
    topicLabel: CONTEXT_TOPIC_LABELS.includes(source.topicLabel as ContextTopicLabel) ? source.topicLabel as ContextTopicLabel : null,
    topicPosition: typeof source.topicPosition === "number" && Number.isFinite(source.topicPosition)
      ? Math.max(1, Math.min(99, Math.round(source.topicPosition)))
      : null,
    practiceMode: CONTEXT_PRACTICE_MODES.includes(source.practiceMode as ContextPracticeMode) ? source.practiceMode as ContextPracticeMode : null,
    secondTakeCompleted: source.secondTakeCompleted === true,
    expressionCount: Math.max(0, Math.min(99, Math.round(Number(source.expressionCount) || 0))),
    contextRoomStatus: CONTEXT_ROOM_STATUSES.includes(source.contextRoomStatus as ContextRoomStatus) ? source.contextRoomStatus as ContextRoomStatus : null,
    focus: clean(source.focus, 2000),
    practicedOn: validDate(source.practicedOn),
    rawSummary: clean(source.rawSummary, 8000),
  };
}

export function missingContextResultFields(draft: ContextRoomResultDraft): string[] {
  const missing: string[] = [];
  if (!draft.materialTitle) missing.push("素材名稱");
  if (!draft.topicLabel) missing.push("完成的話題層次");
  if (!draft.practiceMode) missing.push("練習模式");
  if (!draft.contextRoomStatus) missing.push("語境修習室狀態");
  if (!validDate(draft.practicedOn)) missing.push("修習日期");
  return missing;
}

function keyPart(value: string | number | null): string {
  return String(value ?? "").trim().toLocaleLowerCase("zh-TW").replace(/\s+/g, " ");
}

export function contextResultDuplicateKey(draft: ContextRoomResultDraft): string {
  return [
    "context_room",
    draft.practicedOn,
    draft.materialTitle,
    draft.batchLabel,
    draft.topicPosition,
    draft.practiceMode,
  ].map(keyPart).join("|");
}

export function contextResultCanCompleteActivity(draft: ContextRoomResultDraft): boolean {
  return Boolean(
    draft.topicLabel &&
    draft.practiceMode &&
    draft.contextRoomStatus &&
    !["New", "Understood"].includes(draft.contextRoomStatus)
  );
}

export function normalizeContextRoomResult(value: unknown): ContextRoomResult | null {
  const source = value && typeof value === "object" ? value as Partial<ContextRoomResult> : {};
  const draft = normalizeContextRoomDraft(source);
  if (missingContextResultFields(draft).length || !clean(source.duplicateKey, 3000)) return null;
  return {
    ...draft,
    version: 1,
    recordType: "context-room-result",
    sourceSystem: "context_room",
    activityType: "english_context_practice",
    duplicateKey: clean(source.duplicateKey, 3000),
    topicLabel: draft.topicLabel!,
    practiceMode: draft.practiceMode!,
    contextRoomStatus: draft.contextRoomStatus!,
    linkedActivityId: clean(source.linkedActivityId, 300) || null,
    linkedActivityCompletedAt: clean(source.linkedActivityCompletedAt, 50) || null,
    createdAt: clean(source.createdAt, 50) || new Date().toISOString(),
  };
}
