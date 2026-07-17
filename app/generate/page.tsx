"use client";

import { useMemo, useState, useEffect } from "react";
import { buildP8ZeroSection, type ServiceDivinationChoice } from "@/lib/generate/p8zero";
import { SEVEN_METHODS } from "@/lib/notion/schema";
import { pageLabel } from "@/lib/labels";

type ServiceDivinationEntry = ServiceDivinationChoice & { id: string };

type SessionRow = {
  id: string;
  Session編號: string;
  狀態: string | null;
  模式: string | null;
  項目用途: string | null;
};

type DetailRow = {
  id: string;
  明細編號: string;
  對應日期: string | null;
  抽出順序: string;
};

type MonthlyTheme = { id: string; 月份: string; 主題名: string };

type SharedContext = {
  規則代碼: string;
  牌位定義: string;
  解讀邏輯: string;
  輸出格式: string;
  theme: { 月份: string; 主題名: string; 深度討論題目: string; 每日互動方向: string; 當月三款主題服務: string } | null;
  語氣指引標題: string;
  語氣指引內容: string;
};

type DetailCardResult =
  | { ok: true; 明細編號: string; 對應日期: string | null; cardsSection: string }
  | { ok: false; 明細編號: string; 對應日期: string | null; missing: string[] };

function buildSharedFooter(ctx: SharedContext): string[] {
  const themeSection = ctx.theme
    ? [
        "",
        `【本月主題包(${ctx.theme.月份}${ctx.theme.主題名 ? " " + ctx.theme.主題名 : ""})】`,
        `深度討論題目:${ctx.theme.深度討論題目}`,
        `每日互動方向:${ctx.theme.每日互動方向}`,
        `當月三款主題服務:${ctx.theme.當月三款主題服務}`,
      ]
    : [];
  return [
    "",
    `【解讀規則(${ctx.規則代碼},現行版)】`,
    `牌位定義:${ctx.牌位定義}`,
    `解讀邏輯:${ctx.解讀邏輯}`,
    ...themeSection,
    "",
    `【語氣指引(${ctx.語氣指引標題})】`,
    ctx.語氣指引內容,
    "",
    "【輸出格式】",
    ctx.輸出格式,
  ];
}

