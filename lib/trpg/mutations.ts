import { notion, withNotionRateLimit } from "../notion/client";
import {
  titleProp,
  richTextProp,
  selectProp,
  multiSelectProp,
  numberProp,
  relationProp,
  checkboxProp,
  dateProp,
} from "../notion/properties";
import { TRPG_DATA_SOURCES, QUICK_ADD_TARGET_DB, type QuickAddTargetType } from "./schema";
import { QUICK_ADD_FIELD_DICT } from "./parse";
import { getSave, mapClock } from "./queries";
import type { NotionPage } from "../notion/queries";

// --- 🎲 判定紀錄表:網頁是唯一寫入者(協作協議 §4.3) ---
export async function createJudgment(params: {
  saveId: string;
  judgeMethod: "骰子" | "抽牌";
  pool: number;
  judgeType: string;
  position: string;
  effect: string;
  result: string;
  card?: string;
  devilsBargain: boolean;
  proactive?: boolean;
  behaviorTags: string[];
  moralTags: string[];
  note?: string;
}) {
  const save = await getSave(params.saveId);
  const name = `${params.judgeType}-${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
  const note = [params.card ? `抽到的牌:${params.card}` : null, params.note || null]
    .filter(Boolean)
    .join(" ／ ");

  const page = await withNotionRateLimit(() =>
    notion().pages.create({
      parent: { type: "data_source_id", data_source_id: TRPG_DATA_SOURCES.判定紀錄表 },
      properties: {
        判定名稱: titleProp(name),
        判定方式: selectProp(params.judgeMethod),
        "骰池大小/抽牌張數": numberProp(params.pool),
        判定類型: selectProp(params.judgeType),
        Position: selectProp(params.position),
        Effect: selectProp(params.effect),
        結果級別: selectProp(params.result),
        是否使用DevilsBargain: checkboxProp(params.devilsBargain),
        是否主動發起: checkboxProp(params.proactive ?? false),
        行為標籤: multiSelectProp(params.behaviorTags),
        道德標籤: multiSelectProp(params.moralTags),
        ...(note ? { 備註: richTextProp(note) } : {}),
        ...(save.所屬世界 ? { 所屬世界: relationProp([save.所屬世界]) } : {}),
        ...(save.目前章節 ? { 所屬章節: relationProp([save.目前章節]) } : {}),
        ...(save.目前場景 ? { 所屬場景: relationProp([save.目前場景]) } : {}),
        ...(save.視角角色 ? { 視角角色: relationProp([save.視角角色]) } : {}),
      },
    })
  );
  return { id: page.id, name };
}

// --- ⚡ 快速輸入台 ---
export async function createStagingEntry(params: {
  targetType: QuickAddTargetType;
  rawText: string;
  fields: Record<string, string>;
  parseStatus: "待確認" | "已存檔";
}) {
  const specs = QUICK_ADD_FIELD_DICT[params.targetType];
  const titleSpec = specs.find((s) => s.isTitle);
  const name = (titleSpec && params.fields[titleSpec.key]) || params.rawText.slice(0, 30) || "未命名";

  const page = await withNotionRateLimit(() =>
    notion().pages.create({
      parent: { type: "data_source_id", data_source_id: TRPG_DATA_SOURCES.快速輸入暫存表 },
      properties: {
        暫存紀錄名稱: titleProp(name),
        目標類型: selectProp(params.targetType),
        原始輸入文字: richTextProp(params.rawText),
        解析欄位JSON: richTextProp(JSON.stringify(params.fields)),
        解析狀態: selectProp(params.parseStatus),
      },
    })
  );
  return { id: page.id, name };
}

function buildTargetProperties(targetType: QuickAddTargetType, fields: Record<string, string>) {
  const specs = QUICK_ADD_FIELD_DICT[targetType];
  const { titleProp: titlePropName } = QUICK_ADD_TARGET_DB[targetType];
  const titleSpec = specs.find((s) => s.isTitle);
  const titleValue = (titleSpec && fields[titleSpec.key]) || "未命名";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties: Record<string, any> = {
    [titlePropName]: titleProp(titleValue),
  };
  for (const spec of specs) {
    if (spec.isTitle) continue;
    const value = fields[spec.key];
    if (!value) continue;
    properties[spec.key] = spec.isSelect ? selectProp(value) : richTextProp(value);
  }
  return { properties, titleValue };
}

// 「直接入庫」:寫入正式資料庫 + 暫存表同步記一筆(解析狀態=已存檔)。
export async function createDirectEntry(params: {
  targetType: QuickAddTargetType;
  rawText: string;
  fields: Record<string, string>;
}) {
  const { dataSource } = QUICK_ADD_TARGET_DB[params.targetType];
  const { properties, titleValue } = buildTargetProperties(params.targetType, params.fields);

  const page = await withNotionRateLimit(() =>
    notion().pages.create({
      parent: { type: "data_source_id", data_source_id: dataSource },
      properties,
    })
  );

  const staging = await createStagingEntry({
    targetType: params.targetType,
    rawText: params.rawText,
    fields: params.fields,
    parseStatus: "已存檔",
  });

  return { id: page.id, title: titleValue, stagingId: staging.id };
}

export async function updateStagingStatus(id: string, status: "已存檔" | "已捨棄") {
  await withNotionRateLimit(() =>
    notion().pages.update({ page_id: id, properties: { 解析狀態: selectProp(status) } })
  );
}

// 暫存清單頁「確認」:讀出暫存筆的目標類型+解析欄位 JSON,寫入正式資料庫,
// 再把同一筆暫存記錄的解析狀態改為已存檔(不重複新建暫存筆)。
export async function confirmStagingEntry(id: string) {
  const page = (await withNotionRateLimit(() =>
    notion().pages.retrieve({ page_id: id })
  )) as NotionPage;
  const targetType = page.properties?.目標類型?.select?.name as QuickAddTargetType | undefined;
  const fieldsJSON = page.properties?.解析欄位JSON?.rich_text?.[0]?.plain_text ?? "{}";
  if (!targetType) throw new Error("暫存筆缺少目標類型,無法確認入庫");

  const fields = JSON.parse(fieldsJSON) as Record<string, string>;
  const { dataSource } = QUICK_ADD_TARGET_DB[targetType];
  const { properties, titleValue } = buildTargetProperties(targetType, fields);

  const created = await withNotionRateLimit(() =>
    notion().pages.create({
      parent: { type: "data_source_id", data_source_id: dataSource },
      properties,
    })
  );

  await updateStagingStatus(id, "已存檔");
  return { id: created.id, title: titleValue };
}

// --- ⏱️ 時鐘表:+N / -N ---
export async function adjustClock(id: string, delta: number) {
  const page = await withNotionRateLimit(() => notion().pages.retrieve({ page_id: id }));
  const current = mapClock(page as NotionPage);
  const next = Math.max(0, Math.min(current.格數上限, current.目前格數 + delta));
  await withNotionRateLimit(() =>
    notion().pages.update({ page_id: id, properties: { 目前格數: numberProp(next) } })
  );
  return { id, 目前格數: next, 格數上限: current.格數上限 };
}

// --- 💾 POV進度表:結算精靈用 ---
export async function updateSave(
  id: string,
  params: {
    最近摘要?: string;
    累積遊玩時長增量?: number;
    目前章節?: string;
    目前場景?: string;
    已完成章節新增?: string[];
    已完成場景新增?: string[];
  }
) {
  const save = await getSave(id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties: Record<string, any> = {};
  if (params.最近摘要 !== undefined) properties.最近摘要 = richTextProp(params.最近摘要);
  if (params.累積遊玩時長增量) {
    properties["累積遊玩時長(分)"] = numberProp(save.累積遊玩時長 + params.累積遊玩時長增量);
  }
  if (params.目前章節) properties.目前章節 = relationProp([params.目前章節]);
  if (params.目前場景) properties.目前場景 = relationProp([params.目前場景]);
  if (params.已完成章節新增?.length) {
    properties.已完成章節 = relationProp([...save.已完成章節, ...params.已完成章節新增]);
  }
  if (params.已完成場景新增?.length) {
    properties.已完成場景 = relationProp([...save.已完成場景, ...params.已完成場景新增]);
  }

  await withNotionRateLimit(() => notion().pages.update({ page_id: id, properties }));
  return { id };
}

// --- 📖 遊玩日誌:結算精靈用 ---
export async function createSessionLog(params: {
  worldId?: string;
  title: string;
  fullTextBlocks: string[]; // 依段落切開,寫入頁面內文
  summary: string;
  nextOpeningHint: string;
  playDateISO: string;
}) {
  const page = await withNotionRateLimit(() =>
    notion().pages.create({
      parent: { type: "data_source_id", data_source_id: TRPG_DATA_SOURCES.遊玩日誌 },
      properties: {
        段落標題: titleProp(params.title),
        段落摘要: richTextProp(params.summary),
        下次開場提示: richTextProp(params.nextOpeningHint),
        遊玩日期: dateProp(params.playDateISO),
        文稿狀態: selectProp("原始紀錄"),
        ...(params.worldId ? { 所屬世界: relationProp([params.worldId]) } : {}),
      },
      children: params.fullTextBlocks
        .filter((t) => t.trim())
        .map((text) => ({
          object: "block" as const,
          type: "paragraph" as const,
          paragraph: { rich_text: [{ type: "text" as const, text: { content: text } }] },
        })),
    })
  );
  return { id: page.id };
}
