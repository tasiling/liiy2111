import { NextRequest, NextResponse } from "next/server";
import {
  listContextActivityCandidates,
  listRecentContextResults,
  saveContextRoomResult,
} from "@/lib/dojo/contextRoomResultStore";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [activities, recent] = await Promise.all([
      listContextActivityCandidates(),
      listRecentContextResults(3),
    ]);
    return NextResponse.json({ activities, recent });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const saved = await saveContextRoomResult({
      draft: body.draft,
      linkedActivityId: body.linkedActivityId,
    });
    return NextResponse.json({ ok: true, ...saved }, { status: saved.duplicate ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = /還缺少|不正確|尚未達到|請重新選擇/.test(message) ? 400 : /找不到|已封存/.test(message) ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
