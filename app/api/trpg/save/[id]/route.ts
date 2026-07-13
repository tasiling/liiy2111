import { NextRequest, NextResponse } from "next/server";
import { updateSave } from "@/lib/trpg/mutations";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const result = await updateSave(id, body);
  return NextResponse.json(result);
}
