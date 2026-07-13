import { NextResponse } from "next/server";
import { listSaves, listWorlds, listCharacters, listChapters, listScenes } from "@/lib/trpg/queries";
import {
  JUDGMENT_TYPE,
  POSITION,
  EFFECT,
  BEHAVIOR_TAGS,
  MORAL_TAGS,
} from "@/lib/trpg/schema";

// 下拉選單資料(世界/角色/章節/場景/存檔),供判定台情境列選擇器使用。
export async function GET() {
  const [saves, worlds, characters, chapters, scenes] = await Promise.all([
    listSaves(),
    listWorlds(),
    listCharacters(),
    listChapters(),
    listScenes(),
  ]);

  return NextResponse.json({
    saves,
    worlds,
    characters,
    chapters,
    scenes,
    judgeTypes: JUDGMENT_TYPE,
    positions: POSITION,
    effects: EFFECT,
    behaviorTags: BEHAVIOR_TAGS,
    moralTags: MORAL_TAGS,
  });
}
