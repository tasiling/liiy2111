import { NextResponse } from "next/server";
import { listPendingStaging } from "@/lib/trpg/queries";

export async function GET() {
  const items = await listPendingStaging();
  return NextResponse.json({ items });
}
