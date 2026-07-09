// 語氣指引版本挑選(總綱 v2.5 定案):DB-14 存放多筆「語氣指引 vX」,App 讀取版本最新者。
import type { mapKnowledge } from "@/lib/notion/queries";

type Knowledge = ReturnType<typeof mapKnowledge>;

export function pickLatestToneGuide(candidates: Knowledge[]): Knowledge | null {
  let latest: { version: number; entry: Knowledge } | null = null;
  for (const entry of candidates) {
    const m = entry.標題.match(/語氣指引\s*v(\d+)/i);
    if (!m) continue;
    const version = parseInt(m[1], 10);
    if (!latest || version > latest.version) {
      latest = { version, entry };
    }
  }
  return latest?.entry ?? null;
}
