"use client";

// 探索(雛形 map()的等價實作):道場小地圖,先測導航結構。
import { useRouter } from "next/navigation";
import { SPACES } from "@/lib/dojo/constants";

export default function MapPage() {
  const router = useRouter();
  return (
    <section className="screen">
      <h1>道場小地圖</h1>
      <p className="lead">目前先測導航結構;美術素材之後可替換成完整地圖與建築。</p>
      <div className="grid">
        {Object.entries(SPACES).map(([k, v]) => (
          <button key={k} className={`space ${v[1]}`} onClick={() => router.push(`/${k}`)}>
            <span className="dot" />
            <b>{v[0]}</b>
            <small>{v[2]}</small>
          </button>
        ))}
      </div>
      <div className="box dw">
        <b>居所</b>
        <small>所有路線都能回到這裡。</small>
      </div>
    </section>
  );
}
