import { NextRequest, NextResponse } from "next/server";
import {
  CREATIVE_PRACTICE_TITLE_PREFIX,
  creativePracticeTitle,
  normalizeCreativePractice,
  type CreativePracticeRecord,
} from "@/lib/dojo/manifestation";
import { listJsonRecords, upsertJsonRecord } from "@/lib/dojo/notionStore";
import { taipeiTodayISO } from "@/lib/dojo/formal";

export const dynamic = "force-dynamic";

function titleDate(title: string) {
  const match = title.match(/(\d{4})(\d{2})(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : taipeiTodayISO();
}

export async function GET() {
  try {
    const rows = await listJsonRecords(CREATIVE_PRACTICE_TITLE_PREFIX);
    const practices = rows
      .map((row) => normalizeCreativePractice(row.value, { id: row.id, practicedOn: titleDate(row.title) }))
      .filter((item): item is CreativePracticeRecord => item !== null)
      .sort((a, b) => (b.practicedOn + b.createdAt).localeCompare(a.practicedOn + a.createdAt))
      .slice(0, 40);
    return NextResponse.json({ practices });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const nonce = crypto.randomUUID();
    const practice = normalizeCreativePractice(await req.json(), {
      id: nonce,
      practicedOn: taipeiTodayISO(),
      createdAt: new Date().toISOString(),
    });
    if (!practice) {
      return NextResponse.json({ error: "請先完成本次修習的核心內容" }, { status: 400 });
    }
    const saved = await upsertJsonRecord(
      creativePracticeTitle(practice.method, practice.practicedOn, nonce),
      practice
    );
    practice.id = saved.id;
    return NextResponse.json({ ok: true, practice }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
