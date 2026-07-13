import { NextRequest, NextResponse } from "next/server";
import {
  getSave,
  listUnresolvedClues,
  listPendingCanon,
  listAwarenessGaps,
  getChapterName,
  getSceneName,
  getWorldName,
  getCharacterName,
  listClocksForChapter,
  listRecentJudgments,
} from "@/lib/trpg/queries";

// 儀表板一次撈齊:存檔+時鐘+伏筆+待審+知情(委派書 §6.1:單一聚合端點,避免前端連發)。
export async function GET(req: NextRequest) {
  const saveId = req.nextUrl.searchParams.get("saveId");
  if (!saveId) {
    return NextResponse.json({ error: "缺少 saveId" }, { status: 400 });
  }

  const save = await getSave(saveId);
  const [world名, 角色名, 章節名, 場景名, clues, canon, awareness, clocks, recentJudgments] =
    await Promise.all([
      getWorldName(save.所屬世界 ?? ""),
      getCharacterName(save.視角角色 ?? ""),
      getChapterName(save.目前章節 ?? ""),
      getSceneName(save.目前場景 ?? ""),
      listUnresolvedClues(save.所屬世界 ?? undefined),
      listPendingCanon(save.所屬世界 ?? undefined),
      listAwarenessGaps(),
      listClocksForChapter(save.目前章節 ?? undefined),
      listRecentJudgments(5),
    ]);

  const openingPack = [
    `【存檔】${world名 ?? "?"} ${角色名 ?? ""} POV｜${章節名 ?? "?"}・${場景名 ?? "?"}`,
    `【上次收尾】${save.最近摘要 || "(尚無摘要)"}`,
    clocks.length
      ? `【活躍時鐘】${clocks.map((c) => `${c.時鐘名稱} ${c.目前格數}/${c.格數上限}`).join("、")}`
      : null,
    clues.length
      ? `【未回收伏筆】${clues.map((c) => `${c.伏筆名稱}(${c.埋下章節}埋,預計${c.預計回收章節}收)`).join("；")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return NextResponse.json({
    save: { ...save, 世界名稱: world名, 角色名稱: 角色名, 章節名稱: 章節名, 場景名稱: 場景名 },
    clocks,
    unresolvedClues: clues,
    pendingCanon: canon,
    awarenessGaps: awareness,
    recentJudgments,
    openingPack,
  });
}
