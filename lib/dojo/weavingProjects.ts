import { WEAVING_PROJECT_TITLE_PREFIX } from "./formal";

export const WEAVING_FORMATS = { text: "文字", comic: "漫畫", video: "影片" } as const;
export type WeavingFormat = keyof typeof WEAVING_FORMATS;

export const TEXT_SUBTYPES = {
  article: "長文／文章",
  plurk: "噗浪或短貼文",
  instagram_carousel: "IG 輪播文案",
  instagram_story: "IG 限時動態文字",
  spoken_script: "Podcast／影片口播初稿",
  lesson_legacy: "教學內容／練習單（既有）",
} as const;
export type TextSubtype = keyof typeof TEXT_SUBTYPES;
export type WeavingStatus = "selecting" | "drafting" | "producing" | "reviewing" | "completed" | "sent_to_liaojie" | "archived";
export type WeavingSourceRef = { sourceType: string; sourceId: string };

export type WeavingProject = {
  version: 2;
  recordType: "weaving-project";
  id: string;
  title: string;
  sourceType: string;
  sourceId: string | null;
  sourceRefs: WeavingSourceRef[];
  sourceSnapshot: string;
  coreStatement: string;
  audience: string;
  format: WeavingFormat;
  formatSubtype: string;
  status: WeavingStatus;
  nextAction: string;
  draftText: string;
  outputUrl: string;
  toolKey: string | null;
  sentToLiaojieAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReadingWeavingProjectWithCards = WeavingProject & {
  cards: Array<{ id: string; insight: string; action: string; sourceBookTitle?: string }>;
};
const STATUSES: WeavingStatus[] = ["selecting", "drafting", "producing", "reviewing", "completed", "sent_to_liaojie", "archived"];
function text(value: unknown, max: number): string { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function nullableText(value: unknown, max: number): string | null { const result = text(value, max); return result || null; }

function normalizeSourceRefs(value: unknown): WeavingSourceRef[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const ref = item as Partial<WeavingSourceRef>;
    const sourceType = text(ref.sourceType, 100);
    const sourceId = text(ref.sourceId, 300);
    return sourceType && sourceId ? [{ sourceType, sourceId }] : [];
  }).filter((ref, index, rows) => rows.findIndex((row) => row.sourceType === ref.sourceType && row.sourceId === ref.sourceId) === index).slice(0, 20);
}

function legacyOutputType(value: unknown): { format: WeavingFormat; subtype: string } | null {
  if (value === "article") return { format: "text", subtype: "article" };
  if (value === "carousel") return { format: "text", subtype: "instagram_carousel" };
  if (value === "script") return { format: "text", subtype: "spoken_script" };
  if (value === "lesson") return { format: "text", subtype: "lesson_legacy" };
  if (value === "shortVideo" || value === "longVideo") return { format: "video", subtype: String(value) };
  return null;
}

function normalizeLegacyStatus(value: unknown): WeavingStatus {
  if (value === "completed") return "completed";
  if (value === "revision") return "reviewing";
  if (value === "outline" || value === "draft") return "drafting";
  return "selecting";
}

export function weavingProjectRecordTitle(nonce: string): string { return `${WEAVING_PROJECT_TITLE_PREFIX}${nonce}`; }

export function normalizeWeavingProject(value: unknown, options: { id: string; touch?: boolean }): WeavingProject | null {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const now = new Date().toISOString();
  if (source.recordType === "reading-weaving-project" || source.version === 1) {
    const legacy = legacyOutputType(source.outputType);
    const insightCardIds = Array.isArray(source.insightCardIds)
      ? source.insightCardIds.filter((id): id is string => typeof id === "string" && Boolean(id.trim())) : [];
    if (!legacy || !insightCardIds.length) return null;
    const createdAt = text(source.createdAt, 50) || now;
    return {
      version: 2, recordType: "weaving-project", id: options.id,
      title: text(source.title, 200) || "未命名閱讀企劃",
      sourceType: "reading_insights", sourceId: insightCardIds[0] ?? null,
      sourceRefs: insightCardIds.map((sourceId) => ({ sourceType: "reading_insight", sourceId })),
      sourceSnapshot: "既有閱讀洞察企劃；來源內容仍由洞察卡片庫保存。",
      coreStatement: text(source.title, 200), audience: "", format: legacy.format, formatSubtype: legacy.subtype,
      status: normalizeLegacyStatus(source.status),
      nextAction: source.status === "completed" ? "決定是否送往聊解室" : "確認本篇唯一核心主張",
      draftText: text(source.productionNote, 80000), outputUrl: text(source.outputUrl, 2000), toolKey: null,
      sentToLiaojieAt: null, createdAt,
      updatedAt: options.touch ? now : (text(source.updatedAt, 50) || createdAt),
    };
  }

  const format = source.format === "text" || source.format === "comic" || source.format === "video" ? source.format : null;
  const coreStatement = text(source.coreStatement, 3000);
  const title = text(source.title, 200) || coreStatement.slice(0, 80);
  if (!format || !title || !coreStatement) return null;
  const createdAt = text(source.createdAt, 50) || now;
  const refs = normalizeSourceRefs(source.sourceRefs);
  const sourceType = text(source.sourceType, 100) || "manual";
  const sourceId = nullableText(source.sourceId, 300);
  if (sourceId && !refs.some((ref) => ref.sourceType === sourceType && ref.sourceId === sourceId)) refs.unshift({ sourceType, sourceId });
  return {
    version: 2, recordType: "weaving-project", id: options.id, title, sourceType, sourceId, sourceRefs: refs,
    sourceSnapshot: text(source.sourceSnapshot, 30000), coreStatement, audience: text(source.audience, 1000), format,
    formatSubtype: text(source.formatSubtype, 100) || (format === "text" ? "article" : "planned"),
    status: STATUSES.includes(source.status as WeavingStatus) ? source.status as WeavingStatus : "selecting",
    nextAction: text(source.nextAction, 1000) || "確認本篇唯一核心主張",
    draftText: text(source.draftText, 80000), outputUrl: text(source.outputUrl, 2000), toolKey: nullableText(source.toolKey, 100),
    sentToLiaojieAt: nullableText(source.sentToLiaojieAt, 50), createdAt,
    updatedAt: options.touch ? now : (text(source.updatedAt, 50) || createdAt),
  };
}

export function weavingProjectContent(project: WeavingProject): Omit<WeavingProject, "id"> {
  const { id: _id, ...content } = project; void _id; return content;
}

export const normalizeReadingWeavingProject = normalizeWeavingProject;
export const readingWeavingProjectContent = weavingProjectContent;
