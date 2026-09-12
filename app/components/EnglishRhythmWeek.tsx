"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ENGLISH_TOUCH_TYPES,
  addCalendarDays,
  mondayOf,
  taipeiTodayISO,
  type DailyRecord,
  type EnglishTouchType,
} from "@/lib/dojo/formal";

const TOUCH_ORDER: EnglishTouchType[] = ["input", "output", "vocabulary", "transfer"];
const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

async function readDaily(month: string): Promise<DailyRecord[]> {
  const response = await fetch(`/api/dojo/calendar?month=${month}`, { cache: "no-store" });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((json as { error?: string }).error ?? "讀取英文節奏失敗");
  return (json as { daily?: DailyRecord[] }).daily ?? [];
}

export default function EnglishRhythmWeek() {
  const today = useMemo(() => taipeiTodayISO(), []);
  const weekStart = useMemo(() => mondayOf(today), [today]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addCalendarDays(weekStart, index)), [weekStart]);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const months = [...new Set(days.map((day) => day.slice(0, 7)))];
    Promise.all(months.map(readDaily))
      .then((groups) => { if (!cancelled) setRecords(groups.flat()); })
      .catch((caught) => { if (!cancelled) setError(caught instanceof Error ? caught.message : String(caught)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days]);

  const byDate = useMemo(() => new Map(records.map((record) => [record.date, record])), [records]);
  const weekRecords = days.flatMap((day) => byDate.get(day) ? [byDate.get(day)!] : []);
  const touchedDays = weekRecords.filter((record) => record.englishRhythm.touches.length > 0).length;
  const baseDays = weekRecords.filter((record) => record.englishRhythm.touches.length >= 2).length;
  const vocabForgeRounds = weekRecords.reduce((total, record) => total + record.englishRhythm.vocabForgeRounds, 0);
  const counts = Object.fromEntries(TOUCH_ORDER.map((touch) => [
    touch,
    weekRecords.filter((record) => record.englishRhythm.touches.includes(touch)).length,
  ])) as Record<EnglishTouchType, number>;
  const continuation = [...weekRecords].reverse().find((record) => record.englishRhythm.note.trim())?.englishRhythm.note.trim() ?? "";

  return (
    <section className="english-rhythm-week">
      <div className="subsection-title">
        <div><small>日常節奏</small><h4>本週英文節奏</h4></div>
        <Link href="/calendar">看行事曆 →</Link>
      </div>
      {loading ? <p className="muted-note">正在整理這週的英文微觸…</p> : error ? <p className="form-error">{error}</p> : <>
        <div className="english-week-stats">
          <div><b>{touchedDays}<small>/7 天</small></b><span>有接觸</span></div>
          <div><b>{baseDays}<small> 天</small></b><span>達成 2 項</span></div>
          <div><b>{vocabForgeRounds}<small> 輪</small></b><span>VocabForge</span></div>
        </div>
        <div className="english-week-days">
          {days.map((day, index) => {
            const rhythm = byDate.get(day)?.englishRhythm;
            const count = rhythm?.touches.length ?? 0;
            return <div key={day} className={day === today ? "today" : ""}>
              <small>{WEEKDAYS[index]}{index === 3 ? "・休" : ""}</small>
              <b>{count}/4</b>
              <span aria-label={`${count} 項英文微觸`}>{TOUCH_ORDER.map((touch) => <i key={touch} className={rhythm?.touches.includes(touch) ? "on" : ""} />)}</span>
              {(rhythm?.vocabForgeRounds ?? 0) > 0 && <em>VF {rhythm!.vocabForgeRounds}</em>}
            </div>;
          })}
        </div>
        <div className="english-touch-totals">
          {TOUCH_ORDER.map((touch) => <span key={touch}><b>{ENGLISH_TOUCH_TYPES[touch].label}</b>{counts[touch]} 次</span>)}
        </div>
        {continuation && <p className="english-week-continuation"><b>最近留下</b>{continuation}</p>}
      </>}
    </section>
  );
}
