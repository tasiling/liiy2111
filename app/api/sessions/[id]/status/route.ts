import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/notion/queries";
import { canAdvance, updateSessionStatus } from "@/lib/notion/mutations";
import { SESSION_STATUS_ORDER, type SessionStatus } from "@/lib/notion/schema";

// P5 狀態機推進:只允許順序推進(已抽牌→…→已交付),跳步需二次確認(allowSkip=true)。
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/sessions/[id]/status">) {
  const { id } = await ctx.params;
  const body = await req.json();
  const { newStatus, allowSkip } = body as { newStatus: SessionStatus; allowSkip?: boolean };

  if (!SESSION_STATUS_ORDER.includes(newStatus)) {
    return NextResponse.json({ error: `未知狀態:${newStatus}` }, { status: 400 });
  }

  const session = await getSession(id);
  if (!session.狀態) {
    return NextResponse.json({ error: "找不到現有狀態" }, { status: 404 });
  }

  const check = canAdvance(session.狀態 as SessionStatus, newStatus, !!allowSkip);
  if (!check.ok) {
    return NextResponse.json({ error: check.reason, needsConfirm: !allowSkip }, { status: 409 });
  }

  await updateSessionStatus(id, newStatus);
  return NextResponse.json({ ok: true, from: session.狀態, to: newStatus });
}
