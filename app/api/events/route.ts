import { NextResponse } from "next/server";
import { listActiveEvents } from "@/lib/notion/queries";

export async function GET() {
  const events = await listActiveEvents();
  return NextResponse.json({ events });
}
