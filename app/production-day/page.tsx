"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { pageLabel } from "@/lib/labels";

// P3 生產日工作台(委派書 §四,第二期):照《大生產日 SOP v0.9.2》步驟順序做成引導流程
// (步驟清單+當前步驟高亮)。步驟內容為靜態文字,不持久化「目前第幾步」——每次開工
// 都是新的一輪引導,不是需要跨裝置同步的權威資料,故不寫入 Notion(委派書系統定位第 2 條)。
const STEPS: {
  id: number;
  title: string;
  time: string;
  desc: string;
  widget?: "atoms" | "knowledge";
  links?: { label: string; href: string }[];
}[] = [
  {
    id: 0,
    title: "☆ 開機儀式:回顧上期回饋",
    time: "20 分",
    desc: "讀上期回饋紀錄與待審提案。有累積滿三次的同類問題→標記,生產日結束後再走提案流程,當場不改規則。",
    links: [{ label: pageLabel("P6"), href: "/feedback" }],
  },
  {
    id: 1,
    title: "☆ 月能量流",
    time: "60–90 分",
    desc: "抽月能量流牌陣→建 Session(項目=能量流)+明細→套 R-能量流規則解讀→產出月主題包草稿(主題名、能量關鍵字、深度討論題目、每日互動方向)。",
    links: [{ label: pageLabel("P5"), href: "/sessions" }],
  },
  {
    id: 2,
    title: "☆ 服務組合",
    time: "30 分",
    desc: "以能量關鍵字撈 DB-11 匹配原子項(下方清單);你自己組合三款主題服務,填回 DB-08「當月三款主題服務」。月主題包至此定稿→鎖定,當月不再改(要改走提案)。",
    widget: "atoms",
  },
  {
    id: 3,
    title: "☆ 任務展開",
    time: "30 分",
    desc: `依 DB-06/07 序列模板+窗口內節點展開任務清單;知識庫比對(下方清單)以月主題標籤撈 DB-14 存貨,匹配者排入;二更測驗維度/方法挑選在${pageLabel("P8")}的心理測驗選項表單(App 只列清單,不代選)。`,
    widget: "knowledge",
    links: [
      { label: pageLabel("P2"), href: "/expand" },
      { label: `${pageLabel("P8")}(心理測驗選項)`, href: "/generate" },
    ],
  },
  {
    id: 4,
    title: "生產(核心工作段)",
    time: "—",
    desc: `固定順序:①共振會序列文 ②月能量流發布文+活動總預告 ③三更邀請文 ④二更心理測驗 ⑤其他事件序列文。每篇:套規則+填素材插槽→生成(手動/${pageLabel("P8")}/${pageLabel("P8")}生成)→驗收(四維評分)→過=已產出。`,
    links: [{ label: pageLabel("P8"), href: "/generate" }],
  },
  {
    id: 5,
    title: "☆ 交付與收尾",
    time: "30 分",
    desc: "內容包整理(定稿文字+Canva 模板編號+發布日期)→狀態改「已交付」→處理第 0 步標記的提案→預約小生產日→生產日自評(一筆回饋)。",
    links: [
      { label: pageLabel("P5"), href: "/sessions" },
      { label: pageLabel("P6"), href: "/feedback" },
    ],
  },
];

type MatchState = "no-keywords" | "empty-source" | "no-matches" | "ok";
type AtomMatchRow = {
  id: string;
  原子項名稱: string;
  可組合性: string;
  價格: number | null;
  hitCount: number;
  hitTags: string[];
};
type KnowledgeMatchRow = {
  id: string;
  標題: string;
  狀態: string | null;
  hitCount: number;
  hitTags: string[];
};
type MatchesData = {
  month: string;
  keywordNames: string[];
  atoms: { state: MatchState; matches: AtomMatchRow[] };
  knowledge: { state: MatchState; matches: KnowledgeMatchRow[] };
};