export default function GeneratePage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [themes, setThemes] = useState<MonthlyTheme[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [detailId, setDetailId] = useState("");
  const [monthKey, setMonthKey] = useState(() => new Date().toISOString().slice(0, 7));

  // 單篇組稿(模式=單筆)
  const [prompt, setPrompt] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // 批次組稿(模式=批次,v1.5 補丁)
  const [batchMode, setBatchMode] = useState<"甲" | "乙">("甲");
  const [batchMissing, setBatchMissing] = useState<string[] | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  const [sharedContext, setSharedContext] = useState<SharedContext | null>(null);
  const [batchResults, setBatchResults] = useState<DetailCardResult[] | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // P8-0 組稿選項表單(委派書 v1.6):封面 + 維度/方法(僅心理測驗) + 備註。
  // 這裡的值只組進提示詞,不寫入任何資料庫。
  const [coverText, setCoverText] = useState("");
  const [coverCanvaCode, setCoverCanvaCode] = useState("");
  const [note, setNote] = useState("");
  const [sdCandidates, setSdCandidates] = useState<ServiceDivinationEntry[]>([]);
  const [selectedSdId, setSelectedSdId] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []));
    fetch("/api/monthly-themes")
      .then((r) => r.json())
      .then((d) => setThemes(d.themes ?? []));
  }, []);

  const selectedSession = sessions.find((s) => s.id === sessionId);
  const isBatch = selectedSession?.模式 === "批次";
  const isPsychTest = selectedSession?.項目用途 === "心理測驗";
  const selectedSd = sdCandidates.find((c) => c.id === selectedSdId) ?? null;
  const p8zero = useMemo(
    () => ({
      coverText: coverText || undefined,
      coverCanvaCode: coverCanvaCode || undefined,
      note: note || undefined,
      serviceDivination: selectedSd
        ? { ...selectedSd, 方法: selectedMethod || selectedSd.方法 }
        : null,
    }),
    [coverText, coverCanvaCode, note, selectedSd, selectedMethod]
  );

  async function handleSessionChange(newId: string) {
    setSessionId(newId);
    setDetailId("");
    setDetails([]);
    setPrompt(null);
    setMissing(null);
    setSharedContext(null);
    setBatchResults(null);
    setBatchMissing(null);
    setSelectedSdId("");
    setSelectedMethod("");
    const session = sessions.find((s) => s.id === newId);
    if (newId && session?.模式 === "批次") {
      const res = await fetch(`/api/sessions/${newId}/details`);
      const d = await res.json();
      setDetails(d.details ?? []);
    }
    if (newId && session?.項目用途 === "心理測驗" && sdCandidates.length === 0) {
      const res = await fetch("/api/generate/service-divination");
      const d = await res.json();
      setSdCandidates(d.candidates ?? []);
    }
  }

  async function composeSingle() {
    setLoading(true);
    setPrompt(null);
    setMissing(null);
    setCopied(false);
    try {
      const res = await fetch("/api/generate/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, detailId: detailId || undefined, monthKey, p8zero }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMissing(data.missing ?? [data.error ?? "組稿失敗"]);
        return;
      }
      setPrompt(data.prompt);
    } finally {
      setLoading(false);
    }
  }

  async function copyPrompt() {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
  }

  async function runBatchCompose() {
    setBatchLoading(true);
    setBatchMissing(null);
    setSharedContext(null);
    setBatchResults(null);
    setBatchProgress({ done: 0, total: details.length });
    try {
      const ctxRes = await fetch("/api/generate/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, monthKey }),
      });
      const ctxData = await ctxRes.json();
      if (!ctxRes.ok || !ctxData.ok) {
        setBatchMissing(ctxData.missing ?? [ctxData.error ?? "組稿失敗"]);
        return;
      }
      setSharedContext(ctxData);

      // 逐筆取牌卡資料(遵守速率限制,同時讓使用者看到「第 N/M 筆」進度)。
      const results: DetailCardResult[] = [];
      for (const d of details) {
        const r = await fetch(`/api/generate/detail-cards?detailId=${d.id}`);
        const data = await r.json();
        results.push(data);
        setBatchProgress({ done: results.length, total: details.length });
      }
      setBatchResults(results);
    } finally {
      setBatchLoading(false);
    }
  }

  const successResults = useMemo(
    () => (batchResults ?? []).filter((r): r is Extract<DetailCardResult, { ok: true }> => r.ok),
    [batchResults]
  );
  const failedResults = useMemo(
    () => (batchResults ?? []).filter((r): r is Extract<DetailCardResult, { ok: false }> => !r.ok),
    [batchResults]
  );

  const combinedPrompt = useMemo(() => {
    if (!sharedContext || successResults.length === 0) return null;
    return [
      `【本批任務:共 ${successResults.length} 篇】`,
      ...successResults.flatMap((r) => [`日期:${r.對應日期}`, r.cardsSection, ""]),
      ...buildSharedFooter(sharedContext),
      ...buildP8ZeroSection(p8zero),
      "",
      `請依上列 ${successResults.length} 個日期分別產出 ${successResults.length} 篇,每篇獨立完整,依輸出格式分頁。`,
    ].join("\n");
  }, [sharedContext, successResults, p8zero]);

  const separatePrompts = useMemo(() => {
    if (!sharedContext) return [];
    return successResults.map((r) => ({
      label: `${r.對應日期}`,
      prompt: [
        `【${r.對應日期}】`,
        "",
        "【牌卡資料】",
        r.cardsSection,
        ...buildSharedFooter(sharedContext),
        ...buildP8ZeroSection(p8zero),
      ].join("\n"),
    }));
  }, [sharedContext, successResults, p8zero]);

  async function copyText(text: string, idx: number) {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">{pageLabel("P8")} — 階段一・一鍵組稿</h1>
      <p className="text-sm text-zinc-500">
        自動組裝五項輸入(牌卡資料、對應規則現行版、月主題包、語氣指引現行版、輸出格式)成完整提示詞,複製後貼入任何 AI
        對話生成。純讀取,不寫入 Notion,零 API 成本。缺一律報錯,不會靜默省略。
      </p>

      <section className="border border-black/10 dark:border-white/15 rounded-lg p-4 flex flex-col gap-3 text-sm">
        <label className="flex flex-col gap-1">
          Session
          <select
            className="border rounded px-2 py-1 bg-transparent"
            value={sessionId}
            onChange={(e) => handleSessionChange(e.target.value)}
          >
            <option value="">請選擇 Session…</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.Session編號}({s.項目用途 ?? "未設項目用途"}・{s.模式}・{s.狀態})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          月主題包
          <select
            className="border rounded px-2 py-1 bg-transparent"
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
          >
            <option value={monthKey}>{monthKey}(當前月,若無對應月主題包且非大眾占卜會報錯)</option>
            {themes
              .filter((t) => t.月份 !== monthKey)
              .map((t) => (
                <option key={t.id} value={t.月份}>
                  {t.月份} {t.主題名}
                </option>
              ))}
          </select>
        </label>

        {sessionId && (
          <div className="border border-black/10 dark:border-white/15 rounded-lg p-3 flex flex-col gap-2">
            <span className="text-xs font-medium text-zinc-500">P8-0 組稿選項(只組進提示詞,不寫入 Notion)</span>
            <div className="flex flex-wrap gap-2">
              <label className="flex flex-col gap-1 flex-1 min-w-40">
                封面文字描述(選填)
                <input
                  className="border rounded px-2 py-1 bg-transparent"
                  value={coverText}
                  onChange={(e) => setCoverText(e.target.value)}
                  placeholder="留空則提示詞明示「封面未指定」"
                />
              </label>
              <label className="flex flex-col gap-1 flex-1 min-w-40">
                封面 Canva 模板編號(選填)
                <input
                  className="border rounded px-2 py-1 bg-transparent"
                  value={coverCanvaCode}
                  onChange={(e) => setCoverCanvaCode(e.target.value)}
                />
              </label>
            </div>

            {isPsychTest && (
              <div className="flex flex-wrap gap-2 items-end">
                <label className="flex flex-col gap-1 flex-1 min-w-48">
                  維度/方法(心理測驗候選服務,App 只列清單不代選)
                  <select
                    className="border rounded px-2 py-1 bg-transparent"
                    value={selectedSdId}
                    onChange={(e) => {
                      setSelectedSdId(e.target.value);
                      setSelectedMethod("");
                    }}
                  >
                    <option value="">
                      {sdCandidates.length === 0 ? "目前沒有已核可的候選服務" : "請選擇服務…"}
                    </option>
                    {sdCandidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.標題}(主維度:{c.主維度.join("、")})
                      </option>
                    ))}
                  </select>
                </label>
                {selectedSd && (
                  <label className="flex flex-col gap-1">
                    方法(預設值可換)
                    <select
                      className="border rounded px-2 py-1 bg-transparent"
                      value={selectedMethod || selectedSd.方法}
                      onChange={(e) => setSelectedMethod(e.target.value)}
                    >
                      {SEVEN_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}

            <label className="flex flex-col gap-1">
              其他臨場備註(選填,一行)
              <input
                className="border rounded px-2 py-1 bg-transparent"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </div>
        )}

        {!isBatch && (
          <>
            {sessionId && (
              <label className="flex flex-col gap-1">
                明細(單筆 Session 只有一筆,自動取用;此欄僅供確認)
                <select
                  className="border rounded px-2 py-1 bg-transparent"
                  value={detailId}
                  onChange={(e) => setDetailId(e.target.value)}
                >
                  <option value="">自動取用唯一明細</option>
                  {details.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.明細編號}({d.對應日期}){d.抽出順序 ? ` — ${d.抽出順序}` : "(尚未抽牌)"}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              disabled={!sessionId || loading}
              onClick={composeSingle}
              className="self-start px-3 py-1.5 rounded bg-foreground text-background text-sm disabled:opacity-50"
            >
              {loading ? "組裝中…" : "組裝提示詞"}
            </button>
          </>
        )}

        {isBatch && (
          <>
            <div className="flex items-center gap-3">
              <span>組稿模式:</span>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={batchMode === "甲"}
                  onChange={() => setBatchMode("甲")}
                />
                模式甲・整批一稿(同規則批次預設)
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={batchMode === "乙"}
                  onChange={() => setBatchMode("乙")}
                />
                模式乙・逐篇分稿
              </label>
            </div>
            <button
              disabled={!sessionId || batchLoading || details.length === 0}
              onClick={runBatchCompose}
              className="self-start px-3 py-1.5 rounded bg-foreground text-background text-sm disabled:opacity-50"
            >
              {batchLoading
                ? `讀取中…(${batchProgress?.done ?? 0}/${batchProgress?.total ?? details.length})`
                : `開始批次組稿(共 ${details.length} 筆明細)`}
            </button>
          </>
        )}
      </section>

      {missing && (
        <section className="border border-red-300 dark:border-red-800 rounded-lg p-4 text-sm">
          <h2 className="font-medium mb-2 text-red-700 dark:text-red-400">缺少以下項目,無法組稿:</h2>
          <ul className="list-disc list-inside text-red-700 dark:text-red-400">
            {missing.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </section>
      )}

      {prompt && (
        <section className="border border-black/10 dark:border-white/15 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium">組好的提示詞</h2>
            <button
              onClick={copyPrompt}
              className="px-3 py-1 rounded border border-black/15 dark:border-white/20 text-xs"
            >
              {copied ? "已複製" : "複製"}
            </button>
          </div>
          <textarea
            readOnly
            value={prompt}
            className="w-full h-96 text-xs font-mono border rounded p-2 bg-transparent"
          />
        </section>
      )}

      {batchMissing && (
        <section className="border border-red-300 dark:border-red-800 rounded-lg p-4 text-sm">
          <h2 className="font-medium mb-2 text-red-700 dark:text-red-400">缺少以下項目,無法批次組稿:</h2>
          <ul className="list-disc list-inside text-red-700 dark:text-red-400">
            {batchMissing.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </section>
      )}

      {failedResults.length > 0 && (
        <section className="border border-orange-300 dark:border-orange-800 rounded-lg p-4 text-sm">
          <h2 className="font-medium mb-2 text-orange-700 dark:text-orange-400">
            以下 {failedResults.length} 筆未能取得牌卡資料,不列入本次提示詞:
          </h2>
          <ul className="list-disc list-inside text-orange-700 dark:text-orange-400">
            {failedResults.map((r) => (
              <li key={r.明細編號}>
                {r.明細編號}({r.對應日期}):{r.missing.join("、")}
              </li>
            ))}
          </ul>
        </section>
      )}

      {sharedContext && batchMode === "甲" && combinedPrompt && (
        <section className="border border-black/10 dark:border-white/15 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium">整批一稿(共 {successResults.length} 篇)</h2>
            <button
              onClick={() => copyText(combinedPrompt, -1)}
              className="px-3 py-1 rounded border border-black/15 dark:border-white/20 text-xs"
            >
              {copiedIdx === -1 ? "已複製" : "複製"}
            </button>
          </div>
          <textarea
            readOnly
            value={combinedPrompt}
            className="w-full h-96 text-xs font-mono border rounded p-2 bg-transparent"
          />
        </section>
      )}

      {sharedContext && batchMode === "乙" && separatePrompts.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium text-sm">逐篇分稿(共 {separatePrompts.length} 篇,各自獨立複製)</h2>
          {separatePrompts.map((p, i) => (
            <details key={i} className="border border-black/10 dark:border-white/15 rounded-lg p-4">
              <summary className="flex items-center justify-between cursor-pointer">
                <span className="font-medium text-sm">{p.label}</span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    copyText(p.prompt, i);
                  }}
                  className="px-3 py-1 rounded border border-black/15 dark:border-white/20 text-xs"
                >
                  {copiedIdx === i ? "已複製" : "複製"}
                </button>
              </summary>
              <textarea
                readOnly
                value={p.prompt}
                className="w-full h-72 text-xs font-mono border rounded p-2 mt-2 bg-transparent"
              />
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
