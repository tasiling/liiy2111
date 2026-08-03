"use client";

// 收光(依三方協作規格書 v1.3 §3.5/§3.5.1 從零實作,取代先前四選項的雛形版本)。
// 擁有者指示:快速評分、提案審核掛進這裡(提案審核屬第三期範圍,尚未建置)。
//
// v1.3 §3.5:收光是「處置決定」,不是心靈語句——三個選項對應三種明確的處置方式,
// 不是勾選句。原本的「先收納」「不留紀錄」已取消,收納動作移到各場域的痕跡卡片
// 就地處理,不必等到收光。
//
// v1.3 §3.5.1:測頻只在收光復盤階段做,不在紀錄當下做——逐筆列出今天的片刻,
// 各自可用滑桿或數字輸入標記,可清除;保留單筆的數值與霍金斯狀態標籤,不計算
// 今日平均、不畫任何長條或進度條。
//
// 修正委派書 v1.0 四:新增強度(1–10),與頻率並列、規則相同——各自獨立可
// 清除,清除其中一個不影響另一個;顯示格式集中在 formatFreqIntensityLabel()
// (兩者皆有:"500・愛 ・ 強度 7";只有一項就只顯示那一項),不在這裡另外拼字串。
//
// 追加修正(2026-08-03,擁有者回報「滑桿一動即寫入,無確認、無收合、清除鈕
// 常駐」):改成三態——未標記顯示「標記頻率」「標記強度」兩顆入口按鈕;點下
// 任一顆展開「頻率＋強度」共用的編輯面板(滑桿改成先寫進本地暫存值,不即時
// 寫入 entries),按「確定」才真的呼叫 setEntryFreq/setEntryIntensity,「取消」
// 直接關閉、捨棄暫存值;已標記(至少一項有值)收合成一行(用既有的
// formatFreqIntensityLabel())＋一顆「編輯」按鈕,點編輯才重新展開。清除鈕
// 移到展開面板內,只有該欄位原本已有值時才顯示,按下去立即清除並收合。用
// touched 旗標追蹤這次編輯階段使用者實際動過哪個欄位,「確定」只寫入動過的
// 欄位——避免使用者只想標頻率,卻因為面板同時顯示兩個滑桿而意外把強度也寫進
// 預設值,維持「只填其中一項完全合法」的既有規則。
//
// 《收光三選項與居所接續 — 資料邏輯規格 v1.0》(2026-08-03,擁有者裁決零新增
// 欄位,沿用 DojoEntry 語意寫進 DB-14):三個選項是「今天整體怎麼結束」的一次性
// 動作,不改動任何一筆痕跡的狀態(§0.1)——這裡呼叫 POST /api/closing,不碰
// useDojo() 的 entries。「暫且放下」「直接收光」送出後行為完全相同,只有
// choice 值不同;「帶回明天」多一步可選填一句話(可略過)。三者送出成功後都
// 播放低刺激收光動效(800–1200ms)再回居所(§四)。
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDojo } from "@/lib/dojo/store";
import { SPACES, GUANGXING, GUANGFA, type DojoEntry } from "@/lib/dojo/constants";
import {
  resolveHawkinsLevel,
  formatFreqIntensityLabel,
  HAWKINS_MIN,
  HAWKINS_MAX,
  INTENSITY_MIN,
  INTENSITY_MAX,
} from "@/lib/dojo/hawkins";
import ExistingFeatureLinks from "../components/ExistingFeatureLinks";

type ClosingChoice = "carry" | "pause" | "close";

const CHOICES: { choice: ClosingChoice; label: string; note: string }[] = [
  { choice: "carry", label: "帶回明天", note: "建立一個溫和的接續入口。" },
  { choice: "pause", label: "暫且放下", note: "不建立待辦,現在先休息。" },
  { choice: "close", label: "直接收光", note: "今天就在此結束,不留任何提示。" },
];

const DEFAULT_FREQ = 500;
const DEFAULT_INTENSITY = 5;

