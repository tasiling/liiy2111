import { NextResponse } from "next/server";
import { listDecks } from "@/lib/notion/queries";

export async function GET() {
  const decks = await listDecks();
  return NextResponse.json({ decks });
}
