import { NextRequest, NextResponse } from "next/server";
import { captureImageUrl } from "@/lib/dojo/captureStore";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: RouteContext<"/api/dojo/captures/[id]/images/[blockId]">
) {
  try {
    const { id, blockId } = await context.params;
    const url = await captureImageUrl(id, blockId);
    return NextResponse.redirect(url, { status: 307 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 404 }
    );
  }
}
