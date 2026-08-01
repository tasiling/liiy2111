import ModuleDomainPage from "../components/ModuleDomainPage";
import ExistingFeatureLinks from "../components/ExistingFeatureLinks";

// 織光堂(雛形 weaving()的等價實作)。擁有者指示:生產日工作台、活動註冊表掛進這裡
// (活動註冊表屬第三期範圍,尚未建置,先列出但標明未建置,不假裝有連結)。
export default function WeavingPage() {
  return (
    <ModuleDomainPage
      title="織光堂"
      lead="把採回的素材織成草稿、牌卡、作品與版本。"
      tabs={["工作桌", "牌卡", "成作", "版本"]}
      items={["一則日光草稿", "星星:牌面到版本", "一封給自己的信", "v0.3:三個標題"]}
      actions={["開一則草稿", "建立新牌卡", "新增成作", "建立版本"]}
      space="weaving"
      extra={
        <ExistingFeatureLinks
          links={[
            { label: "生產日工作台", href: "/production-day" },
            { label: "活動註冊表", href: null },
          ]}
        />
      }
    />
  );
}
