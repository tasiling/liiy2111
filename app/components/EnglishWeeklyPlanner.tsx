"use client";

import { useMemo, useState } from "react";
import {
  DAILY_TASK_CATEGORIES,
  type DailyTaskCategory,
  type WeeklyBoard,
} from "@/lib/dojo/formal";
import {
  englishFocusWeeklyCandidates,
  type LearningTrackRecord,
} from "@/lib/dojo/learning";

const CATEGORIES: DailyTaskCategory[] = ["important", "hobby", "health"];
const OPTIONAL_TEMPLATE_KEY = "journal-translation-1";
const LEGACY_TEMPLATE_KEYS = new Set([
  "topic-select-video",
  "topic-watch-absorb",
  "topic-context-talk",
  "magic-tree-house-read",
  "magic-tree-house-retell",
  "english-context-chat",
  "journal-translation-2",
]);

export default function EnglishWeeklyPlanner({
  board,
  english,
  disabled,
  onApply,
  onRemove,
}: {
  board: WeeklyBoard;
  english: LearningTrackRecord;
  disabled: boolean;
  onApply: (board: WeeklyBoard) => Promise<void>;
  onRemove: (indexes: number[], label: string) => Promise<void>;
}) {
  const candidates = useMemo(() => englishFocusWeeklyCandidates(), []);
  const groups = useMemo(() => [...new Set(candidates.map((item) => item.group))], [candidates]);
  const [colors, setColors] = useState<Record<string, DailyTaskCategory>>(() =>
    Object.fromEntries(candidates.map((item) => [item.templateKey, item.defaultCategory]))
  );
  const [open, setOpen] = useState(false);
  const [includeOptional, setIncludeOptional] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const existing = new Set(board.cells.flatMap((cell) => cell.learning?.trackKey === "english" ? [cell.learning.templateKey] : []));
  const coreCandidates = candidates.filter((item) => item.templateKey !== OPTIONAL_TEMPLATE_KEY);
  const optionalCandidate = candidates.find((item) => item.templateKey === OPTIONAL_TEMPLATE_KEY) ?? null;
  const selectedCandidates = candidates.filter((item) => item.templateKey !== OPTIONAL_TEMPLATE_KEY || includeOptional || existing.has(item.templateKey));
  const missing = selectedCandidates.filter((item) => !existing.has(item.templateKey));
  const existingCoreCount = coreCandidates.filter((item) => existing.has(item.templateKey)).length;
  const optionalExists = existing.has(OPTIONAL_TEMPLATE_KEY);
  const hasLegacyPlan = board.cells.some((cell) => cell.learning?.trackKey === "english" && LEGACY_TEMPLATE_KEYS.has(cell.learning.templateKey));
  const existingIndexes = board.cells.flatMap((cell) =>
    cell.learning?.trackKey === "english" &&
    (candidates.some((candidate) => candidate.templateKey === cell.learning?.templateKey) || LEGACY_TEMPLATE_KEYS.has(cell.learning.templateKey))
      ? [cell.index]
      : []
  );

  async function apply() {
    if (hasLegacyPlan) {
      setError("本週仍保留舊版 10 格，不會自動混入新版。請切換到下週空白盤面再套用新版範本。");
      return;
    }
    const empty = board.cells.filter((cell) => cell.index !== 12 && !cell.text.trim());
    if (empty.length < missing.length) {
      setError(`還需要 ${missing.length} 個空格，目前只剩 ${empty.length} 格。`);
      return;
    }
    const byIndex = new Map(empty.slice(0, missing.length).map((cell, index) => [cell.index, missing[index]]));
    const next: WeeklyBoard = {
      ...board,
      version: 2,
      colorsConfirmedAt: null,
      rules: { planningDay: 0, crossColorLines: true, minimumLineColors: 2 },
      cells: board.cells.map((cell) => {
        const candidate = byIndex.get(cell.index);
        if (!candidate) return cell;
        return {
          ...cell,
          text: candidate.title,
          shortLabel: candidate.shortTitle,
          category: colors[candidate.templateKey] ?? candidate.defaultCategory,
          sourceType: "learning",
          sourceId: "english",
          learning: {
            trackKey: "english",
            templateKey: candidate.templateKey,
            skill: candidate.skill,
            path: candidate.path,
            practiceType: candidate.practiceType,
          },
          completion: {
            mode: candidate.completionMode,
            target: candidate.target,
            progress: 0,
            unit: candidate.unit,
            requiresEvidence: candidate.requiresEvidence,
            criteria: candidate.completionCriteria,
          },
          evidenceNote: "",
          completed: false,
          completedAt: null,
        };
      }),
    };
    setError(null);
    try {
      await onApply(next);
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "加入週盤時發生錯誤");
    }
  }

  async function removeEnglishPlan() {
    if (!existingIndexes.length) return;
    const confirmed = window.confirm(`確定從本週移除已加入的 ${existingIndexes.length} 個英文修習格嗎？已排入今天或已完成的紀錄會保留。`);
    if (!confirmed) return;
    setError(null);
    try {
      await onRemove(existingIndexes, "英文深度修習範本");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "移除英文修習格時發生錯誤");
    }
  }

  return (
    <section className="ritual-card english-week-planner">
      <button type="button" className="english-week-planner-head" onClick={() => setOpen((value) => !value)}>
        <span><small>英文修習・只把深度成果放進週盤</small><b>英文修習範本・3＋1 格</b></span>
        <em>{hasLegacyPlan ? "本週為舊版 10 格" : `${existingCoreCount}/3 核心${optionalExists ? "＋選配" : ""}`}</em>
      </button>
      {open && (
        <div className="english-week-planner-body">
          <p>每日看片、閱讀幾頁、口說 2–3 句或 VocabForge 5 張都留在「日常節奏」，不占週盤。週盤只保留語境修習、詞彙淬煉與真實轉用三個核心成果；日記自譯依本週負擔選配。目前階段：{english.english?.weeklyMode === "vocabulary-growth" ? "後三個月・詞彙擴充" : "前三個月・書面習慣建立"}。</p>
          {hasLegacyPlan && <p className="english-template-legacy-note">本週已套用舊版 10 格，因此保持原盤面不變。下週切換到空白週盤時，就可以直接使用新版 3＋1 格。</p>}
          {groups.map((group) => <section className="english-candidate-group" key={group}>
            <div className="english-candidate-group-heading">
              <h3>{group}</h3>
              {group === "本週選配" && optionalCandidate && !optionalExists && (
                <button
                  type="button"
                  className={includeOptional ? "on" : ""}
                  aria-pressed={includeOptional}
                  onClick={() => setIncludeOptional((value) => !value)}
                >
                  {includeOptional ? "✓ 本週加入" : "本週不加入"}
                </button>
              )}
            </div>
            {candidates.filter((candidate) => candidate.group === group).map((candidate) => (
              <article
                key={candidate.templateKey}
                className={`${existing.has(candidate.templateKey) ? "already-added" : ""} ${candidate.templateKey === OPTIONAL_TEMPLATE_KEY && !includeOptional && !optionalExists ? "optional-muted" : ""}`}
              >
                <div><b>{candidate.title}</b><small>{candidate.skill} · {candidate.completionCriteria}</small></div>
                {existing.has(candidate.templateKey) ? <span>已在盤面</span> : (
                  <div className="candidate-colors" aria-label={`${candidate.title}的三色分類`}>
                    {CATEGORIES.map((category) => (
                      <button
                        type="button"
                        key={category}
                        className={`${category} ${colors[candidate.templateKey] === category ? "on" : ""}`}
                        onClick={() => setColors((current) => ({ ...current, [candidate.templateKey]: category }))}
                      >{DAILY_TASK_CATEGORIES[category].label.replace(/^一件/, "")}</button>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </section>)}
          {error && <p className="form-error">{error}</p>}
          <div className="english-week-actions">
            {!hasLegacyPlan && missing.length > 0 ? (
              <button type="button" className="primary english-week-apply" disabled={disabled} onClick={() => void apply()}>
                加入尚未放入的 {missing.length} 格
              </button>
            ) : !hasLegacyPlan ? <p className="save-notice">本週英文核心格已放入{optionalExists ? "，日記自譯也已選配。" : "。"}</p> : null}
            {existingIndexes.length > 0 && <button type="button" className="remove" disabled={disabled} onClick={() => void removeEnglishPlan()}>從本週移除 {existingIndexes.length} 格</button>}
          </div>
        </div>
      )}
    </section>
  );
}
