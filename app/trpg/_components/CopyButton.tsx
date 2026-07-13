"use client";

import { useState } from "react";

export default function CopyButton({ text, label = "複製" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={!text}
      className="px-3 py-1.5 rounded border text-xs hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50"
    >
      {copied ? "已複製 ✓" : label}
    </button>
  );
}
