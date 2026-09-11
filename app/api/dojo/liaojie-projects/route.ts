import { NextRequest, NextResponse } from "next/server";
import { LIAOJIE_PROJECT_TITLE_PREFIX, WEAVING_PROJECT_TITLE_PREFIX, WEAVING_SHUTTLE_TITLE_PREFIX, WEAVING_WORK_TITLE_PREFIX, parseJson } from "@/lib/dojo/formal";
import { liaojieProjectContent, liaojieProjectRecordTitle, normalizeLiaojieProject } from "@/lib/dojo/liaojiePublication";
import { normalizeWeavingProject, weavingProjectContent } from "@/lib/dojo/weavingProjects";
import { normalizeWeavingShuttle, normalizeWeavingWork, workContent } from "@/lib/dojo/weavingShuttle";
import { archiveJsonRecordById, listJsonRecords, updateJsonRecordById } from "@/lib/dojo/notionStore";
import { createKnowledgeEntry } from "@/lib/notion/mutations";
import { getKnowledgeEntry } from "@/lib/notion/queries";

export const dynamic = "force-dynamic";

async function projects() {
  const rows = await listJsonRecords(LIAOJIE_PROJECT_TITLE_PREFIX);
  return rows.map((row) => normalizeLiaojieProject(row.value, { id: row.id }))
    .filter((project): project is NonNullable<typeof project> => project !== null)
    .filter((project) => project.status !== "archived")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function GET(req: NextRequest) {
  try {
    const rows = await projects();
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const project = rows.find((item) => item.id === id);
      return project ? NextResponse.json({ project }) : NextResponse.json({ error: "找不到這張聊解企劃" }, { status: 404 });
    }
    return NextResponse.json({ projects: rows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const weavingWorkId = typeof body.weavingWorkId === "string" ? body.weavingWorkId : "";
    const weavingShuttleId = typeof body.weavingShuttleId === "string" ? body.weavingShuttleId : "";
    if (weavingWorkId || weavingShuttleId) {
      if (!weavingWorkId || !weavingShuttleId) return NextResponse.json({ error: "缺少織光杼或作品緯線 id" }, { status: 400 });
      const existing = (await projects()).find((item) => item.weavingWorkId === weavingWorkId);
      if (existing) return NextResponse.json({ ok: true, project: existing, duplicate: true });

      const [shuttleRow, workRow] = await Promise.all([getKnowledgeEntry(weavingShuttleId), getKnowledgeEntry(weavingWorkId)]);
      if (!shuttleRow.標題.startsWith(WEAVING_SHUTTLE_TITLE_PREFIX) || !workRow.標題.startsWith(WEAVING_WORK_TITLE_PREFIX)) {
        return NextResponse.json({ error: "來源不是有效的織光杼與作品緯線" }, { status: 400 });
      }
      const shuttle = normalizeWeavingShuttle(parseJson(shuttleRow.內容), { id: weavingShuttleId });
      const work = normalizeWeavingWork(parseJson(workRow.內容), { id: weavingWorkId });
      if (!shuttle || !work || work.shuttleId !== shuttle.id) return NextResponse.json({ error: "作品與織光杼的關係無法確認" }, { status: 409 });
      if (work.status !== "completed" && work.status !== "sent_to_liaojie") {
        return NextResponse.json({ error: "請先確認這件作品完成，再手動送往聊解室" }, { status: 409 });
      }
      const core = shuttle.coreVersions.find((version) => version.id === work.coreVersionId) ?? shuttle.coreVersions[shuttle.coreVersions.length - 1];
      const project = normalizeLiaojieProject({
        weavingProjectId: "", weavingShuttleId, weavingWorkId, sourceCoreVersionId: core.id,
        sourceTitle: work.title, sourceCoreStatement: core.statement,
        sourceOutputUrl: work.outputUrl, sourceDraftSnapshot: work.finalSnapshot || work.draftText,
        brandAngle: core.statement, audience: shuttle.audience, platform: "instagram_post",
        title: work.title, coverCopy: "", summary: "", callToAction: "", themeGroup: "",
        scheduledOn: null, status: "received", publishedUrl: "", responseNote: "", nextStep: "決定首發平台",
      }, { id: "pending", touch: true });
      if (!project) return NextResponse.json({ error: "聊解企劃內容不完整" }, { status: 400 });
      const created = await createKnowledgeEntry({ 標題: liaojieProjectRecordTitle(crypto.randomUUID()), 內容: JSON.stringify(liaojieProjectContent(project)) });
      project.id = created.id;
      const sentAt = new Date().toISOString();
      const updatedWork = normalizeWeavingWork({ ...work, status: "sent_to_liaojie", sentToLiaojieAt: sentAt, nextAction: "在聊解室完成首發版本" }, { id: work.id, touch: true });
      if (updatedWork) await updateJsonRecordById(work.id, WEAVING_WORK_TITLE_PREFIX, workRow.標題, workContent(updatedWork));
      return NextResponse.json({ ok: true, project }, { status: 201 });
    }

    const weavingProjectId = typeof body.weavingProjectId === "string" ? body.weavingProjectId : "";
    if (!weavingProjectId) return NextResponse.json({ error: "缺少織光案 id" }, { status: 400 });
    const existing = (await projects()).find((item) => item.weavingProjectId === weavingProjectId);
    if (existing) return NextResponse.json({ ok: true, project: existing, duplicate: true });

    const weavingRow = await getKnowledgeEntry(weavingProjectId);
    if (!weavingRow.標題.startsWith(WEAVING_PROJECT_TITLE_PREFIX)) return NextResponse.json({ error: "來源不是織光案" }, { status: 400 });
    const weaving = normalizeWeavingProject(parseJson(weavingRow.內容), { id: weavingProjectId });
    if (!weaving) return NextResponse.json({ error: "來源織光案無法讀取" }, { status: 409 });
    if (weaving.status !== "completed" && weaving.status !== "sent_to_liaojie") {
      return NextResponse.json({ error: "請先確認作品完成，再手動送往聊解室" }, { status: 409 });
    }

    const project = normalizeLiaojieProject({
      weavingProjectId, weavingShuttleId: "", weavingWorkId: "", sourceCoreVersionId: "",
      sourceTitle: weaving.title, sourceCoreStatement: weaving.coreStatement,
      sourceOutputUrl: weaving.outputUrl, sourceDraftSnapshot: weaving.draftText,
      brandAngle: weaving.coreStatement, audience: weaving.audience, platform: "instagram_post",
      title: weaving.title, coverCopy: "", summary: "", callToAction: "", themeGroup: "",
      scheduledOn: null, status: "received", publishedUrl: "", responseNote: "", nextStep: "決定首發平台",
    }, { id: "pending", touch: true });
    if (!project) return NextResponse.json({ error: "聊解企劃內容不完整" }, { status: 400 });
    const created = await createKnowledgeEntry({ 標題: liaojieProjectRecordTitle(crypto.randomUUID()), 內容: JSON.stringify(liaojieProjectContent(project)) });
    project.id = created.id;

    const sentAt = new Date().toISOString();
    const updatedWeaving = normalizeWeavingProject({ ...weaving, status: "sent_to_liaojie", sentToLiaojieAt: sentAt, nextAction: "在聊解室完成首發版本" }, { id: weaving.id, touch: true });
    if (updatedWeaving) await updateJsonRecordById(weaving.id, WEAVING_PROJECT_TITLE_PREFIX, weavingRow.標題, weavingProjectContent(updatedWeaving));
    return NextResponse.json({ ok: true, project }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (typeof body.id !== "string") return NextResponse.json({ error: "缺少聊解企劃 id" }, { status: 400 });
    const row = await getKnowledgeEntry(body.id);
    if (!row.標題.startsWith(LIAOJIE_PROJECT_TITLE_PREFIX)) return NextResponse.json({ error: "紀錄類型不符" }, { status: 400 });
    const previous = normalizeLiaojieProject(parseJson(row.內容), { id: body.id });
    if (!previous) return NextResponse.json({ error: "既有聊解企劃無法讀取" }, { status: 409 });
    const requestedStatus = body.project?.status;
    if (requestedStatus === "scheduled" && !String(body.project?.scheduledOn || previous.scheduledOn || "").trim()) {
      return NextResponse.json({ error: "安排發布前請先選擇日期" }, { status: 409 });
    }
    if (requestedStatus === "published" && !String(body.project?.publishedUrl || previous.publishedUrl || "").trim()) {
      return NextResponse.json({ error: "標記已發布前請先貼上發布連結" }, { status: 409 });
    }
    const project = normalizeLiaojieProject({
      ...previous, ...body.project,
      weavingProjectId: previous.weavingProjectId, weavingShuttleId: previous.weavingShuttleId,
      weavingWorkId: previous.weavingWorkId, sourceCoreVersionId: previous.sourceCoreVersionId,
      sourceTitle: previous.sourceTitle, sourceCoreStatement: previous.sourceCoreStatement,
      sourceOutputUrl: previous.sourceOutputUrl, sourceDraftSnapshot: previous.sourceDraftSnapshot,
      createdAt: previous.createdAt,
    }, { id: body.id, touch: true });
    if (!project) return NextResponse.json({ error: "聊解企劃內容不完整" }, { status: 400 });
    await updateJsonRecordById(body.id, LIAOJIE_PROJECT_TITLE_PREFIX, row.標題, liaojieProjectContent(project));
    return NextResponse.json({ ok: true, project });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少聊解企劃 id" }, { status: 400 });
    await archiveJsonRecordById(id, LIAOJIE_PROJECT_TITLE_PREFIX);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
