import ModuleDomainPage from "../components/ModuleDomainPage";

// 野採(雛形 forage()的等價實作)。這個場域目前沒有既有功能可掛,維持雛形原樣。
export default function ForagePage() {
  return (
    <ModuleDomainPage
      title="野採"
      lead="把問題、閱讀、對話與素材撿起來;不必立刻做成作品。"
      tabs={["提問", "閱讀", "AI 論道", "素材"]}
      items={["我為什麼快完成時會停下來?", "《晨光》的一行摘記", "從停下來開始談", "路邊的光"]}
      actions={["記下一個問題", "新增閱讀摘記", "開始一段論道", "放入素材口袋"]}
      space="forage"
    />
  );
}
