import { NextRequest, NextResponse } from "next/server";
import { WEAVING_SHUTTLE_TITLE_PREFIX, WEAVING_WORK_TITLE_PREFIX, parseJson } from "@/lib/dojo/formal";
import {
  createShuttleDraft,
  createWorkDraft,
  currentCore,
  normalizeWeavingShuttle,
  normalizeWeavingWork,
  shuttleContent,
  shuttleRecordTitle,
  workContent,
  workRecordTitle,
  type CoreImpact,
  type ReflectionNextMove,
  type WeavingReflection,
  type WeavingShuttle,
  type WeavingWork,
} from "@/lib/dojo/weavingShuttle";
import { listJsonRecords, updateJsonRecordById } from "@/lib/dojo/notionStore";
import { archiveKnowledgeEntry, createKnowledgeEntry } from "@/lib/notion/mutations";
import { getKnowledgeEntry } from "@/lib/notion/queries";

export const dynamic = "force-dynamic";

async function readShuttle(id: string) {
  const row = await getKnowledgeEntry(id);
  if (!row.標題.startsWith(WEAVING_SHUTTLE_TITLE_PREFIX)) throw new Error("來源不是織光杼");
  const shuttle = normalizeWeavingShuttle(parseJson(row.內容), { id });
  if (!shuttle) throw new Error("織光杼無法讀取");
  return { row, shuttle };
}

async function readWork(id: string) {
  const row = await getKnowledgeEntry(id);
  if (!row.標題.startsWith(WEAVING_WORK_TITLE_PREFIX)) throw new Error("來源不是作品緯線");
  const work = normalizeWeavingWork(parseJson(row.內容), { id });
  if (!work) throw new Error("作品緯線無法讀取");
  return { row, work };
}

