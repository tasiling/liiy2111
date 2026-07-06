import { NextRequest, NextResponse } from "next/server";
import { getEvent, listNodesForEvent, listSlotsForEvent } from "@/lib/notion/queries";
import { expandSequence, isWithinRollingWindow, type SequenceNode } from "@/lib/date";

// P2 序列展開引擎(預覽):讀 DB-06/07/15,依錨點計算實際日期,不寫入 Notion。
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { eventId, singleDate } = body as { eventId: string; singleDate?: string };

  if (!eventId) {
    return NextResponse.json({ error: "缺少 eventId" }, { status: 400 });
  }

  const [event, nodes] = await Promise.all([getEvent(eventId), listNodesForEvent(eventId)]);

  if (!event.事件型態) {
    return NextResponse.json({ error: "此事件缺少「事件型態」設定,無法展開" }, { status: 400 });
  }

  let sessionDates: Date[];
  if (event.事件型態 === "單日") {
    if (!singleDate) {
      return NextResponse.json({ error: "單日事件需提供 singleDate" }, { status: 400 });
    }
    sessionDates = [new Date(singleDate)];
  } else {
    const slots = await listSlotsForEvent(eventId);
    const withDates = slots.filter((s): s is typeof s & { 日期: string } => !!s.日期);
    if (withDates.length === 0) {
      return NextResponse.json(
        { error: "此多日事件在 DB-15 場次表尚無任何已排定日期的場次" },
        { status: 400 }
      );
    }
    sessionDates = withDates
      .sort((a, b) => a.日期.localeCompare(b.日期))
      .map((s) => new Date(s.日期));
  }

  const nodesForEngine: SequenceNode[] = nodes
    .filter((n): n is typeof n & { 錨點: "首場" | "每場" | "末場" } => !!n.錨點 && !!n.相對天數)
    .map((n) => ({ ...n }));

  let expanded;
  try {
    expanded = expandSequence(nodesForEngine, sessionDates);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "展開計算失敗" },
      { status: 400 }
    );
  }

  const today = new Date();
  const tasks = expanded
    .map((t) => ({
      ...t,
      節點編號: t.節點.節點編號,
      內容類型: t.節點.內容類型,
      目的: t.節點.目的,
      發布平台: t.節點.發布平台,
      在滾動窗口內: isWithinRollingWindow(new Date(t.日期), today),
    }))
    .sort((a, b) => a.日期.localeCompare(b.日期));

  return NextResponse.json({ event, tasks });
}
