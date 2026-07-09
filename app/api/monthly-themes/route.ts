import { NextResponse } from "next/server";
import { listMonthlyThemes } from "@/lib/notion/queries";

export async function GET() {
  const themes = await listMonthlyThemes();
  return NextResponse.json({ themes });
}