async function createWork(input: {
  shuttle: WeavingShuttle; title: string; format: "text" | "comic" | "video";
  formatSubtype?: string; derivedFromWorkId?: string | null;
}) {
  const work = createWorkDraft({
    shuttleId: input.shuttle.id, title: input.title, coreVersionId: currentCore(input.shuttle).id,
    format: input.format, formatSubtype: input.formatSubtype, derivedFromWorkId: input.derivedFromWorkId,
  });
  const created = await createKnowledgeEntry({ 標題: workRecordTitle(crypto.randomUUID()), 內容: JSON.stringify(workContent(work)) });
  work.id = created.id;
  return work;
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    const shuttleId = req.nextUrl.searchParams.get("shuttleId");
    const rows = await listJsonRecords(WEAVING_WORK_TITLE_PREFIX);
    const works = rows.map((row) => normalizeWeavingWork(row.value, { id: row.id }))
      .filter((work): work is WeavingWork => work !== null && work.status !== "archived");
    if (id) {
      const work = works.find((item) => item.id === id);
      return work ? NextResponse.json({ work }) : NextResponse.json({ error: "找不到這件作品" }, { status: 404 });
    }
    return NextResponse.json({ works: shuttleId ? works.filter((work) => work.shuttleId === shuttleId) : works });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const shuttleId = typeof body.shuttleId === "string" ? body.shuttleId : "";
    if (!shuttleId) return NextResponse.json({ error: "缺少織光杼 id" }, { status: 400 });
    const { row: shuttleRow, shuttle } = await readShuttle(shuttleId);

    if (body.action !== "reflect") {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) return NextResponse.json({ error: "請填寫作品名稱" }, { status: 400 });
      const format = body.format === "comic" || body.format === "video" ? body.format : "text";
      const work = await createWork({ shuttle, title, format, derivedFromWorkId: typeof body.derivedFromWorkId === "string" ? body.derivedFromWorkId : null });
      if (shuttle.status === "resting") {
        const active = normalizeWeavingShuttle({ ...shuttle, status: "active" }, { id: shuttle.id, touch: true });
        if (active) await updateJsonRecordById(shuttle.id, WEAVING_SHUTTLE_TITLE_PREFIX, shuttleRow.標題, shuttleContent(active));
      }
      return NextResponse.json({ ok: true, shuttle, work }, { status: 201 });
    }

    const workId = typeof body.workId === "string" ? body.workId : "";
    if (!workId) return NextResponse.json({ error: "缺少作品 id" }, { status: 400 });
    const { row: workRow, work } = await readWork(workId);
    if (work.shuttleId !== shuttle.id) return NextResponse.json({ error: "作品不屬於這張織光杼" }, { status: 409 });
    if (work.status !== "completed" && work.status !== "sent_to_liaojie") return NextResponse.json({ error: "請先確認作品完成" }, { status: 409 });
    const insight = typeof body.insight === "string" ? body.insight.trim() : "";
    if (!insight) return NextResponse.json({ error: "請先寫下這次創作讓你更明白的事" }, { status: 400 });
    const coreImpact: CoreImpact = ["expanded", "changed", "branched"].includes(body.coreImpact) ? body.coreImpact : "unchanged";
    const nextMove: ReflectionNextMove = ["adapt", "update_core", "branch"].includes(body.nextMove) ? body.nextMove : "rest";
    const nextCoreStatement = typeof body.nextCoreStatement === "string" ? body.nextCoreStatement.trim() : "";
    const requestedBranchTitle = typeof body.branchTitle === "string" ? body.branchTitle.trim() : "";
    if (nextMove === "update_core" && !nextCoreStatement) return NextResponse.json({ error: "請填寫更新後的核心觀點" }, { status: 400 });
    if (nextMove === "branch" && (!nextCoreStatement || !requestedBranchTitle)) {
      return NextResponse.json({ error: "分支前請填寫新織光杼名稱與核心觀點" }, { status: 400 });
    }
    const reflection: WeavingReflection = { insight, coreImpact, nextMove, createdAt: new Date().toISOString() };
    const reflected = normalizeWeavingWork({ ...work, reflection }, { id: work.id, touch: true });
    if (!reflected) return NextResponse.json({ error: "回杼內容無法保存" }, { status: 400 });
    await updateJsonRecordById(work.id, WEAVING_WORK_TITLE_PREFIX, workRow.標題, workContent(reflected));

    if (nextMove === "rest") {
      const resting = normalizeWeavingShuttle({ ...shuttle, status: "resting" }, { id: shuttle.id, touch: true });
      if (resting) await updateJsonRecordById(shuttle.id, WEAVING_SHUTTLE_TITLE_PREFIX, shuttleRow.標題, shuttleContent(resting));
      return NextResponse.json({ ok: true, shuttle: resting ?? shuttle, work: reflected, nextWork: null });
    }

    const nextFormat = body.nextFormat === "comic" || body.nextFormat === "video" ? body.nextFormat : "text";
    const nextTitle = typeof body.nextTitle === "string" && body.nextTitle.trim() ? body.nextTitle.trim() : `${work.title}・延伸`;

    if (nextMove === "branch") {
      const branch = createShuttleDraft({
        title: requestedBranchTitle, sourceType: "weaving_branch", sourceId: shuttle.id,
        sourceRefs: [...shuttle.sourceRefs, { sourceType: "weaving_shuttle", sourceId: shuttle.id }],
        sourceSnapshot: `由「${shuttle.title}」的作品「${work.title}」分支。\n\n創作後理解：${insight}`,
        coreStatement: nextCoreStatement, audience: shuttle.audience, direction: shuttle.direction,
        branchedFromShuttleId: shuttle.id, branchedFromWorkId: work.id,
      });
      const createdBranch = await createKnowledgeEntry({ 標題: shuttleRecordTitle(crypto.randomUUID()), 內容: JSON.stringify(shuttleContent(branch)) });
      branch.id = createdBranch.id;
      try {
        const nextWork = await createWork({ shuttle: branch, title: nextTitle, format: nextFormat, derivedFromWorkId: work.id });
        const branchedParent = normalizeWeavingShuttle({ ...shuttle, status: "branched" }, { id: shuttle.id, touch: true });
        if (branchedParent) await updateJsonRecordById(shuttle.id, WEAVING_SHUTTLE_TITLE_PREFIX, shuttleRow.標題, shuttleContent(branchedParent));
        return NextResponse.json({ ok: true, shuttle: branch, work: reflected, nextWork, branched: true }, { status: 201 });
      } catch (error) {
        await archiveKnowledgeEntry(branch.id).catch(() => undefined);
        throw error;
      }
    }

    let updatedShuttle = shuttle;
    if (nextMove === "update_core") {
      const version = {
        id: crypto.randomUUID(), number: shuttle.coreVersions.length + 1, statement: nextCoreStatement,
        changeNote: insight, derivedFromWorkId: work.id, createdAt: new Date().toISOString(),
      };
      const next = normalizeWeavingShuttle({
        ...shuttle, status: "active", coreVersions: [...shuttle.coreVersions, version], currentCoreVersionId: version.id,
      }, { id: shuttle.id, touch: true });
      if (!next) return NextResponse.json({ error: "核心經線版本無法建立" }, { status: 400 });
      await updateJsonRecordById(shuttle.id, WEAVING_SHUTTLE_TITLE_PREFIX, shuttleRow.標題, shuttleContent(next));
      updatedShuttle = next;
    }
    const nextWork = await createWork({ shuttle: updatedShuttle, title: nextTitle, format: nextFormat, derivedFromWorkId: work.id });
    return NextResponse.json({ ok: true, shuttle: updatedShuttle, work: reflected, nextWork, branched: false }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: /缺少|不屬於|請先|分支前|來源不是/.test(message) ? 409 : 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (typeof body.id !== "string") return NextResponse.json({ error: "缺少作品 id" }, { status: 400 });
    const { row, work: previous } = await readWork(body.id);
    const work = normalizeWeavingWork({
      ...previous, ...body.work, shuttleId: previous.shuttleId, coreVersionId: previous.coreVersionId,
      derivedFromWorkId: previous.derivedFromWorkId, reflection: previous.reflection,
      createdAt: previous.createdAt,
    }, { id: body.id, touch: true });
    if (!work) return NextResponse.json({ error: "作品內容不完整" }, { status: 400 });
    await updateJsonRecordById(body.id, WEAVING_WORK_TITLE_PREFIX, row.標題, workContent(work));
    return NextResponse.json({ ok: true, work });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
