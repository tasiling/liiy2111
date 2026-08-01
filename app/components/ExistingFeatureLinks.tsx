"use client";

// 擁有者指示:現有功能重新掛進場域,邏輯不動,只改位置與外觀。
// 這是雛形本身沒有的區塊,用 .box 卡片樣式(雛形既有類別)呈現,放在各場域頁雛形內容
// 之前,不打散雛形原本的頁籤/卡片結構。連結指向的頁面仍是各自原本的 Tailwind 介面
// (只改動線入口,不重新設計既有功能頁面本身)。
import Link from "next/link";

export type FeatureLink = { label: string; href: string | null };

export default function ExistingFeatureLinks({ links }: { links: FeatureLink[] }) {
  return (
    <div className="box dw">
      <span className="label">既有功能</span>
      <div className="row" style={{ marginTop: 6 }}>
        {links.map((l) =>
          l.href ? (
            <Link key={l.label} href={l.href} className="item" style={{ margin: 0, padding: "8px 11px", width: "auto" }}>
              {l.label} →
            </Link>
          ) : (
            <span
              key={l.label}
              className="tag"
              style={{ opacity: 0.7 }}
              title="尚未建置"
            >
              {l.label}(尚未建置)
            </span>
          )
        )}
      </div>
    </div>
  );
}
