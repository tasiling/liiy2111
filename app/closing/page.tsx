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
import { useDojo } from "@/lib/dojo/store";
import { SPACES, GUANGXING, GUANGFA } from "@/lib/dojo/constants";
import {
  resolveHawkinsLevel,
  formatFreqIntensityLabel,
  HAWKINS_MIN,
  HAWKINS_MAX,
  INTENSITY_MIN,
  INTENSITY_MAX,
} from "@/lib/dojo/hawkins";
import ExistingFeatureLinks from "../components/ExistingFeatureLinks";

const CHOICES: { label: string; note: string }[] = [
  { label: "帶回明天", note: "建立一個溫和的接續入口。" },
  { label: "暫且放下", note: "不建立待辦,現在先休息。" },
  { label: "直接收光", note: "今天就在此結束,不留任何提示。" },
];

const DEFAULT_FREQ = 500;
const DEFAULT_INTENSITY = 5;

export default function ClosingPage() {
  const { entries, setEntryFreq, setEntryIntensity } = useDojo();
  const todayEntries = entries.filter((e) => e.date === "今天" || e.date === "剛剛");

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
      {todayEntries.map((e) => {
        const level = e.freq != null ? resolveHawkinsLevel(e.freq) : null;
        const combinedLabel = formatFreqIntensityLabel(e.freq, e.intensity);
        return (
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
            {combinedLabel && (
              <span
                className="tag"
                style={{ borderColor: level?.color ?? "var(--gold)", color: level?.color ?? "var(--gold)", marginTop: 6 }}
              >
                {combinedLabel}
              </span>
            )}

            <small style={{ display: "block", marginTop: 8 }}>頻率(0–1000)</small>
            {e.freq != null ? (
              <>
                <div className="two" style={{ marginTop: 4, alignItems: "center" }}>
                  <input
                    type="range"
                    min={HAWKINS_MIN}
                    max={HAWKINS_MAX}
                    step={5}
                    value={e.freq}
                    onChange={(ev) => setEntryFreq(e.id, Number(ev.target.value))}
                  />
                  <input
                    className="field"
                    style={{ margin: 0 }}
                    type="number"
                    min={HAWKINS_MIN}
                    max={HAWKINS_MAX}
                    value={e.freq}
                    onChange={(ev) => {
                      const n = Number(ev.target.value);
                      if (Number.isFinite(n)) setEntryFreq(e.id, Math.min(HAWKINS_MAX, Math.max(HAWKINS_MIN, n)));
                    }}
                  />
                </div>
                <button className="danger" style={{ marginTop: 6 }} onClick={() => setEntryFreq(e.id, null)}>
                  清除頻率
                </button>
              </>
            ) : (
              <button style={{ marginTop: 6 }} onClick={() => setEntryFreq(e.id, DEFAULT_FREQ)}>
                標記頻率
              </button>
            )}

            <small style={{ display: "block", marginTop: 10 }}>強度(1–10)</small>
            {e.intensity != null ? (
              <>
                <div className="two" style={{ marginTop: 4, alignItems: "center" }}>
                  <input
                    type="range"
                    min={INTENSITY_MIN}
                    max={INTENSITY_MAX}
                    step={1}
                    value={e.intensity}
                    onChange={(ev) => setEntryIntensity(e.id, Number(ev.target.value))}
                  />
                  <input
                    className="field"
                    style={{ margin: 0 }}
                    type="number"
                    min={INTENSITY_MIN}
                    max={INTENSITY_MAX}
                    value={e.intensity}
                    onChange={(ev) => {
                      const n = Number(ev.target.value);
                      if (Number.isFinite(n))
                        setEntryIntensity(e.id, Math.min(INTENSITY_MAX, Math.max(INTENSITY_MIN, n)));
                    }}
                  />
                </div>
                <button className="danger" style={{ marginTop: 6 }} onClick={() => setEntryIntensity(e.id, null)}>
                  清除強度
                </button>
              </>
            ) : (
              <button style={{ marginTop: 6 }} onClick={() => setEntryIntensity(e.id, DEFAULT_INTENSITY)}>
                標記強度
              </button>
            )}
          </div>
        );
      })}

      <h3>今天怎麼處置</h3>
      {CHOICES.map((c) => (
        <button
          key={c.label}
          className="item cl"
          onClick={() => alert(`已選擇:${c.label}(此為工程測試版,尚未接正式流程)`)}
        >
          <b>{c.label}</b>
          <small>{c.note}</small>
        </button>
      ))}
      <div className="note">
        測試重點:三個處置選項是否足夠;復盤測頻是否讓人有壓力(不測也完全合法,不應該有任何提示要求一定要測)。
      </div>
    </section>
  );
}
