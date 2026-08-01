"use client";

// 修習所(雛形 practice()/body()/mind()/spirit()/nen()/logs()的等價實作)。
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDojo } from "@/lib/dojo/store";
import { LIGHT_NEN, type NenKey } from "@/lib/dojo/constants";

type Tab = "body" | "mind" | "spirit" | "nen" | "logs";
const TABS: { key: Tab; label: string }[] = [
  { key: "body", label: "身" },
  { key: "mind", label: "心" },
  { key: "spirit", label: "靈修" },
  { key: "nen", label: "念能" },
  { key: "logs", label: "修行紀錄" },
];

export default function PracticePage() {
  const [tab, setTab] = useState<Tab>("body");
  return (
    <section className="screen">
      <h1>修習所</h1>
      <p className="lead">身、心、靈修、念能與修行紀錄;「心」明確拆為知、情、意。</p>
      <div className="row">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <div>
        {tab === "body" && <BodyTab />}
        {tab === "mind" && <MindTab />}
        {tab === "spirit" && <SpiritTab />}
        {tab === "nen" && <NenTab />}
        {tab === "logs" && <LogsTab />}
      </div>
      <div className="note">測試重點:身、心、靈修是否為正確第一層;修行紀錄是否應跨三者統整。</div>
    </section>
  );
}

function BodyTab() {
  const { openQuickAdd } = useDojo();
  return (
    <>
      <div className="card">
        <span className="label">身體照料</span>
        <b>今天先照看身體。</b>
        <small>活動、睡眠、飲食、疼痛與恢復都可作為單次紀錄,不強迫建立 Session。</small>
        <label className="check">
          <input type="checkbox" />
          活動／伸展
        </label>
        <label className="check">
          <input type="checkbox" />
          飲食與喝水
        </label>
        <label className="check">
          <input type="checkbox" />
          睡眠／休息
        </label>
      </div>
      <button className="primary" onClick={() => openQuickAdd({ presetSpace: "practice", presetKind: "身" })}>
        留下身體紀錄
      </button>
    </>
  );
}

function MindTab() {
  const { openQuickAdd } = useDojo();
  return (
    <>
      <div className="card">
        <span className="label">心(知／情／意)</span>
        <b>覺察此刻的心。</b>
        <small>閱讀筆記、情緒紀錄、意圖與決定,皆可單筆保留。</small>
      </div>
      <button className="primary" onClick={() => openQuickAdd({ presetSpace: "practice", presetKind: "心" })}>
        留下心的紀錄
      </button>
    </>
  );
}

function SpiritTab() {
  const { openQuickAdd } = useDojo();
  return (
    <>
      <div className="card">
        <span className="label">靈修</span>
        <b>回到更深的連結。</b>
        <small>冥想、祈願、儀式、與宇宙對話的片刻。</small>
      </div>
      <button className="primary" onClick={() => openQuickAdd({ presetSpace: "practice", presetKind: "靈修" })}>
        留下靈修紀錄
      </button>
    </>
  );
}

function NenTab() {
  const router = useRouter();
  const { startTimerWithNen } = useDojo();
  const [selected, setSelected] = useState<NenKey>("ning");
  const v = LIGHT_NEN[selected];

  function startWithNen(k: NenKey) {
    startTimerWithNen(k);
    router.push("/timer");
  }

  return (
    <>
      <div className="card">
        <span className="label">光念系統 · 五功法(已定版)</span>
        <b>光念不是裝飾能力,而是修行的五種運作方式。</b>
        <small>轉譯方向:念(Aura)→ 光;念能力 → 光念;纏、絕、練、發、堅 → 凝光、藏光、煉光、顯光、恆光。</small>
      </div>
      <div className="row">
        {(Object.entries(LIGHT_NEN) as [NenKey, (typeof LIGHT_NEN)[NenKey]][]).map(([k, val]) => (
          <button key={k} className={selected === k ? "on" : ""} onClick={() => setSelected(k)}>
            {val[0]}
          </button>
        ))}
      </div>
      <div className="card">
        <span className="label">{v[0]}</span>
        <b>{v[1]}</b>
        <small>真實對應:{v[2]}</small>
        <button className="primary" onClick={() => startWithNen(selected)}>
          以「{v[0]}」開始這段修行
        </button>
      </div>
      <div className="note">
        此頁只放已定案的五功法;「生命流動」與「織光獨立成念」目前是提案,不放入功能版,等你正式定案再加入。
      </div>
    </>
  );
}

function LogsTab() {
  const { entries } = useDojo();
  const list = entries.filter((e) => e.space === "practice");
  if (list.length === 0) return <div className="empty">還沒有修行紀錄。</div>;
  return (
    <div className="timeline">
      {list.map((e) => (
        <div key={e.id} className="event" style={{ "--event": "var(--pr)" } as React.CSSProperties}>
          <b>{e.title}</b>
          <small>
            {e.kind} · {e.date}
          </small>
        </div>
      ))}
    </div>
  );
}