export default function ClosingPage() {
  const router = useRouter();
  const { entries } = useDojo();
  const todayEntries = entries.filter((e) => e.date === "今天" || e.date === "剛剛");

  // 「帶回明天」是唯一有額外步驟的選項:點下去先展開一句話輸入框(可留空),
  // 按確定才真的送出;另外兩個選項點下去就直接送出,不需要中間狀態。
  const [carryStep, setCarryStep] = useState(false);
  const [carryNote, setCarryNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [settled, setSettled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitChoice(choice: ClosingChoice, note?: string) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/closing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice, note }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "收光失敗,請重試。");
      }
      setSettled(true);
      // 低刺激收光動效(800–1200ms)後回居所——不是換頁式的成功訊息,是安靜地淡出。
      setTimeout(() => router.push("/"), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="screen">
      <h1>收光</h1>
      <p className="lead">今天可以安心結束;沒有未完成警告,也不要求連續打卡。</p>
      <ExistingFeatureLinks links={[{ label: "快速評分", href: "/feedback" }, { label: "提案審核", href: null }]} />
      <div className="box cl">
        <span className="label">今天回望</span>
        <b>你留下了 {entries.length} 個片刻。</b>
        <small>它們可以留在今天、帶回明天、放下,或直接收光。</small>
      </div>

      <h3>復盤測頻</h3>
      <p className="lead">願不願意標記當時的能量與投入程度;不測也完全可以。</p>
      {todayEntries.length === 0 && <div className="empty">今天還沒有片刻可以復盤。</div>}
      {todayEntries.map((e) => (
        <div key={e.id} className={`item ${SPACES[e.space]?.[1] ?? "dw"}`}>
          <span className="status">
            <span className="dot" />
            {SPACES[e.space]?.[0]} · {e.kind}
          </span>
          {e.guangxing && (
            <span className="tag" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}>
              {GUANGXING[e.guangxing][0]}
            </span>
          )}
          {e.guangfa && (
            <span className="tag" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}>
              {GUANGFA[e.guangfa][0]}
            </span>
          )}
          <b>{e.title}</b>
          <ClosingMeasurePanel entry={e} />
        </div>
      ))}

      <h3>今天怎麼處置</h3>
      {error && <div className="warn">{error}</div>}
      {!carryStep &&
        CHOICES.map((c) => (
          <button
            key={c.choice}
            className="item cl"
            disabled={submitting}
            onClick={() => (c.choice === "carry" ? setCarryStep(true) : submitChoice(c.choice))}
          >
            <b>{c.label}</b>
            <small>{c.note}</small>
          </button>
        ))}
      {carryStep && (
        <div className="item cl">
          <b>帶回明天</b>
          <small>可以寫一句話,亦可略過。</small>
          <textarea
            className="field"
            style={{ marginTop: 8 }}
            value={carryNote}
            onChange={(e) => setCarryNote(e.target.value)}
            placeholder="想帶到明天的一句話(選填)"
          />
          <div className="two" style={{ marginTop: 8 }}>
            <button onClick={() => { setCarryStep(false); setCarryNote(""); }} disabled={submitting}>
              取消
            </button>
            <button className="primary" onClick={() => submitChoice("carry", carryNote)} disabled={submitting}>
              {submitting ? "送出中…" : "帶回明天"}
            </button>
          </div>
        </div>
      )}
      {settled && (
        <div className="settle" role="status">
          已收光
        </div>
      )}
      <div className="note">
        測試重點:三個處置選項是否足夠;復盤測頻是否讓人有壓力(不測也完全合法,不應該有任何提示要求一定要測)。
      </div>
    </section>
  );
}

