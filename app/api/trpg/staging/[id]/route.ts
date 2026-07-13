import { NextRequest, NextResponse } from "next/server";
import { confirmStagingEntry, updateStagingStatus } from "@/lib/trpg/mutations";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action } = (await req.json()) as { action: "confirm" | "discard" };

  if (action === "confirm") {
    const result = await confirmStagingEntry(id);
    return NextResponse.json({ action, ...result });
  }
  if (action === "discard") {
    await updateStagingStatus(id, "已捨棄");
    return NextResponse.json({ action, id });
  }
  return NextResponse.json({ error: "action 不合法" }, { status: 400 });
}
