// 執事(雛形 assistant()的等價實作):只在主動召喚時協助,所有輸出都是預覽。
export default function AssistantPage() {
  return (
    <section className="screen">
      <h1>執事</h1>
      <p className="lead">只在你主動召喚時協助;所有輸出都是預覽,等待你確認。</p>
      <button className="item">
        <b>整理一段素材</b>
        <small>整理成摘要、標題或草稿預覽,不會直接寫入道藏或公開。</small>
      </button>
      <button className="item">
        <b>幫我起一個論道題目</b>
        <small>只給題目候選,不自動展開辯論。</small>
      </button>
      <div className="note">測試重點:執事不主動彈出、不催促、不評價。</div>
    </section>
  );
}
