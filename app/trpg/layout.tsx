import Link from "next/link";

const TABS = [
  { href: "/trpg", label: "儀表板", icon: "📊" },
  { href: "/trpg/judge", label: "判定", icon: "🎲" },
  { href: "/trpg/quick-add", label: "輸入", icon: "⚡" },
  { href: "/trpg/clocks", label: "時鐘", icon: "⏱️" },
  { href: "/trpg/session-log", label: "結算", icon: "📖" },
];

export default function TrpgLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-3rem)] -mx-4 md:mx-0">
      <nav className="hidden md:flex md:flex-col md:w-40 md:shrink-0 border-r border-black/10 dark:border-white/15 px-2 py-4 gap-1">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-black/5 dark:hover:bg-white/10"
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        ))}
      </nav>

      <main className="flex-1 min-w-0 px-4 py-4 pb-24 md:pb-4">{children}</main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-10 flex border-t border-black/10 dark:border-white/15 bg-background">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs"
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
