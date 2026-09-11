import Link from "next/link";
import ModuleDomainPage from "../components/ModuleDomainPage";
import WeavingCaptureInbox from "../components/WeavingCaptureInbox";
import WeavingProjectHub from "../components/WeavingProjectHub";

export default function WeavingPage() {
  return (
    <ModuleDomainPage
      title="織光堂"
      lead="讓核心經線穿過不同作品，並把創作後的新理解帶回來。"
      space="weaving"
      defaultKind="創作"
      extra={(
        <>
          <WeavingProjectHub />
          <WeavingCaptureInbox />
          <Link href="/backstage" className="backstage-inline-link">內容生產工具已集中到工作後台 →</Link>
        </>
      )}
    />
  );
}
