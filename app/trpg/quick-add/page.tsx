"use client";

import { useEffect, useMemo, useState } from "react";

const TARGET_TYPES = ["角色", "事件", "地點", "世界觀"] as const;
type TargetType = (typeof TARGET_TYPES)[number];

const FIELD_LABELS: Record<TargetType, { key: string; label: string }[]> = {
  角色: [
    { key: "角色名稱", label: "姓名" },
    { key: "核心動機", label: "動機" },
    { key: "基本資料", label: "基本資料" },
    { key: "外顯特徵", label: "外顯特徵" },
    { key: "已知資訊", label: "已知資訊" },
    { key: "目標", label: "目標" },
    { key: "關係狀態", label: "關係狀態" },
    { key: "角色定位", label: "定位" },
    { key: "陣營", label: "陣營" },
  ],
  事件: [
    { key: "事件名稱", label: "名稱" },
    { key: "事件摘要", label: "摘要" },
    { key: "事件類型", label: "類型" },
    { key: "事件狀態", label: "狀態" },
    { key: "事件可見度", label: "可見度" },
  ],
  地點: [
    { key: "地點名稱", label: "名稱" },
    { key: "描述", label: "描述" },
    { key: "地點類型", label: "類型" },
    { key: "區域", label: "區域" },
  ],
  世界觀: [
    { key: "設定名稱", label: "名稱" },
    { key: "設定內容", label: "內容" },
    { key: "設定分類", label: "分類" },
  ],
};

const ALIASES: Record<TargetType, Record<string, string>> = {
  角色: { 姓名: "角色名稱", 名字: "角色名稱", 角色名稱: "角色名稱", 角色名: "角色名稱",
    動機: "核心動機", 核心動機: "核心動機", 基本資料: "基本資料", 背景: "基本資料",
    外顯特徵: "外顯特徵", 外貌: "外顯特徵", 特徵: "外顯特徵", 已知資訊: "已知資訊", 已知: "已知資訊",
    目標: "目標", 關係狀態: "關係狀態", 關係: "關係狀態", 定位: "角色定位", 角色定位: "角色定位", 陣營: "陣營" },
  事件: { 名稱: "事件名稱", 事件名稱: "事件名稱", 標題: "事件名稱", 摘要: "事件摘要", 事件摘要: "事件摘要",
    內容: "事件摘要", 類型: "事件類型", 事件類型: "事件類型", 狀態: "事件狀態", 事件狀態: "事件狀態",
    可見度: "事件可見度", 事件可見度: "事件可見度" },
  地點: { 名稱: "地點名稱", 地點名稱: "地點名稱", 標題: "地點名稱", 描述: "描述", 介紹: "描述",
    類型: "地點類型", 地點類型: "地點類型", 區域: "區域" },
  世界觀: { 名稱: "設定名稱", 設定名稱: "設定名稱", 標題: "設定名稱", 內容: "設定內容",
    設定內容: "設定內容", 描述: "設定內容", 分類: "設定分類", 設定分類: "設定分類" },
};

function parseText(text: string, targetType: TargetType) {
  const aliasMap = ALIASES[targetType];
  const lines = text.split(/\r?\n/);
  const fields: Record<string, string> = {};
  const unmatched: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^([^\s：:]{1,10})[：:]\s*(.+)$/);
    const key = match ? aliasMap[match[1]] : undefined;
    if (match && key) {
      fields[key] = fields[key] ? `${fields[key]}\n${match[2]}` : match[2];
    } else {
      unmatched.push(trimmed);
    }
  }
  return { fields, summary: unmatched.join("\n") };
}

type StagingItem = {
  id: string;
  暫存紀錄名稱: string;
  目標類型: string;
  原始輸入文字: string;
  解析狀態: string;
};

export default function QuickAddPage() {
  const [targetType, setTargetType] = useState<TargetType>("角色");
  const [rawText, setRawText] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [staging, setStaging] = useState<StagingItem[]>([]);

  // 自動解析(純函式,不需要 effect):使用者若手動編輯欄位,edits 覆蓋解析結果。
  const parsed = useMemo(() => parseText(rawText, targetType), [rawText, targetType]);
  const fields = { ...parsed.fields, ...edits };

  function updateRawText(value: string) {
    setRawText(value);
    setEdits({});
  }
  function updateTargetType(value: TargetType) {
    setTargetType(value);
    setEdits({});
  }

  function loadStaging() {
    fetch("/api/trpg/staging")
      .then((r) => r.json())
      .then((data) => setStaging(data.items ?? []));
  }
  useEffect(loadStaging, []);

  async function submit(mode: "staging" | "direct") {
    setSaving(true);
    try {
      const res = await fetch("/api/trpg/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, rawText, fields, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "存入失敗");
      updateRawText("");
      loadStaging();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function actOnStaging(id: string, action: "confirm" | "discard") {
    await fetch(`/api/trpg/staging/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    loadStaging();
  }

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <h1 className="text-lg font-semibold">⚡ 快速輸入台</h1>

      <div className="grid grid-cols-4 gap-2">
        {TARGET_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => updateTargetType(t)}
            className={`py-2 rounded border text-sm ${
              targetType === t ? "bg-foreground text-background" : "hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <textarea
        className="border rounded px-3 py-2 bg-transparent text-sm"
        rows={8}
        placeholder={"貼上任意格式文字,例如：\n姓名：蘇晚\n動機：復仇"}
        value={rawText}
        onChange={(e) => updateRawText(e.target.value)}
      />

      {rawText.trim() && (
        <div className="border rounded-lg p-4 flex flex-col gap-3">
          <h2 className="text-sm text-zinc-500">預覽(可編輯)</h2>
          {FIELD_LABELS[targetType].map((f) => (
            <div key={f.key} className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500">{f.label}</label>
              <input
                className="border rounded px-2 py-1 bg-transparent text-sm"
                value={fields[f.key] ?? ""}
                onChange={(e) => setEdits((prev) => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => submit("staging")}
              disabled={saving}
              className="flex-1 py-2 rounded border text-sm disabled:opacity-50"
            >
              存入暫存
            </button>
            <button
              onClick={() => submit("direct")}
              disabled={saving}
              className="flex-1 py-2 rounded bg-foreground text-background text-sm disabled:opacity-50"
            >
              直接入庫
            </button>
          </div>
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-zinc-500">待確認暫存清單 ({staging.length})</h2>
        {staging.map((item) => (
          <div key={item.id} className="border rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {item.目標類型}｜{item.暫存紀錄名稱}
              </span>
            </div>
            <p className="text-xs text-zinc-500 whitespace-pre-wrap line-clamp-3">
              {item.原始輸入文字}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => actOnStaging(item.id, "confirm")}
                className="flex-1 py-1.5 rounded bg-foreground text-background text-xs"
              >
                確認入庫
              </button>
              <button
                onClick={() => actOnStaging(item.id, "discard")}
                className="flex-1 py-1.5 rounded border text-xs"
              >
                捨棄
              </button>
            </div>
          </div>
        ))}
        {staging.length === 0 && <p className="text-sm text-zinc-500">無待確認項目</p>}
      </section>
    </div>
  );
}
