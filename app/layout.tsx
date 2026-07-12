import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "深耕聚光系統 主控台",
  description: "全零的深耕聚光系統 — 產線 C 主控台(第一期 MVP)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="flex gap-4 px-4 py-3 border-b border-black/10 dark:border-white/15 text-sm">
          <Link href="/" className="font-medium hover:underline">
            主控台
          </Link>
          <Link href="/production-day" className="font-medium hover:underline">
            生產日工作台
          </Link>
          <Link href="/sessions" className="font-medium hover:underline">
            Session 工作站
          </Link>
          <Link href="/expand" className="font-medium hover:underline">
            序列展開
          </Link>
          <Link href="/generate" className="font-medium hover:underline">
            P8 組稿
          </Link>
          <Link href="/feedback" className="font-medium hover:underline">
            回饋快填
          </Link>
        </nav>
        <main className="flex-1 p-4 max-w-3xl w-full mx-auto">{children}</main>
      </body>
    </html>
  );
}
