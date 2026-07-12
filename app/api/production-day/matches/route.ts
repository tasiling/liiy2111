import { NextRequest, NextResponse } from "next/server";
import {
  getMonthlyThemeByMonth,
  listActiveServiceAtoms,
  listAllKnowledgeEntries,
  listAllTags,
} from "@/lib/notion/queries";
import { matchServiceAtoms, matchKnowledgeEntries, type AtomMatch, type KnowledgeMatch } from "@/lib/match";

// P3 生產日工作台第 2/3 步支援:依月主題包「能量關鍵字」比對 DB-11 服務原子庫、
// DB-14 知識庫。只列清單附命中標籤,不加推薦分數、不自動組合(擁有者 2026-07-12 定案)。
export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);

  const [theme, atoms, knowledgeEntries, tags] = await Promise.all([
    getMonthlyThemeByMonth(month),
    listActiveServiceAtoms(),
    listAllKnowledgeEntries(),
    listAllTags(),
  ]);

  const tagNameById = new Map(tags.map((t) => [t.id, t.標籤名]));
  const keywordIds = theme?.能量關鍵字 ?? [];
  const keywordNames = keywordIds.map((id) => tagNameById.get(id) ?? id);

  // 月主題包未設關鍵字(或該月根本沒有月主題包紀錄):明確提示,不 fallback 列全部。
  if (keywordIds.length === 0) {
    return NextResponse.json({
      month,
      keywordNames: [],
      atoms: { state: "no-keywords" as const, matches: [] },
      knowledge: { state: "no-keywords" as const, matches: [] },
    });
  }

  const atomMatches = matchServiceAtoms(keywordIds, atoms);
  const knowledgeMatches = matchKnowledgeEntries(keywordIds, knowledgeEntries);

  function serializeAtom(m: AtomMatch) {
    return {
      id: m.atom.id,
      原子項名稱: m.atom.原子項名稱,
      可組合性: m.atom.可組合性,
      價格: m.atom.價格,
      hitCount: m.hitCount,
      hitTags: m.hitTagIds.map((id) => tagNameById.get(id) ?? id),
    };
  }
  function serializeKnowledge(m: KnowledgeMatch) {
    return {
      id: m.entry.id,
      標題: m.entry.標題,
      狀態: m.entry.狀態,
      hitCount: m.hitCount,
      hitTags: m.hitTagIds.map((id) => tagNameById.get(id) ?? id),
    };
  }

  return NextResponse.json({
    month,
    keywordNames,
    atoms: {
      // DB-11 目前為空是已知狀態(建檔工作單在擁有者手上),與「有資料但沒比對到」分開顯示。
      state: atoms.length === 0 ? ("empty-source" as const) : atomMatches.length === 0 ? ("no-matches" as const) : ("ok" as const),
      matches: atomMatches.map(serializeAtom),
    },
    knowledge: {
      state:
        knowledgeEntries.length === 0
          ? ("empty-source" as const)
          : knowledgeMatches.length === 0
            ? ("no-matches" as const)
            : ("ok" as const),
      matches: knowledgeMatches.map(serializeKnowledge),
    },
  });
}
