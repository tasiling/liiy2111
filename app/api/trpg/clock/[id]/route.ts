import { NextRequest, NextResponse } from "next/server";
import { adjustClock } from "@/lib/trpg/mutations";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { delta } = (await req.json()) as { delta: number };
  const result = await adjustClock(id, delta);
  return NextResponse.json(result);
}
