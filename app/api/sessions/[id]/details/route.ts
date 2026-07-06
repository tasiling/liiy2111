import { NextResponse } from "next/server";
import { listDetailsForSession } from "@/lib/notion/queries";

export async function GET(_req: Request, ctx: RouteContext<"/api/sessions/[id]/details">) {
  const { id } = await ctx.params;
  const details = await listDetailsForSession(id);
  return NextResponse.json({ details });
}
