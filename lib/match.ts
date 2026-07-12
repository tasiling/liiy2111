// P3 生產日工作台:能量關鍵字/主題標籤比對純函式(擁有者 2026-07-12 裁決定案)。
// 規則:交集≥1 即列入(委派書「命中任一」定案),只列清單附命中標籤,不加推薦分數、
// 不自動組合(A 方案)。這裡不碰 Notion,只做記憶體內比對,方便獨立驗證。

export type ServiceAtom = {
  id: string;
  原子項名稱: string;
  狀態: string | null;
  能量屬性標籤: string[];
  可組合性: string;
  價格: number | null;
};

export type KnowledgeEntry = {
  id: string;
  標題: string;
  狀態: string | null;
  主題標籤: string[];
};

export type AtomMatch = { atom: ServiceAtom; hitCount: number; hitTagIds: string[] };
export type KnowledgeMatch = { entry: KnowledgeEntry; hitCount: number; hitTagIds: string[] };

function hitTags(itemTagIds: string[], keywordIds: string[]): string[] {
  const keySet = new Set(keywordIds);
  return itemTagIds.filter((id) => keySet.has(id));
}

// DB-11 服務原子庫比對(委派書第 2 步支援):只列狀態=啟用者(呼叫端先過濾),
// 交集≥1 即列入,依命中標籤數多寡排序,同數依原子項名稱排序。
export function matchServiceAtoms(keywordIds: string[], atoms: ServiceAtom[]): AtomMatch[] {
  return atoms
    .map((atom) => {
      const hitTagIds = hitTags(atom.能量屬性標籤, keywordIds);
      return { atom, hitCount: hitTagIds.length, hitTagIds };
    })
    .filter((m) => m.hitCount >= 1)
    .sort((a, b) => b.hitCount - a.hitCount || a.atom.原子項名稱.localeCompare(b.atom.原子項名稱));
}

// DB-14 知識庫比對(委派書第 3 步支援):同交集規則,狀態=存貨者置頂,
// 其餘(已排入/已發布)排在後面,兩層內都依命中標籤數→標題排序。
export function matchKnowledgeEntries(keywordIds: string[], entries: KnowledgeEntry[]): KnowledgeMatch[] {
  return entries
    .map((entry) => {
      const hitTagIds = hitTags(entry.主題標籤, keywordIds);
      return { entry, hitCount: hitTagIds.length, hitTagIds };
    })
    .filter((m) => m.hitCount >= 1)
    .sort((a, b) => {
      const aTier = a.entry.狀態 === "存貨" ? 0 : 1;
      const bTier = b.entry.狀態 === "存貨" ? 0 : 1;
      if (aTier !== bTier) return aTier - bTier;
      if (b.hitCount !== a.hitCount) return b.hitCount - a.hitCount;
      return a.entry.標題.localeCompare(b.entry.標題);
    });
}