// 頻率／強度共用一個編輯面板(未標記→展開中→已標記三態,見檔案開頭註解)。
function ClosingMeasurePanel({ entry }: { entry: DojoEntry }) {
  const { setEntryFreq, setEntryIntensity } = useDojo();
  const [editing, setEditing] = useState(false);
  const [pendingFreq, setPendingFreq] = useState(entry.freq ?? DEFAULT_FREQ);
  const [touchedFreq, setTouchedFreq] = useState(entry.freq != null);
  const [pendingIntensity, setPendingIntensity] = useState(entry.intensity ?? DEFAULT_INTENSITY);
  const [touchedIntensity, setTouchedIntensity] = useState(entry.intensity != null);

  const level = entry.freq != null ? resolveHawkinsLevel(entry.freq) : null;
  const combinedLabel = formatFreqIntensityLabel(entry.freq, entry.intensity);
  const hasAny = entry.freq != null || entry.intensity != null;

  function openEdit() {
    // 展開時把暫存值重設回目前實際值,不會殘留上一次取消掉的操作。
    setPendingFreq(entry.freq ?? DEFAULT_FREQ);
    setTouchedFreq(entry.freq != null);
    setPendingIntensity(entry.intensity ?? DEFAULT_INTENSITY);
    setTouchedIntensity(entry.intensity != null);
    setEditing(true);
  }

  function confirm() {
    // 只寫入這次編輯階段真的動過的欄位,沒動過的維持原狀(不會被面板上顯示的
    // 預設滑桿位置意外寫入)。
    if (touchedFreq) setEntryFreq(entry.id, pendingFreq);
    if (touchedIntensity) setEntryIntensity(entry.id, pendingIntensity);
    setEditing(false);
  }

  function cancel() {
    // 未按確定即離開,不寫入——暫存值直接捨棄。
    setEditing(false);
  }

  function clearFreqNow() {
    setEntryFreq(entry.id, null);
    setTouchedFreq(false);
    setPendingFreq(DEFAULT_FREQ);
  }

  function clearIntensityNow() {
    setEntryIntensity(entry.id, null);
    setTouchedIntensity(false);
    setPendingIntensity(DEFAULT_INTENSITY);
  }

  if (!editing) {
    if (!hasAny) {
      return (
        <div className="two" style={{ marginTop: 8 }}>
          <button onClick={openEdit}>標記頻率</button>
          <button onClick={openEdit}>標記強度</button>
        </div>
      );
    }
    return (
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span className="tag" style={{ borderColor: level?.color ?? "var(--gold)", color: level?.color ?? "var(--gold)" }}>
          {combinedLabel}
        </span>
        <button onClick={openEdit}>編輯</button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      <small style={{ display: "block" }}>頻率(0–1000)</small>
      <div className="two" style={{ marginTop: 4, alignItems: "center" }}>
        <input
          type="range"
          min={HAWKINS_MIN}
          max={HAWKINS_MAX}
          step={5}
          value={pendingFreq}
          onChange={(ev) => {
            setPendingFreq(Number(ev.target.value));
            setTouchedFreq(true);
          }}
        />
        <input
          className="field"
          style={{ margin: 0 }}
          type="number"
          min={HAWKINS_MIN}
          max={HAWKINS_MAX}
          value={pendingFreq}
          onChange={(ev) => {
            const n = Number(ev.target.value);
            if (Number.isFinite(n)) {
              setPendingFreq(Math.min(HAWKINS_MAX, Math.max(HAWKINS_MIN, n)));
              setTouchedFreq(true);
            }
          }}
        />
      </div>
      {entry.freq != null && (
        <button className="danger" style={{ marginTop: 4 }} onClick={clearFreqNow}>
          清除頻率
        </button>
      )}

      <small style={{ display: "block", marginTop: 12 }}>強度(1–10)</small>
      <div className="two" style={{ marginTop: 4, alignItems: "center" }}>
        <input
          type="range"
          min={INTENSITY_MIN}
          max={INTENSITY_MAX}
          step={1}
          value={pendingIntensity}
          onChange={(ev) => {
            setPendingIntensity(Number(ev.target.value));
            setTouchedIntensity(true);
          }}
        />
        <input
          className="field"
          style={{ margin: 0 }}
          type="number"
          min={INTENSITY_MIN}
          max={INTENSITY_MAX}
          value={pendingIntensity}
          onChange={(ev) => {
            const n = Number(ev.target.value);
            if (Number.isFinite(n)) {
              setPendingIntensity(Math.min(INTENSITY_MAX, Math.max(INTENSITY_MIN, n)));
              setTouchedIntensity(true);
            }
          }}
        />
      </div>
      {entry.intensity != null && (
        <button className="danger" style={{ marginTop: 4 }} onClick={clearIntensityNow}>
          清除強度
        </button>
      )}

      <div className="two" style={{ marginTop: 10 }}>
        <button onClick={cancel}>取消</button>
        <button className="primary" onClick={confirm}>
          確定
        </button>
      </div>
    </div>
  );
}
