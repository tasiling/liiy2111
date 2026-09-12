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
const OPTIONAL_TEMPLATE_KEYS = new Set(["journal-translation-1", "cross-date-revisit"]);
const LEGACY_TEMPLATE_KEYS = new Set([
  "topic-select-video",
  "topic-watch-absorb",
  "topic-context-talk",
  "magic-tree-house-read",
  "magic-tree-house-retell",
  "english-context-chat",
  "journal-translation-2",
  "context-room-deep-practice",
  "vocabforge-one-round",
]);

function existingLineTitle(board: WeeklyBoard, templateKey: string, fallback: string) {
  const text = board.cells.find((cell) => cell.learning?.templateKey === templateKey)?.text ?? "";
  const prefix = text.split("｜")[0]?.trim();
  return prefix && prefix !== fallback ? prefix : "";
}

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
  const [topicLine, setTopicLine] = useState(() => existingLineTitle(board, "weekly-topic-understanding", "本週主題"));
  const [materialLine, setMaterialLine] = useState(() => existingLineTitle(board, "independent-material-understanding", "自主素材"));
  const candidates = useMemo(() => englishFocusWeeklyCandidates().map((candidate) => {
    const topic = topicLine.trim() || "本週主題";
    const material = materialLine.trim() || "自主素材";
    if (candidate.templateKey === "weekly-topic-understanding") return { ...candidate, title: `${topic}｜完成素材與三點理解` };
    if (candidate.templateKey === "weekly-topic-expression") return { ...candidate, title: `${topic}｜完成 First＋Second Take` };
    if (candidate.templateKey === "independent-material-understanding") return { ...candidate, title: `${material}｜完成一批理解整理` };
    if (candidate.templateKey === "independent-material-expression") return { ...candidate, title: `${material}｜完成重述與修改` };
    return candidate;
  }), [materialLine, topicLine]);
  const groups = useMemo(() => [...new Set(candidates.map((item) => item.group))], [candidates]);
  const [colors, setColors] = useState<Record<string, DailyTaskCategory>>(() =>
    Object.fromEntries(candidates.map((item) => [item.templateKey, item.defaultCategory]))
  );
  const [open, setOpen] = useState(false);
  const [includedOptional, setIncludedOptional] = useState<Set<string>>(() => new Set(
    board.cells.flatMap((cell) => cell.learning?.trackKey === "english" && OPTIONAL_TEMPLATE_KEYS.has(cell.learning.templateKey)
      ? [cell.learning.templateKey]
      : [])
  ));
  const [error, setError] = useState<string | null>(null);
  const existing = new Set(board.cells.flatMap((cell) => cell.learning?.trackKey === "english" ? [cell.learning.templateKey] : []));
  const coreCandidates = candidates.filter((item) => !OPTIONAL_TEMPLATE_KEYS.has(item.templateKey));
  const selectedCandidates = candidates.filter((item) => !OPTIONAL_TEMPLATE_KEYS.has(item.templateKey) || includedOptional.has(item.templateKey) || existing.has(item.templateKey));
  const missing = selectedCandidates.filter((item) => !existing.has(item.templateKey));
  const existingCoreCount = coreCandidates.filter((item) => existing.has(item.templateKey)).length;
  const optionalExistsCount = [...OPTIONAL_TEMPLATE_KEYS].filter((key) => existing.has(key)).length;
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
    if (missing.some((candidate) => candidate.templateKey.startsWith("weekly-topic-")) && !topicLine.trim()) {
      setError("請先填入本週的課程或 VoiceTube 主題。");
      return;
    }
    if (missing.some((candidate) => candidate.templateKey.startsWith("independent-material-")) && !materialLine.trim()) {
      setError("請先填入本週的自主素材與範圍。");
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
        <span><small>英文修習・只把深度成果放進週盤</small><b>英文修習範本・6＋2 格</b></span>
        <em>{hasLegacyPlan ? "本週保留舊版" : `${existingCoreCount}/6 核心${optionalExistsCount ? `＋${optionalExistsCount} 選配` : ""}`}</em>
      </button>
      {open && (
        <div className="english-week-planner-body">
          <p>每日微觸留在「日常節奏」，不占週盤。這裡把本週主題與自主素材各拆成理解、表達兩個成果，再加上詞彙淬煉與真實轉用；日記自譯、跨日回訪可自由選配。目前階段：{english.english?.weeklyMode === "vocabulary-growth" ? "後三個月・詞彙擴充" : "前三個月・書面習慣建立"}。</p>
          {hasLegacyPlan && <p className="english-template-legacy-note">本週已有舊版英文範本，因此保持原盤面不變。請在下一個空白週套用新版 6＋2。</p>}
          {!hasLegacyPlan && <div className="english-week-lines">
            <label>主題線 A<input className="field" value={topicLine} onChange={(event) => setTopicLine(event.target.value.slice(0, 90))} placeholder="例如：Past Experiences／VoiceTube" /></label>
            <label>素材線 B<input className="field" value={materialLine} onChange={(event) => setMaterialLine(event.target.value.slice(0, 90))} placeholder="例如：Magic Tree House #1 Ch4–6" /></label>
          </div>}
          {groups.map((group) => <section className="english-candidate-group" key={group}>
            <div className="english-candidate-group-heading">
              <h3>{group}</h3>
              {group === "本週選配" && <small>可選 0–2 格</small>}
            </div>
            {candidates.filter((candidate) => candidate.group === group).map((candidate) => (
              <article
                key={candidate.templateKey}
                className={`${existing.has(candidate.templateKey) ? "already-added" : ""} ${OPTIONAL_TEMPLATE_KEYS.has(candidate.templateKey) && !includedOptional.has(candidate.templateKey) && !existing.has(candidate.templateKey) ? "optional-muted" : ""}`}
              >
                <div><b>{candidate.title}</b><small>{candidate.skill} · {candidate.completionCriteria}</small></div>
                {existing.has(candidate.templateKey) ? <span>已在盤面</span> : (
                  <div>
                    {OPTIONAL_TEMPLATE_KEYS.has(candidate.templateKey) && <button
                      type="button"
                      className={`english-optional-toggle ${includedOptional.has(candidate.templateKey) ? "on" : ""}`}
                      aria-pressed={includedOptional.has(candidate.templateKey)}
                      onClick={() => setIncludedOptional((current) => {
                        const next = new Set(current);
                        if (next.has(candidate.templateKey)) next.delete(candidate.templateKey); else next.add(candidate.templateKey);
                        return next;
                      })}
                    >{includedOptional.has(candidate.templateKey) ? "✓ 本週加入" : "本週不加入"}</button>}
                    {(!OPTIONAL_TEMPLATE_KEYS.has(candidate.templateKey) || includedOptional.has(candidate.templateKey)) && <div className="candidate-colors" aria-label={`${candidate.title}的三色分類`}>
                    {CATEGORIES.map((category) => (
                      <button
                        type="button"
                        key={category}
                        className={`${category} ${colors[candidate.templateKey] === category ? "on" : ""}`}
                        onClick={() => setColors((current) => ({ ...current, [candidate.templateKey]: category }))}
                      >{DAILY_TASK_CATEGORIES[category].label.replace(/^一件/, "")}</button>
                    ))}
                    </div>}
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
            ) : !hasLegacyPlan ? <p className="save-notice">本週六個核心格已放入{optionalExistsCount ? `，另有 ${optionalExistsCount} 個選配。` : "。"}</p> : null}
            {existingIndexes.length > 0 && <button type="button" className="remove" disabled={disabled} onClick={() => void removeEnglishPlan()}>從本週移除 {existingIndexes.length} 格</button>}
          </div>
        </div>
      )}
    </section>
  );
}
