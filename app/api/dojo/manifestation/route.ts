import { NextRequest, NextResponse } from "next/server";
import {
  CREATIVE_ROLE_TITLE,
  MANIFESTATION_MILESTONE_TITLE_PREFIX,
  emptyCreativeRole,
  manifestationMilestoneTitle,
  normalizeCreativeRole,
  normalizeManifestationMilestone,
} from "@/lib/dojo/manifestation";
import { listJsonRecords, readJsonRecord, upsertJsonRecord } from "@/lib/dojo/notionStore";
import { taipeiTodayISO } from "@/lib/dojo/formal";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [profileRow, rows] = await Promise.all([
      readJsonRecord(CREATIVE_ROLE_TITLE),
      listJsonRecords(MANIFESTATION_MILESTONE_TITLE_PREFIX),
    ]);
    const milestones = rows
      .map((row) => normalizeManifestationMilestone(row.value, { id: row.id, date: taipeiTodayISO() }))
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt))
      .slice(0, 20);
    return NextResponse.json({
      profile: profileRow ? normalizeCreativeRole(profileRow.value) : emptyCreativeRole(),
      milestones,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const profile = normalizeCreativeRole(await req.json());
    if (!profile.title) return NextResponse.json({ error: "請先寫下創現角色的稱號" }, { status: 400 });
    if (!profile.traits.length) return NextResponse.json({ error: "請選定至少一個核心特質" }, { status: 400 });
    profile.updatedAt = new Date().toISOString();
    await upsertJsonRecord(CREATIVE_ROLE_TITLE, profile);
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const nonce = crypto.randomUUID();
    const milestone = normalizeManifestationMilestone(body, {
      id: nonce,
      date: taipeiTodayISO(),
      createdAt: new Date().toISOString(),
    });
    if (!milestone) {
      return NextResponse.json({ error: "請寫下你主動採取的行動，並選擇對應特質" }, { status: 400 });
    }
    const saved = await upsertJsonRecord(manifestationMilestoneTitle(milestone.date, nonce), milestone);
    milestone.id = saved.id;
    return NextResponse.json({ ok: true, milestone }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
