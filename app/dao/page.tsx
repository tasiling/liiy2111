"use client";

// 道藏(雛形 dao()的等價實作)。雛形本身的四個頁籤按鈕沒有掛任何互動(demo 就是這樣),
// 這裡照樣只做視覺呈現,不額外加點擊邏輯。擁有者指示:牌卡庫、知識庫掛進這裡,
// 但兩者目前都還沒有獨立頁面(只在其他功能內部被讀取),先列出並標明未建置。
import { useDojo } from "@/lib/dojo/store";
import { SPACES, GUANGXING, GUANGFA, type SpaceKey } from "@/lib/dojo/constants";
import ExistingFeatureLinks from "../components/ExistingFeatureLinks";

const ARCHIVE_SOURCE_SPACES: SpaceKey[] = ["weaving", "practice", "forage"];

export default function DaoPage() {
  const { entries, openQuickAdd } = useDojo();
  const archivable = entries.filter((e) => ARCHIVE_SOURCE_SPACES.includes(e.space));

  return (
    <section className="screen">
      <h1>道藏</h1>
      <p className="lead">牌冊、作品、洞見與生活痕跡;不是成就櫃。</p>
      <ExistingFeatureLinks links={[{ label: "牌卡庫", href: null }, { label: "知識庫", href: null }]} />
      <div className="row">
        <button className="on">牌冊</button>
        <button>作品</button>
        <button>洞見</button>
        <button>生活痕跡</button>
      </div>
      <div className="card da">
        <span className="label">留存規則</span>
        <b>不是所有東西都必須入藏。</b>
        <small>只有你主動選擇留存的資料才會進道藏;保留來源、版本與隱私設定。</small>
      </div>
      {archivable.map((e) => (
        <div key={e.id} className="item da">
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
          <small>
            來源:{SPACES[e.space][0]} · {e.kind} ·{" "}
            <button onClick={() => openQuickAdd({ editId: e.id })}>查看／入藏</button>
          </small>
        </div>
      ))}
      <div className="note">測試重點:道藏需要牌冊翻頁與關係網視圖,但這是視覺層;功能核心是來源追溯、版本與入藏確認。</div>
    </section>
  );
}
