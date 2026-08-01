"use client";

// 收光(雛形 closing()/closingChoice()的等價實作)。擁有者指示:快速評分、提案審核
// 掛進這裡(提案審核屬第三期範圍,尚未建置)。
import { useDojo } from "@/lib/dojo/store";
import ExistingFeatureLinks from "../components/ExistingFeatureLinks";

const CHOICES: { label: string; note: string }[] = [
  { label: "帶回明天", note: "建立一個溫和的接續入口。" },
  { label: "先收納", note: "保留它,但今天先不處理。" },
  { label: "暫且放下", note: "不建立待辦,現在先休息。" },
  { label: "不留紀錄", note: "某些日子什麼都不留,也完全可以。" },
];

export default function ClosingPage() {
  const { entries } = useDojo();
  return (
    <section className="screen">
      <h1>收光</h1>
      <p className="lead">今天可以安心結束;沒有未完成警告,也不要求連續打卡。</p>
      <ExistingFeatureLinks links={[{ label: "快速評分", href: "/feedback" }, { label: "提案審核", href: null }]} />
      <div className="box cl">
        <span className="label">今天回望</span>
        <b>你留下了 {entries.length} 個片刻。</b>
        <small>它們可以留在今天、帶回明天、收納、放下,或什麼都不做。</small>
      </div>
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
      <div className="note">測試重點:收光四種動作是否足夠,或應先有一句自由書寫再選擇處理方式。</div>
    </section>
  );
}
