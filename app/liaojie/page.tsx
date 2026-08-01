import ModuleDomainPage from "../components/ModuleDomainPage";
import ExistingFeatureLinks from "../components/ExistingFeatureLinks";

// 聊解室(雛形 liaojie()的等價實作)。擁有者指示:任務管理站、組稿台、序列展開
// 掛進這裡。總覽台(P1)委派書未指定歸屬場域,判斷它是生產進度總覽,性質上最接近
// 聊解室(服務與對外工作場域),先掛在這裡——這是我方的判斷,非明確指示,若擁有者
// 認為應該放別處或獨立,請告知調整。
export default function LiaojiePage() {
  return (
    <ModuleDomainPage
      title="聊解室"
      lead="服務與對外工作場域;清楚但不把生活變成 KPI。"
      tabs={["今日工作", "日上三更", "五光行旅", "共振會", "服務"]}
      items={["待審核內容預覽", "選題 → 生成 → 人工審核 → 發布", "靜水亭:光站 03", "八月共振會", "服務案件與限閱脈絡"]}
      actions={["留下工作脈絡", "建立內容草稿", "新增／整理光站", "建立活動", "新增服務紀錄"]}
      space="liaojie"
      extra={
        <ExistingFeatureLinks
          links={[
            { label: "任務管理站", href: "/sessions" },
            { label: "組稿台", href: "/generate" },
            { label: "序列展開", href: "/expand" },
            { label: "總覽台", href: "/overview" },
          ]}
        />
      }
    />
  );
}