export default function ProductionDayPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<MatchesData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const r = await fetch(`/api/production-day/matches?month=${month}`);
      const json = await r.json();
      if (!cancelled) {
        setData(json);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [month]);

  function toggleCompleted(id: number) {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{pageLabel("P3")}</h1>
        <label className="flex items-center gap-2 text-sm">
          月份
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border rounded px-2 py-1 bg-transparent"
          />
        </label>
      </div>

      <ol className="flex flex-col gap-3">
        {STEPS.map((step) => (
          <li
            key={step.id}
            className={`border rounded-lg p-3 ${
              currentStep === step.id
                ? "border-blue-500 ring-2 ring-blue-500"
                : "border-black/10 dark:border-white/15"
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => toggleCompleted(step.id)}
                className={`w-5 h-5 rounded border shrink-0 text-xs flex items-center justify-center ${
                  completed.has(step.id)
                    ? "bg-green-600 border-green-600 text-white"
                    : "border-black/25 dark:border-white/25"
                }`}
                aria-label="標記完成"
              >
                {completed.has(step.id) ? "✓" : ""}
              </button>
              <button
                onClick={() => setCurrentStep(step.id)}
                className={`font-medium text-sm text-left ${completed.has(step.id) ? "line-through opacity-60" : ""}`}
              >
                第 {step.id} 步・{step.title}
              </button>
              <span className="text-xs text-zinc-500">{step.time}</span>
              {step.links?.map((l) => (
                <Link key={l.href} href={l.href} className="text-xs underline ml-auto">
                  {l.label} →
                </Link>
              ))}
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{step.desc}</p>

            {step.widget === "atoms" && (
              <AtomMatchPanel loading={loading} data={data} />
            )}
            {step.widget === "knowledge" && (
              <KnowledgeMatchPanel loading={loading} data={data} />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function KeywordLine({ data }: { data: MatchesData | null }) {
  if (!data || data.keywordNames.length === 0) return null;
  return (
    <p className="text-xs text-zinc-500 mt-2">本月能量關鍵字:{data.keywordNames.join("、")}</p>
  );
}

function AtomMatchPanel({ loading, data }: { loading: boolean; data: MatchesData | null }) {
  if (loading || !data) return <p className="text-xs text-zinc-500 mt-2">載入中…</p>;
  const { atoms } = data;
  return (
    <div className="mt-3 border-t border-black/5 dark:border-white/10 pt-2">
      <h3 className="text-xs font-medium text-zinc-500 mb-1">DB-11 服務原子項匹配清單</h3>
      <KeywordLine data={data} />
      {atoms.state === "no-keywords" && (
        <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">本月能量關鍵字未設定</p>
      )}
      {atoms.state === "empty-source" && (
        <p className="text-sm text-zinc-500 mt-1">原子庫尚未建檔</p>
      )}
      {atoms.state === "no-matches" && (
        <p className="text-sm text-zinc-500 mt-1">本月能量關鍵字沒有匹配到任何啟用中的原子項。</p>
      )}
      {atoms.state === "ok" && (
        <ul className="flex flex-col gap-1 mt-1">
          {atoms.matches.map((m) => (
            <li key={m.id} className="text-sm border border-black/5 dark:border-white/10 rounded px-2 py-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{m.原子項名稱}</span>
                <span className="text-xs text-zinc-500">命中 {m.hitCount} 個標籤:{m.hitTags.join("、")}</span>
                {m.價格 != null && <span className="text-xs text-zinc-500 ml-auto">${m.價格}</span>}
              </div>
              {m.可組合性 && <p className="text-xs text-zinc-500 mt-0.5">{m.可組合性}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function KnowledgeMatchPanel({ loading, data }: { loading: boolean; data: MatchesData | null }) {
  if (loading || !data) return <p className="text-xs text-zinc-500 mt-2">載入中…</p>;
  const { knowledge } = data;
  return (
    <div className="mt-3 border-t border-black/5 dark:border-white/10 pt-2">
      <h3 className="text-xs font-medium text-zinc-500 mb-1">DB-14 知識庫比對清單(狀態=存貨者置頂)</h3>
      <KeywordLine data={data} />
      {knowledge.state === "no-keywords" && (
        <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">本月能量關鍵字未設定</p>
      )}
      {knowledge.state === "empty-source" && (
        <p className="text-sm text-zinc-500 mt-1">知識庫尚無資料</p>
      )}
      {knowledge.state === "no-matches" && (
        <p className="text-sm text-zinc-500 mt-1">本月主題標籤沒有匹配到任何知識庫條目。</p>
      )}
      {knowledge.state === "ok" && (
        <ul className="flex flex-col gap-1 mt-1">
          {knowledge.matches.map((m) => (
            <li key={m.id} className="text-sm border border-black/5 dark:border-white/10 rounded px-2 py-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{m.標題}</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    m.狀態 === "存貨"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-zinc-100 dark:bg-zinc-800"
                  }`}
                >
                  {m.狀態 ?? "未標示"}
                </span>
                <span className="text-xs text-zinc-500">命中 {m.hitCount} 個標籤:{m.hitTags.join("、")}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
