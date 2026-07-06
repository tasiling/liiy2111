"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function UnlockForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "驗證失敗");
      router.push(redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4">
      <h1 className="text-lg font-semibold">深耕聚光系統 主控台</h1>
      <p className="text-sm text-zinc-500">請輸入存取金鑰</p>
      <form onSubmit={submit} className="flex flex-col gap-3 w-full max-w-xs">
        <input
          type="password"
          className="border rounded px-3 py-2 bg-transparent"
          placeholder="存取金鑰"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoFocus
        />
        <button
          type="submit"
          disabled={submitting || !key}
          className="px-3 py-2 rounded bg-foreground text-background text-sm disabled:opacity-50"
        >
          {submitting ? "驗證中…" : "進入"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}

export default function UnlockPage() {
  return (
    <Suspense>
      <UnlockForm />
    </Suspense>
  );
}
