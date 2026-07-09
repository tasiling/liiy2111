"use client";

import { useEffect, useState } from "react";

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

export default function GeneratePage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [themes, setThemes] = useState<MonthlyTheme[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [detailId, setDetailId] = useState("");
  const [monthKey, setMonthKey] = useState(() => new Date().toISOString().slice(0, 7));
  const [prompt, setPrompt] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []));
    fetch("/api/monthly-themes")
      .then((r) => r.json())
      .then((d) => setThemes(d.themes ?? []));
  }, []);

  const selectedSession = sessions.find((s) => s.id === sessionId);

  async function handleSessionChange(newId: string) {
    setSessionId(newId);
    setDetailId("");
    setDetails([]);
    const session = sessions.find((s) => s.id === newId);
    if (newId && session?.模式 === "批次") {
      const res = await fetch(`/api/sessions/${newId}/details`);
      const d = await res.json();
      setDetails(d.details ?? []);
    }
  }

  async function compose() {
    setLoading(true);
    setPrompt(null);
    setMissing(null);
    setCopied(false);
    try {
      const res = await fetch("/api/generate/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          detailId: detailId || undefined,
          monthKey,
        }),
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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">P8 生成工作台 — 階段一・一鍵組稿</h1>
      <p className="text-sm text-zinc-500">
        自動組裝五項輸入(牌卡資料、對應規則現行版、月主題包、語氣指引現行版、輸出格式)成完整提示詞,複製後貼入任何 AI
        對話生成。純讀取,不寫入 Notion,零 API 成本。五項缺一即報錯,不會靜默省略。
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

        {selectedSession?.模式 === "批次" && (
          <label className="flex flex-col gap-1">
            明細(批次 Session 需指定要組哪一天)
            <select
              className="border rounded px-2 py-1 bg-transparent"
              value={detailId}
              onChange={(e) => setDetailId(e.target.value)}
            >
              <option value="">請選擇明細…</option>
              {details.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.明細編號}({d.對應日期}){d.抽出順序 ? ` — ${d.抽出順序}` : "(尚未抽牌)"}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1">
          月主題包
          <select
            className="border rounded px-2 py-1 bg-transparent"
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
          >
            <option value={monthKey}>{monthKey}(當前月,若無對應月主題包會報錯)</option>
            {themes
              .filter((t) => t.月份 !== monthKey)
              .map((t) => (
                <option key={t.id} value={t.月份}>
                  {t.月份} {t.主題名}
                </option>
              ))}
          </select>
        </label>

        <button
          disabled={!sessionId || loading}
          onClick={compose}
          className="self-start px-3 py-1.5 rounded bg-foreground text-background text-sm disabled:opacity-50"
        >
          {loading ? "組裝中…" : "組裝提示詞"}
        </button>
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
    </div>
  );
}
