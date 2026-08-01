import ModuleDomainPage from "../components/ModuleDomainPage";
import ExistingFeatureLinks from "../components/ExistingFeatureLinks";

// 聊解室(雛形 liaojie()的等價實作)。擁有者指示:任務管理站、組稿台、序列展開
// 掛進這裡。總覽台(P1)擁有者裁決(2026-08-01)改掛居所底下的「看整月」子頁
// (/overview),不在這裡——行事曆與完成度屬於「今天要做什麼」,是居所的職責,
// 不是工作場域的。
// 「日上三更」頁籤(tabLinks 索引 1)已是真實功能(/sanko,指令產生器),取代原本
// 該頁籤的模擬新增按鈕;其餘頁籤(今日工作/五光行旅/共振會/服務)仍是雛形模擬內容。
export default function LiaojiePage() {
  return (
    <ModuleDomainPage
      title="聊解室"
      lead="服務與對外工作場域;清楚但不把生活變成 KPI。"
      tabs={["今日工作", "日上三更", "五光行旅", "共振會", "服務"]}
      items={["待審核內容預覽", "選題 → 生成 → 人工審核 → 發布", "靜水亭:光站 03", "八月共振會", "服務案件與限閱脈絡"]}
      actions={["留下工作脈絡", "建立內容草稿", "新增／整理光站", "建立活動", "新增服務紀錄"]}
      space="liaojie"
      tabLinks={[null, "/sanko", null, null, null]}
      extra={
        <ExistingFeatureLinks
          links={[
            { label: "任務管理站", href: "/sessions" },
            { label: "組稿台", href: "/generate" },
            { label: "序列展開", href: "/expand" },
          ]}
        />
      }
    />
  );
}
