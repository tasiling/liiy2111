import { NextRequest, NextResponse } from "next/server";
import { createSessionLog, updateSave } from "@/lib/trpg/mutations";
import { getSave } from "@/lib/trpg/queries";

// 結算精靈:寫入遊玩日誌 + 更新 POV進度表(步驟 1-3),時鐘/伏筆由時鐘面板另行處理(步驟 4)。
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    saveId,
    title,
    fullText,
    summary,
    nextOpeningHint,
    playDateISO,
    minutesPlayed,
    currentChapterId,
    currentSceneId,
    completedChapterIds,
    completedSceneIds,
  } = body as {
    saveId: string;
    title: string;
    fullText: string;
    summary: string;
    nextOpeningHint: string;
    playDateISO: string;
    minutesPlayed: number;
    currentChapterId?: string;
    currentSceneId?: string;
    completedChapterIds?: string[];
    completedSceneIds?: string[];
  };

  if (!saveId || !title || !fullText) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  const save = await getSave(saveId);

  const log = await createSessionLog({
    worldId: save.所屬世界 ?? undefined,
    title,
    fullTextBlocks: fullText.split(/\n{2,}/),
    summary,
    nextOpeningHint,
    playDateISO,
  });

  await updateSave(saveId, {
    最近摘要: summary,
    累積遊玩時長增量: minutesPlayed,
    目前章節: currentChapterId,
    目前場景: currentSceneId,
    已完成章節新增: completedChapterIds,
    已完成場景新增: completedSceneIds,
  });

  return NextResponse.json({ logId: log.id });
}
